-- ══════════════════════════════════════════════════════════════════
--  Ativar "Letra com Nome" (letras-decorativas) no catálogo público
--  O INSERT original (letras_decorativas.sql) nunca definiu `estado`,
--  ficando no valor por defeito 'rascunho' — visível só para admins.
--  Correr no Supabase SQL Editor em produção.
-- ══════════════════════════════════════════════════════════════════

UPDATE public.prod_designs
SET estado = 'ativo'
WHERE id = 'letras-decorativas';

-- Confirmar:
-- SELECT id, nome, familia, estado FROM public.prod_designs WHERE id = 'letras-decorativas';
