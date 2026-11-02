// Gera uma imagem com o FLUX schnell da Cloudflare Workers AI (tier gratuito) e
// guarda-a no Storage. Variáveis de ambiente: CF_ACCOUNT_ID e CF_API_TOKEN.
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { assertAdmin } from '@/lib/assertAdmin';

export const runtime = 'nodejs';
export const maxDuration = 60;

const BUCKET = 'loja_produtos';
const MODELO = '@cf/black-forest-labs/flux-1-schnell';

export async function POST(request: Request) {
  const guard = await assertAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { prompt } = await request.json() as { prompt?: string };
  if (!prompt?.trim()) return NextResponse.json({ error: 'prompt em falta.' }, { status: 400 });

  const conta = process.env.CF_ACCOUNT_ID;
  const token = process.env.CF_API_TOKEN;
  if (!conta || !token) {
    return NextResponse.json({ error: 'CF_ACCOUNT_ID / CF_API_TOKEN não configuradas.' }, { status: 500 });
  }

  const cf = await fetch(`https://api.cloudflare.com/client/v4/accounts/${conta}/ai/run/${MODELO}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: prompt.slice(0, 2000), steps: 6 }),
  });
  const json = await cf.json().catch(() => null);
  const b64: string | undefined = json?.result?.image;
  if (!cf.ok || !b64) {
    console.error('[marketing/gerar-imagem] Cloudflare:', cf.status, JSON.stringify(json?.errors ?? json)?.slice(0, 300));
    return NextResponse.json({ error: 'A Cloudflare não devolveu imagem (limite diário ou token inválido).' }, { status: 502 });
  }

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const path = `marketing/${randomUUID()}.jpg`;
  const { error } = await admin.storage.from(BUCKET).upload(path, Buffer.from(b64, 'base64'), { contentType: 'image/jpeg' });
  if (error) {
    console.error('[marketing/gerar-imagem] storage:', error);
    return NextResponse.json({ error: 'Erro ao guardar a imagem.' }, { status: 500 });
  }
  const { data } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ ok: true, url: data.publicUrl });
}
