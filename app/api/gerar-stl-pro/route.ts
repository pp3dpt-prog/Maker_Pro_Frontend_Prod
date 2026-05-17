import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

export function GET() {
  return new Response('This endpoint requires POST', { status: 405 });
}

export async function POST(req: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  if (!backendUrl) {
    return new Response(
      'NEXT_PUBLIC_BACKEND_URL not configured',
      { status: 500 }
    );
  }

  const body = await req.json();

  const designId = body.design_id ?? body.id;
  const params = body.params;

  if (!designId || !params) {
    return new Response('INVALID_REQUEST', { status: 400 });
  }

  const backendRes = await fetch(
    backendUrl + '/api/preview',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        design_id: designId,
        params,
      }),
    }
  );

  if (!backendRes.ok) {
    const text = await backendRes.text();
    return new Response(text, {
      status: backendRes.status,
    });
  }

  // ✅ Continua correto: ler binário completo
  const buffer = await backendRes.arrayBuffer();

  // ✅ CORREÇÃO IMPORTANTE: tipo STL
  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'model/stl',
      'Cache-Control': 'no-store',
    },
  });
}