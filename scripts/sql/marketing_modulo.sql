-- ============================================================================
-- Módulo Marketing — publicação IG/Facebook + campanhas pagas + analytics
-- Correr no Supabase SQL Editor (idempotente — pode correr-se mais que uma vez).
-- Ver docs/plano-marketing.md para o contexto completo.
-- ============================================================================

-- Depende de public.is_admin(), já criado em loja_modulo.sql.

-- ----------------------------------------------------------------------------
-- 1. Publicações (orgânicas e a base de campanhas pagas)
-- ----------------------------------------------------------------------------
create table if not exists public.prod_marketing_posts (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid references public.prod_loja_produtos(id) on delete set null,
  legenda text not null,
  imagens jsonb not null default '[]',        -- array de URLs (reaproveita prod_loja_imagens)
  canal text not null,                        -- 'instagram' | 'facebook' | 'ambos'
  tipo text not null default 'organico',      -- 'organico' | 'pago'
  estado text not null default 'rascunho',    -- rascunho | agendado | publicado | falhou
  agendado_para timestamptz,
  publicado_em timestamptz,
  meta_post_id text,                          -- id devolvido pela Graph API (post FB e/ou media IG)
  meta_post_id_ig text,                       -- quando canal='ambos', FB e IG têm ids distintos
  insights jsonb,                             -- cache: impressions/reach/likes/comments/saves
  erro text,
  criado_por uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ----------------------------------------------------------------------------
-- 2. Campanhas pagas (Meta Ads) — sempre nascem 'rascunho'/'pausada', nunca 'ativa'
-- ----------------------------------------------------------------------------
create table if not exists public.prod_marketing_ads (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references public.prod_marketing_posts(id) on delete cascade,
  nome text not null,
  orcamento_diario_cents int not null,
  publico jsonb not null default '{}',        -- {idade_min, idade_max, generos, localizacoes, interesses}
  estado text not null default 'rascunho',    -- rascunho | pausada | ativa | terminada
  meta_campaign_id text,
  meta_adset_id text,
  meta_ad_id text,
  previsao_alcance_min int,
  previsao_alcance_max int,
  previsao_custo_estimado_cents int,
  gasto_real_cents int not null default 0,
  ativada_em timestamptz,                     -- só preenchido quando o utilizador confirma o gasto
  ativada_por uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint marketing_ads_estado_nunca_direto_ativa check (
    estado in ('rascunho', 'pausada', 'ativa', 'terminada')
  )
);

-- ----------------------------------------------------------------------------
-- 3. Índices
-- ----------------------------------------------------------------------------
create index if not exists idx_marketing_posts_produto  on public.prod_marketing_posts(produto_id);
create index if not exists idx_marketing_posts_estado    on public.prod_marketing_posts(estado);
create index if not exists idx_marketing_posts_agendado  on public.prod_marketing_posts(agendado_para) where estado = 'agendado';
create index if not exists idx_marketing_ads_post        on public.prod_marketing_ads(post_id);
create index if not exists idx_marketing_ads_estado      on public.prod_marketing_ads(estado);

-- ----------------------------------------------------------------------------
-- 4. RLS — dados internos de negócio, sem leitura pública. Só admin (via API
--    service_role para as rotas de publicação/cron, e via browser client
--    para o painel, igual ao padrão de prod_campanhas / prod_loja_*).
-- ----------------------------------------------------------------------------
alter table public.prod_marketing_posts enable row level security;
alter table public.prod_marketing_ads   enable row level security;

drop policy if exists marketing_posts_admin on public.prod_marketing_posts;
create policy marketing_posts_admin on public.prod_marketing_posts
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists marketing_ads_admin on public.prod_marketing_ads;
create policy marketing_ads_admin on public.prod_marketing_ads
  for all using (public.is_admin()) with check (public.is_admin());
