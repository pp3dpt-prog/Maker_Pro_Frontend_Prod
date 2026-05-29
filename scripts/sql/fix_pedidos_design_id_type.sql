-- Corrige o tipo da coluna design_id em prod_pedidos_orcamento.
-- O prod_designs usa IDs de texto (ex: "caixa-hexagonal"), não UUIDs.
-- Correr no Supabase SQL Editor em produção.

ALTER TABLE public.prod_pedidos_orcamento
  ALTER COLUMN design_id TYPE text;
