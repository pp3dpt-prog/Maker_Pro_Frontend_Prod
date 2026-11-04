// Proxy para o backend: contornos por cor do porta-chaves de imagem (pré-visualização).
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const backendUrl = process.env.BACKEND_URL;
  if (!backendUrl) return Response.json({ error: 'BACKEND_URL não configurado.' }, { status: 500 });

  const auth = req.headers.get('authorization');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55_000);
  try {
    const res = await fetch(`${backendUrl}/vetorizar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(auth ? { Authorization: auth } : {}) },
      body: await req.text(),
      signal: controller.signal,
    });
    const text = await res.text();
    return new Response(text, { status: res.status, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    const abort = err instanceof Error && err.name === 'AbortError';
    return Response.json({ error: abort ? 'A imagem está a demorar demasiado a processar.' : 'Erro de ligação ao servidor.' }, { status: 504 });
  } finally {
    clearTimeout(timeout);
  }
}
