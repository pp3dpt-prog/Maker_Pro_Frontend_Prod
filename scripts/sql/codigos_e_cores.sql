-- Códigos (admin /admin/codigos) e cores (admin /admin/cores). Aditivo.

-- ═══ CÓDIGOS ═══
-- tipos: desconto (loja, % ou valor fixo) · sem_pagamento (loja) · downloads (créditos) · plano (plano por N dias)
alter table prod_cupons add column if not exists valor_cents integer;      -- desconto fixo (alternativa ao %)
alter table prod_cupons add column if not exists downloads integer;        -- tipo downloads
alter table prod_cupons add column if not exists plano_id uuid references prod_planos(id) on delete set null;
alter table prod_cupons add column if not exists plano_dias integer;       -- tipo plano
alter table prod_cupons add column if not exists um_por_utilizador boolean not null default true;
alter table prod_cupons alter column desconto_percent set default 0;
alter table prod_cupons drop constraint if exists prod_cupons_tipo_chk;
alter table prod_cupons add constraint prod_cupons_tipo_chk check (tipo in ('desconto','sem_pagamento','downloads','plano'));

create table if not exists prod_cupoes_resgates (
  id uuid primary key default gen_random_uuid(),
  cupao_id integer not null references prod_cupons(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  encomenda_id uuid references prod_loja_encomendas(id) on delete set null,
  detalhe text,
  created_at timestamptz not null default now()
);
create index if not exists prod_cupoes_resgates_cupao_idx on prod_cupoes_resgates(cupao_id);
alter table prod_cupoes_resgates enable row level security;
drop policy if exists cupoes_resgates_admin on prod_cupoes_resgates;
create policy cupoes_resgates_admin on prod_cupoes_resgates for all using (is_admin()) with check (is_admin());
drop policy if exists cupoes_resgates_proprio on prod_cupoes_resgates;
create policy cupoes_resgates_proprio on prod_cupoes_resgates for select using (auth.uid() = user_id);

-- Loja: só aceita códigos de loja
create or replace function usar_cupao_loja(p_codigo text)
returns setof prod_cupons
language sql security definer set search_path = public as $$
  update prod_cupons
     set usos_atuais = coalesce(usos_atuais, 0) + 1
   where upper(codigo) = upper(trim(p_codigo))
     and tipo in ('desconto','sem_pagamento')
     and ativo
     and (validade is null or validade > now())
     and (max_usos is null or coalesce(usos_atuais, 0) < max_usos)
  returning *;
$$;
revoke all on function usar_cupao_loja(text) from public, anon, authenticated;
grant execute on function usar_cupao_loja(text) to service_role;

-- Resgate na conta (downloads / plano). Atómico; devolve uma mensagem.
create or replace function resgatar_codigo(p_codigo text, p_user uuid)
returns json
language plpgsql security definer set search_path = public as $$
declare
  c prod_cupons;
  pl prod_planos;
  perf prod_perfis;
  restantes int;
  msg text;
begin
  select * into c from prod_cupons where upper(codigo) = upper(trim(p_codigo)) for update;
  if not found or not c.ativo or (c.validade is not null and c.validade <= now())
     or (c.max_usos is not null and coalesce(c.usos_atuais,0) >= c.max_usos) then
    return json_build_object('ok', false, 'erro', 'Código inválido, expirado ou esgotado.');
  end if;
  if c.tipo in ('desconto','sem_pagamento') then
    return json_build_object('ok', false, 'erro', 'Este código é para usar na finalização de uma encomenda da loja.');
  end if;
  if c.um_por_utilizador and exists (select 1 from prod_cupoes_resgates where cupao_id = c.id and user_id = p_user) then
    return json_build_object('ok', false, 'erro', 'Já usaste este código.');
  end if;
  select * into perf from prod_perfis where id = p_user for update;
  if not found then return json_build_object('ok', false, 'erro', 'Perfil não encontrado.'); end if;

  if c.tipo = 'downloads' then
    update prod_perfis set downloads_comprados = coalesce(downloads_comprados,0) + coalesce(c.downloads,0) where id = p_user;
    msg := format('Recebeste %s download(s) gratuito(s).', coalesce(c.downloads,0));
  elsif c.tipo = 'plano' then
    select * into pl from prod_planos where id = c.plano_id;
    if not found then return json_build_object('ok', false, 'erro', 'O plano deste código já não existe.'); end if;
    restantes := greatest(0, coalesce(perf.downloads_limite,0) - coalesce(perf.downloads_mes,0));
    update prod_perfis set
      plano = coalesce(pl.tier, case when pl.permite_venda_comercial then 'comercial' else 'pessoal' end),
      plano_id = pl.id,
      downloads_limite = restantes + coalesce(pl.limite_downloads,0),
      downloads_mes = 0,
      plano_valido_ate = now() + make_interval(days => coalesce(c.plano_dias, pl.validade_dias, 30))
    where id = p_user;
    msg := format('Plano %s ativo durante %s dias.', pl.nome, coalesce(c.plano_dias, pl.validade_dias, 30));
  end if;

  update prod_cupons set usos_atuais = coalesce(usos_atuais,0) + 1 where id = c.id;
  insert into prod_cupoes_resgates (cupao_id, user_id, email, detalhe) values (c.id, p_user, perf.email, msg);
  return json_build_object('ok', true, 'mensagem', msg);
end $$;
revoke all on function resgatar_codigo(text, uuid) from public, anon, authenticated;
grant execute on function resgatar_codigo(text, uuid) to service_role;

-- ═══ CORES ═══
create table if not exists prod_cores (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  hex text not null check (hex ~* '^#[0-9a-f]{6}$'),
  ativo boolean not null default true,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists prod_cores_hex_uniq on prod_cores (upper(hex));
alter table prod_cores enable row level security;
drop policy if exists cores_select on prod_cores;
create policy cores_select on prod_cores for select using (true);
drop policy if exists cores_admin on prod_cores;
create policy cores_admin on prod_cores for all using (is_admin()) with check (is_admin());

-- Por design: { "<param>": { "default": "#RRGGBB", "permitidas": ["#..", ...] } }
alter table prod_designs add column if not exists cores_config jsonb;
-- Global: permitir ou não o seletor de cor livre (além das amostras)
alter table prod_loja_config add column if not exists cores_livres boolean not null default true;

insert into prod_cores (nome, hex, ordem) values
 ('Preto','#111111',1),('Branco','#FFFFFF',2),('Cinzento','#9CA3AF',3),('Prateado','#C0C0C0',4),
 ('Dourado','#E0A526',5),('Vermelho','#DC2626',6),('Vermelho escuro','#B91C1C',7),('Telha','#7F1D1D',8),
 ('Laranja','#F97316',9),('Amarelo','#FACC15',10),('Verde','#16A34A',11),('Verde escuro','#15803D',12),
 ('Azul claro','#38BDF8',13),('Azul','#1E3A8A',14),('Roxo','#7C3AED',15),('Rosa','#F472B6',16),
 ('Castanho','#6B3A1E',17),('Caramelo','#B5651D',18),('Gengibre','#C8915A',19),('Bege','#E7D7B8',20),('Marfim','#F1E7D6',21)
on conflict do nothing;
