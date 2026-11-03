// Lógica da aba Concorrência: descobrir concorrentes (Gemini + pesquisa Google),
// recolher as publicações públicas deles (Meta Business Discovery) e pedir à IA uma
// análise do que tem mais interação + sugestões de próximos produtos.
import type { SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import { perfilConcorrente, MetaApiError } from '@/lib/meta';

const MODELO = 'gemini-3.6-flash';

export const RAMOS_PADRAO = [
  'impressão 3D personalizada (Portugal)',
  'porta-chaves e etiquetas personalizadas',
  'chapas de identificação para animais (pet tags)',
  'decoração impressa em 3D (vasos, candeeiros, suportes)',
  'ficheiros STL / modelos 3D paramétricos para makers',
];

function gemini() {
  if (!process.env.GEMINI_API_KEY) throw new Error('GEMINI_API_KEY não configurada.');
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

// Com a pesquisa Google ativa o Gemini não aceita responseMimeType JSON, por isso
// pedimos JSON no texto e extraímos o primeiro objeto { … }.
function extrairJson<T>(texto: string): T {
  const limpo = texto.replace(/```(?:json)?/gi, '');
  const ini = limpo.indexOf('{');
  const fim = limpo.lastIndexOf('}');
  if (ini < 0 || fim <= ini) throw new Error('A IA não devolveu JSON.');
  return JSON.parse(limpo.slice(ini, fim + 1)) as T;
}

function fontesDaPesquisa(r: any): { titulo: string; url: string }[] {
  const chunks = r?.candidates?.[0]?.groundingMetadata?.groundingChunks ?? [];
  const vistos = new Set<string>();
  const out: { titulo: string; url: string }[] = [];
  for (const c of chunks) {
    const url = c?.web?.uri;
    if (!url || vistos.has(url)) continue;
    vistos.add(url);
    out.push({ titulo: c.web.title ?? url, url });
  }
  return out.slice(0, 15);
}

/** Resumo do nosso catálogo (loja + gerador), para a IA saber o que já temos. */
export async function contextoCatalogo(admin: SupabaseClient) {
  const [{ data: produtos }, { data: designs }] = await Promise.all([
    admin.from('prod_loja_produtos').select('nome').in('estado', ['ativo', 'rascunho']).limit(80),
    admin.from('prod_designs').select('nome, familia').limit(120),
  ]);
  const loja = (produtos ?? []).map(p => p.nome).filter(Boolean);
  const gerador = (designs ?? []).map(d => (d.familia ? `${d.nome} (${d.familia})` : d.nome)).filter(Boolean);
  return `Loja pp3d.pt (produtos já impressos): ${loja.join('; ') || '(vazio)'}\nGerador de modelos paramétricos pp3d.pt (STL à medida): ${gerador.join('; ') || '(vazio)'}`;
}

// ── 1. Descobrir concorrentes ───────────────────────────────────────────────

export interface SugestaoConcorrente {
  username: string; nome?: string; ramo?: string; motivo?: string;
  // preenchido depois de confirmar na Meta
  valido?: boolean; seguidores?: number; n_publicacoes?: number; foto_url?: string; erro?: string;
}

export async function descobrirConcorrentes(admin: SupabaseClient, ramos: string[], jaTemos: string[]): Promise<SugestaoConcorrente[]> {
  const catalogo = await contextoCatalogo(admin);
  const r = await gemini().models.generateContent({
    model: MODELO,
    contents: [{ role: 'user', parts: [{ text:
`A pp3d.pt é uma loja portuguesa (Lisboa) de produtos impressos em 3D personalizáveis e de modelos 3D paramétricos para makers.
${catalogo}

Ramos a pesquisar:
${ramos.map(r => `- ${r}`).join('\n')}

Pesquisa na web e encontra contas de INSTAGRAM de concorrentes reais nestes ramos: primeiro em Portugal, depois Espanha/Brasil e algumas referências internacionais grandes que sirvam de benchmark.
Só contas que tenham a certeza de existir (vistas em resultados de pesquisa, sites ou lojas Etsy com link para o Instagram). Não inventes nomes de utilizador.
Não incluas estas, que já seguimos: ${jaTemos.join(', ') || '(nenhuma)'}.

Responde APENAS com JSON: {"concorrentes":[{"username":"sem @","nome":"...","ramo":"um dos ramos acima","motivo":"1 frase: o que vendem e porque é concorrente"}]} com 10 a 20 contas.` }] }],
    config: { tools: [{ googleSearch: {} }] },
  });

  const { concorrentes } = extrairJson<{ concorrentes: SugestaoConcorrente[] }>(r.text ?? '');
  const ja = new Set(jaTemos.map(u => u.toLowerCase()));
  const unicos = new Map<string, SugestaoConcorrente>();
  for (const c of concorrentes ?? []) {
    const u = String(c.username ?? '').replace(/^@/, '').trim().toLowerCase();
    if (u && !ja.has(u) && !unicos.has(u)) unicos.set(u, { ...c, username: u });
  }

  // Confirma cada um na Meta: só contas Business/Creator dão para analisar.
  const lista = [...unicos.values()];
  await Promise.all(lista.map(async c => {
    try {
      const p = await perfilConcorrente(c.username, 1);
      Object.assign(c, { valido: true, nome: p.name ?? c.nome, seguidores: p.followers_count, n_publicacoes: p.media_count, foto_url: p.profile_picture_url });
    } catch (e) {
      Object.assign(c, { valido: false, erro: e instanceof Error ? e.message : 'Não encontrado.' });
    }
  }));
  return lista.sort((a, b) => Number(b.valido) - Number(a.valido) || (b.seguidores ?? 0) - (a.seguidores ?? 0));
}

// ── 2. Recolher publicações dos concorrentes ────────────────────────────────

export async function recolherConcorrente(admin: SupabaseClient, c: { id: string; username: string }) {
  try {
    const p = await perfilConcorrente(c.username, 30);
    const seguidores = p.followers_count ?? 0;
    await admin.from('prod_marketing_concorrentes').update({
      nome: p.name ?? null, biografia: p.biography ?? null, site: p.website ?? null, foto_url: p.profile_picture_url ?? null,
      seguidores, n_publicacoes: p.media_count ?? null, ultima_recolha: new Date().toISOString(), erro: null,
    }).eq('id', c.id);

    const linhas = p.media.map(m => ({
      concorrente_id: c.id,
      media_id: m.id,
      legenda: m.caption ?? null,
      tipo: m.media_product_type === 'REELS' ? 'REELS' : (m.media_type ?? null),
      link: m.permalink ?? null,
      media_url: m.thumbnail_url ?? m.media_url ?? null,
      gostos: m.like_count ?? 0, // a conta pode esconder os gostos → 0
      comentarios: m.comments_count ?? 0,
      envolvimento: seguidores > 0 ? ((m.like_count ?? 0) + (m.comments_count ?? 0)) / seguidores : null,
      publicado_em: m.timestamp ?? null,
      recolhido_em: new Date().toISOString(),
    }));
    if (linhas.length) await admin.from('prod_marketing_concorrencia_posts').upsert(linhas, { onConflict: 'media_id' });
    return { ok: true as const, posts: linhas.length };
  } catch (e) {
    const msg = e instanceof MetaApiError || e instanceof Error ? e.message : 'Erro a ler a conta.';
    await admin.from('prod_marketing_concorrentes').update({ erro: msg, ultima_recolha: new Date().toISOString() }).eq('id', c.id);
    return { ok: false as const, erro: msg };
  }
}

// ── 3. Análise com IA ───────────────────────────────────────────────────────

export interface AnaliseIA {
  resumo: string;
  categorias: { nome: string; posts: number; interacao_media: number; exemplos?: string[] }[];
  tendencias: { tema: string; evidencia: string }[];
  sugestoes: { titulo: string; tipo: string; descricao: string; porque: string; publico?: string; prioridade?: number; ja_temos?: string }[];
}

export async function analisarConcorrencia(admin: SupabaseClient, criadoPor: string | null) {
  const desde = new Date(Date.now() - 120 * 86_400_000).toISOString();
  const { data: posts } = await admin
    .from('prod_marketing_concorrencia_posts')
    .select('media_id, legenda, tipo, gostos, comentarios, envolvimento, publicado_em, prod_marketing_concorrentes!inner(username, ramo, seguidores, ativo)')
    .eq('prod_marketing_concorrentes.ativo', true)
    .gte('publicado_em', desde)
    .order('envolvimento', { ascending: false, nullsFirst: false })
    .limit(400);

  if (!posts?.length) throw new Error('Ainda não há publicações de concorrentes recolhidas. Adiciona concorrentes e recolhe os dados primeiro.');

  // Enviamos à IA os 80 posts com mais envolvimento + 20 dos com menos (para contraste).
  const ordenados = posts as any[];
  const amostra = [...ordenados.slice(0, 80), ...ordenados.slice(-20)];
  const linhas = amostra.map(p => {
    const c = p.prod_marketing_concorrentes;
    const leg = String(p.legenda ?? '').replace(/\s+/g, ' ').slice(0, 220);
    return `[${p.media_id}] @${c.username} (${c.ramo ?? '?'}, ${c.seguidores ?? '?'} seg.) ${p.tipo ?? ''} | ${p.gostos} gostos, ${p.comentarios} coment., envolv. ${p.envolvimento != null ? (Number(p.envolvimento) * 100).toFixed(2) + '%' : '?'} | ${leg}`;
  }).join('\n');

  const catalogo = await contextoCatalogo(admin);
  const r = await gemini().models.generateContent({
    model: MODELO,
    contents: [{ role: 'user', parts: [{ text:
`És analista de marketing da pp3d.pt (Lisboa): loja de produtos impressos em 3D personalizáveis + gerador de modelos STL paramétricos para makers.
${catalogo}

Abaixo estão publicações recentes de concorrentes no Instagram, ordenadas por envolvimento ((gostos+comentários)/seguidores). Não sabemos as vendas deles: usa a interação como sinal de procura.
${linhas}

Usa também a pesquisa Google para confirmar o que está em alta agora em impressão 3D e produtos personalizados (Etsy, MakerWorld, Printables, Thingiverse, TikTok), sobretudo em Portugal e Europa, nesta altura do ano (${new Date().toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })}).

Responde APENAS com JSON, em português de Portugal:
{
 "resumo": "3-5 frases: o que está a resultar nos concorrentes",
 "categorias": [{"nome":"tipo de produto","posts":nº de posts da lista nesta categoria,"interacao_media":envolvimento médio em fração (ex. 0.034),"exemplos":["media_id", "..."]}],
 "tendencias": [{"tema":"...","evidencia":"o que viste nos posts ou na pesquisa"}],
 "sugestoes": [{"titulo":"produto ou trabalho concreto","tipo":"produto loja | modelo paramétrico | conteúdo/campanha","descricao":"o que é","porque":"ligação aos dados acima","publico":"clientes | makers","prioridade":1,"ja_temos":"nome do nosso produto parecido, ou vazio"}]
}
6 a 12 categorias ordenadas por interação média; 4 a 8 tendências; 8 a 12 sugestões (prioridade 1 = fazer já, 3 = mais tarde), realistas para impressão 3D FDM e que aproveitem o gerador paramétrico quando fizer sentido. Não inventes números.` }] }],
    config: { tools: [{ googleSearch: {} }] },
  });

  const analise = extrairJson<AnaliseIA>(r.text ?? '');
  const fontes = fontesDaPesquisa(r);

  const { data, error } = await admin.from('prod_marketing_concorrencia_analises').insert({
    resumo: analise.resumo ?? '',
    categorias: analise.categorias ?? [],
    tendencias: analise.tendencias ?? [],
    sugestoes: (analise.sugestoes ?? []).sort((a, b) => (a.prioridade ?? 9) - (b.prioridade ?? 9)),
    fontes,
    n_posts_analisados: amostra.length,
    criado_por: criadoPor,
  }).select().single();
  if (error) throw new Error(error.message);
  return data;
}
