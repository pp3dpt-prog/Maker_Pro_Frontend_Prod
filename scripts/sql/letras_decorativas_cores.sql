-- ══════════════════════════════════════════════════════════════════
--  Letras Decorativas — parâmetros de cor (preview ao vivo)
--  Adiciona cor_letra e cor_nome ao generation_schema.parameters.
--  São parâmetros só-de-preview (não vão para o backend OpenSCAD —
--  ver VISUAL_PARAMS em app/customizador/PageInner.tsx).
--  Correr no Supabase SQL Editor em produção.
-- ══════════════════════════════════════════════════════════════════

UPDATE public.prod_designs
SET generation_schema = jsonb_set(
  jsonb_set(
    generation_schema,
    '{parameters,cor_letra}',
    '{"default":"#16d8aa","order":10,"ui":{"label":"Cor da letra","widget":"color"}}'::jsonb,
    true
  ),
  '{parameters,cor_nome}',
  '{"default":"#f3f3f0","order":11,"ui":{"label":"Cor do nome","widget":"color"}}'::jsonb,
  true
)
WHERE id = 'letras-decorativas';

-- Confirmar:
-- SELECT generation_schema->'parameters'->'cor_letra' AS cor_letra,
--        generation_schema->'parameters'->'cor_nome'  AS cor_nome
-- FROM public.prod_designs WHERE id = 'letras-decorativas';
