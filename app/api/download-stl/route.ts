import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const auth = req.headers.get('authorization');

  // ✅ Corrigido: NEXT_PUBLIC_BACKEND_URL em vez de BACKEND_URL
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  if (!backendUrl) {
    return new Response('NEXT_PUBLIC_BACKEND_URL não configurado', { status: 500 });
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
    return new Response(isAbort ? 'TIMEOUT' : 'BACKEND_ERROR', { status: 504 });
  } finally {
    clearTimeout(timeout);
  }

  return new Response(res.body, {
    status: res.status,
    headers: {
      'Content-Type': res.headers.get('content-type') ?? 'application/octet-stream',
      'Content-Disposition': res.headers.get('content-disposition') ?? '',
    },
  });
}