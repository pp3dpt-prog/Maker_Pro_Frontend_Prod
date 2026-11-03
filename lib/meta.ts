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
