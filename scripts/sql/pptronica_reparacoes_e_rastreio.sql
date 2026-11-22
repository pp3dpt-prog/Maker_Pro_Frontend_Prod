-- PPtronica: pedidos de reparação (reaproveita prod_pedidos_orcamento) + rastreio de envio
-- nas encomendas da loja. Correr no Supabase SQL Editor (idempotente).

-- ----------------------------------------------------------------------------
-- 1. prod_pedidos_orcamento: novo tipo_pedido 'reparacao'
-- ----------------------------------------------------------------------------

-- Campos de design deixam de ser obrigatórios (reparação não tem design/peça impressa)
alter table public.prod_pedidos_orcamento alter column design_id drop not null;
alter table public.prod_pedidos_orcamento alter column design_nome drop not null;

-- Novos campos para descrever o equipamento a reparar
alter table public.prod_pedidos_orcamento
  add column if not exists equipamento        text,
  add column if not exists problema_descricao text,
  add column if not exists fotos              jsonb not null default '[]'::jsonb;

-- tipo_pedido passa a aceitar 'reparacao'
alter table public.prod_pedidos_orcamento drop constraint if exists prod_pedidos_orcamento_tipo_pedido_check;
alter table public.prod_pedidos_orcamento
  add constraint prod_pedidos_orcamento_tipo_pedido_check
  check (tipo_pedido in ('encomenda', 'proposta', 'reparacao'));

-- ----------------------------------------------------------------------------
-- 2. prod_loja_encomendas: rastreio de envio
-- ----------------------------------------------------------------------------
alter table public.prod_loja_encomendas
  add column if not exists codigo_rastreio text,
  add column if not exists transportadora  text,
  add column if not exists url_rastreio    text;
