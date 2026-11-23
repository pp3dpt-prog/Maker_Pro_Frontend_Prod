-- Design: Porta-Crachá com Dobradiça (tipo carteira), para o catálogo
-- /empresas. Estado 'rascunho' — rever no customizador e marcar como 'ativo'
-- no admin quando aprovado.
--
-- Histórico desta peça:
--  1. Primeira versão: moldura fixa (sem abrir), janela na frente, aba com
--     furo, faixa de logótipo na base.
--  2. Fechei a parte de trás (sólida) a pedido — só a frente mostra o cartão.
--  3. Esta versão: substitui tudo por um mecanismo de dobradiça tipo carteira
--     (abre/fecha muitas vezes) — duas placas ligadas por uma dobradiça de
--     "nós" alternados (barrel hinge), com um pino de filamento de 1,75mm
--     inserido depois de impresso (não uma dobradiça viva, que parte em PLA
--     com uso repetido). Testado localmente com OpenSCAD CLI: válido aberto
--     E fechado (simulei a dobra 180°), sem colisões. Logótipo removido
--     nesta versão — a decidir onde fica (pendente).

insert into public.prod_designs
  (id, nome, familia, descricao, estado, usa_modo, mostrar_empresas, scad_template, generation_schema)
values (
  'badge_cartao_acesso',
  'Porta-Crachá com Dobradiça',
  'Crachás',
  'Porta-crachá tipo carteira para cartão de acesso, com dobradiça de nós (pino de filamento) e janela para ver o cartão.',
  'rascunho',
  false,
  true,
  $scad$// ── PORTA-CRACHÁ TIPO CARTEIRA, COM DOBRADIÇA (abre/fecha) ──
// Duas placas (bandeja sólida + tampa com janela) ligadas por uma dobradiça de
// "nós" alternados (barrel hinge): imprime-se deitado, plano, e depois de
// impresso enfia-se um pedaço de filamento de 1,75 mm como pino, cortado à
// largura da peça — gira à vontade, sem o problema de fragilidade de uma
// dobradiça viva (parede fina a dobrar) em PLA.
// Os valores da dobradiça (raio dos nós, folgas, nº de nós) são fixos de
// propósito — não dependem dos parâmetros do cliente, para não partir o
// mecanismo. Testar o primeiro furo (pino_d) com a impressora: se o
// filamento não passar, aumentar para 2,3–2,5 mm.

function _Wc()   = is_undef(largura_cartao) ? 86 : largura_cartao;
function _Hc()   = is_undef(altura_cartao) ? 55 : altura_cartao;
function _rim_w()= is_undef(rebordo_largura) ? 2.5 : rebordo_largura;
function _rim_h()= is_undef(rebordo_altura) ? 1.2 : rebordo_altura;
function _esp()  = is_undef(espessura) ? 2 : espessura;
function _mold() = is_undef(moldura) ? 4 : moldura;
function _abaW() = is_undef(aba_largura) ? 24 : aba_largura;
function _abaH() = is_undef(aba_altura) ? 12 : aba_altura;
function _furoD()= is_undef(furo_d) ? 4 : furo_d;

// Constantes da dobradiça — fixas (não expostas ao cliente)
Rk = 3;
pino_d = 2.1;
n_nos = 5;
gap = 0.4;
margem_nos = 6;
g = 0.3;
margem_longe = 3;

function _W()  = _Wc() + 2 * _rim_w();
function _Dp() = _Hc() + margem_longe + _rim_w();
function _comp_no() = (_W() - 2 * margem_nos - (n_nos - 1) * gap) / n_nos;
function _x0(i) = margem_nos + i * (_comp_no() + gap);

module no(i) {
    translate([_x0(i), 0, Rk])
        rotate([0, 90, 0])
            difference() {
                cylinder(r = Rk, h = _comp_no(), $fn = 48);
                translate([0, 0, -1])
                    cylinder(d = pino_d, h = _comp_no() + 2, $fn = 24);
            }
}

module ponte(i, sinal) {
    translate([_x0(i), sinal > 0 ? 0 : -(Rk + g), 0])
        cube([_comp_no(), Rk + g, 2 * Rk]);
}

module dobradica(dono) {
    for (i = [0 : n_nos - 1])
        if ((dono == "A" && i % 2 == 0) || (dono == "B" && i % 2 == 1)) {
            no(i);
            ponte(i, dono == "A" ? 1 : -1);
        }
}

module bandeja() {
    union() {
        translate([0, Rk + g, 0]) cube([_W(), _Dp(), _esp()]);
        translate([0, Rk + g, _esp()]) cube([_rim_w(), _Dp(), _rim_h()]);
        translate([_W() - _rim_w(), Rk + g, _esp()]) cube([_rim_w(), _Dp(), _rim_h()]);
        translate([0, Rk + g + _Dp() - _rim_w(), _esp()]) cube([_W(), _rim_w(), _rim_h()]);
        dobradica("A");
        translate([(_W() - _abaW()) / 2, Rk + g + _Dp() - _rim_w(), 0])
            difference() {
                cube([_abaW(), _abaH(), _esp()]);
                translate([_abaW() / 2, _abaH() - _furoD(), _esp() / 2])
                    cylinder(d = _furoD(), h = _esp() + 2, center = true, $fn = 32);
            }
    }
}

module tampa() {
    union() {
        difference() {
            translate([0, -(Rk + g) - _Dp(), 0]) cube([_W(), _Dp(), _esp()]);
            translate([_mold(), -(Rk + g) - _Dp() + _mold(), -1])
                cube([_W() - 2 * _mold(), _Dp() - 2 * _mold(), _esp() + 2]);
        }
        dobradica("B");
    }
}

union() {
    bandeja();
    tampa();
}
$scad$,
  '{
    "parameters": {
      "largura_cartao": {"ui": {"label": "Largura do cartão", "widget": "slider", "step": 1}, "min": 80, "max": 95, "unit": "mm", "order": 1, "default": 86},
      "altura_cartao": {"ui": {"label": "Altura do cartão", "widget": "slider", "step": 1}, "min": 50, "max": 65, "unit": "mm", "order": 2, "default": 55},
      "espessura": {"ui": {"label": "Espessura das placas", "widget": "slider", "step": 0.1}, "min": 1.2, "max": 3, "unit": "mm", "order": 3, "default": 2},
      "rebordo_largura": {"ui": {"label": "Largura do rebordo", "widget": "slider", "step": 0.5}, "min": 1.5, "max": 5, "unit": "mm", "order": 4, "default": 2.5},
      "rebordo_altura": {"ui": {"label": "Altura do rebordo (espessura do cartão + folga)", "widget": "slider", "step": 0.1}, "min": 0.6, "max": 2.5, "unit": "mm", "order": 5, "default": 1.2},
      "moldura": {"ui": {"label": "Moldura à volta da janela", "widget": "slider", "step": 0.5}, "min": 2, "max": 8, "unit": "mm", "order": 6, "default": 4},
      "aba_largura": {"ui": {"label": "Largura da aba (furo)", "widget": "slider", "step": 1}, "min": 16, "max": 34, "unit": "mm", "order": 7, "default": 24},
      "aba_altura": {"ui": {"label": "Altura da aba (furo)", "widget": "slider", "step": 1}, "min": 8, "max": 20, "unit": "mm", "order": 8, "default": 12},
      "furo_d": {"ui": {"label": "Diâmetro do furo (fita/clipe)", "widget": "slider", "step": 0.5}, "min": 3, "max": 8, "unit": "mm", "order": 9, "default": 4},
      "info_dobradica": {"ui": {"text": "Imprime-se deitado/plano. Depois de impresso, corta-se um pedaço de filamento de 1,75mm à largura da peça e enfia-se pelos furos da dobradiça (o \"nó\" ao centro) como pino — é isso que permite abrir e fechar muitas vezes. Sem logótipo nesta versão.", "widget": "info"}, "order": 99}
    }
  }'::jsonb
)
on conflict (id) do update set
  nome = excluded.nome,
  descricao = excluded.descricao,
  scad_template = excluded.scad_template,
  generation_schema = excluded.generation_schema;
