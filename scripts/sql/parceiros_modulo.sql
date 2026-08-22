-- ============================================================================
-- Módulo Parceiros — locais físicos onde ver/personalizar/levantar produtos
-- Correr no Supabase SQL Editor (idempotente — pode correr-se mais que uma vez).
-- Reutiliza public.is_admin() já criada em scripts/sql/loja_modulo.sql.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Tabelas
-- ----------------------------------------------------------------------------
create table if not exists public.prod_parceiros (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  morada text,
  codigo_postal text,
  cidade text,
  telefone text,
  email text,
  website_url text,
  facebook_url text,
  instagram_url text,
  horario_texto text,
  servicos text[] default '{}',
  ordem int default 0,
  ativo boolean default true,
  created_at timestamptz default now()
);

-- Associação parceiro <-> categorias da loja (um parceiro pode servir várias categorias)
create table if not exists public.prod_parceiros_categorias (
  parceiro_id uuid references public.prod_parceiros(id) on delete cascade,
  categoria_id uuid references public.prod_loja_categorias(id) on delete cascade,
  primary key (parceiro_id, categoria_id)
);

-- ----------------------------------------------------------------------------
-- 2. Índices
-- ----------------------------------------------------------------------------
create index if not exists idx_parceiros_categorias_cat on public.prod_parceiros_categorias(categoria_id);
create index if not exists idx_parceiros_categorias_parceiro on public.prod_parceiros_categorias(parceiro_id);

-- ----------------------------------------------------------------------------
-- 3. RLS
--    Leitura pública só de parceiros ativos (admin vê tudo via is_admin()).
--    Escrita: só admin (padrão igual ao módulo loja).
-- ----------------------------------------------------------------------------
alter table public.prod_parceiros            enable row level security;
alter table public.prod_parceiros_categorias enable row level security;

drop policy if exists parceiros_select on public.prod_parceiros;
create policy parceiros_select on public.prod_parceiros
  for select using (ativo or public.is_admin());

drop policy if exists parceiros_categorias_select on public.prod_parceiros_categorias;
create policy parceiros_categorias_select on public.prod_parceiros_categorias
  for select using (true);

drop policy if exists parceiros_admin on public.prod_parceiros;
create policy parceiros_admin on public.prod_parceiros
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists parceiros_categorias_admin on public.prod_parceiros_categorias;
create policy parceiros_categorias_admin on public.prod_parceiros_categorias
  for all using (public.is_admin()) with check (public.is_admin());
