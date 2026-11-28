// Helpers de servidor da Loja (lê sessão + persona). Só para Server Components / route handlers.
import { createClient } from '@/lib/supabase/server';
import { isMakerTipo, PRAZO_DEFAULT, type PrazoConfig } from '@/lib/loja';

export interface Viewer {
  userId: string | null;
  tipo: string | null;       // tipo_utilizador
  role: string | null;
  isMaker: boolean;          // maker | ambos
  ocultarPrecos: boolean;    // = isMaker
  isAdmin: boolean;
}

export async function getViewer(): Promise<Viewer> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { userId: null, tipo: null, role: null, isMaker: false, ocultarPrecos: false, isAdmin: false };
  }
  const { data } = await supabase
    .from('prod_perfis')
    .select('tipo_utilizador, role')
    .eq('id', user.id)
    .maybeSingle();
  const tipo = data?.tipo_utilizador ?? null;
  const role = data?.role ?? null;
  const maker = isMakerTipo(tipo);
  return { userId: user.id, tipo, role, isMaker: maker, ocultarPrecos: maker, isAdmin: role === 'admin' };
}

export interface CatalogoProduto {
  id: string;
  slug: string;
  nome: string;
  estado: string;
  preco_cents: number;
  preco_promo_cents: number | null;
  stock: number;
  sob_encomenda: boolean;
  requer_orcamento: boolean;
  categoria_id: string | null;
  prod_loja_imagens: { url: string; ordem: number }[];
  prod_loja_variantes: { stock: number; ativo: boolean }[];
}
export interface CatalogoCategoria { id: string; slug: string; nome: string; descricao: string | null; }

// Catálogo público: categorias ativas + produtos ativos (opcionalmente filtrados por categoria).
// isAdmin=true inclui produtos em rascunho/inativos, para pré-visualização no admin.
export async function fetchCatalogo(categoriaSlug?: string, isAdmin = false): Promise<{
  categorias: CatalogoCategoria[];
  produtos: CatalogoProduto[];
  categoriaAtual: CatalogoCategoria | null;
}> {
  const supabase = await createClient();
  const { data: cats } = await supabase
    .from('prod_loja_categorias')
    .select('id, slug, nome, descricao')
    .eq('ativo', true)
    .eq('tipo', 'peca') // filamentos vivem só na Área Maker (/makers/filamentos)
    .order('ordem', { ascending: true });
  const categorias = (cats ?? []) as CatalogoCategoria[];

  let q = supabase
    .from('prod_loja_produtos')
    .select('id, slug, nome, estado, preco_cents, preco_promo_cents, stock, sob_encomenda, requer_orcamento, categoria_id, prod_loja_imagens(url, ordem), prod_loja_variantes(stock, ativo)')
    .eq('tipo', 'peca')
    .order('updated_at', { ascending: false });
  if (!isAdmin) q = q.eq('estado', 'ativo');

  let categoriaAtual: CatalogoCategoria | null = null;
  if (categoriaSlug) {
    categoriaAtual = categorias.find(c => c.slug === categoriaSlug) ?? null;
    // Se a categoria não existir, devolve lista vazia (id impossível).
    q = q.eq('categoria_id', categoriaAtual?.id ?? '00000000-0000-0000-0000-000000000000');
  }

  const { data: prods } = await q;
  return { categorias, produtos: (prods ?? []) as unknown as CatalogoProduto[], categoriaAtual };
}

export interface ProdutoImagem { id: string; url: string; alt: string | null; ordem: number; }
export interface ProdutoVariante {
  id: string; cor: string | null; cor_secundaria: string | null; cor_terciaria: string | null; tamanho: string | null;
  sku: string | null; stock: number; preco_cents: number | null; ordem: number; ativo: boolean;
  cor_hex: string | null;
}

export interface FilamentoDetalhes {
  material: string;
  diametro_mm: number;
  peso_liquido_g: number;
  temp_bico_min: number | null; temp_bico_max: number | null;
  temp_mesa_min: number | null; temp_mesa_max: number | null;
  ficha_tecnica_url: string | null;
  notas: string | null;
  prod_loja_marcas: { nome: string; slug: string; logo_url: string | null } | null;
}
export interface ProdutoDetalhe {
  id: string; slug: string; nome: string; descricao: string | null; estado: string;
  preco_cents: number; preco_promo_cents: number | null; stock: number;
  sob_encomenda: boolean; duas_cores: boolean; tres_cores: boolean; requer_orcamento: boolean;
  permite_personalizar: boolean; design_id: string | null; categoria_id: string | null;
  tipo: 'peca' | 'filamento';
  prod_loja_filamento_detalhes: FilamentoDetalhes | null;
  prod_loja_categorias: { slug: string; nome: string } | null;
  prod_loja_imagens: ProdutoImagem[];
  prod_loja_variantes: ProdutoVariante[];
}

const FILAMENTO_SELECT = 'prod_loja_filamento_detalhes(material, diametro_mm, peso_liquido_g, temp_bico_min, temp_bico_max, temp_mesa_min, temp_mesa_max, ficha_tecnica_url, notas, prod_loja_marcas(nome, slug, logo_url))';

// Produto por slug. Por omissão só ativo; isAdmin=true permite pré-visualizar rascunhos/inativos.
export async function fetchProduto(slug: string, isAdmin = false): Promise<ProdutoDetalhe | null> {
  const supabase = await createClient();
  let q = supabase
    .from('prod_loja_produtos')
    .select(`id, slug, nome, descricao, estado, preco_cents, preco_promo_cents, stock, sob_encomenda, duas_cores, tres_cores, requer_orcamento, permite_personalizar, design_id, categoria_id, tipo, prod_loja_categorias(slug, nome), prod_loja_imagens(id, url, alt, ordem), prod_loja_variantes(id, cor, cor_secundaria, cor_terciaria, tamanho, sku, stock, preco_cents, ordem, ativo, cor_hex), ${FILAMENTO_SELECT}`)
    .eq('slug', slug);
  if (!isAdmin) q = q.eq('estado', 'ativo');
  const { data } = await q.maybeSingle();
  return (data as unknown as ProdutoDetalhe) ?? null;
}

// ── Parceiros (locais físicos associados a categorias da loja) ──────────────
export interface Parceiro {
  id: string;
  nome: string;
  descricao: string | null;
  morada: string | null;
  codigo_postal: string | null;
  cidade: string | null;
  telefone: string | null;
  email: string | null;
  website_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  horario_texto: string | null;
  servicos: string[];
}

// Parceiros ativos associados a uma categoria (via prod_parceiros_categorias), ordenados.
// Devolve [] se a categoria for null ou se as tabelas ainda não existirem (pré-migração).
export async function fetchParceirosPorCategoria(categoriaId: string | null): Promise<Parceiro[]> {
  if (!categoriaId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('prod_parceiros_categorias')
    .select('prod_parceiros(id, nome, descricao, morada, codigo_postal, cidade, telefone, email, website_url, facebook_url, instagram_url, horario_texto, servicos, ordem, ativo)')
    .eq('categoria_id', categoriaId);

  const parceiros = ((data ?? []) as unknown as { prod_parceiros: (Parceiro & { ordem: number; ativo: boolean }) | null }[])
    .map(row => row.prod_parceiros)
    .filter((p): p is Parceiro & { ordem: number; ativo: boolean } => !!p && p.ativo)
    .sort((a, b) => a.ordem - b.ordem);

  return parceiros;
}

// ── Prémio da campanha "bug corrigido" (ver resgatar_premio_loja no Supabase) ──
// Revela o código do prémio a quem ainda não o viu, na primeira visita à loja
// depois da campanha (idempotente). O código em si resgata-se em "Tens um
// código?" no dashboard, tal como qualquer outro cupão de prod_cupons.
export type PremioLoja =
  | { tipo: 'maker_bonus'; codigo: string; quantidade: number }
  | { tipo: 'desconto_loja'; codigo: string }
  | null;

export async function resgatarPremioLoja(): Promise<PremioLoja> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('resgatar_premio_loja');
  if (error || !data || data.tipo === 'ja_resgatado' || data.tipo === null) return null;
  return data as PremioLoja;
}

// Config de prazos (singleton). Devolve defaults se não existir.
export async function getPrazoConfig(): Promise<PrazoConfig> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('prod_loja_config')
    .select('prazo_stock_min, prazo_stock_max, prazo_producao_min, prazo_producao_max')
    .eq('id', 1)
    .maybeSingle();
  return (data as PrazoConfig) ?? PRAZO_DEFAULT;
}

// ── Filamentos (só makers; a RLS do Supabase devolve vazio a quem não é maker) ──
export interface FilamentoCard {
  id: string; slug: string; nome: string;
  preco_cents: number; preco_promo_cents: number | null; stock: number; sob_encomenda: boolean;
  prod_loja_imagens: { url: string; ordem: number }[];
  prod_loja_variantes: { cor: string | null; cor_hex: string | null; stock: number; ativo: boolean; preco_cents: number | null; ordem: number }[];
  prod_loja_filamento_detalhes: FilamentoDetalhes | null;
}
export interface Marca { id: string; nome: string; slug: string; logo_url: string | null; }

export async function fetchFilamentos(): Promise<{ filamentos: FilamentoCard[]; marcas: Marca[] }> {
  const supabase = await createClient();
  const [{ data: prods }, { data: marcas }] = await Promise.all([
    supabase
      .from('prod_loja_produtos')
      .select(`id, slug, nome, preco_cents, preco_promo_cents, stock, sob_encomenda, prod_loja_imagens(url, ordem), prod_loja_variantes(cor, cor_hex, stock, ativo, preco_cents, ordem), ${FILAMENTO_SELECT}`)
      .eq('tipo', 'filamento')
      .eq('estado', 'ativo')
      .order('nome', { ascending: true }),
    supabase.from('prod_loja_marcas').select('id, nome, slug, logo_url').eq('ativo', true).order('ordem'),
  ]);
  return { filamentos: (prods ?? []) as unknown as FilamentoCard[], marcas: (marcas ?? []) as Marca[] };
}

// ── Banners (a RLS filtra por público, datas e ativo) ──
export type BannerPosicao = 'topo_loja' | 'topo_pecas' | 'topo_filamentos' | 'area_maker' | 'entre_produtos' | 'pagina_produto';
export interface Banner {
  id: string; titulo: string; subtitulo: string | null;
  imagem_url: string; imagem_mobile_url: string | null;
  link: string | null; texto_botao: string | null; posicao: BannerPosicao;
}

export async function fetchBanners(posicao: BannerPosicao, limite = 1): Promise<Banner[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('prod_loja_banners')
    .select('id, titulo, subtitulo, imagem_url, imagem_mobile_url, link, texto_botao, posicao')
    .eq('posicao', posicao)
    .order('prioridade', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limite);
  if (error) return [];
  return (data ?? []) as Banner[];
}
