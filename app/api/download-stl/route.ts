import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { logInfo, logWarn } from '@/lib/logger';
import { verificarAbuso, getIP, alertarSeguranca } from '@/lib/abuse';

export const runtime = 'nodejs';
export const maxDuration = 120; // geração de STL pode demorar (nomes longos, etc.)

export async function POST(req: NextRequest) {
  const body = await req.text();
  const auth = req.headers.get('authorization');

  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) {
    return new Response('BACKEND_URL não configurado', { status: 500 });
  }

  // Identificar quem pede
  let quem = getIP(req);
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.email) quem = user.email;
  } catch { /* anónimo */ }

  // Detecção de abuso: máx 15 downloads por minuto
  const { bloqueado, total } = await verificarAbuso(quem, 'download', 15, 60);
  if (bloqueado) {
    await logWarn('seguranca', `Possível abuso de downloads — ${total} pedidos/min`, { total }, quem);
    await alertarSeguranca(quem, 'downloads');
    return new Response('RATE_LIMITED', { status: 429 });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 110_000);
  let res: Response;
  try {
    res = await fetch(`${backendUrl}/download-stl`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: auth } : {}),
      },
      body,
      signal: controller.signal,
    });
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    await logWarn('download', isAbort ? 'Download timeout' : 'Erro backend no download', { erro: isAbort ? 'timeout' : 'backend' }, quem);
    return new Response(isAbort ? 'TIMEOUT' : 'BACKEND_ERROR', { status: 504 });
  } finally {
    clearTimeout(timeout);
  }

  // Registar resultado do download
  if (res.status === 402) {
    await logWarn('download', 'Download bloqueado — limite/plano insuficiente', { status: 402 }, quem);
  } else if (res.ok) {
    await logInfo('download', 'Download STL concluído', undefined, quem);
  } else {
    await logWarn('download', `Download falhou (${res.status})`, { status: res.status }, quem);
  }

  return new Response(res.body, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'application/octet-stream',
      'Content-Disposition': res.headers.get('content-disposition') ?? '',
    },
  });
}