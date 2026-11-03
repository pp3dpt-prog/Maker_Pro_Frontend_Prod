// Wrapper fino da Meta Graph API (publicação orgânica IG/FB) e Marketing API
// (estimativas de alcance + campanhas pagas). Sem lógica de negócio — quem decide
// o que gravar/quando é sempre o chamador (rotas em app/api/admin/marketing/*).
//
// Env vars necessárias (ver .env.example):
//   META_PAGE_ACCESS_TOKEN, META_PAGE_ID, META_IG_USER_ID, META_AD_ACCOUNT_ID (opcional, só pago)

const GRAPH_VERSION = 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;

export class MetaApiError extends Error {
  constructor(message: string, public readonly detalhe?: unknown) {
    super(message);
    this.name = 'MetaApiError';
  }
}

// Token configurado: normalmente o de um utilizador do sistema (System User) do
// Business Manager, que serve para Instagram e Marketing API.
function pageToken(): string {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) throw new MetaApiError('META_PAGE_ACCESS_TOKEN não configurado.');
  return token;
}

// Publicar e ler estatísticas na Página de Facebook exige um token DA PÁGINA;
// com um token de utilizador/System User a Meta responde (#200) "publish_actions
// deprecated". Pedimos o token da página com o token configurado (se este já for
// de página, a Meta devolve-o igual) e guardamo-lo em memória enquanto a função vive.
let tokenPaginaCache: string | null = null;

async function tokenDaPagina(): Promise<string> {
  if (tokenPaginaCache) return tokenPaginaCache;
  const pageId = process.env.META_PAGE_ID;
  if (!pageId) throw new MetaApiError('META_PAGE_ID não configurado.');

  const json = await graphFetch(`/${pageId}`, { fields: 'access_token' }, 'GET');
  if (!json.access_token) {
    throw new MetaApiError(
      'Não foi possível obter o token da Página. Confirma que o utilizador do sistema tem acesso total à Página e as permissões pages_manage_posts e pages_read_engagement.'
    );
  }
  tokenPaginaCache = json.access_token as string;
  return tokenPaginaCache;
}

async function graphFetch(
  path: string,
  params: Record<string, string>,
  method: 'GET' | 'POST' = 'GET',
  token: string = pageToken(),
) {
  const url = new URL(`${GRAPH_BASE}${path}`);
  const body = new URLSearchParams({ ...params, access_token: token });

  const res = method === 'GET'
    ? await fetch(`${url.toString()}?${body.toString()}`, { method: 'GET' })
    : await fetch(url.toString(), { method: 'POST', body });

  const json = await res.json();
  if (!res.ok || json.error) {
    throw new MetaApiError(json.error?.message ?? `Erro Graph API (${res.status})`, json.error);
  }
  return json;
}

// ── Publicação orgânica ─────────────────────────────────────────────────────

export async function publicarFacebook(texto: string, imagemUrl: string): Promise<{ postId: string }> {
  const pageId = process.env.META_PAGE_ID;
  if (!pageId) throw new MetaApiError('META_PAGE_ID não configurado.');

  const json = await graphFetch(`/${pageId}/photos`, {
    url: imagemUrl,
    caption: texto,
    published: 'true',
  }, 'POST', await tokenDaPagina());

  return { postId: json.post_id ?? json.id };
}

export async function publicarInstagram(legenda: string, imagemUrl: string): Promise<{ mediaId: string }> {
  const igUserId = process.env.META_IG_USER_ID;
  if (!igUserId) throw new MetaApiError('META_IG_USER_ID não configurado.');

  // Passo 1: criar o container de media
  const container = await graphFetch(`/${igUserId}/media`, {
    image_url: imagemUrl,
    caption: legenda,
  }, 'POST');

  // Passo 1b: o Instagram descarrega e processa a imagem em segundo plano; publicar
  // antes de terminar dá "Media ID is not available". Esperamos pelo estado FINISHED.
  await esperarContainerInstagram(container.id);

  // Passo 2: publicar o container
  const publicado = await graphFetch(`/${igUserId}/media_publish`, {
    creation_id: container.id,
  }, 'POST');

  return { mediaId: publicado.id };
}

async function esperarContainerInstagram(containerId: string, limiteMs = 40_000) {
  const inicio = Date.now();
  let intervaloMs = 1_500;
  while (Date.now() - inicio < limiteMs) {
    const json = await graphFetch(`/${containerId}`, { fields: 'status_code,status' }, 'GET');
    const estado: string | undefined = json.status_code;
    if (estado === 'FINISHED' || estado === 'PUBLISHED') return;
    if (estado === 'ERROR' || estado === 'EXPIRED') {
      throw new MetaApiError(`O Instagram não conseguiu processar a imagem (${estado}${json.status ? `: ${json.status}` : ''}).`, json);
    }
    await new Promise(r => setTimeout(r, intervaloMs));
    intervaloMs = Math.min(intervaloMs * 1.5, 5_000);
  }
  throw new MetaApiError('O Instagram ainda está a processar a imagem. Tenta publicar outra vez daqui a um minuto.');
}

// ── Reels (vídeo vertical) ──────────────────────────────────────────────────
// O Instagram processa o vídeo de forma assíncrona e pode demorar minutos, mais do que um
// pedido HTTP deve esperar. Por isso o Reel do Instagram é feito em duas fases:
//   1. criarContainerReelInstagram() → guarda-se o container_id na BD;
//   2. estadoContainerInstagram() + publicarContainerInstagram() — no mesmo pedido se ficar
//      pronto depressa, senão num ciclo seguinte do cron (de 30 em 30 min).

export async function criarContainerReelInstagram(legenda: string, videoUrl: string): Promise<{ containerId: string }> {
  const igUserId = process.env.META_IG_USER_ID;
  if (!igUserId) throw new MetaApiError('META_IG_USER_ID não configurado.');
  const json = await graphFetch(`/${igUserId}/media`, {
    media_type: 'REELS',
    video_url: videoUrl,
    caption: legenda,
    share_to_feed: 'true',
  }, 'POST');
  return { containerId: json.id };
}

export type EstadoContainer = 'pronto' | 'a_processar' | 'publicado';

/** Espera até `limiteMs` pelo processamento do container; lança erro se falhou ou expirou. */
export async function estadoContainerInstagram(containerId: string, limiteMs = 45_000): Promise<EstadoContainer> {
  const inicio = Date.now();
  let intervaloMs = 3_000;
  for (;;) {
    const json = await graphFetch(`/${containerId}`, { fields: 'status_code,status' }, 'GET');
    const estado: string | undefined = json.status_code;
    if (estado === 'FINISHED') return 'pronto';
    if (estado === 'PUBLISHED') return 'publicado';
    if (estado === 'ERROR' || estado === 'EXPIRED') {
      throw new MetaApiError(`O Instagram não conseguiu processar o vídeo (${estado}${json.status ? `: ${json.status}` : ''}).`, json);
    }
    if (Date.now() - inicio + intervaloMs > limiteMs) return 'a_processar';
    await new Promise(r => setTimeout(r, intervaloMs));
    intervaloMs = Math.min(intervaloMs * 1.5, 8_000);
  }
}

export async function publicarContainerInstagram(containerId: string): Promise<{ mediaId: string }> {
  const igUserId = process.env.META_IG_USER_ID;
  if (!igUserId) throw new MetaApiError('META_IG_USER_ID não configurado.');
  const json = await graphFetch(`/${igUserId}/media_publish`, { creation_id: containerId }, 'POST');
  return { mediaId: json.id };
}

/**
 * Publica um Reel na Página de Facebook (Reels Publishing API, 3 passos). O Facebook vai
 * buscar o ficheiro ao URL público e processa-o depois; o pedido não fica à espera disso.
 * Devolve o video_id, que é o identificador do Reel.
 */
export async function publicarReelFacebook(descricao: string, videoUrl: string): Promise<{ videoId: string }> {
  const pageId = process.env.META_PAGE_ID;
  if (!pageId) throw new MetaApiError('META_PAGE_ID não configurado.');
  const token = await tokenDaPagina();

  // 1. Abrir a sessão de upload
  const inicio = await graphFetch(`/${pageId}/video_reels`, { upload_phase: 'start' }, 'POST', token);
  const videoId: string = inicio.video_id;
  if (!videoId) throw new MetaApiError('O Facebook não devolveu video_id ao iniciar o Reel.', inicio);

  // 2. O Facebook descarrega o vídeo do nosso URL público
  const up = await fetch(`https://rupload.facebook.com/video-upload/${GRAPH_VERSION}/${videoId}`, {
    method: 'POST',
    headers: { Authorization: `OAuth ${token}`, file_url: videoUrl },
  });
  const upJson = await up.json().catch(() => ({}));
  if (!up.ok || upJson?.success !== true) {
    throw new MetaApiError(upJson?.debug_info?.message ?? upJson?.error?.message ?? `Falhou o envio do vídeo para o Facebook (HTTP ${up.status}).`, upJson);
  }

  // 3. Publicar (marcado como gerado por IA — o clip vem do Wan 2.2)
  await graphFetch(`/${pageId}/video_reels`, {
    video_id: videoId,
    upload_phase: 'finish',
    video_state: 'PUBLISHED',
    description: descricao,
    is_ai_generated: 'true',
  }, 'POST', token);

  return { videoId };
}

export async function obterInsightsPost(mediaId: string, canal: 'instagram' | 'facebook') {
  const metricas = canal === 'instagram'
    ? 'impressions,reach,likes,comments,saved'
    : 'post_impressions,post_engaged_users';

  // Estatísticas de posts da Página também precisam do token da página.
  const token = canal === 'facebook' ? await tokenDaPagina() : pageToken();
  const json = await graphFetch(`/${mediaId}/insights`, { metric: metricas }, 'GET', token);
  const resultado: Record<string, number> = {};
  for (const item of json.data ?? []) {
    resultado[item.name] = item.values?.[0]?.value ?? 0;
  }
  return resultado;
}

// ── Marketing API (pago) — nunca ativa gasto sozinho ────────────────────────

export interface PublicoAlvo {
  idade_min: number;
  idade_max: number;
  generos: ('homem' | 'mulher')[];
  localizacoes: string[]; // ex: ['PT']
  interesses?: string[];
}

function adAccountId(): string {
  const id = process.env.META_AD_ACCOUNT_ID;
  if (!id) throw new MetaApiError('META_AD_ACCOUNT_ID não configurado — configura uma Ad Account no Meta Business primeiro.');
  return id;
}

function targetingSpec(publico: PublicoAlvo) {
  return JSON.stringify({
    age_min: publico.idade_min,
    age_max: publico.idade_max,
    genders: publico.generos.map(g => (g === 'homem' ? 1 : 2)),
    geo_locations: { countries: publico.localizacoes },
    ...(publico.interesses?.length ? { flexible_spec: [{ interests: publico.interesses }] } : {}),
  });
}

export async function estimarAlcance(publico: PublicoAlvo, orcamentoDiarioCents: number) {
  const json = await graphFetch(`/act_${adAccountId()}/delivery_estimate`, {
    optimization_goal: 'REACH',
    targeting_spec: targetingSpec(publico),
    daily_budget: String(orcamentoDiarioCents),
  }, 'GET');

  const estimativa = json.data?.[0] ?? {};
  return {
    alcanceMin: estimativa.estimate_mtn_1 ?? null,
    alcanceMax: estimativa.estimate_mtn_2 ?? null,
    // A Marketing API não devolve custo/resultado diretamente na delivery_estimate;
    // fica como aproximação simples até termos histórico real de campanhas.
  };
}

export async function criarCampanhaPaga(params: {
  nome: string;
  postIdFacebook: string;
  publico: PublicoAlvo;
  orcamentoDiarioCents: number;
}) {
  const account = `act_${adAccountId()}`;

  // 1. Campanha — SEMPRE pausada. Ativar é uma ação separada e explícita.
  const campanha = await graphFetch(`/${account}/campaigns`, {
    name: params.nome,
    objective: 'OUTCOME_ENGAGEMENT',
    status: 'PAUSED',
    special_ad_categories: '[]',
  }, 'POST');

  // 2. Ad Set — orçamento + público, também pausado.
  const adSet = await graphFetch(`/${account}/adsets`, {
    name: `${params.nome} — conjunto`,
    campaign_id: campanha.id,
    daily_budget: String(params.orcamentoDiarioCents),
    billing_event: 'IMPRESSIONS',
    optimization_goal: 'POST_ENGAGEMENT',
    targeting: targetingSpec(params.publico),
    status: 'PAUSED',
  }, 'POST');

  // 3. Ad — usa o post orgânico já publicado como criativo, também pausado.
  const creative = await graphFetch(`/${account}/adcreatives`, {
    name: `${params.nome} — criativo`,
    object_story_id: params.postIdFacebook,
  }, 'POST');

  const ad = await graphFetch(`/${account}/ads`, {
    name: `${params.nome} — anúncio`,
    adset_id: adSet.id,
    creative: JSON.stringify({ creative_id: creative.id }),
    status: 'PAUSED',
  }, 'POST');

  return {
    metaCampaignId: campanha.id as string,
    metaAdsetId: adSet.id as string,
    metaAdId: ad.id as string,
  };
}

export async function ativarCampanha(metaCampaignId: string) {
  await graphFetch(`/${metaCampaignId}`, { status: 'ACTIVE' }, 'POST');
}

export async function pausarCampanha(metaCampaignId: string) {
  await graphFetch(`/${metaCampaignId}`, { status: 'PAUSED' }, 'POST');
}

export async function obterGastoCampanha(metaCampaignId: string): Promise<number> {
  const json = await graphFetch(`/${metaCampaignId}/insights`, { fields: 'spend' }, 'GET');
  const spendEuros = Number(json.data?.[0]?.spend ?? 0);
  return Math.round(spendEuros * 100); // cents
}

// ── Estado nas plataformas (leitura em tempo real para o separador Analytics) ─
// Pergunta à Meta o que está mesmo publicado/a correr, em vez de confiar só na BD.
// Nunca altera nada na Meta — só lê.

export type EstadoNaPlataforma =
  | 'publicado'      // existe e está visível
  | 'a_processar'    // container/vídeo ainda em processamento
  | 'removido'       // tinha id mas a Meta já não o encontra (apagado)
  | 'erro'           // a Meta devolveu erro (processamento falhou, permissões…)
  | 'nao_publicado'; // ainda não tem id nesta rede

export interface EstadoPlataforma {
  estado: EstadoNaPlataforma;
  detalhe?: string;
  link?: string;
  publicadoEm?: string;
  metricas?: Record<string, number>;
}

function objetoNaoExiste(e: unknown): boolean {
  if (!(e instanceof MetaApiError)) return false;
  const d = e.detalhe as { code?: number; error_subcode?: number } | undefined;
  return d?.code === 100 && (d.error_subcode === 33 || /does not exist|cannot be loaded/i.test(e.message));
}

// A Meta vai retirando métricas (ex.: 'impressions' → 'views'); um pedido com uma
// métrica inválida falha por inteiro, por isso tentamos várias listas por ordem.
async function insightsTolerante(caminho: string, listas: string[], token: string) {
  for (const lista of listas) {
    try {
      const json = await graphFetch(caminho, { metric: lista }, 'GET', token);
      const r: Record<string, number> = {};
      for (const item of json.data ?? []) {
        const v = item.values?.[0]?.value ?? item.total_value?.value;
        if (typeof v === 'number') r[item.name] = v;
      }
      return r;
    } catch { /* tenta a lista seguinte */ }
  }
  return null;
}

export async function estadoInstagram(mediaId: string | null, containerId: string | null): Promise<EstadoPlataforma> {
  if (!mediaId) {
    if (!containerId) return { estado: 'nao_publicado' };
    try {
      const c = await graphFetch(`/${containerId}`, { fields: 'status_code,status' }, 'GET');
      if (c.status_code === 'ERROR' || c.status_code === 'EXPIRED') {
        return { estado: 'erro', detalhe: `Container ${c.status_code}${c.status ? `: ${c.status}` : ''}` };
      }
      return { estado: 'a_processar', detalhe: `Container ${c.status_code ?? 'IN_PROGRESS'} — o cron publica quando ficar pronto.` };
    } catch (e) {
      return { estado: 'erro', detalhe: e instanceof Error ? e.message : 'Erro a ler o container.' };
    }
  }

  const token = pageToken();
  try {
    const m = await graphFetch(`/${mediaId}`, { fields: 'permalink,timestamp,media_type,like_count,comments_count' }, 'GET', token);
    const metricas: Record<string, number> = {
      gostos: m.like_count ?? 0,
      comentarios: m.comments_count ?? 0,
    };
    const ins = await insightsTolerante(`/${mediaId}/insights`, [
      'views,reach,saved,shares',
      'reach,saved,shares',
      'impressions,reach,saved',
      'reach',
    ], token);
    if (ins) {
      if (ins.views != null) metricas.visualizacoes = ins.views;
      else if (ins.impressions != null) metricas.visualizacoes = ins.impressions;
      if (ins.reach != null) metricas.alcance = ins.reach;
      if (ins.saved != null) metricas.guardados = ins.saved;
      if (ins.shares != null) metricas.partilhas = ins.shares;
    }
    return { estado: 'publicado', link: m.permalink, publicadoEm: m.timestamp, metricas };
  } catch (e) {
    if (objetoNaoExiste(e)) return { estado: 'removido', detalhe: 'O Instagram já não encontra esta publicação (foi apagada?).' };
    return { estado: 'erro', detalhe: e instanceof Error ? e.message : 'Erro a ler a publicação.' };
  }
}

export async function estadoFacebook(postId: string | null, ehReel: boolean): Promise<EstadoPlataforma> {
  if (!postId) return { estado: 'nao_publicado' };
  let token: string;
  try { token = await tokenDaPagina(); } catch (e) {
    return { estado: 'erro', detalhe: e instanceof Error ? e.message : 'Sem token da Página.' };
  }

  try {
    if (ehReel) {
      // Reels do Facebook: o id guardado é o video_id.
      const v = await graphFetch(`/${postId}`, {
        fields: 'permalink_url,created_time,status,likes.summary(true).limit(0),comments.summary(true).limit(0)',
      }, 'GET', token);
      const st: string | undefined = v.status?.video_status;
      const metricas: Record<string, number> = {
        gostos: v.likes?.summary?.total_count ?? 0,
        comentarios: v.comments?.summary?.total_count ?? 0,
      };
      const ins = await insightsTolerante(`/${postId}/video_insights`, [
        'blue_reels_play_count,post_impressions_unique',
        'blue_reels_play_count',
      ], token);
      if (ins?.blue_reels_play_count != null) metricas.visualizacoes = ins.blue_reels_play_count;
      if (ins?.post_impressions_unique != null) metricas.alcance = ins.post_impressions_unique;
      const link = v.permalink_url ? (v.permalink_url.startsWith('http') ? v.permalink_url : `https://www.facebook.com${v.permalink_url}`) : undefined;

      if (st === 'error') return { estado: 'erro', detalhe: 'O Facebook não conseguiu processar o vídeo.', link };
      if (st && st !== 'ready') return { estado: 'a_processar', detalhe: `Vídeo: ${st}`, link, metricas };
      return { estado: 'publicado', link, publicadoEm: v.created_time, metricas };
    }

    const p = await graphFetch(`/${postId}`, {
      fields: 'permalink_url,created_time,is_published,reactions.summary(total_count).limit(0),comments.summary(true).limit(0),shares',
    }, 'GET', token);
    const metricas: Record<string, number> = {
      gostos: p.reactions?.summary?.total_count ?? 0,
      comentarios: p.comments?.summary?.total_count ?? 0,
      partilhas: p.shares?.count ?? 0,
    };
    const ins = await insightsTolerante(`/${postId}/insights`, [
      'post_media_view,post_impressions_unique',
      'post_impressions,post_impressions_unique',
      'post_impressions_unique',
    ], token);
    if (ins) {
      const vistas = ins.post_media_view ?? ins.post_impressions;
      if (vistas != null) metricas.visualizacoes = vistas;
      if (ins.post_impressions_unique != null) metricas.alcance = ins.post_impressions_unique;
    }
    if (p.is_published === false) return { estado: 'a_processar', detalhe: 'Post ainda não publicado na Página.', link: p.permalink_url, metricas };
    return { estado: 'publicado', link: p.permalink_url, publicadoEm: p.created_time, metricas };
  } catch (e) {
    if (objetoNaoExiste(e)) return { estado: 'removido', detalhe: 'O Facebook já não encontra esta publicação (foi apagada?).' };
    return { estado: 'erro', detalhe: e instanceof Error ? e.message : 'Erro a ler a publicação.' };
  }
}

export interface EstadoAnuncio {
  campanhaStatus?: string;      // o que está configurado (ACTIVE/PAUSED…)
  efetivo?: string;             // o que a Meta está mesmo a fazer (ACTIVE, PAUSED, IN_PROCESS, WITH_ISSUES, DISAPPROVED…)
  anuncioEfetivo?: string;
  problemas: string[];          // revisão rejeitada, problemas de entrega, erros
  gastoCents: number;
  impressoes: number;
  alcance: number;
  cliques: number;
  erro?: string;
}

export async function estadoAnuncio(metaCampaignId: string | null, metaAdId: string | null): Promise<EstadoAnuncio> {
  const r: EstadoAnuncio = { problemas: [], gastoCents: 0, impressoes: 0, alcance: 0, cliques: 0 };
  if (!metaCampaignId) { r.erro = 'Campanha sem id da Meta.'; return r; }

  try {
    const c = await graphFetch(`/${metaCampaignId}`, { fields: 'status,effective_status' }, 'GET');
    r.campanhaStatus = c.status;
    r.efetivo = c.effective_status;
  } catch (e) {
    r.erro = objetoNaoExiste(e) ? 'A campanha já não existe na Meta (foi apagada?).' : (e instanceof Error ? e.message : 'Erro a ler a campanha.');
    return r;
  }

  if (metaAdId) {
    try {
      const a = await graphFetch(`/${metaAdId}`, { fields: 'effective_status,ad_review_feedback,issues_info' }, 'GET');
      r.anuncioEfetivo = a.effective_status;
      const global = a.ad_review_feedback?.global as Record<string, string> | undefined;
      if (global) for (const [motivo, texto] of Object.entries(global)) r.problemas.push(`Revisão: ${texto || motivo}`);
      for (const i of (a.issues_info ?? []) as { error_summary?: string; error_message?: string }[]) {
        r.problemas.push(i.error_summary ?? i.error_message ?? 'Problema de entrega.');
      }
    } catch { /* o estado da campanha já chega */ }
  }

  try {
    const ins = await graphFetch(`/${metaCampaignId}/insights`, { fields: 'spend,impressions,reach,clicks', date_preset: 'maximum' }, 'GET');
    const d = ins.data?.[0] ?? {};
    r.gastoCents = Math.round(Number(d.spend ?? 0) * 100);
    r.impressoes = Number(d.impressions ?? 0);
    r.alcance = Number(d.reach ?? 0);
    r.cliques = Number(d.clicks ?? 0);
  } catch { /* sem dados de entrega ainda */ }

  return r;
}

// ── Concorrência (Business Discovery) ───────────────────────────────────────
// Lê dados PÚBLICOS de outra conta Instagram Business/Creator através da nossa
// conta (META_IG_USER_ID). Contas pessoais não aparecem — a Meta não as expõe.

export interface PostConcorrente {
  id: string;
  caption?: string;
  like_count?: number;
  comments_count?: number;
  media_type?: string;
  media_product_type?: string;
  permalink?: string;
  timestamp?: string;
  media_url?: string;
  thumbnail_url?: string;
}

export interface PerfilConcorrente {
  username: string;
  name?: string;
  biography?: string;
  website?: string;
  followers_count?: number;
  media_count?: number;
  profile_picture_url?: string;
  media: PostConcorrente[];
}

export async function perfilConcorrente(username: string, nPosts = 30): Promise<PerfilConcorrente> {
  const igUserId = process.env.META_IG_USER_ID;
  if (!igUserId) throw new MetaApiError('META_IG_USER_ID não configurado.');
  const u = username.replace(/^@/, '').trim().toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(u)) throw new MetaApiError(`"${username}" não é um nome de utilizador do Instagram válido.`);

  const camposMedia = 'id,caption,like_count,comments_count,media_type,media_product_type,permalink,timestamp,media_url,thumbnail_url';
  try {
    const json = await graphFetch(`/${igUserId}`, {
      fields: `business_discovery.username(${u}){username,name,biography,website,followers_count,media_count,profile_picture_url,media.limit(${nPosts}){${camposMedia}}}`,
    }, 'GET');
    const bd = json.business_discovery ?? {};
    return { ...bd, media: bd.media?.data ?? [] };
  } catch (e) {
    const d = (e instanceof MetaApiError ? e.detalhe : undefined) as { code?: number; error_subcode?: number } | undefined;
    if (d?.code === 110 || d?.error_subcode === 2207013) {
      throw new MetaApiError(`@${u} não existe ou é uma conta pessoal (só contas Business/Creator são visíveis).`, d);
    }
    throw e;
  }
}
