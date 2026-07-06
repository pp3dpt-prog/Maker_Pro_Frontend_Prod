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
  preco_cents: number;
  preco_promo_cents: number | null;
  stock: number;
  sob_encomenda: boolean;
  requer_orcamento: boolean;
  categoria_id: string | null;
  prod_loja_imagens: { url: string; ordem: number }[];
  prod_loja_variantes: { stock: number; ativo: boolean }[];
}
export interface CatalogoCategoria { id: string; slug: string; nome: string; }

// Catálogo público: categorias ativas + produtos ativos (opcionalmente filtrados por categoria).
export async function fetchCatalogo(categoriaSlug?: string): Promise<{
  categorias: CatalogoCategoria[];
  produtos: CatalogoProduto[];
  categoriaAtual: CatalogoCategoria | null;
}> {
  const supabase = await createClient();
  const { data: cats } = await supabase
    .from('prod_loja_categorias')
    .select('id, slug, nome')
    .eq('ativo', true)
    .order('ordem', { ascending: true });
  const categorias = (cats ?? []) as CatalogoCategoria[];

  let q = supabase
    .from('prod_loja_produtos')
    .select('id, slug, nome, preco_cents, preco_promo_cents, stock, sob_encomenda, requer_orcamento, categoria_id, prod_loja_imagens(url, ordem), prod_loja_variantes(stock, ativo)')
    .eq('estado', 'ativo')
    .order('updated_at', { ascending: false });

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
  id: string; cor: string | null; cor_secundaria: string | null; tamanho: string | null;
  sku: string | null; stock: number; preco_cents: number | null; ordem: number; ativo: boolean;
}
export interface ProdutoDetalhe {
  id: string; slug: string; nome: string; descricao: string | null;
  preco_cents: number; preco_promo_cents: number | null; stock: number;
  sob_encomenda: boolean; duas_cores: boolean; requer_orcamento: boolean;
  permite_personalizar: boolean; design_id: string | null; categoria_id: string | null;
  prod_loja_categorias: { slug: string; nome: string } | null;
  prod_loja_imagens: ProdutoImagem[];
  prod_loja_variantes: ProdutoVariante[];
}

// Produto público por slug (só ativo). Devolve null se não existir.
export async function fetchProduto(slug: string): Promise<ProdutoDetalhe | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('prod_loja_produtos')
    .select('id, slug, nome, descricao, preco_cents, preco_promo_cents, stock, sob_encomenda, duas_cores, requer_orcamento, permite_personalizar, design_id, categoria_id, prod_loja_categorias(slug, nome), prod_loja_imagens(id, url, alt, ordem), prod_loja_variantes(id, cor, cor_secundaria, tamanho, sku, stock, preco_cents, ordem, ativo)')
    .eq('slug', slug)
    .eq('estado', 'ativo')
    .maybeSingle();
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
