-- ============================================================================
-- Candidaturas a parceiro — formulário público (sem login) em cada produto,
-- para empresas que queiram vender/anunciar. Revistas em /admin/loja/parceiros/candidaturas.
-- Correr no Supabase SQL Editor (idempotente — pode correr-se mais que uma vez).
-- Reutiliza public.is_admin() já criada em scripts/sql/loja_modulo.sql.
-- ============================================================================

create table if not exists public.prod_parceiros_candidaturas (
  id uuid primary key default gen_random_uuid(),
  tipo_interesse text not null default 'vender', -- vender | publicidade | ambos
  empresa text not null,
  nome_contacto text not null,
  email text not null,
  telefone text,
  cidade text,
  mensagem text,
  produto_slug text,
  produto_nome text,
  estado text not null default 'novo', -- novo | contactado | recusado
  created_at timestamptz default now()
);

create index if not exists idx_parceiros_candidaturas_estado on public.prod_parceiros_candidaturas(estado);

alter table public.prod_parceiros_candidaturas enable row level security;

-- Qualquer visitante pode submeter uma candidatura (formulário público, sem login)
drop policy if exists parceiros_candidaturas_insert on public.prod_parceiros_candidaturas;
create policy parceiros_candidaturas_insert on public.prod_parceiros_candidaturas
  for insert with check (true);

-- Só admin lê/gere as candidaturas recebidas
drop policy if exists parceiros_candidaturas_admin on public.prod_parceiros_candidaturas;
create policy parceiros_candidaturas_admin on public.prod_parceiros_candidaturas
  for all using (public.is_admin()) with check (public.is_admin());
