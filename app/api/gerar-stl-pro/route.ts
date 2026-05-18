import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export function GET() {
  return new Response('This endpoint requires POST', { status: 405 });
}

export async function POST(req: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  if (!backendUrl) {
    return new Response('NEXT_PUBLIC_BACKEND_URL not configured', { status: 500 });
  }

  const body = await req.json();
  const designId = body.design_id ?? body.id;
  const params = body.params;
  const system = body.system ?? 'legacy'; // 'legacy' = pet tags, 'scad' = novos produtos

  if (!designId || !params) {
    return new Response('INVALID_REQUEST', { status: 400 });
  }

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
