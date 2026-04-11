import { NextResponse } from 'next/server';

export const runtime = 'nodejs'; // garante runtime Node (compatibilidade previsível)

export async function POST(req: Request) {
  const apiUrl = (process.env.API_URL ?? '').trim();

  // Não uses NEXT_PUBLIC aqui; isto é server-only
  if (!apiUrl) {
    return NextResponse.json(
      { error: 'API_URL não definida no ambiente (server)' },
      { status: 500 }
    );
  }

  // Passa o Bearer token para o backend validar
  const authorization = req.headers.get('authorization') ?? '';

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: 'Body inválido (JSON esperado).' },
      { status: 400 }
    );
  }

  // Proxy para o backend real
  const upstream = await fetch(`${apiUrl}/gerar-stl-pro`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(authorization ? { Authorization: authorization } : {}),
    },
    body: JSON.stringify(body),
  });

  // Propaga status + body (sem inventar)
  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}