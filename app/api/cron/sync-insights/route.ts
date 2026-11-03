// Cron diário — grava as métricas dos posts e anúncios no histórico permanente
// (prod_marketing_metricas / prod_marketing_ads):
//   • posts publicados nos últimos 30 dias → atualiza os números;
//   • posts com ≥ 28 dias ainda sem retrato final → tira o retrato final (arquivado_em),
//     antes de saírem da janela do Analytics. Também apanha posts antigos que nunca
//     foram arquivados (backfill), aos poucos para não estourar o tempo do cron;
//   • anúncios pagos → gasto, impressões, alcance, cliques.
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { recolherMetricasPost, recolherMetricasAnuncio, DIAS_JANELA, DIAS_ARQUIVO } from '@/lib/marketing-metricas';

export const runtime = 'nodejs';
export const maxDuration = 60;

const MAX_BACKFILL_POR_EXECUCAO = 25;

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CAMPOS_POST = 'id, canal, video_url, publicado_em, meta_post_id, meta_post_id_ig, meta_container_ig';

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  const authHeader = req.headers.get('authorization');
  const ok = secret === process.env.CRON_SECRET || authHeader === `Bearer ${process.env.CRON_SECRET}`;
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limiteArquivo = new Date(Date.now() - DIAS_ARQUIVO * 86_400_000).toISOString();
  const limiteJanela = new Date(Date.now() - DIAS_JANELA * 86_400_000).toISOString();

  // 1. Posts recentes (ainda não chegaram aos 28 dias): só atualizar.
  const { data: recentes } = await admin
    .from('prod_marketing_posts')
    .select(CAMPOS_POST)
    .eq('estado', 'publicado')
    .gte('publicado_em', limiteArquivo);

  // 2. Posts com ≥ 28 dias sem retrato final (inclui os da janela 28–30 e backfill antigo).
  const { data: antigos } = await admin
    .from('prod_marketing_posts')
    .select(CAMPOS_POST)
    .eq('estado', 'publicado')
    .lt('publicado_em', limiteArquivo)
    .order('publicado_em', { ascending: false });

  const { data: jaArquivados } = await admin
    .from('prod_marketing_metricas')
    .select('post_id')
    .not('arquivado_em', 'is', null);
  const arquivados = new Set((jaArquivados ?? []).map(r => r.post_id));
  // Os que estão quase a sair da janela vêm primeiro (ordem por publicado_em desc).
  const porArquivar = (antigos ?? []).filter(p => !arquivados.has(p.id)).slice(0, MAX_BACKFILL_POR_EXECUCAO);

  let postsAtualizados = 0, postsArquivados = 0, falhas = 0;
  for (const post of [...(recentes ?? []), ...porArquivar]) {
    try {
      await recolherMetricasPost(admin, post);
      if (post.publicado_em && post.publicado_em < limiteArquivo) postsArquivados++; else postsAtualizados++;
    } catch (e) {
      // Um post falhar não deve travar os restantes.
      falhas++;
      console.error('[sync-insights] post', post.id, e);
    }
  }

  // 3. Anúncios pagos (todos os que chegaram à Meta).
  const { data: ads } = await admin
    .from('prod_marketing_ads')
    .select('id, meta_campaign_id, meta_ad_id, estado, metricas_atualizadas_em, created_at')
    .neq('estado', 'rascunho')
    .not('meta_campaign_id', 'is', null);

  let adsAtualizados = 0;
  for (const ad of ads ?? []) {
    // Terminadas e já com números de depois do fim não precisam de nova leitura.
    if (ad.estado === 'terminada' && ad.metricas_atualizadas_em && ad.created_at < limiteJanela) continue;
    try {
      await recolherMetricasAnuncio(admin, ad);
      adsAtualizados++;
    } catch (e) {
      console.error('[sync-insights] ad', ad.id, e);
    }
  }

  return NextResponse.json({
    ok: true,
    postsAtualizados,
    postsArquivados,
    postsPorArquivar: Math.max(0, (antigos ?? []).filter(p => !arquivados.has(p.id)).length - porArquivar.length),
    falhas,
    adsAtualizados,
  });
}
