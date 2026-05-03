import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

/**
 * GET defensivo
 * Serve apenas para debug e para evitar 404 HTML do Next
 */
export function GET() {
  return new Response(
    'This endpoint requires POST',
    { status: 405 }
  );
}

/**
 * POST – Gerar PREVIEW
 * Proxy para o backend (/api/preview)
 */
export async function POST(req: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  if (!backendUrl) {
    return new Response(
      'NEXT_PUBLIC_BACKEND_URL not configured',
      { status: 500 }
    );
  }

  const body = await req.text();
  const auth = req.headers.get('authorization');

  const res = await fetch(
    backendUrl + '/api/preview',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: auth } : {}),
      },
      body,
    }
  );

  return new Response(res.body, {
    status: res.status,
    headers: {
      // Preview devolve imagem (PNG ou similar)
      'Content-Type': res.headers.get('content-type') ?? 'image/png',
    },
  });
}
