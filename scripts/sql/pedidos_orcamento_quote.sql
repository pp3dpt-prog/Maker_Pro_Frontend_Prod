-- Adds quote management columns to prod_pedidos_orcamento
-- Run this in the Supabase SQL Editor after the base table exists.

-- Make sure the check constraint includes 'recusado' and 'orcamento_enviado'
-- (the original SQL may be missing 'recusado'; we add it safely)
ALTER TABLE public.prod_pedidos_orcamento
  DROP CONSTRAINT IF EXISTS prod_pedidos_orcamento_estado_check;

ALTER TABLE public.prod_pedidos_orcamento
  ADD CONSTRAINT prod_pedidos_orcamento_estado_check
  CHECK (estado IN (
    'pendente_orcamento',
    'orcamento_enviado',
    'aceite',
    'recusado',
    'em_producao',
    'enviado',
    'concluido',
    'cancelado'
  ));

-- Quote management columns
ALTER TABLE public.prod_pedidos_orcamento
  ADD COLUMN IF NOT EXISTS preco_estimado     numeric(10,2),   -- might already exist
  ADD COLUMN IF NOT EXISTS prazo_entrega_dias integer,
  ADD COLUMN IF NOT EXISTS notas_orcamento    text,
  ADD COLUMN IF NOT EXISTS stl_url            text,
  ADD COLUMN IF NOT EXISTS token_resposta     uuid DEFAULT gen_random_uuid() UNIQUE,
  ADD COLUMN IF NOT EXISTS token_expira_em    timestamptz;

-- Policy: allow unauthenticated read by token (for the client response page)
DROP POLICY IF EXISTS "pedidos_orcamento_read_by_token" ON public.prod_pedidos_orcamento;
CREATE POLICY "pedidos_orcamento_read_by_token"
  ON public.prod_pedidos_orcamento
  FOR SELECT
  USING (token_resposta IS NOT NULL);

-- Policy: allow unauthenticated update by token (for accept/reject)
DROP POLICY IF EXISTS "pedidos_orcamento_update_by_token" ON public.prod_pedidos_orcamento;
CREATE POLICY "pedidos_orcamento_update_by_token"
  ON public.prod_pedidos_orcamento
  FOR UPDATE
  USING (
    token_resposta IS NOT NULL
    AND token_expira_em > now()
    AND estado = 'orcamento_enviado'
  )
  WITH CHECK (estado IN ('aceite', 'recusado'));
