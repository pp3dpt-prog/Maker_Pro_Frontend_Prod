import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export function GET() {
  return new Response('This endpoint requires POST', { status: 405 });
}

export async function POST(req: NextRequest) {
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) return new Response('BACKEND_URL not configured', { status: 500 });

  const body = await req.json();
  const auth = req.headers.get('authorization');
  const { id, params, mode } = body;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 110_000);
  let res: Response;
  try {
    res = await fetch(`${backendUrl}/gerar-stl-hueforge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: auth } : {}),
      },
      // Espalhar params ao nível raiz (igual ao gerar-stl-pro)
      body: JSON.stringify({ id, mode: mode ?? 'preview', ...params }),
      signal: controller.signal,
    });
  } catch (err: unknown) {
    const isAbort = err instanceof Error && err.name === 'AbortError';
    return new Response(isAbort ? 'TIMEOUT' : 'BACKEND_ERROR', { status: 504 });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const text = await res.text();
    return new Response(text, { status: res.status });
  }

  const data = await res.json();
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}
