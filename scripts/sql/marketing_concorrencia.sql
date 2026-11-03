-- Aba "Concorrência" do /admin/marketing.
-- Concorrentes (contas de Instagram Business/Creator), as publicações públicas
-- deles recolhidas pela Graph API (Business Discovery) e as análises feitas pela IA.

create table if not exists public.prod_marketing_concorrentes (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,              -- @ do Instagram, sem o @, em minúsculas
  nome text,
  ramo text,                                  -- ex.: "porta-chaves personalizados", "pet tags"
  biografia text,
  site text,
  foto_url text,
  seguidores int,
  n_publicacoes int,
  origem text not null default 'manual',      -- manual | ia
  motivo text,                                -- porque a IA o sugeriu
  ativo boolean not null default true,
  ultima_recolha timestamptz,
  erro text,
  created_at timestamptz default now()
);

create table if not exists public.prod_marketing_concorrencia_posts (
  id uuid primary key default gen_random_uuid(),
  concorrente_id uuid not null references public.prod_marketing_concorrentes(id) on delete cascade,
  media_id text not null unique,
  legenda text,
  tipo text,                                  -- IMAGE | VIDEO | CAROUSEL_ALBUM | REELS
  link text,
  media_url text,                             -- URL do CDN do Instagram (expira; serve só de pré-visualização)
  gostos int not null default 0,
  comentarios int not null default 0,
  envolvimento numeric,                       -- (gostos + comentários) / seguidores no momento da recolha
  publicado_em timestamptz,
  recolhido_em timestamptz not null default now()
);

create index if not exists idx_conc_posts_concorrente on public.prod_marketing_concorrencia_posts(concorrente_id);
create index if not exists idx_conc_posts_publicado on public.prod_marketing_concorrencia_posts(publicado_em desc);

create table if not exists public.prod_marketing_concorrencia_analises (
  id uuid primary key default gen_random_uuid(),
  resumo text,
  categorias jsonb not null default '[]',     -- [{nome, posts, interacao_media, exemplos}]
  tendencias jsonb not null default '[]',     -- [{tema, evidencia}]
  sugestoes jsonb not null default '[]',      -- [{titulo, tipo, descricao, porque, publico, prioridade, ja_temos}]
  fontes jsonb not null default '[]',         -- [{titulo, url}] da pesquisa Google
  n_posts_analisados int,
  criado_por uuid references auth.users(id),
  created_at timestamptz default now()
);

alter table public.prod_marketing_concorrentes enable row level security;
alter table public.prod_marketing_concorrencia_posts enable row level security;
alter table public.prod_marketing_concorrencia_analises enable row level security;

drop policy if exists conc_admin on public.prod_marketing_concorrentes;
create policy conc_admin on public.prod_marketing_concorrentes
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists conc_posts_admin on public.prod_marketing_concorrencia_posts;
create policy conc_posts_admin on public.prod_marketing_concorrencia_posts
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists conc_analises_admin on public.prod_marketing_concorrencia_analises;
create policy conc_analises_admin on public.prod_marketing_concorrencia_analises
  for all using (public.is_admin()) with check (public.is_admin());
