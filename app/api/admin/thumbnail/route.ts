// Recebe uma imagem base64 e guarda no Supabase Storage como thumbnail do design
import { createClient as createAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { design_id, image_base64, field } = await request.json();
  if (!design_id || !image_base64) return NextResponse.json({ error: 'Dados em falta.' }, { status: 400 });

  // 'thumbnail' (default) = cartão principal (produtos/makers); 'montagem' = imagem
  // explicativa opcional mostrada no customizador (ex: vista explodida das peças).
  const target = field === 'montagem'
    ? { path: `montagem/${design_id}.jpg`, column: 'imagem_montagem_url' as const }
    : { path: `thumbnails/${design_id}.jpg`, column: 'thumbnail_url' as const };

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // Converter base64 para buffer
  const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  const { error: uploadError } = await admin.storage
    .from('makers_pro_stl_prod')
    .upload(target.path, buffer, { contentType: 'image/jpeg', upsert: true });

  if (uploadError) {
    console.error('[thumbnail] upload error:', uploadError);
    return NextResponse.json({ error: 'Erro no upload.' }, { status: 500 });
  }

  const { data: urlData } = admin.storage
    .from('makers_pro_stl_prod')
    .getPublicUrl(target.path);

  const publicUrl = urlData.publicUrl;

  await admin.from('prod_designs').update({ [target.column]: publicUrl }).eq('id', design_id);

  return NextResponse.json({ ok: true, url: publicUrl });
}
