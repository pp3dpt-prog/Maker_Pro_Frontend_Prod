-- ============================================================================
-- Feedback público (form na homepage, aberto a qualquer visitante)
-- Correr no Supabase SQL Editor (idempotente).
-- ============================================================================

create table if not exists public.prod_feedback (
  id uuid primary key default gen_random_uuid(),
  nome text,
  avaliacao int,                          -- opcional, 1-5
  mensagem text not null,
  contacto_metodo text,                   -- 'email' | 'whatsapp' | null
  contacto_valor text,
  aceita_contacto boolean not null default false,
  estado text not null default 'pendente',  -- pendente | lido | respondido
  nota_admin text,                        -- nota interna (ex.: o que foi respondido)
  created_at timestamptz default now()
);

alter table public.prod_feedback enable row level security;

-- Só admin lê/gere (inserção pública passa sempre pela API com service_role,
-- nunca diretamente do browser — evita dar policy de insert a anónimos).
drop policy if exists feedback_admin on public.prod_feedback;
create policy feedback_admin on public.prod_feedback
  for all using (public.is_admin()) with check (public.is_admin());
