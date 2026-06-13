-- ============================================================================
-- Módulo Loja online + /makers — Fase 1: schema, RLS e helpers
-- Correr no Supabase SQL Editor (idempotente — pode correr-se mais que uma vez).
-- Ver docs/plano-loja.md para o contexto completo.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Helper: is_admin() — usado nas policies (role='admin' em prod_perfis)
-- ----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.prod_perfis
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ----------------------------------------------------------------------------
-- 1. Alterações a prod_designs (catálogo digital / makers)
--    gratuito  -> divide os não-exclusivos em grátis vs pago
--    preco_digital_cents -> preço de compra avulsa do ficheiro pago
-- ----------------------------------------------------------------------------
alter table public.prod_designs add column if not exists gratuito boolean default false;
alter table public.prod_designs add column if not exists preco_digital_cents int;

-- ----------------------------------------------------------------------------
-- 2. Tabelas da loja física
-- ----------------------------------------------------------------------------
create table if not exists public.prod_loja_categorias (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nome text not null,
  descricao text,
  imagem_url text,
  ordem int default 0,
  ativo boolean default true,
  created_at timestamptz default now()
);

create table if not exists public.prod_loja_produtos (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nome text not null,
  descricao text,
  categoria_id uuid references public.prod_loja_categorias(id) on delete set null,
  preco_cents int not null,                 -- preço base (variantes podem fazer override)
  preco_promo_cents int,
  stock int not null default 0,             -- usado só em produtos SEM variantes
  portes_cents int,                         -- override por produto (null = usa config global)
  design_id text references public.prod_designs(id) on delete set null, -- prod_designs.id é TEXT
  permite_personalizar boolean default false,
  duas_cores boolean default false,         -- peça pode ter cor base + cor secundária
  sob_encomenda boolean default false,      -- feito por produção (sempre prazo de produção)
  estado text not null default 'rascunho',  -- rascunho | ativo | inativo
  peso_gramas int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Variantes (cor + tamanho). Produto com variantes: stock vive aqui.
create table if not exists public.prod_loja_variantes (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid references public.prod_loja_produtos(id) on delete cascade,
  cor text,                                 -- cor base
  cor_secundaria text,                      -- só se o produto for duas_cores
  tamanho text,
  sku text,
  stock int not null default 0,
  preco_cents int,                          -- override do preço base (null = herda)
  ordem int default 0,
  ativo boolean default true,
  unique (produto_id, cor, cor_secundaria, tamanho)
);

-- Migração de colunas/constraint para DBs já criadas (idempotente)
alter table public.prod_loja_produtos  add column if not exists duas_cores boolean default false;
alter table public.prod_loja_produtos  add column if not exists sob_encomenda boolean default false;
alter table public.prod_loja_variantes add column if not exists cor_secundaria text;
alter table public.prod_loja_config add column if not exists prazo_stock_min int not null default 1;
alter table public.prod_loja_config add column if not exists prazo_stock_max int not null default 3;
alter table public.prod_loja_config add column if not exists prazo_producao_min int not null default 3;
alter table public.prod_loja_config add column if not exists prazo_producao_max int not null default 5;
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'prod_loja_variantes_produto_id_cor_tamanho_key') then
    alter table public.prod_loja_variantes drop constraint prod_loja_variantes_produto_id_cor_tamanho_key;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'prod_loja_variantes_produto_id_cor_cor_secundaria_tamanho_key') then
    alter table public.prod_loja_variantes
      add constraint prod_loja_variantes_produto_id_cor_cor_secundaria_tamanho_key
      unique (produto_id, cor, cor_secundaria, tamanho);
  end if;
end $$;

create table if not exists public.prod_loja_imagens (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid references public.prod_loja_produtos(id) on delete cascade,
  variante_id uuid references public.prod_loja_variantes(id) on delete cascade,
  url text not null,
  alt text,
  ordem int default 0
);

-- Config global da loja (singleton) — portes editáveis no admin
create table if not exists public.prod_loja_config (
  id int primary key default 1,
  portes_cents int not null default 0,
  portes_gratis_acima_cents int,
  prazo_stock_min int not null default 1,       -- dias úteis quando há stock
  prazo_stock_max int not null default 3,
  prazo_producao_min int not null default 3,    -- dias úteis quando é por produção
  prazo_producao_max int not null default 5,
  check (id = 1)
);
insert into public.prod_loja_config (id, portes_cents)
values (1, 0) on conflict (id) do nothing;

create table if not exists public.prod_loja_carrinho_itens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  sessao_id text,                           -- convidados sem login (gerido via API service_role)
  produto_id uuid references public.prod_loja_produtos(id) on delete cascade,
  variante_id uuid references public.prod_loja_variantes(id) on delete cascade,
  quantidade int not null default 1,
  personalizacao jsonb,
  created_at timestamptz default now()
);

create table if not exists public.prod_loja_encomendas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  numero serial,
  estado text default 'pendente',           -- pendente|pago|enviado|entregue|cancelado
  total_cents int not null,
  portes_cents int default 0,
  metodo_pagamento text,                    -- stripe | ifthenpay
  payment_ref text,
  morada_envio jsonb,
  nif text,
  created_at timestamptz default now()
);

create table if not exists public.prod_loja_encomenda_itens (
  id uuid primary key default gen_random_uuid(),
  encomenda_id uuid references public.prod_loja_encomendas(id) on delete cascade,
  produto_id uuid references public.prod_loja_produtos(id),
  variante_id uuid references public.prod_loja_variantes(id),
  nome text,                                -- snapshot à data
  cor text,
  tamanho text,
  preco_cents int,
  quantidade int,
  personalizacao jsonb
);

-- ----------------------------------------------------------------------------
-- 3. Índices
-- ----------------------------------------------------------------------------
create index if not exists idx_loja_produtos_categoria on public.prod_loja_produtos(categoria_id);
create index if not exists idx_loja_produtos_estado    on public.prod_loja_produtos(estado);
create index if not exists idx_loja_produtos_design    on public.prod_loja_produtos(design_id);
create index if not exists idx_loja_variantes_produto  on public.prod_loja_variantes(produto_id);
create index if not exists idx_loja_imagens_produto    on public.prod_loja_imagens(produto_id);
create index if not exists idx_loja_carrinho_user      on public.prod_loja_carrinho_itens(user_id);
create index if not exists idx_loja_carrinho_sessao    on public.prod_loja_carrinho_itens(sessao_id);
create index if not exists idx_loja_encomendas_user    on public.prod_loja_encomendas(user_id);
create index if not exists idx_loja_enc_itens_enc      on public.prod_loja_encomenda_itens(encomenda_id);

-- ----------------------------------------------------------------------------
-- 4. RLS
--    Leitura pública só de conteúdo ativo (admin vê tudo via is_admin()).
--    Escrita de catálogo: nenhuma policy => só service_role (admin via API).
--    Carrinho/encomendas: utilizador gere as suas linhas.
-- ----------------------------------------------------------------------------
alter table public.prod_loja_categorias        enable row level security;
alter table public.prod_loja_produtos          enable row level security;
alter table public.prod_loja_variantes         enable row level security;
alter table public.prod_loja_imagens           enable row level security;
alter table public.prod_loja_config            enable row level security;
alter table public.prod_loja_carrinho_itens    enable row level security;
alter table public.prod_loja_encomendas        enable row level security;
alter table public.prod_loja_encomenda_itens   enable row level security;

-- Categorias: leitura pública (ativas) / admin tudo
drop policy if exists loja_categorias_select on public.prod_loja_categorias;
create policy loja_categorias_select on public.prod_loja_categorias
  for select using (ativo or public.is_admin());

-- Produtos: leitura pública (ativos) / admin tudo
drop policy if exists loja_produtos_select on public.prod_loja_produtos;
create policy loja_produtos_select on public.prod_loja_produtos
  for select using (estado = 'ativo' or public.is_admin());

-- Variantes: visíveis se ativas e o produto está ativo / admin tudo
drop policy if exists loja_variantes_select on public.prod_loja_variantes;
create policy loja_variantes_select on public.prod_loja_variantes
  for select using (
    public.is_admin() or (
      ativo and exists (
        select 1 from public.prod_loja_produtos p
        where p.id = produto_id and p.estado = 'ativo'
      )
    )
  );

-- Imagens: visíveis se o produto está ativo / admin tudo
drop policy if exists loja_imagens_select on public.prod_loja_imagens;
create policy loja_imagens_select on public.prod_loja_imagens
  for select using (
    public.is_admin() or exists (
      select 1 from public.prod_loja_produtos p
      where p.id = produto_id and p.estado = 'ativo'
    )
  );

-- Config: leitura pública (precisa dos portes), escrita só service_role
drop policy if exists loja_config_select on public.prod_loja_config;
create policy loja_config_select on public.prod_loja_config
  for select using (true);

-- Carrinho: utilizador autenticado gere as SUAS linhas.
-- (Carrinho de convidado, com sessao_id, é gerido por API com service_role.)
drop policy if exists loja_carrinho_all on public.prod_loja_carrinho_itens;
create policy loja_carrinho_all on public.prod_loja_carrinho_itens
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Encomendas: utilizador vê as suas / admin vê todas. Inserção via service_role (checkout/webhook).
drop policy if exists loja_encomendas_select on public.prod_loja_encomendas;
create policy loja_encomendas_select on public.prod_loja_encomendas
  for select using (auth.uid() = user_id or public.is_admin());

drop policy if exists loja_enc_itens_select on public.prod_loja_encomenda_itens;
create policy loja_enc_itens_select on public.prod_loja_encomenda_itens
  for select using (
    public.is_admin() or exists (
      select 1 from public.prod_loja_encomendas e
      where e.id = encomenda_id and e.user_id = auth.uid()
    )
  );

-- Escrita do catálogo: admin (role='admin') via browser client (padrão das campanhas).
-- Policies `for all` admin — somam-se (OR) às policies de select públicas acima.
drop policy if exists loja_categorias_admin on public.prod_loja_categorias;
create policy loja_categorias_admin on public.prod_loja_categorias
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists loja_produtos_admin on public.prod_loja_produtos;
create policy loja_produtos_admin on public.prod_loja_produtos
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists loja_variantes_admin on public.prod_loja_variantes;
create policy loja_variantes_admin on public.prod_loja_variantes
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists loja_imagens_admin on public.prod_loja_imagens;
create policy loja_imagens_admin on public.prod_loja_imagens
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists loja_config_admin on public.prod_loja_config;
create policy loja_config_admin on public.prod_loja_config
  for all using (public.is_admin()) with check (public.is_admin());

-- ----------------------------------------------------------------------------
-- 5. Storage bucket para fotos de produtos
--    Criar bucket público 'loja_produtos' (uma vez). Upload via API service_role.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('loja_produtos', 'loja_produtos', true)
on conflict (id) do nothing;

-- Leitura pública dos ficheiros do bucket
drop policy if exists loja_produtos_storage_read on storage.objects;
create policy loja_produtos_storage_read on storage.objects
  for select using (bucket_id = 'loja_produtos');
-- (Escrita/upload faz-se via service_role na API, que ignora RLS.)
