-- Histórico permanente de métricas do marketing.
-- O Analytics só consulta a Meta para os últimos 30 dias; antes de um post sair
-- dessa janela, o cron sync-insights tira um "retrato final" e guarda-o aqui,
-- para a tabela de todos os tempos nunca perder dados.

create table if not exists public.prod_marketing_metricas (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.prod_marketing_posts(id) on delete cascade,
  plataforma text not null check (plataforma in ('instagram', 'facebook')),
  estado text,                                -- publicado | removido | erro | a_processar
  link text,
  visualizacoes int not null default 0,
  alcance int not null default 0,
  gostos int not null default 0,
  comentarios int not null default 0,
  guardados int not null default 0,
  partilhas int not null default 0,
  metricas jsonb not null default '{}',       -- resposta completa (para métricas futuras)
  atualizado_em timestamptz not null default now(),
  arquivado_em timestamptz,                   -- preenchido no retrato final (≥ 28 dias)
  unique (post_id, plataforma)
);

create index if not exists idx_marketing_metricas_post on public.prod_marketing_metricas(post_id);

alter table public.prod_marketing_metricas enable row level security;
drop policy if exists marketing_metricas_admin on public.prod_marketing_metricas;
create policy marketing_metricas_admin on public.prod_marketing_metricas
  for all using (public.is_admin()) with check (public.is_admin());

-- Anúncios: guardar também impressões/alcance/cliques (o gasto já existia).
alter table public.prod_marketing_ads add column if not exists impressoes int not null default 0;
alter table public.prod_marketing_ads add column if not exists alcance int not null default 0;
alter table public.prod_marketing_ads add column if not exists cliques int not null default 0;
alter table public.prod_marketing_ads add column if not exists metricas_atualizadas_em timestamptz;
