-- Pet tags: rebordo opcional à volta da frente (redonda, coração, osso, hexágono).
--
-- Acrescenta ao fim de cada scad_template um bloco de rebordo (desligado por omissão)
-- e três parâmetros ao generation_schema: rebordo, rebordo_largura, rebordo_altura.
-- O rebordo segue o contorno da chapa (sem a argola), fica por cima da superfície
-- da frente (altura_fixa) e não tapa o furo da argola.
-- A pré-visualização usa as mesmas medidas (lib/petTagForma.ts no frontend).
--
-- Pode correr-se mais do que uma vez: só acrescenta o bloco se ainda não existir.

-- ── Templates ────────────────────────────────────────────────────────────────

update public.prod_designs set scad_template = scad_template || $scad$

// --- REBORDO (opcional) ---
rebordo = false;
rebordo_largura = 1.2;
rebordo_altura = 1;
module rebordo_corpo_2d() { circle(r = raio_medalha); }
module rebordo_furo_2d() { translate([0, raio_medalha + 3]) circle(r = 3); }
if (rebordo)
    translate([0, 0, altura_fixa]) linear_extrude(height = rebordo_altura)
        difference() { rebordo_corpo_2d(); offset(delta = -rebordo_largura) rebordo_corpo_2d(); rebordo_furo_2d(); }
$scad$
where id = 'tag-redonda' and scad_template not like '%rebordo_largura%';

update public.prod_designs set scad_template = scad_template || $scad$

// --- REBORDO (opcional) ---
rebordo = false;
rebordo_largura = 1.2;
rebordo_altura = 1;
module rebordo_corpo_2d() {
    union() {
        translate([-9, 9]) circle(r = 12);
        translate([9, 9]) circle(r = 12);
        translate([0, -17]) rotate(45) square([25, 25]);
    }
}
module rebordo_furo_2d() { translate([0, 22]) circle(r = 3.5); }
if (rebordo)
    translate([0, 0, altura_fixa]) linear_extrude(height = rebordo_altura)
        difference() { rebordo_corpo_2d(); offset(delta = -rebordo_largura) rebordo_corpo_2d(); rebordo_furo_2d(); }
$scad$
where id = 'tag-coracao' and scad_template not like '%rebordo_largura%';

update public.prod_designs set scad_template = scad_template || $scad$

// --- REBORDO (opcional) ---
rebordo = false;
rebordo_largura = 1.2;
rebordo_altura = 1;
module rebordo_corpo_2d() {
    union() {
        translate([-15, -8]) square([30, 16]);
        translate([-15, 6]) circle(r = 8);
        translate([-15, -6]) circle(r = 8);
        translate([15, 6]) circle(r = 8);
        translate([15, -6]) circle(r = 8);
    }
}
module rebordo_furo_2d() { translate([0, 10]) circle(r = 2.8); }
if (rebordo)
    translate([0, 0, altura_fixa]) linear_extrude(height = rebordo_altura)
        difference() { rebordo_corpo_2d(); offset(delta = -rebordo_largura) rebordo_corpo_2d(); rebordo_furo_2d(); }
$scad$
where id = 'tag-osso' and scad_template not like '%rebordo_largura%';

update public.prod_designs set scad_template = scad_template || $scad$

// --- REBORDO (opcional) ---
rebordo = false;
rebordo_largura = 1.2;
rebordo_altura = 1;
module rebordo_corpo_2d() { circle(r = 15, $fn = 6); }
module rebordo_furo_2d() { translate([0, 15]) circle(r = 2.5); }
if (rebordo)
    translate([0, 0, altura_fixa]) linear_extrude(height = rebordo_altura)
        difference() { rebordo_corpo_2d(); offset(delta = -rebordo_largura) rebordo_corpo_2d(); rebordo_furo_2d(); }
$scad$
where id = 'tag-hexagono' and scad_template not like '%rebordo_largura%';

-- ── Parâmetros (sliders) ─────────────────────────────────────────────────────

update public.prod_designs
set generation_schema = jsonb_set(
  generation_schema,
  '{parameters}',
  (generation_schema -> 'parameters') || '{
    "rebordo":         { "order": 11, "default": false, "ui": { "label": "Rebordo à volta da frente", "widget": "checkbox" } },
    "rebordo_largura": { "order": 12, "default": 1.2, "min": 0.8, "max": 2.5, "unit": "mm", "ui": { "label": "Largura do rebordo", "widget": "slider", "step": 0.1, "visible_when": { "rebordo": { "min": 1 } } } },
    "rebordo_altura":  { "order": 13, "default": 1,   "min": 0.4, "max": 2,   "unit": "mm", "ui": { "label": "Altura do rebordo", "widget": "slider", "step": 0.2, "visible_when": { "rebordo": { "min": 1 } } } }
  }'::jsonb
)
where id in ('tag-redonda', 'tag-coracao', 'tag-osso', 'tag-hexagono');

-- Confirmação: 4 linhas, todas com tem_rebordo = true e os 3 parâmetros
select id,
       scad_template like '%rebordo_largura%' as tem_rebordo,
       generation_schema -> 'parameters' ? 'rebordo' as param_rebordo
from public.prod_designs
where id in ('tag-redonda', 'tag-coracao', 'tag-osso', 'tag-hexagono');
