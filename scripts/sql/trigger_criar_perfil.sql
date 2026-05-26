-- Trigger: criar linha em prod_perfis quando um utilizador se regista
-- Correr no Supabase SQL Editor (uma única vez).

-- 1. Função chamada pelo trigger
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.prod_perfis (
    id,
    email,
    role,
    plano,
    tipo_utilizador,
    downloads_mes,
    downloads_limite
  )
  values (
    new.id,
    new.email,
    null,        -- role: null por omissão (admin definido manualmente)
    'gratuito',  -- plano inicial
    null,        -- tipo_utilizador: definido na página /bem-vindo
    0,
    3            -- 3 downloads gratuitos
  )
  on conflict (id) do nothing; -- seguro se o perfil já existir
  return new;
end;
$$;

-- 2. Trigger em auth.users (dispara após cada INSERT)
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
