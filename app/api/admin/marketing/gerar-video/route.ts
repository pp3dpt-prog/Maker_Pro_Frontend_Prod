// Gera um clip de Reel a partir de uma imagem: imagem vertical 480x832 (ffmpeg) → Wan 2.2
// (Hugging Face, ZeroGPU grátis) → conversão para 720x1280/30fps/H.264 (ffmpeg) → Supabase
// Storage. Devolve o URL público do vídeo. Um pedido = um vídeo; a UI chama uma vez por abordagem.
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { assertAdmin } from '@/lib/assertAdmin';
import { gerarClipWan, WanError, WanQuotaError } from '@/lib/wan';
import { converterParaReel, prepararImagemParaWan } from '@/lib/reelVideo';

export const runtime = 'nodejs';
// Fila da ZeroGPU + ~30-60 s de geração + conversão. Fluid compute (Hobby) permite até 300 s.
export const maxDuration = 300;

const BUCKET = 'loja_produtos';

// A ZeroGPU reserva tempo de GPU proporcional à duração; se a quota do dia não chegar para 5 s,
// tenta-se mais curto. Os Reels exigem pelo menos 3 s.
const DURACOES = [5, 4, 3];

export async function POST(request: Request) {
  const guard = await assertAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { imagem_url, prompt, duracao } = await request.json() as { imagem_url?: string; prompt?: string; duracao?: number };
  if (!imagem_url?.startsWith('https://')) return NextResponse.json({ error: 'imagem_url (https) em falta.' }, { status: 400 });
  if (!prompt?.trim()) return NextResponse.json({ error: 'prompt em falta.' }, { status: 400 });

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const id = randomUUID();

  // 1. Imagem vertical para o Wan (produto inteiro sobre fundo desfocado), guardada no Storage
  //    porque o Space vai buscá-la por URL.
  let imagemWan: string;
  try {
    const original = await fetch(imagem_url);
    if (!original.ok) throw new Error(`não foi possível descarregar a imagem (HTTP ${original.status})`);
    const vertical = await prepararImagemParaWan(Buffer.from(await original.arrayBuffer()));
    const caminho = `marketing/reels/entrada/${id}.jpg`;
    const { error } = await admin.storage.from(BUCKET).upload(caminho, vertical, { contentType: 'image/jpeg' });
    if (error) throw new Error(error.message);
    imagemWan = admin.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl;
  } catch (e) {
    console.error('[marketing/gerar-video] imagem:', e);
    return NextResponse.json({ error: `Erro a preparar a imagem: ${e instanceof Error ? e.message : String(e)}` }, { status: 502 });
  }

  // 2. Wan → 3. formato Reels
  const pedida = Math.min(5, Math.max(3, duracao ?? 5));
  let reel: Buffer | null = null;
  let duracaoUsada = 0;
  try {
    for (const d of DURACOES.filter(x => x <= pedida)) {
      try {
        const clip = await gerarClipWan({ imagemUrl: imagemWan, prompt: prompt.trim().slice(0, 1000), duracaoSeg: d });
        reel = await converterParaReel(clip);
        duracaoUsada = d;
        break;
      } catch (e) {
        if (e instanceof WanQuotaError && d !== 3) continue; // pedir menos GPU
        throw e;
      }
    }
    if (!reel) throw new WanQuotaError();
  } catch (e) {
    console.error('[marketing/gerar-video]', e);
    const msg = e instanceof WanError ? e.message : `Erro a gerar o vídeo: ${e instanceof Error ? e.message.slice(0, 200) : String(e)}`;
    return NextResponse.json({ error: msg }, { status: e instanceof WanQuotaError ? 429 : 502 });
  }

  // 4. Guardar o Reel
  const caminho = `marketing/reels/${id}.mp4`;
  const { error } = await admin.storage.from(BUCKET).upload(caminho, reel, { contentType: 'video/mp4' });
  if (error) {
    console.error('[marketing/gerar-video] storage:', error);
    return NextResponse.json({ error: `Erro ao guardar o vídeo: ${error.message}` }, { status: 500 });
  }
  const { data } = admin.storage.from(BUCKET).getPublicUrl(caminho);
  return NextResponse.json({ ok: true, url: data.publicUrl, duracao: duracaoUsada });
}
