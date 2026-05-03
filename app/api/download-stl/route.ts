import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.text();
  const auth = req.headers.get('authorization');

  const res = await fetch(
    process.env.BACKEND_URL + '/download-stl',
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
      'Content-Type':
        res.headers.get('content-type') ??
        'application/octet-stream',
      'Content-Disposition':
        res.headers.get('content-disposition') ?? '',
    },
  });
}