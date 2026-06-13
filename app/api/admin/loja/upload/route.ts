// Upload de foto de produto da loja para o Storage (bucket 'loja_produtos').
// Recebe { image_base64 }, devolve { url }. Só admin.
import { createClient as createAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

const BUCKET = 'loja_produtos';

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

  const { image_base64 } = await request.json();
  if (!image_base64) return NextResponse.json({ error: 'Imagem em falta.' }, { status: 400 });

  const match = /^data:image\/(\w+);base64,/.exec(image_base64);
  const ext = (match?.[1] ?? 'jpg').replace('jpeg', 'jpg');
  const base64Data = image_base64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const path = `produtos/${randomUUID()}.${ext}`;

  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: `image/${ext}`, upsert: false });

  if (uploadError) {
    console.error('[loja/upload] erro:', uploadError);
    return NextResponse.json({ error: 'Erro no upload.' }, { status: 500 });
  }

  const { data: urlData } = admin.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ ok: true, url: urlData.publicUrl, path });
}
