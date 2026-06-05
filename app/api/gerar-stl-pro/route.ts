import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logInfo, logWarn } from '@/lib/logger';
import { verificarAbuso, getIP, alertarSeguranca } from '@/lib/abuse';

export const runtime = 'nodejs';
export const maxDuration = 120; // permite geração lenta (ex: nomes longos com twist)

export function GET() {
  return new Response('This endpoint requires POST', { status: 405 });
}

export async function POST(req: NextRequest) {
  const backendUrl = process.env.BACKEND_URL;

  if (!backendUrl) {
    return new Response('BACKEND_URL not configured', { status: 500 });
  }

  const body = await req.json();
  const designId = body.design_id ?? body.id;
  const params = body.params;
  const system = body.system ?? 'legacy'; // 'legacy' = pet tags, 'scad' = novos produtos

  if (!designId || !params) {
    return new Response('INVALID_REQUEST', { status: 400 });
  }

  // ── Identificar quem pede (email autenticado ou IP) ──
  let quem = getIP(req);
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) quem = user.email;
  } catch { /* anónimo — usa IP */ }

  // ── Detecção de abuso: máx 20 gerações por minuto ──
  const { bloqueado, total } = await verificarAbuso(quem, 'geracao', 20, 60);
  if (bloqueado) {
    await logWarn('seguranca', `Possível abuso de geração STL — ${total} pedidos/min`, { design: designId, system, total }, quem);
    await alertarSeguranca(quem, 'geração STL');
    return new Response('RATE_LIMITED', { status: 429 });
  }

  // Registar a geração (também serve de contador para o rate-limit)
  await logInfo('geracao', `Geração STL: ${designId}`, { system }, quem);

  // ── SISTEMA NOVO: produtos com scad_template (copo, etiquetas, etc.) ──
  if (system === 'scad') {
    const auth = req.headers.get('authorization');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 110_000); // 110s (antes do limite Next.js)

    let backendRes: Response;
    try {
      backendRes = await fetch(`${backendUrl}/gerar-stl-pro`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(auth ? { Authorization: auth } : {}),
        },
        body: JSON.stringify({
          id: designId,
          mode: 'preview',
          modo: 'preview', // alias PT — alguns scad_templates usam variável `modo`
          ...params,
        }),
        signal: controller.signal,
      });
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === 'AbortError';
      return new Response(isAbort ? 'TIMEOUT' : 'BACKEND_ERROR', { status: 504 });
    } finally {
      clearTimeout(timeout);
    }

    if (!backendRes.ok) {
      const text = await backendRes.text();
      return new Response(text, { status: backendRes.status });
    }

    // Backend devolve { success, url, storagePath, cached, mode }
    const data = await backendRes.json();
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── SISTEMA LEGADO: pet tags com base_geometry estático ──
  const backendRes = await fetch(`${backendUrl}/api/preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ design_id: designId, params }),
  });

  if (!backendRes.ok) {
    const text = await backendRes.text();
    return new Response(text, { status: backendRes.status });
  }

  const buffer = await backendRes.arrayBuffer();
  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'model/stl',
      'Cache-Control': 'no-store',
    },
  });
}
