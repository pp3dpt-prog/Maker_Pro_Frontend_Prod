-- Tabela para guardar pedidos de orçamento de cliente final
-- Submetidos via modal "Encomendar peça impressa" no customizador.
--
-- IMPORTANTE: correr o ficheiro inteiro de uma só vez no Supabase SQL Editor.

-- Extensão necessária para gen_random_uuid()
create extension if not exists pgcrypto;

create table if not exists public.prod_pedidos_orcamento (
  id                 uuid primary key default gen_random_uuid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),

  -- Quem pediu (obrigatório: só clientes finais autenticados podem pedir)
  user_id            uuid not null references auth.users(id) on delete cascade,

  -- Peça
  design_id          uuid not null,
  design_nome        text not null,
  familia            text,
  params             jsonb not null default '{}'::jsonb,

  -- Contacto
  contacto_nome      text not null,
  contacto_email     text not null,
  contacto_telefone  text not null,

  -- Moradas
  morada_faturacao   text not null,
  morada_envio       text not null,
  mesma_morada       boolean not null default true,

  -- Notas livres (quantidade, cores, prazos, etc.)
  notas              text,

  -- Workflow
  estado             text not null default 'pendente_orcamento'
                     check (estado in (
                       'pendente_orcamento',
                       'orcamento_enviado',
                       'aceite',
                       'em_producao',
                       'enviado',
                       'concluido',
                       'cancelado'
                     )),
  preco_estimado     numeric(10,2),
  notas_internas     text
);

create index if not exists prod_pedidos_orcamento_user_id_idx
  on public.prod_pedidos_orcamento (user_id);
create index if not exists prod_pedidos_orcamento_estado_idx
  on public.prod_pedidos_orcamento (estado);
create index if not exists prod_pedidos_orcamento_created_at_idx
  on public.prod_pedidos_orcamento (created_at desc);

-- RLS
alter table public.prod_pedidos_orcamento enable row level security;

-- Inserção apenas para utilizadores autenticados registados como cliente final
-- (tipo_utilizador in ('consumidor','ambos') em prod_perfis).
drop policy if exists "pedidos_orcamento_insert_cliente_final" on public.prod_pedidos_orcamento;
create policy "pedidos_orcamento_insert_cliente_final"
  on public.prod_pedidos_orcamento
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.prod_perfis p
      where p.id = auth.uid()
        and p.tipo_utilizador in ('consumidor','ambos')
    )
  );

-- Utilizadores autenticados podem ler os seus pedidos
drop policy if exists "pedidos_orcamento_select_own" on public.prod_pedidos_orcamento;
create policy "pedidos_orcamento_select_own"
  on public.prod_pedidos_orcamento
  for select
  to authenticated
  using (user_id = auth.uid());

-- Admins (role = 'admin' em prod_perfis) leem e atualizam tudo
drop policy if exists "pedidos_orcamento_admin_all" on public.prod_pedidos_orcamento;
create policy "pedidos_orcamento_admin_all"
  on public.prod_pedidos_orcamento
  for all
  to authenticated
  using (
    exists (
      select 1 from public.prod_perfis p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from public.prod_perfis p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $func$
begin
  new.updated_at = now();
  return new;
end
$func$;

drop trigger if exists prod_pedidos_orcamento_set_updated_at on public.prod_pedidos_orcamento;
create trigger prod_pedidos_orcamento_set_updated_at
  before update on public.prod_pedidos_orcamento
  for each row execute function public.set_updated_at();
