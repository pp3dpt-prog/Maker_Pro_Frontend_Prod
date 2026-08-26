// Só consulta a Marketing API para prever alcance/custo — nunca cria nada.
// Usado pelo slider de orçamento antes do utilizador decidir impulsionar.
import { createClient as createAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { estimarAlcance, MetaApiError, type PublicoAlvo } from '@/lib/meta';

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

  const { publico, orcamento_diario_cents } = await request.json() as {
    publico: PublicoAlvo; orcamento_diario_cents: number;
  };
  if (!publico || !orcamento_diario_cents) {
    return NextResponse.json({ error: 'publico e orcamento_diario_cents são obrigatórios.' }, { status: 400 });
  }

  try {
    const estimativa = await estimarAlcance(publico, orcamento_diario_cents);
    return NextResponse.json({ ok: true, ...estimativa });
  } catch (e) {
    const msg = e instanceof MetaApiError ? e.message : 'Erro ao estimar alcance.';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
