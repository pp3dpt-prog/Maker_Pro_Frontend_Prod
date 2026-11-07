// Upload da foto de um design (thumbnail_url) para o Storage. Só admin.
// Mesma convenção dos thumbnails existentes: bucket makers_pro_stl_prod,
// pasta thumbnails/<design_id>.<ext>.
import { createClient as createAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const BUCKET = 'makers_pro_stl_prod';

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: 'Não autenticado.' };

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.email?.toLowerCase().trim() === adminEmail.toLowerCase().trim()) {
    return { ok: true as const };
  }
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: perfil } = await admin.from('prod_perfis').select('role').eq('id', user.id).maybeSingle();
  if (perfil?.role === 'admin') return { ok: true as const };
  return { ok: false as const, status: 403, error: 'Sem permissão.' };
}

export async function POST(request: Request) {
  const guard = await assertAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { design_id, image_base64 } = await request.json();
  if (!design_id || !image_base64) {
    return NextResponse.json({ error: 'design_id e image_base64 são obrigatórios.' }, { status: 400 });
  }

  const match = /^data:image\/(\w+);base64,/.exec(image_base64);
  const ext = (match?.[1] ?? 'jpg').replace('jpeg', 'jpg');
  const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: design, error: findError } = await admin
    .from('prod_designs').select('id').eq('id', design_id).maybeSingle();
  if (findError || !design) return NextResponse.json({ error: 'Design não encontrado.' }, { status: 404 });

  const path = `thumbnails/${design_id}.${ext}`;
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: `image/${ext}`, upsert: true });

  if (uploadError) {
    console.error('[designs/upload-foto] erro no upload:', uploadError);
    return NextResponse.json({ error: 'Erro no upload.' }, { status: 500 });
  }

  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path);
  // Cache-bust: upsert mantém o mesmo path, o browser (e o CDN) têm de ver a nova foto.
  const url = `${urlData.publicUrl}?v=${Date.now()}`;

  const { error: updateError } = await admin
    .from('prod_designs').update({ thumbnail_url: url }).eq('id', design_id);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true, url });
}
