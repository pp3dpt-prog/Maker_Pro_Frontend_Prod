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
