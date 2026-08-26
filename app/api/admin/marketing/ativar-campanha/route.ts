// Único caminho que liga o gasto real de uma campanha paga. Exige `confirmar: true`
// explícito no corpo do pedido — a UI só deve chamar isto a partir de um botão
// dedicado ("Ativar e gastar X€/dia"), nunca automaticamente.
import { createClient as createAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { ativarCampanha, MetaApiError } from '@/lib/meta';

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: 'Não autenticado.' };

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.email?.toLowerCase().trim() === adminEmail.toLowerCase().trim()) {
    return { ok: true as const, userId: user.id };
  }
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: perfil } = await admin.from('prod_perfis').select('role').eq('id', user.id).maybeSingle();
  if (perfil?.role === 'admin') return { ok: true as const, userId: user.id };
  return { ok: false as const, status: 403, error: 'Sem permissão.' };
}

export async function POST(request: Request) {
  const guard = await assertAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { ad_id, confirmar } = await request.json();
  if (!ad_id) return NextResponse.json({ error: 'ad_id em falta.' }, { status: 400 });
  if (confirmar !== true) {
    return NextResponse.json({ error: 'Confirmação explícita em falta — esta ação começa a gastar dinheiro.' }, { status: 400 });
  }

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: ad } = await admin.from('prod_marketing_ads').select('*').eq('id', ad_id).maybeSingle();
  if (!ad) return NextResponse.json({ error: 'Campanha não encontrada.' }, { status: 404 });
  if (!ad.meta_campaign_id) return NextResponse.json({ error: 'Campanha sem id da Meta.' }, { status: 400 });

  try {
    await ativarCampanha(ad.meta_campaign_id);
  } catch (e) {
    const msg = e instanceof MetaApiError ? e.message : 'Erro ao ativar campanha.';
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const { data: atualizado } = await admin
    .from('prod_marketing_ads')
    .update({ estado: 'ativa', ativada_em: new Date().toISOString(), ativada_por: guard.userId, updated_at: new Date().toISOString() })
    .eq('id', ad_id)
    .select()
    .single();

  return NextResponse.json({ ok: true, ad: atualizado });
}
