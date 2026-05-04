import { NextRequest } from 'next/server';

export const runtime = 'nodejs';

/**
 * GET defensivo
 * Evita que o browser faça GET por engano
 */
export function GET() {
  return new Response(
    'This endpoint requires POST',
    { status: 405 }
  );
}

/**
 * POST – Gerar PREVIEW (proxy)
 * - aceita payload genérico do frontend
 * - traduz contrato para o backend
 * - devolve PNG binário (sem streaming)
 */
export async function POST(req: NextRequest) {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;

  if (!backendUrl) {
    return new Response(
      'NEXT_PUBLIC_BACKEND_URL not configured',
      { status: 500 }
    );
  }

  // ✅ Ler JSON corretamente (em vez de text)
  const body = await req.json();

  // ✅ Contrato genérico e escalável
  const designId = body.design_id ?? body.id;
  const params = body.params;

  if (!designId || !params) {
    return new Response(
      'INVALID_REQUEST',
      { status: 400 }
    );
  }

  // ✅ Pedido ao backend real
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

  // ✅ Se backend falhar, propagar erro claro
  if (!backendRes.ok) {
    const text = await backendRes.text();
    return new Response(text, {
      status: backendRes.status,
    });
  }

  // ✅ LER O BINÁRIO COMPLETO (NÃO STREAMAR)
  const buffer = await backendRes.arrayBuffer();

  return new Response(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
    },
  });
}
