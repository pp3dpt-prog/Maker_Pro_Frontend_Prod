// Gera um clip de Reel a partir de uma imagem: Wan 2.2 (Hugging Face, ZeroGPU grátis) →
// conversão para 720x1280/30fps/H.264 (ffmpeg) → Supabase Storage. Devolve o URL público.
// Um pedido = um vídeo; a UI chama esta rota uma vez por abordagem.
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { assertAdmin } from '@/lib/assertAdmin';
import { gerarClipWan, WanError } from '@/lib/wan';
import { converterParaReel } from '@/lib/reelVideo';

export const runtime = 'nodejs';
// Fila da ZeroGPU + ~30-60 s de geração + conversão. Fluid compute (Hobby) permite até 300 s.
export const maxDuration = 300;

const BUCKET = 'loja_produtos';

export async function POST(request: Request) {
  const guard = await assertAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { imagem_url, prompt, duracao } = await request.json() as { imagem_url?: string; prompt?: string; duracao?: number };
  if (!imagem_url?.startsWith('https://')) return NextResponse.json({ error: 'imagem_url (https) em falta.' }, { status: 400 });
  if (!prompt?.trim()) return NextResponse.json({ error: 'prompt em falta.' }, { status: 400 });

  let reel: Buffer;
  try {
    // Reels exigem pelo menos 3 s; o Space gera no máximo 5 s.
    const duracaoSeg = Math.min(5, Math.max(3, duracao ?? 5));
    const clip = await gerarClipWan({ imagemUrl: imagem_url, prompt: prompt.trim().slice(0, 1000), duracaoSeg });
    reel = await converterParaReel(clip);
  } catch (e) {
    console.error('[marketing/gerar-video]', e);
    const msg = e instanceof WanError ? e.message : `Erro a gerar o vídeo: ${e instanceof Error ? e.message.slice(0, 200) : String(e)}`;
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const caminho = `marketing/reels/${randomUUID()}.mp4`;
  const { error } = await admin.storage.from(BUCKET).upload(caminho, reel, { contentType: 'video/mp4' });
  if (error) {
    console.error('[marketing/gerar-video] storage:', error);
    return NextResponse.json({ error: `Erro ao guardar o vídeo: ${error.message}` }, { status: 500 });
  }
  const { data } = admin.storage.from(BUCKET).getPublicUrl(caminho);
  return NextResponse.json({ ok: true, url: data.publicUrl });
}
