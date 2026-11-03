// Prepara o envio de um vídeo (Reel) teu para o Storage.
// Os vídeos são grandes demais para passar pela função da Vercel (limite ~4,5 MB por
// pedido), por isso devolvemos um URL de upload assinado e o browser envia o ficheiro
// diretamente para o Supabase. Recebe { nome, tipo, tamanho }, devolve { path, token, url }.
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { assertAdmin } from '@/lib/assertAdmin';

const BUCKET = 'loja_produtos';
const TIPOS: Record<string, string> = { 'video/mp4': 'mp4', 'video/quicktime': 'mov' };
const MAX_BYTES = 50 * 1024 * 1024; // limite por ficheiro do Supabase Storage no plano gratuito

export async function POST(request: Request) {
  const guard = await assertAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { tipo, tamanho } = await request.json();
  const ext = TIPOS[tipo];
  if (!ext) return NextResponse.json({ error: 'Formato não suportado. Usa um vídeo MP4 ou MOV.' }, { status: 400 });
  if (typeof tamanho === 'number' && tamanho > MAX_BYTES) {
    return NextResponse.json({ error: `O vídeo tem ${(tamanho / 1048576).toFixed(0)} MB; o máximo é 50 MB. Exporta-o em 1080p ou comprime-o primeiro.` }, { status: 400 });
  }

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const path = `marketing/reels/${randomUUID()}.${ext}`;
  const { data, error } = await admin.storage.from(BUCKET).createSignedUploadUrl(path);
  if (error || !data) {
    console.error('[marketing/upload-video]', error);
    return NextResponse.json({ error: 'Não foi possível preparar o envio do vídeo.' }, { status: 500 });
  }

  const url = admin.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
  return NextResponse.json({ ok: true, bucket: BUCKET, path, token: data.token, url });
}
