import { NextRequest } from 'next/server';

export function GET() {
  return new Response('GET OK');
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const auth = req.headers.get('authorization');

  const res = await fetch(
    process.env.NEXT_PUBLIC_BACKEND_URL + '/api/preview',
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
      'Content-Type': res.headers.get('content-type') ?? 'image/png',
    },
  });
}