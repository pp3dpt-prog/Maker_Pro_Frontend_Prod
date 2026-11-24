-- Loja: códigos na finalização da encomenda.
--   tipo = 'desconto'       → aplica desconto_percent e segue para pagamento Stripe
--   tipo = 'sem_pagamento'  → a encomenda é registada e enviada por email, sem pagamento
-- Aditivo (não apaga nada). Correr uma vez no SQL editor do Supabase.

alter table prod_cupons add column if not exists tipo text not null default 'desconto';
alter table prod_cupons add column if not exists parceiro_id uuid references prod_parceiros(id) on delete set null;
alter table prod_cupons add column if not exists notas text;
alter table prod_cupons alter column usos_atuais set default 0;
alter table prod_cupons alter column ativo set default true;
alter table prod_cupons alter column created_at set default now();
do $$ begin
  alter table prod_cupons add constraint prod_cupons_tipo_chk check (tipo in ('desconto','sem_pagamento'));
exception when duplicate_object then null; end $$;
create unique index if not exists prod_cupons_codigo_uniq on prod_cupons (upper(codigo));

-- Só o admin gere códigos no browser; a validação no checkout é feita server-side (service role).
drop policy if exists cupons_admin on prod_cupons;
create policy cupons_admin on prod_cupons for all using (is_admin()) with check (is_admin());

alter table prod_loja_encomendas add column if not exists codigo_usado text;
alter table prod_loja_encomendas add column if not exists desconto_cents integer not null default 0;

-- Consome um uso do código de forma atómica. Devolve o cupão se for válido; senão, nada.
create or replace function usar_cupao_loja(p_codigo text)
returns setof prod_cupons
language sql security definer set search_path = public as $$
  update prod_cupons
     set usos_atuais = coalesce(usos_atuais, 0) + 1
   where upper(codigo) = upper(trim(p_codigo))
     and ativo
     and (validade is null or validade > now())
     and (max_usos is null or coalesce(usos_atuais, 0) < max_usos)
  returning *;
$$;
revoke all on function usar_cupao_loja(text) from public, anon, authenticated;
grant execute on function usar_cupao_loja(text) to service_role;
