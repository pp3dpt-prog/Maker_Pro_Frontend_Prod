-- Nova pet tag: Pata (tag-pata)
--
-- Almofada grande (para o nome) + 4 dedos + argola entre os dedos do meio.
-- Nome em relevo na frente, telefone gravado no verso, rebordo opcional — igual
-- às outras pet tags. As medidas são as mesmas de lib/petTagForma.ts ('pata'),
-- usado na pré-visualização, e de public/models/blank_pata.stl.
-- Os campos comuns (preço, licença, ui_schema antigo, acesso…) são copiados da
-- tag-hexagono. Pode correr-se mais do que uma vez (atualiza a linha).

insert into public.prod_designs (
  id, nome, descricao, thumbnail_url, licenca, preco_creditos, parametros_default,
  stl_file_path, ui_schema, scad_template, familia, preco_base, pvp,
  default_x_nome, default_y_nome, default_size_nome, min_x_nome, max_x_nome, min_y_nome, max_y_nome,
  default_x_num, default_y_num, default_size_num, min_x_num, max_x_num, min_y_num, max_y_num,
  default_fonte, credit_price, base_template_id, generation_schema,
  usa_modo, estado, acesso_maker, requer_licenca_comercial, disponivel_consumidor, gratuito
)
select
  'tag-pata', 'Pata', 'Pet tag em forma de pata, com o nome do teu animal na almofada e o teu contacto no verso.',
  '/thumbnails/tag-pata.png', h.licenca, h.preco_creditos, h.parametros_default,
  '/models/blank_pata.stl', h.ui_schema,
$scad$altura_fixa = 3;

// Elipse como no editor: scale([rx, ry]) circle(1), rodada e colocada em (cx, cy).
// $fn fixo: com os valores por omissão do OpenSCAD um circle(r = 1) sai um pentágono.
module elipse(cx, cy, rx, ry, rot = 0) {
    translate([cx, cy]) rotate(rot) scale([rx, ry]) circle(r = 1, $fn = 72);
}

// Almofada + 4 dedos encostados a ela; o fecho (offset +0,8 / −0,8) suaviza a
// ligação dedo-almofada sem tapar os entalhes entre os dedos.
module pata_2d() {
    offset(r = -0.8) offset(r = 0.8) union() {
        elipse(0, -6, 13, 10);
        elipse(-5.6, 8, 4.3, 5.6, 8);
        elipse(5.6, 8, 4.3, 5.6, -8);
        elipse(-13.2, 2.5, 4, 5.2, 32);
        elipse(13.2, 2.5, 4, 5.2, -32);
        translate([-2.5, 5]) square([5, 10.5]);   // tapa a fenda entre os dedos do meio, sob a argola
    }
}

module geometria_pata() {
    linear_extrude(height = altura_fixa) difference() {
        union() {
            pata_2d();
            translate([0, 15.5]) circle(r = 5, $fn = 72);          // argola
        }
        translate([0, 15.5]) circle(r = 2.6, $fn = 72);            // furo da argola
    }
}

union() {
    difference() {
        geometria_pata();
        // VERSO: telefone gravado
        translate([xPosN, yPosN, -0.1])
            mirror([1, 0, 0])
            linear_extrude(height = 1.1)
                text(telefone, size = fontSizeN, font = fonte, halign = "center", valign = "center");
    }
    // FRENTE: nome em relevo (na almofada)
    translate([xPos, yPos, altura_fixa])
        linear_extrude(height = 1)
            text(nome_pet, size = fontSize, font = fonte, halign = "center", valign = "center");
}

// --- REBORDO (opcional) ---
rebordo = false;
rebordo_largura = 1.2;
rebordo_altura = 1;
module rebordo_corpo_2d() { pata_2d(); }
module rebordo_furo_2d() { translate([0, 15.5]) circle(r = 2.6, $fn = 72); }
if (rebordo)
    translate([0, 0, altura_fixa]) linear_extrude(height = rebordo_altura)
        difference() { rebordo_corpo_2d(); offset(delta = -rebordo_largura) rebordo_corpo_2d(); rebordo_furo_2d(); }
$scad$,
  'pet-tags', h.preco_base, h.pvp,
  0, -6, 5, -15, 15, -15, 10,
  0, -6, 4, -15, 15, -15, 10,
  h.default_fonte, h.credit_price, null,  -- base_template_id: FK para prod_scad_templates; não é usado pelo código
  '{
    "parameters": {
      "mostrar_texto":   { "order": 0,  "default": true, "ui": { "label": "Mostrar simulação do texto", "widget": "checkbox" } },
      "fonte":           { "order": 1,  "default": "Aladin", "ui": { "label": "Fonte", "widget": "select", "options": ["Aladin", "Amarante", "Benne", "Baloo 2"] } },
      "nome_pet":        { "order": 2,  "default": "BOBI", "ui": { "label": "Nome do animal", "widget": "text" } },
      "fontSize":        { "order": 3,  "default": 5,   "min": 3,   "max": 9,   "unit": "mm", "ui": { "label": "Tamanho do nome", "widget": "slider", "step": 0.5 } },
      "xPos":            { "order": 5,  "default": 0,   "min": -8,  "max": 8,   "unit": "mm", "ui": { "label": "Posição horizontal do nome", "widget": "slider", "step": 0.5 } },
      "yPos":            { "order": 6,  "default": -6,  "min": -13, "max": 8,   "unit": "mm", "ui": { "label": "Posição vertical do nome", "widget": "slider", "step": 0.5 } },
      "telefone":        { "order": 7,  "default": "912345678", "ui": { "label": "Telefone", "widget": "text" } },
      "fontSizeN":       { "order": 8,  "default": 3.5, "min": 3,   "max": 7,   "unit": "mm", "ui": { "label": "Tamanho do telefone", "widget": "slider", "step": 0.5 } },
      "xPosN":           { "order": 9,  "default": 0,   "min": -8,  "max": 8,   "unit": "mm", "ui": { "label": "Posição horizontal do telefone", "widget": "slider", "step": 0.5 } },
      "yPosN":           { "order": 10, "default": -6,  "min": -13, "max": 8,   "unit": "mm", "ui": { "label": "Posição vertical do telefone", "widget": "slider", "step": 0.5 } },
      "rebordo":         { "order": 11, "default": false, "ui": { "label": "Rebordo à volta da frente", "widget": "checkbox" } },
      "rebordo_largura": { "order": 12, "default": 1.2, "min": 0.8, "max": 2.5, "unit": "mm", "ui": { "label": "Largura do rebordo", "widget": "slider", "step": 0.1, "visible_when": { "rebordo": { "min": 1 } } } },
      "rebordo_altura":  { "order": 13, "default": 1,   "min": 0.4, "max": 2,   "unit": "mm", "ui": { "label": "Altura do rebordo", "widget": "slider", "step": 0.2, "visible_when": { "rebordo": { "min": 1 } } } }
    }
  }'::jsonb,
  h.usa_modo, 'ativo', h.acesso_maker, h.requer_licenca_comercial, h.disponivel_consumidor, h.gratuito
from public.prod_designs h
where h.id = 'tag-hexagono'
on conflict (id) do update set
  nome = excluded.nome, descricao = excluded.descricao, thumbnail_url = excluded.thumbnail_url,
  stl_file_path = excluded.stl_file_path, scad_template = excluded.scad_template,
  generation_schema = excluded.generation_schema;

-- Confirmação
select id, nome, familia, estado, stl_file_path from public.prod_designs where id = 'tag-pata';
