import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const apiUrl = (process.env.API_URL ?? '').trim();
  if (!apiUrl) {
    return NextResponse.json({ error: 'API_URL não definida' }, { status: 500 });
  }

  const auth = req.headers.get('authorization') ?? '';
  const body = await req.json();

  const upstream = await fetch(`${apiUrl}/gerar-stl-pro`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // passa o Bearer token para o backend validar
      Authorization: auth,
    },
    body: JSON.stringify(body),
  });

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}