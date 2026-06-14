// Admin: gera URL assinada para descarregar um STL anexado a uma encomenda (bucket privado).
import { createClient as createAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const BUCKET = 'makers_pro_stl_prod';

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: 'Não autenticado.' };
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.email?.toLowerCase().trim() === adminEmail.toLowerCase().trim()) return { ok: true as const };
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: perfil } = await admin.from('prod_perfis').select('role').eq('id', user.id).maybeSingle();
  if (perfil?.role === 'admin') return { ok: true as const };
  return { ok: false as const, status: 403, error: 'Sem permissão.' };
}

export async function POST(request: Request) {
  const guard = await assertAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { path } = await request.json();
  if (!path) return NextResponse.json({ error: 'path em falta.' }, { status: 400 });

  // Normalizar: aceita um caminho limpo OU uma URL assinada antiga (extrai a chave do objeto).
  const objectKey = normalizarChave(String(path));
  if (!objectKey) return NextResponse.json({ error: 'Caminho de ficheiro inválido.' }, { status: 400 });

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await admin.storage.from(BUCKET).createSignedUrl(objectKey, 60 * 30); // 30 min
  if (error || !data) {
    console.error('[loja/stl-url] createSignedUrl:', error?.message, 'key:', objectKey);
    return NextResponse.json({ error: `Ficheiro não encontrado (${objectKey}).` }, { status: 404 });
  }

  return NextResponse.json({ ok: true, url: data.signedUrl });
}

// "https://x/storage/v1/object/sign/makers_pro_stl_prod/users/7/a.stl?token=..." -> "users/7/a.stl"
function normalizarChave(input: string): string {
  let p = input.trim();
  // só o pathname, sem query (?token=...)
  try { if (/^https?:\/\//i.test(p)) p = new URL(p).pathname; } catch { /* não é URL */ }
  p = p.split('?')[0];
  // se vier o caminho do Storage, ficar só com o que está depois do nome do bucket
  const marker = `${BUCKET}/`;
  const idx = p.indexOf(marker);
  if (idx >= 0) p = p.slice(idx + marker.length);
  // limpar barras iniciais
  return p.replace(/^\/+/, '');
}
