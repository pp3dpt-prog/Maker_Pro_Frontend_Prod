// Liga encomendas de convidado (sem user_id) ao utilizador autenticado, por email.
// Chamado logo a seguir à criação de conta pós-compra, para o histórico aparecer no dashboard.
import { createClient as createAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // Só encomendas de convidado (sem user_id) cujo email na morada bate com o email da conta.
  const { data: candidatas } = await admin
    .from('prod_loja_encomendas')
    .select('id, morada_envio')
    .is('user_id', null);

  const emailConta = user.email.toLowerCase().trim();
  const ids = (candidatas ?? [])
    .filter((e: any) => (e.morada_envio?.email ?? '').toLowerCase().trim() === emailConta)
    .map((e: any) => e.id);

  if (ids.length === 0) return NextResponse.json({ ok: true, ligadas: 0 });

  const { error } = await admin.from('prod_loja_encomendas').update({ user_id: user.id }).in('id', ids);
  if (error) { console.error('[vincular-encomendas] erro:', error); return NextResponse.json({ error: 'Erro ao ligar encomendas.' }, { status: 500 }); }

  return NextResponse.json({ ok: true, ligadas: ids.length });
}
