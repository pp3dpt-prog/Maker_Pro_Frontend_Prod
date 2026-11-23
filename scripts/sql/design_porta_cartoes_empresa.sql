-- Novo design: Porta-cartões de Visita (com logótipo em relevo), para o
-- catálogo /empresas. Criado como rascunho (estado='rascunho') — rever no
-- customizador e marcar como 'ativo' no admin quando aprovado. Testado
-- localmente com OpenSCAD (CLI) antes de inserir: "Simple: yes", sem erros
-- de malha, com e sem logótipo.
-- Revisão: fechado dos dois lados (paredes laterais), a pedido — antes os
-- cartões podiam escorregar para fora pelas pontas.

insert into public.prod_designs
  (id, nome, familia, descricao, estado, usa_modo, mostrar_empresas, scad_template, generation_schema)
values (
  'porta_cartoes_empresa',
  'Porta-cartões de Visita',
  'Porta-cartões',
  'Suporte de secretária para cartões de visita, com logótipo da empresa em relevo.',
  'rascunho',
  false,
  true,
  $scad$// ── PORTA-CARTÕES DE VISITA (com logótipo opcional) ──
// Suporte em "L" fechado nos dois lados: base onde os cartões assentam, encostados
// a uma parede vertical, com paredes laterais para os cartões não escorregarem para
// os lados. O logótipo (opcional) fica em relevo na parte de cima da parede, acima
// da altura dos cartões, para não ficar tapado quando os cartões estão colocados.
// logo_pts / logo_paths / tem_logo vêm do servidor (lib/logo.js, generation_schema.logo).

function _L()      = is_undef(largura) ? 95 : largura;
function _prof()   = is_undef(profundidade) ? 35 : profundidade;
function _altp()   = is_undef(altura_parede) ? 65 : altura_parede;
function _altc()   = is_undef(altura_cartoes) ? 30 : altura_cartoes;
function _esp()    = is_undef(espessura) ? 3 : espessura;
function _lipH()   = is_undef(lip_altura) ? 6 : lip_altura;
function _relevo() = is_undef(relevo) ? 1 : relevo;
function _logo()   = !is_undef(tem_logo) && tem_logo == true && !is_undef(logo_pts) && len(logo_pts) >= 3;

module suporte() {
    union() {
        cube([_L(), _prof(), _esp()]);
        translate([0, 0, _esp()])
            cube([_L(), _esp(), _lipH()]);
        translate([0, _prof() - _esp(), 0])
            cube([_L(), _esp(), _altp()]);
        cube([_esp(), _prof(), _altp()]);
        translate([_L() - _esp(), 0, 0])
            cube([_esp(), _prof(), _altp()]);
    }
}

module logo3d() {
    if (_logo())
        translate([_L() / 2, _prof() - _esp() + 0.05, _altc() + (_altp() - _altc()) / 2])
            rotate([90, 0, 0])
                linear_extrude(height = _relevo())
                    polygon(points = logo_pts, paths = logo_paths);
}

union() {
    suporte();
    logo3d();
}
$scad$,
  '{
    "logo": {"param": "logo", "largura_param": "logo_largura"},
    "parameters": {
      "largura": {"ui": {"label": "Largura", "widget": "slider", "step": 1}, "min": 70, "max": 130, "unit": "mm", "order": 1, "default": 95},
      "profundidade": {"ui": {"label": "Profundidade da base", "widget": "slider", "step": 1}, "min": 20, "max": 50, "unit": "mm", "order": 2, "default": 35},
      "altura_parede": {"ui": {"label": "Altura da parede", "widget": "slider", "step": 1}, "min": 35, "max": 90, "unit": "mm", "order": 3, "default": 65},
      "altura_cartoes": {"ui": {"label": "Altura livre para os cartões", "widget": "slider", "step": 1}, "min": 15, "max": 45, "unit": "mm", "order": 4, "default": 30},
      "espessura": {"ui": {"label": "Espessura das paredes", "widget": "slider", "step": 0.5}, "min": 2, "max": 6, "unit": "mm", "order": 5, "default": 3},
      "lip_altura": {"ui": {"label": "Altura do lábio frontal", "widget": "slider", "step": 0.5}, "min": 3, "max": 12, "unit": "mm", "order": 6, "default": 6},
      "logo": {"ui": {"label": "Logótipo da empresa (opcional)", "widget": "image_upload", "accept": "image/png,image/jpeg,image/webp,image/svg+xml"}, "order": 7, "default": ""},
      "logo_largura": {"ui": {"label": "Largura do logótipo", "widget": "slider", "step": 1}, "min": 20, "max": 80, "unit": "mm", "order": 8, "default": 40},
      "relevo": {"ui": {"label": "Altura do relevo do logótipo", "widget": "slider", "step": 0.1}, "min": 0.4, "max": 2, "unit": "mm", "order": 9, "default": 1},
      "info_porta_cartoes": {"ui": {"text": "Carrega o teu logótipo (PNG/SVG com fundo transparente funciona melhor) — fica em relevo na parte de cima, acima dos cartões.", "widget": "info"}, "order": 99}
    }
  }'::jsonb
)
on conflict (id) do nothing;
