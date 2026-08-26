// Cria a campanha/adset/ad na Meta Marketing API — SEMPRE em estado pausado.
// Isto NUNCA gasta dinheiro por si só. Ativar é uma rota separada
// (ativar-campanha) que exige um clique explícito do utilizador na UI.
import { createClient as createAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { criarCampanhaPaga, MetaApiError, type PublicoAlvo } from '@/lib/meta';

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

  const { post_id, nome, publico, orcamento_diario_cents } = await request.json() as {
    post_id: string; nome: string; publico: PublicoAlvo; orcamento_diario_cents: number;
  };
  if (!post_id || !nome || !publico || !orcamento_diario_cents) {
    return NextResponse.json({ error: 'post_id, nome, publico e orcamento_diario_cents são obrigatórios.' }, { status: 400 });
  }

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: post } = await admin.from('prod_marketing_posts').select('*').eq('id', post_id).maybeSingle();
  if (!post) return NextResponse.json({ error: 'Post não encontrado.' }, { status: 404 });
  if (post.estado !== 'publicado' || !post.meta_post_id) {
    return NextResponse.json({ error: 'O post tem de estar publicado no Facebook antes de ser impulsionado.' }, { status: 400 });
  }

  try {
    const meta = await criarCampanhaPaga({
      nome,
      postIdFacebook: post.meta_post_id,
      publico,
      orcamentoDiarioCents: orcamento_diario_cents,
    });

    const { data: ad, error } = await admin
      .from('prod_marketing_ads')
      .insert([{
        post_id,
        nome,
        orcamento_diario_cents,
        publico,
        estado: 'pausada',
        meta_campaign_id: meta.metaCampaignId,
        meta_adset_id: meta.metaAdsetId,
        meta_ad_id: meta.metaAdId,
      }])
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, ad });
  } catch (e) {
    const msg = e instanceof MetaApiError ? e.message : 'Erro ao criar campanha.';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
