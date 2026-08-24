-- ============================================================================
-- Galeria de trabalhos (peças não à venda / personalizações feitas)
-- Correr no Supabase SQL Editor (idempotente).
-- ============================================================================

create table if not exists public.prod_galeria (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  descricao text,
  foto_url text not null,
  ordem int default 0,
  ativo boolean not null default true,
  created_at timestamptz default now()
);

alter table public.prod_galeria enable row level security;

-- Leitura pública só de itens ativos; admin vê e gere tudo.
drop policy if exists galeria_select on public.prod_galeria;
create policy galeria_select on public.prod_galeria
  for select using (ativo or public.is_admin());

drop policy if exists galeria_admin on public.prod_galeria;
create policy galeria_admin on public.prod_galeria
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- Várias fotos por peça (a foto_url em prod_galeria continua a servir de capa)
-- ============================================================================

create table if not exists public.prod_galeria_fotos (
  id uuid primary key default gen_random_uuid(),
  galeria_id uuid references public.prod_galeria(id) on delete cascade,
  url text not null,
  ordem int default 0
);

create index if not exists idx_galeria_fotos_galeria on public.prod_galeria_fotos(galeria_id);

alter table public.prod_galeria_fotos enable row level security;

drop policy if exists galeria_fotos_select on public.prod_galeria_fotos;
create policy galeria_fotos_select on public.prod_galeria_fotos
  for select using (
    public.is_admin() or exists (
      select 1 from public.prod_galeria g where g.id = galeria_id and g.ativo
    )
  );

drop policy if exists galeria_fotos_admin on public.prod_galeria_fotos;
create policy galeria_fotos_admin on public.prod_galeria_fotos
  for all using (public.is_admin()) with check (public.is_admin());

-- Backfill: leva a foto_url das peças existentes para a nova tabela (ordem 0).
insert into public.prod_galeria_fotos (galeria_id, url, ordem)
select id, foto_url, 0 from public.prod_galeria g
where not exists (select 1 from public.prod_galeria_fotos f where f.galeria_id = g.id);
