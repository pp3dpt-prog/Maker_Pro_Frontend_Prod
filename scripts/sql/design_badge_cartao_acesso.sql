-- Novo design: Porta-Crachá para Cartão de Acesso (moldura + janela + aba com
-- furo + faixa de logótipo na base), para o catálogo /empresas. Criado como
-- rascunho (estado='rascunho') — rever no customizador e marcar como 'ativo'
-- no admin quando aprovado. Testado localmente com OpenSCAD (CLI) antes de
-- inserir: "Simple: yes", sem erros de malha, com e sem logótipo (faixa
-- "wordmark" larga e baixa na base — a aba de cima é só para o furo).
-- Revisão: a placa de trás passa a sólida (fechada) em vez de ter janela
-- também — só a frente mostra o cartão; mais rígido e protege o cartão.

insert into public.prod_designs
  (id, nome, familia, descricao, estado, usa_modo, mostrar_empresas, scad_template, generation_schema)
values (
  'badge_cartao_acesso',
  'Porta-Crachá para Cartão de Acesso',
  'Crachás',
  'Porta-crachá rígido para cartão de acesso, com furo para fita/clipe e faixa para o nome ou logótipo da empresa.',
  'rascunho',
  false,
  true,
  $scad$// ── PORTA-CRACHÁ PARA CARTÃO DE ACESSO (com nome/logótipo opcional) ──
// Moldura rígida com janela na frente para ver o cartão; a parte de trás é sólida
// (fechada), mais rígida e protege o cartão. Aberta por cima para inserir/retirar o
// cartão. Aba no topo com furo para fita/clipe. Faixa na base (a toda a largura)
// para o nome ou logótipo da empresa, em relevo.
// logo_pts / logo_paths / tem_logo vêm do servidor (lib/logo.js, generation_schema.logo).

function _Wc()     = is_undef(largura_cartao) ? 86 : largura_cartao;
function _Hc()      = is_undef(altura_cartao) ? 55 : altura_cartao;
function _folga()   = is_undef(folga) ? 1.2 : folga;
function _par()     = is_undef(parede) ? 1.6 : parede;
function _ladoL()   = is_undef(lado_lateral) ? 3 : lado_lateral;
function _baseH()   = is_undef(altura_base) ? 10 : altura_base;
function _mold()    = is_undef(moldura) ? 4 : moldura;
function _guia()    = is_undef(guia) ? 8 : guia;
function _abaH()    = is_undef(altura_aba) ? 14 : altura_aba;
function _abaW()    = is_undef(largura_aba) ? 20 : largura_aba;
function _furoD()   = is_undef(furo_d) ? 4 : furo_d;
function _relevo()  = is_undef(relevo) ? 0.8 : relevo;
function _logo()    = !is_undef(tem_logo) && tem_logo == true && !is_undef(logo_pts) && len(logo_pts) >= 3;

function _W()      = _Wc() + 2 * _ladoL();
function _Hframe() = _baseH() + _Hc() + _guia();
function _prof()   = 2 * _par() + _folga();

module frame2d() {
    difference() {
        square([_W(), _Hframe()]);
        translate([_ladoL() + _mold(), _baseH() + _mold()])
            square([_Wc() - 2 * _mold(), _Hc() - 2 * _mold()]);
    }
}

module parede_estrutural() {
    union() {
        cube([_W(), _prof(), _baseH()]);
        cube([_ladoL(), _prof(), _Hframe()]);
        translate([_W() - _ladoL(), 0, 0])
            cube([_ladoL(), _prof(), _Hframe()]);
    }
}

module placa_frontal() {
    translate([0, _par(), 0])
        rotate([90, 0, 0])
            linear_extrude(height = _par())
                frame2d();
}

module placa_traseira() {
    translate([0, _prof(), 0])
        rotate([90, 0, 0])
            linear_extrude(height = _par())
                square([_W(), _Hframe()]);
}

module aba() {
    translate([(_W() - _abaW()) / 2, 0, _Hframe()])
        cube([_abaW(), _prof(), _abaH()]);
}

module furo() {
    translate([_W() / 2, -1, _Hframe() + _abaH() / 2])
        rotate([-90, 0, 0])
            cylinder(d = _furoD(), h = _prof() + 2, $fn = 48);
}

module logo3d() {
    if (_logo())
        translate([_W() / 2, 0.05, _baseH() / 2])
            rotate([90, 0, 0])
                linear_extrude(height = _relevo())
                    polygon(points = logo_pts, paths = logo_paths);
}

difference() {
    union() {
        parede_estrutural();
        placa_frontal();
        placa_traseira();
        aba();
        logo3d();
    }
    furo();
}
$scad$,
  '{
    "logo": {"param": "logo", "largura_param": "logo_largura"},
    "parameters": {
      "largura_cartao": {"ui": {"label": "Largura do cartão", "widget": "slider", "step": 1}, "min": 80, "max": 95, "unit": "mm", "order": 1, "default": 86},
      "altura_cartao": {"ui": {"label": "Altura do cartão", "widget": "slider", "step": 1}, "min": 50, "max": 65, "unit": "mm", "order": 2, "default": 55},
      "folga": {"ui": {"label": "Folga para o cartão", "widget": "slider", "step": 0.1}, "min": 0.6, "max": 2.5, "unit": "mm", "order": 3, "default": 1.2},
      "parede": {"ui": {"label": "Espessura das placas frente/trás", "widget": "slider", "step": 0.1}, "min": 1, "max": 3, "unit": "mm", "order": 4, "default": 1.6},
      "lado_lateral": {"ui": {"label": "Largura da borda lateral", "widget": "slider", "step": 0.5}, "min": 2, "max": 6, "unit": "mm", "order": 5, "default": 3},
      "altura_base": {"ui": {"label": "Altura da faixa da base (logótipo)", "widget": "slider", "step": 1}, "min": 6, "max": 18, "unit": "mm", "order": 6, "default": 10},
      "moldura": {"ui": {"label": "Moldura visível à volta da janela", "widget": "slider", "step": 0.5}, "min": 2, "max": 8, "unit": "mm", "order": 7, "default": 4},
      "guia": {"ui": {"label": "Altura extra para facilitar a inserção", "widget": "slider", "step": 1}, "min": 3, "max": 20, "unit": "mm", "order": 8, "default": 8},
      "altura_aba": {"ui": {"label": "Altura da aba (furo)", "widget": "slider", "step": 1}, "min": 10, "max": 24, "unit": "mm", "order": 9, "default": 14},
      "largura_aba": {"ui": {"label": "Largura da aba (furo)", "widget": "slider", "step": 1}, "min": 14, "max": 34, "unit": "mm", "order": 10, "default": 20},
      "furo_d": {"ui": {"label": "Diâmetro do furo (fita/clipe)", "widget": "slider", "step": 0.5}, "min": 3, "max": 8, "unit": "mm", "order": 11, "default": 4},
      "logo": {"ui": {"label": "Nome ou logótipo da empresa (opcional)", "widget": "image_upload", "accept": "image/png,image/jpeg,image/webp,image/svg+xml"}, "order": 12, "default": ""},
      "logo_largura": {"ui": {"label": "Largura do logótipo", "widget": "slider", "step": 1}, "min": 20, "max": 70, "unit": "mm", "order": 13, "default": 50},
      "relevo": {"ui": {"label": "Altura do relevo do logótipo", "widget": "slider", "step": 0.1}, "min": 0.4, "max": 2, "unit": "mm", "order": 14, "default": 0.8},
      "info_badge": {"ui": {"text": "A faixa de baixo é larga e baixa — ideal para o nome da empresa (uma linha de texto/logótipo tipo \"wordmark\"), não para um símbolo alto.", "widget": "info"}, "order": 99}
    }
  }'::jsonb
)
on conflict (id) do nothing;
