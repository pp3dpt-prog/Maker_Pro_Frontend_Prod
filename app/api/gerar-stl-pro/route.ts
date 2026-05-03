import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

/**
 * GET defensivo
 */
export function GET() {
  return new Response('This endpoint requires POST', { status: 405 });
}

/**
 * POST – Gerar PREVIEW
 * Faz proxy para o backend, corrigindo o contrato:
 * id (frontend) -> design_id (backend)
 */
export async function POST(req: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  if (!backendUrl) {
    return new Response(
      'NEXT_PUBLIC_BACKEND_URL not configured',
      { status: 500 }
    );
  }

  // ✅ Ler JSON corretamente
  const body = await req.json();
  const auth = req.headers.get('authorization');

  
  // aceitar contrato genérico
  const designId = body.design_id ?? body.id;

  if (!designId || !body.params) {
    return new Response('INVALID_REQUEST', { status: 400 });
  }

  const backendPayload = {
    design_id: designId,
    params: body.params,
  };


  const res = await fetch(
    backendUrl + '/api/preview',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: auth } : {}),
      },
      body: JSON.stringify(backendPayload),
    }
  );

  return new Response(res.body, {
    status: res.status,
    headers: {
      'Content-Type':
        res.headers.get('content-type') ?? 'image/png',
    },
  });
}