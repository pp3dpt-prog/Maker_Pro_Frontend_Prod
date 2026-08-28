-- ══════════════════════════════════════════════════════════════════
--  Letras Decorativas — corrige o parâmetro "folga"
--  Bug: "step" estava fora do objeto "ui" (GeneratedEditor só lê
--  ui.step), por isso caía no default step=1 — com min=0.1/max=1 o
--  slider ficava praticamente preso numa única posição.
--  Também ajusta os limites pedidos: min 0.1, max 0.6, default 0.2.
--  Correr no Supabase SQL Editor em produção. Não altera `estado`.
-- ══════════════════════════════════════════════════════════════════

UPDATE public.prod_designs
SET generation_schema = jsonb_set(
  generation_schema,
  '{parameters,folga}',
  '{
    "default": 0.2,
    "min": 0.1,
    "max": 0.6,
    "unit": "mm",
    "order": 10,
    "ui": {
      "label": "Folga do encaixe (mm)",
      "widget": "slider",
      "step": 0.05
    }
  }'::jsonb,
  true
)
WHERE id = 'letras-decorativas';

-- Confirmar:
-- SELECT generation_schema->'parameters'->'folga' AS folga
-- FROM public.prod_designs WHERE id = 'letras-decorativas';
