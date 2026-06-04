// Recebe uma imagem base64 e guarda no Supabase Storage como thumbnail do design
import { createClient as createAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { design_id, image_base64 } = await request.json();
  if (!design_id || !image_base64) return NextResponse.json({ error: 'Dados em falta.' }, { status: 400 });

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // Converter base64 para buffer
  const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  const storagePath = `thumbnails/${design_id}.jpg`;

  const { error: uploadError } = await admin.storage
    .from('makers_pro_stl_prod')
    .upload(storagePath, buffer, { contentType: 'image/jpeg', upsert: true });

  if (uploadError) {
    console.error('[thumbnail] upload error:', uploadError);
    return NextResponse.json({ error: 'Erro no upload.' }, { status: 500 });
  }

  const { data: urlData } = admin.storage
    .from('makers_pro_stl_prod')
    .getPublicUrl(storagePath);

  const publicUrl = urlData.publicUrl;

  // Actualizar thumbnail_url no design
  await admin.from('prod_designs').update({ thumbnail_url: publicUrl }).eq('id', design_id);

  return NextResponse.json({ ok: true, url: publicUrl });
}
