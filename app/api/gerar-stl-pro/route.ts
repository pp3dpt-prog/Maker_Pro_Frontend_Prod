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
  const params = body.params ?? {};

  if (!designId) {
    return new Response('INVALID_REQUEST', { status: 400 });
  }

  // Encaminhar o token de autenticação do utilizador ao backend
  const auth = req.headers.get('authorization');

  // Chamar o endpoint correto do backend Docker com parâmetros planos
  const backendRes = await fetch(`${backendUrl}/gerar-stl-pro`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(auth ? { Authorization: auth } : {}),
    },
    body: JSON.stringify({
      id: designId,
      mode: 'preview',
      ...params,   // parâmetros planos: nome, fontSize, fonte, diametro, etc.
    }),
  });

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
