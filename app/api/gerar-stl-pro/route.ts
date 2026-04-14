import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const raw = (process.env.API_URL ?? '').trim();
  const apiUrl = raw.replace(/\/+$/, ''); // remove trailing slashes

  if (!apiUrl) {
    return NextResponse.json(
      { error: 'API_URL não definida no ambiente (server)' },
      { status: 500 }
    );
  }

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

  // Timeout defensivo (Render pode demorar / cold start)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120_000);

  try {
    const upstream = await fetch(`${apiUrl}/gerar-stl-pro`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    // Não assumir JSON sempre
    const contentType = upstream.headers.get('content-type') ?? '';
    const text = await upstream.text();
    let data: any = {};

    if (contentType.includes('application/json')) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { error: 'Resposta JSON inválida do backend.', raw: text?.slice(0, 500) };
      }
    } else {
      // devolve texto para depuração (limitado)
      data = { error: 'Backend não devolveu JSON.', raw: text?.slice(0, 500) };
    }

    return NextResponse.json(data, { status: upstream.status });
  } catch (e: any) {
    const isTimeout = e?.name === 'AbortError';
    return NextResponse.json(
      { error: isTimeout ? 'Timeout ao contactar backend.' : 'Erro a contactar backend.' },
      { status: isTimeout ? 504 : 502 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
``