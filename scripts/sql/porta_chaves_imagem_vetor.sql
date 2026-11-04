-- Porta-chaves de imagem (SVG/PNG) passa a usar o motor "vetor-cores":
-- a imagem é separada em cores e vetorizada no backend (Maker_Pro_Docker_Prod:
-- app/vetorPortachaves.js) e a geometria é feita em JavaScript — o OpenSCAD deixa
-- de ser usado neste modelo. O editor está em app/personalizar-imagem/PortachavesVetorEditor.tsx.
--
--   Sem AMS, pausas ..... .zip com 1 STL (base numa cor + um nível por cada outra cor) + guia das pausas
--   Sem AMS, peças ...... .zip com a base (com encaixes) + 1 STL por cor para colar + guia
--   Com AMS ............. .3mf com a base e cada cor numa parte

update public.prod_designs
set
  scad_template = '// Este modelo não usa OpenSCAD: é gerado em JavaScript no backend (app/vetorPortachaves.js, engine "vetor-cores").',
  descricao = coalesce(descricao, 'Carrega um logótipo ou desenho (SVG ou PNG) e transforma-o num porta-chaves. Com AMS sai um 3MF com cada cor numa parte; sem AMS, cada cor fica num nível com pausas para trocar o filamento, ou em peças de cor para colar.'),
  generation_schema = '{
    "engine": "vetor-cores",
    "parameters": {
      "image_path":        { "order": 1,  "default": null, "ui": { "label": "A tua imagem (SVG ou PNG)", "widget": "image_upload" } },
      "modo":              { "order": 2,  "default": "sem_ams", "ui": { "label": "Impressora", "widget": "select", "options": ["sem_ams", "ams"] } },
      "num_cores":         { "order": 3,  "default": 2,   "min": 1,   "max": 6,   "ui": { "label": "Número de cores", "widget": "slider", "step": 1 } },
      "remover_fundo":     { "order": 4,  "default": 1,   "ui": { "label": "Remover fundo", "widget": "checkbox" } },
      "tolerancia":        { "order": 5,  "default": 40,  "min": 10,  "max": 120, "ui": { "label": "Sensibilidade do fundo", "widget": "slider", "step": 5 } },
      "buracos_fundo":     { "order": 5,  "default": 1,   "ui": { "label": "Fundo dentro do desenho é buraco", "widget": "checkbox" } },
      "largura":           { "order": 6,  "default": 40,  "min": 20,  "max": 80,  "unit": "mm", "ui": { "label": "Largura do desenho", "widget": "slider", "step": 1 } },
      "contorno":          { "order": 7,  "default": 2.5, "min": 0,   "max": 6,   "unit": "mm", "ui": { "label": "Contorno da base", "widget": "slider", "step": 0.5 } },
      "espessura_base":    { "order": 8,  "default": 2,   "min": 1.2, "max": 5,   "unit": "mm", "ui": { "label": "Espessura da base", "widget": "slider", "step": 0.2 } },
      "relevo":            { "order": 9,  "default": 1.2, "min": 0.4, "max": 3,   "unit": "mm", "ui": { "label": "Altura do relevo", "widget": "slider", "step": 0.2 } },
      "acabamento":        { "order": 10, "default": "relevo", "ui": { "label": "Acabamento (AMS)", "widget": "select", "options": ["relevo", "liso"] } },
      "metodo":            { "order": 11, "default": "pausas", "ui": { "label": "Sem AMS: método", "widget": "select", "options": ["pausas", "pecas"] } },
      "cor_base":          { "order": 11, "default": 0,   "min": 0,   "max": 6,   "ui": { "label": "Cor da base (0 = mais clara)", "widget": "slider", "step": 1 } },
      "ordem":             { "order": 11, "default": "escuras_cima", "ui": { "label": "Ordem dos níveis", "widget": "select", "options": ["escuras_cima", "claras_cima"] } },
      "furo_pos":          { "order": 12, "default": "cima", "ui": { "label": "Furo", "widget": "select", "options": ["cima", "cima-esquerda", "cima-direita", "esquerda", "direita", "nenhum"] } },
      "furo_d":            { "order": 13, "default": 4.5, "min": 3,   "max": 8,   "unit": "mm", "ui": { "label": "Diâmetro do furo", "widget": "slider", "step": 0.5 } },
      "detalhe_min":       { "order": 14, "default": 0.4, "min": 0,   "max": 3,   "unit": "mm²", "ui": { "label": "Ignorar detalhes menores que", "widget": "slider", "step": 0.1 } },
      "preencher_buracos": { "order": 15, "default": 1,   "ui": { "label": "Tapar os buracos do desenho com a base", "widget": "checkbox" } },
      "encaixe":           { "order": 16, "default": 0.6, "min": 0.4, "max": 1.2, "unit": "mm", "ui": { "label": "Profundidade dos encaixes", "widget": "slider", "step": 0.1 } },
      "folga":             { "order": 17, "default": 0.2, "min": 0,   "max": 0.6, "unit": "mm", "ui": { "label": "Folga das peças", "widget": "slider", "step": 0.05 } }
    }
  }'::jsonb
where id = 'porta_chaves_imagem';

-- Confirmação: deve devolver 1 linha com engine = vetor-cores
select id, nome, generation_schema->>'engine' as engine, estado from public.prod_designs where id = 'porta_chaves_imagem';
