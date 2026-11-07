// Marca um design como a "capa" da sua família (imagem usada no cartão da
// família em /produtos) — desmarca qualquer outro da mesma família. Só admin.
import { createClient as createAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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

  const { design_id } = await request.json();
  if (!design_id) return NextResponse.json({ error: 'design_id é obrigatório.' }, { status: 400 });

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: design, error: findError } = await admin
    .from('prod_designs').select('id, familia').eq('id', design_id).maybeSingle();
  if (findError || !design) return NextResponse.json({ error: 'Design não encontrado.' }, { status: 404 });
  if (!design.familia) return NextResponse.json({ error: 'Design sem família.' }, { status: 400 });

  // Desmarca a capa atual da família (índice único só permite uma true por
  // família) e marca a nova — duas queries, não há transação direta via REST,
  // mas o unset primeiro evita o conflito do índice único.
  const { error: unsetError } = await admin
    .from('prod_designs').update({ capa_familia: false })
    .eq('familia', design.familia).eq('capa_familia', true);
  if (unsetError) return NextResponse.json({ error: unsetError.message }, { status: 500 });

  const { error: setError } = await admin
    .from('prod_designs').update({ capa_familia: true }).eq('id', design_id);
  if (setError) return NextResponse.json({ error: setError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
