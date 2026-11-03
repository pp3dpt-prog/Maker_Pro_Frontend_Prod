// Recolha + gravação das métricas de um post/anúncio no histórico permanente
// (prod_marketing_metricas / colunas de prod_marketing_ads). Partilhado pela rota
// estado-plataformas (botão Atualizar) e pelo cron diário sync-insights.
import type { SupabaseClient } from '@supabase/supabase-js';
import { estadoInstagram, estadoFacebook, estadoAnuncio, type EstadoPlataforma, type EstadoAnuncio } from '@/lib/meta';

export const DIAS_JANELA = 30;
// O retrato final é tirado a partir deste dia, com folga para o cron falhar 1-2 dias.
export const DIAS_ARQUIVO = 28;

export interface PostParaMetricas {
  id: string;
  canal: string;
  video_url: string | null;
  publicado_em: string | null;
  meta_post_id: string | null;
  meta_post_id_ig: string | null;
  meta_container_ig: string | null;
}

function linha(postId: string, plataforma: 'instagram' | 'facebook', r: EstadoPlataforma, arquivar: boolean) {
  const m = r.metricas ?? {};
  return {
    post_id: postId,
    plataforma,
    estado: r.estado,
    link: r.link ?? null,
    visualizacoes: m.visualizacoes ?? 0,
    alcance: m.alcance ?? 0,
    gostos: m.gostos ?? 0,
    comentarios: m.comentarios ?? 0,
    guardados: m.guardados ?? 0,
    partilhas: m.partilhas ?? 0,
    metricas: m,
    atualizado_em: new Date().toISOString(),
    ...(arquivar ? { arquivado_em: new Date().toISOString() } : {}),
  };
}

/** Consulta a Meta para o post e grava no histórico. Devolve o estado em cada rede. */
export async function recolherMetricasPost(admin: SupabaseClient, p: PostParaMetricas) {
  const querIg = p.canal === 'instagram' || p.canal === 'ambos';
  const querFb = p.canal === 'facebook' || p.canal === 'ambos';
  const [instagram, facebook] = await Promise.all([
    querIg ? estadoInstagram(p.meta_post_id_ig, p.meta_container_ig) : Promise.resolve(null),
    querFb ? estadoFacebook(p.meta_post_id, !!p.video_url) : Promise.resolve(null),
  ]);

  const idadeDias = p.publicado_em ? (Date.now() - new Date(p.publicado_em).getTime()) / 86_400_000 : 0;
  const arquivar = idadeDias >= DIAS_ARQUIVO;

  const linhas = [];
  // Só gravamos quando a Meta deu números (publicado/a processar). Um erro
  // temporário não deve apagar o que já estava guardado.
  if (instagram && (instagram.estado === 'publicado' || instagram.estado === 'a_processar') && instagram.metricas) linhas.push(linha(p.id, 'instagram', instagram, arquivar));
  if (facebook && (facebook.estado === 'publicado' || facebook.estado === 'a_processar') && facebook.metricas) linhas.push(linha(p.id, 'facebook', facebook, arquivar));
  if (linhas.length) {
    await admin.from('prod_marketing_metricas').upsert(linhas, { onConflict: 'post_id,plataforma' });
  }
  // Publicação apagada na rede (ou erro persistente muito depois da janela): marca o
  // estado mantendo os últimos números guardados e, se for altura, arquiva-a — senão
  // o cron voltaria a tentá-la todos os dias.
  for (const [plat, r] of [['instagram', instagram], ['facebook', facebook]] as const) {
    const desistir = r?.estado === 'removido' || (r?.estado === 'erro' && idadeDias >= DIAS_JANELA + 7);
    if (!r || !desistir) continue;
    const marca = { estado: r.estado, ...(arquivar ? { arquivado_em: new Date().toISOString() } : {}) };
    const { data: existe } = await admin.from('prod_marketing_metricas')
      .update(marca).eq('post_id', p.id).eq('plataforma', plat).select('id');
    if (!existe?.length && arquivar) {
      await admin.from('prod_marketing_metricas').insert({ post_id: p.id, plataforma: plat, ...marca });
    }
  }

  // Cache antigo (mantido por compatibilidade)
  const insights = { ...(instagram?.metricas ? { instagram: instagram.metricas } : {}), ...(facebook?.metricas ? { facebook: facebook.metricas } : {}) };
  if (Object.keys(insights).length) {
    await admin.from('prod_marketing_posts').update({ insights, updated_at: new Date().toISOString() }).eq('id', p.id);
  }

  return { instagram, facebook };
}

/** Consulta a Meta para o anúncio e grava gasto/impressões/alcance/cliques. */
export async function recolherMetricasAnuncio(admin: SupabaseClient, a: { id: string; meta_campaign_id: string | null; meta_ad_id: string | null }): Promise<EstadoAnuncio> {
  const meta = await estadoAnuncio(a.meta_campaign_id, a.meta_ad_id);
  if (!meta.erro && (meta.gastoCents > 0 || meta.impressoes > 0)) {
    await admin.from('prod_marketing_ads').update({
      gasto_real_cents: meta.gastoCents,
      impressoes: meta.impressoes,
      alcance: meta.alcance,
      cliques: meta.cliques,
      metricas_atualizadas_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', a.id);
  }
  return meta;
}
