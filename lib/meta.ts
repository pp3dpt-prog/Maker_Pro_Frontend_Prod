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

function pageToken(): string {
  const token = process.env.META_PAGE_ACCESS_TOKEN;
  if (!token) throw new MetaApiError('META_PAGE_ACCESS_TOKEN não configurado.');
  return token;
}

async function graphFetch(path: string, params: Record<string, string>, method: 'GET' | 'POST' = 'GET') {
  const url = new URL(`${GRAPH_BASE}${path}`);
  const body = new URLSearchParams({ ...params, access_token: pageToken() });

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
  }, 'POST');

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

  // Passo 2: publicar o container
  const publicado = await graphFetch(`/${igUserId}/media_publish`, {
    creation_id: container.id,
  }, 'POST');

  return { mediaId: publicado.id };
}

export async function obterInsightsPost(mediaId: string, canal: 'instagram' | 'facebook') {
  const metricas = canal === 'instagram'
    ? 'impressions,reach,likes,comments,saved'
    : 'post_impressions,post_engaged_users';

  const json = await graphFetch(`/${mediaId}/insights`, { metric: metricas }, 'GET');
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
