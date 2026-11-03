// Estado em tempo real das publicações (Instagram/Facebook) e dos anúncios pagos,
// lido diretamente da Meta. Usado pelo separador Analytics do /admin/marketing.
// Só lê na Meta; na BD apenas atualiza o cache de métricas (insights/gasto real).
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { assertAdmin } from '@/lib/assertAdmin';
import { recolherMetricasPost, recolherMetricasAnuncio } from '@/lib/marketing-metricas';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

// Corre `fn` sobre os itens com no máximo `n` pedidos em paralelo (não abusar da Graph API).
async function emLotes<T, R>(itens: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(itens.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, itens.length) }, async () => {
    while (i < itens.length) { const k = i++; out[k] = await fn(itens[k]); }
  }));
  return out;
}

export async function GET() {
  const guard = await assertAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: posts }, { data: ads }] = await Promise.all([
    admin.from('prod_marketing_posts')
      .select('id, legenda, imagens, video_url, abordagem, canal, estado, erro, agendado_para, publicado_em, created_at, meta_post_id, meta_post_id_ig, meta_container_ig')
      .neq('estado', 'rascunho')
      .or(`publicado_em.gte.${desde},and(publicado_em.is.null,created_at.gte.${desde})`)
      .order('created_at', { ascending: false })
      .limit(25),
    admin.from('prod_marketing_ads')
      .select('id, post_id, nome, estado, orcamento_diario_cents, meta_campaign_id, meta_ad_id, created_at')
      .neq('estado', 'rascunho')
      .order('created_at', { ascending: false })
      .limit(15),
  ]);

  const postsOut = await emLotes(posts ?? [], 4, async (p) => {
    // Consulta a Meta e grava no histórico permanente (prod_marketing_metricas).
    const { instagram, facebook } = await recolherMetricasPost(admin, p);

    return {
      id: p.id,
      legenda: p.legenda,
      thumb: p.imagens?.[0] ?? null,
      video_url: p.video_url,
      abordagem: p.abordagem,
      canal: p.canal,
      estado: p.estado,
      erro: p.erro,
      agendado_para: p.agendado_para,
      publicado_em: p.publicado_em,
      instagram,
      facebook,
    };
  });

  const adsOut = await emLotes(ads ?? [], 4, async (a) => {
    const meta = await recolherMetricasAnuncio(admin, a);
    return { id: a.id, post_id: a.post_id, nome: a.nome, estado: a.estado, orcamento_diario_cents: a.orcamento_diario_cents, meta };
  });

  return NextResponse.json({ atualizadoEm: new Date().toISOString(), posts: postsOut, ads: adsOut });
}
