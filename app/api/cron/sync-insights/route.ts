// Cron diário — atualiza o cache de insights (impressions/reach/likes/etc.) dos
// posts publicados recentemente e o gasto real das campanhas pagas ativas, para
// o dashboard de analytics não bater na Graph API a cada carregamento de página.
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { obterInsightsPost, obterGastoCampanha, MetaApiError } from '@/lib/meta';

export const runtime = 'nodejs';

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  const authHeader = req.headers.get('authorization');
  const ok = secret === process.env.CRON_SECRET || authHeader === `Bearer ${process.env.CRON_SECRET}`;
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { data: posts } = await admin
    .from('prod_marketing_posts')
    .select('id, meta_post_id, meta_post_id_ig, canal')
    .eq('estado', 'publicado')
    .gte('publicado_em', desde);

  let postsAtualizados = 0;
  for (const post of posts ?? []) {
    try {
      const insights: Record<string, unknown> = {};
      if (post.meta_post_id_ig) Object.assign(insights, await obterInsightsPost(post.meta_post_id_ig, 'instagram'));
      if (post.meta_post_id) Object.assign(insights, await obterInsightsPost(post.meta_post_id, 'facebook'));
      await admin.from('prod_marketing_posts').update({ insights, updated_at: new Date().toISOString() }).eq('id', post.id);
      postsAtualizados++;
    } catch (e) {
      // Um post falhar não deve travar os restantes.
      console.error('[sync-insights] post', post.id, e instanceof MetaApiError ? e.message : e);
    }
  }

  const { data: ads } = await admin
    .from('prod_marketing_ads')
    .select('id, meta_campaign_id')
    .eq('estado', 'ativa');

  let adsAtualizados = 0;
  for (const ad of ads ?? []) {
    if (!ad.meta_campaign_id) continue;
    try {
      const gastoRealCents = await obterGastoCampanha(ad.meta_campaign_id);
      await admin.from('prod_marketing_ads').update({ gasto_real_cents: gastoRealCents, updated_at: new Date().toISOString() }).eq('id', ad.id);
      adsAtualizados++;
    } catch (e) {
      console.error('[sync-insights] ad', ad.id, e instanceof MetaApiError ? e.message : e);
    }
  }

  return NextResponse.json({ ok: true, postsAtualizados, adsAtualizados });
}
