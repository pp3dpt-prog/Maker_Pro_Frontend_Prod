-- ============================================================================
-- Loja física — novas categorias: Caixas Dobráveis e Selos
-- Correr no Supabase SQL Editor (idempotente — pode correr-se mais que uma vez).
-- Cria as categorias e alguns produtos em rascunho (estado='rascunho'), para
-- o admin completar com fotos, preço real e stock em /admin/loja antes de
-- publicar (passar estado para 'ativo'). Preços abaixo são só uma estimativa
-- de arranque.
-- ============================================================================

insert into public.prod_loja_categorias (slug, nome, descricao, ordem, ativo)
values
  ('caixas-dobraveis', 'Caixas Dobráveis',
   'Caixas dobráveis para montares tu mesmo — vêm planas, prontas a dobrar e encaixar, sem colas nem ferramentas. Ideais para embalar presentes, organizar ou guardar o que quiseres, no tamanho que precisares.',
   10, true),
  ('selos', 'Selos',
   'Selos personalizados para marcares cartões, convites ou papel mais grosso com o teu nome, iniciais ou logótipo. Dão um toque único a correspondência, embalagens e trabalhos de papelaria.',
   20, true)
on conflict (slug) do update set
  nome = excluded.nome,
  descricao = excluded.descricao;

-- Caixas Dobráveis — três tamanhos de arranque
insert into public.prod_loja_produtos (slug, nome, descricao, categoria_id, preco_cents, stock, permite_personalizar, sob_encomenda, estado)
select v.slug, v.nome, v.descricao, c.id, v.preco_cents, 0, false, true, 'rascunho'
from public.prod_loja_categorias c
join (values
  ('caixa-dobravel-pequena', 'Caixa Dobrável Pequena',
   'Caixa dobrável pequena (aprox. 10x10x5 cm), impressa plana e pronta a montar à mão em segundos.',
   999),
  ('caixa-dobravel-media', 'Caixa Dobrável Média',
   'Caixa dobrável média (aprox. 15x15x8 cm), impressa plana e pronta a montar à mão em segundos.',
   1299),
  ('caixa-dobravel-grande', 'Caixa Dobrável Grande',
   'Caixa dobrável grande (aprox. 20x20x10 cm), impressa plana e pronta a montar à mão em segundos.',
   1699)
) as v(slug, nome, descricao, preco_cents) on true
where c.slug = 'caixas-dobraveis'
on conflict (slug) do nothing;

-- Selos — três variantes de personalização de arranque
insert into public.prod_loja_produtos (slug, nome, descricao, categoria_id, preco_cents, stock, permite_personalizar, sob_encomenda, estado)
select v.slug, v.nome, v.descricao, c.id, v.preco_cents, 0, true, true, 'rascunho'
from public.prod_loja_categorias c
join (values
  ('selo-personalizado-iniciais', 'Selo Personalizado — Iniciais',
   'Selo com as tuas iniciais em relevo, para marcar cartões, convites ou papel mais grosso.',
   1199),
  ('selo-personalizado-texto', 'Selo Personalizado — Nome ou Texto',
   'Selo com o nome ou texto que quiseres em relevo, para marcar cartões, convites ou papel mais grosso.',
   1399),
  ('selo-personalizado-logo', 'Selo Personalizado — Logótipo',
   'Selo com o teu logótipo em relevo, para marcar cartões, embalagens ou papel mais grosso.',
   1599)
) as v(slug, nome, descricao, preco_cents) on true
where c.slug = 'selos'
on conflict (slug) do nothing;
