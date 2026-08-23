-- ============================================================================
-- Reviews: foto do produto recebido + reviews curadas pelo admin (sem conta)
-- Correr no Supabase SQL Editor (idempotente).
-- ============================================================================

alter table public.prod_reviews add column if not exists foto_url text;

-- Reviews curadas pelo admin (a partir de conversas/fotos de clientes) não têm
-- utilizador autenticado associado — user_id passa a ser opcional.
alter table public.prod_reviews alter column user_id drop not null;
