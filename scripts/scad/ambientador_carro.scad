// ── AMBIENTADOR PARA O CARRO ──
// Recipiente com tampa perfurada que abre com uma volta curta (baioneta de 3 patilhas, 60°;
// fecha no sentido dos ponteiros do relógio, com um clique no fim):
// abre-se, põe-se um disco de algodão com umas gotas de ambientador/óleo essencial, fecha-se.
// Fixação: clip para a grelha da ventilação (peça à parte, entra numa calha em cauda de
// andorinha no fundo), argola para pendurar no retrovisor, ou sem fixação.
// Texto opcional na tampa, embutido à face (com AMS sai noutra cor; sem AMS fica gravado).
// Tampa regulável (opcional): a tampa leva rasgos em raio e por cima roda um disco com os
// mesmos rasgos, preso por um pino de encaixe ao centro — alinhados = cheiro no máximo,
// desencontrados = quase fechado. Marcas na tampa: ponto = máximo, traço = mínimo.
//
// Tudo imprime sem suportes: o corpo com o fundo na mesa, a tampa com a face na mesa
// (já vem virada), o clip deitado de lado.
//
// Parâmetros:
//   forma            "Redonda" | "Hexagonal" | "Flor"
//   diametro         diâmetro (mm) — para a hexagonal/flor é o círculo inscrito
//   profundidade     altura livre para o algodão (mm)
//   padrao_furos     "Furos redondos" | "Ranhuras" | "Favo"
//   tamanho_furo     (mm)
//   furos_fundo      true/false — furos também no fundo (deixa passar o ar da ventilação)
//   regulador        "Sem regulador" | "Tampa regulável" (com regulador não há texto)
//   texto_tampa      "Sem texto" | "Com texto"
//   texto, fonte     texto na tampa (vazio → "Carro", para a peça do texto nunca sair vazia); esc_texto (0–1) vem do servidor
//                    (generation_schema.ajuste_texto) para caber
//   fixacao          "Clip para a grelha da ventilação" | "Argola para pendurar" | "Sem fixação"
//   espessura_grelha espessura da lâmina da grelha que o clip agarra (mm)
//   folga            folga da baioneta e da calha do clip (mm)
//   modo             "corpo" | "tampa" | "texto" | "clip" | "disco" | "tudo"

function _forma() = is_undef(forma) ? "Redonda" : forma;
function _D()     = is_undef(diametro) ? 50 : max(40, min(70, diametro));
function _prof()  = is_undef(profundidade) ? 8 : max(5, min(15, profundidade));
function _padrao()= is_undef(padrao_furos) ? "Furos redondos" : padrao_furos;
function _furo()  = is_undef(tamanho_furo) ? 3 : max(2, min(5, tamanho_furo));
function _fundoF()= is_undef(furos_fundo) ? true : (furos_fundo == true || furos_fundo == 1 || furos_fundo == "true");
function _reg()   = !is_undef(regulador) && regulador == "Tampa regulável";
function _comTxt()= !_reg() && !is_undef(texto_tampa) && texto_tampa == "Com texto";
function _txt()   = !_comTxt() ? "" : (is_undef(texto) || texto == "") ? "Carro" : texto;
function _fonte() = is_undef(fonte) ? "Luckiest Guy" : fonte;
function _esc()   = is_undef(esc_texto) ? 1 : max(0.2, min(1, esc_texto));
function _fix()   = is_undef(fixacao) ? "Clip para a grelha da ventilação" : fixacao;
function _clip()  = _fix() == "Clip para a grelha da ventilação";
function _argola()= _fix() == "Argola para pendurar";
function _grelha()= is_undef(espessura_grelha) ? 2 : max(0.8, min(4, espessura_grelha));
function _folga() = is_undef(folga) ? 0.25 : max(0.1, min(0.5, folga));
function _modo()  = is_undef(modo) ? "tudo" : modo;

$fn = 72;
PAREDE   = 2;      // parede do corpo
T_TAMPA  = 2;      // espessura da face da tampa
INLAY    = 0.6;    // profundidade do texto embutido
SAIA_E   = 2.2;    // espessura da saia da tampa
SAIA_H   = 5;      // altura da saia (para dentro do corpo)
LUG_D    = 1.0;    // quanto a patilha sai da parede
LUG_H    = 1.6;    // altura da patilha
LUG_ANG  = 24;     // largura da patilha (graus)
TOPO_LUG = 0.8;    // patilha acaba a 0,8 mm do bordo
ROT      = 60;     // quanto se roda para fechar (graus)
TAM_TXT  = 6;      // letra no diâmetro nominal (50 mm)
LARG_TXT = 34;     // largura útil do texto no nominal — igual a ajuste_texto.largura_util
DT_W0 = 6; DT_W1 = 8; DT_H = 1.6;   // calha do clip: largura na face, largura no fundo, altura
CLIP_W = 10;       // largura do clip (comprimento do trilho)
DENTE_L = 16;      // comprimento dos dentes do clip
N_RASGO = 8;       // regulador: rasgos em raio (de 45 em 45°)
A_RASGO = 20;      // largura de cada rasgo (graus) — 22,5° de rodar fecha tudo
DISCO_E = 1.6;     // espessura do disco
PINO_D  = 4;       // pino do disco

function _k()    = _D() / 50;
function _F()    = _clip() ? 1.6 + DT_H : 1.6;            // espessura do fundo
function _H()    = _F() + _prof();                          // altura do corpo
function _Ri()   = _D()/2 - PAREDE;                         // raio da cavidade
function _sro()  = _Ri() - _folga();                        // saia: raio exterior
function _sri()  = _sro() - SAIA_E;                         // saia: raio interior
function _zlug() = _H() - TOPO_LUG - LUG_H;                 // base da parte recta da patilha
function _tsize()= TAM_TXT * _k() * _esc();
function _r1()   = PINO_D/2 + 2.2;                         // regulador: rasgos de r1 a r2
function _r2()   = _sri() - 0.8;
function _rd()   = _r2() + 1.5;                             // raio do disco
function _banda()= _txt() == "" ? 0 : _tsize() * 1.5 + 2;  // faixa sem furos para o texto

// ---------- 2D ----------
module contorno2d() {
    R = _D()/2;
    if (_forma() == "Hexagonal") rotate(30) circle(R / cos(30), $fn = 6);
    else if (_forma() == "Flor")
        offset(r = -1.5) offset(r = 1.5) union() {
            circle(R);
            for (i = [0:5]) rotate(i*60 + 30) translate([R*0.88, 0]) circle(R*0.3);   // 6 pétalas: fechada (60°) alinha com o corpo
        }
    else difference() {
        circle(R);
        for (i = [0:11]) rotate(i*30) translate([R + 0.35, 0]) circle(0.9, $fn = 16);  // serrilha para rodar
    }
}

module setor(r, a0, a1) {   // fatia de pizza de a0 a a1 graus
    n = max(2, ceil((a1 - a0) / 4));
    polygon(concat([[0, 0]], [for (i = [0:n]) let(a = a0 + (a1 - a0)*i/n) r*[cos(a), sin(a)]]));
}

module padrao2d(rmax, excluirBanda = 0, excluirCalha = 0) {
    d = _furo(); s = d + 1.6;
    intersection() {
        circle(rmax);
        difference() {
            if (_padrao() == "Ranhuras")
                for (j = [-ceil(rmax/s):ceil(rmax/s)]) translate([0, j*s]) offset(r = d/2 - 0.01) square([2*rmax, 0.02], center = true);
            else if (_padrao() == "Favo")
                for (j = [-ceil(rmax/s):ceil(rmax/s)], i = [-ceil(rmax/s)-1:ceil(rmax/s)+1])
                    translate([(i + (j % 2 == 0 ? 0 : 0.5))*s*1.08, j*s*0.94]) rotate(30) circle(d*0.62, $fn = 6);
            else
                for (j = [-ceil(rmax/s):ceil(rmax/s)], i = [-ceil(rmax/s)-1:ceil(rmax/s)+1])
                    translate([(i + (j % 2 == 0 ? 0 : 0.5))*s, j*s*0.866]) circle(d/2, $fn = 20);
            if (excluirBanda > 0) rotate(ROT) square([4*rmax, excluirBanda], center = true);  // texto direito com a tampa fechada
            if (excluirCalha > 0) square([4*rmax, excluirCalha], center = true);
        }
    }
}

module rasgos2d() {   // regulador: rasgos em raio (iguais na tampa e no disco)
    difference() {
        circle(_r2());
        circle(_r1());
        for (i = [0:N_RASGO-1]) rotate(i*360/N_RASGO + A_RASGO) setor(_r2() + 1, 0, 360/N_RASGO - A_RASGO);
    }
}

module marcas2d() {   // ponto = rasgos alinhados (máximo), traço = desencontrados (mínimo)
    rm = (_rd() + _D()/2) / 2 - 0.3;
    for (i = [0:N_RASGO-1]) {
        rotate(90 + i*360/N_RASGO) translate([rm, 0]) circle(0.7, $fn = 16);
        rotate(90 + i*360/N_RASGO + 180/N_RASGO) translate([rm, 0]) square([2, 0.7], center = true);
    }
}

module texto2d() {
    if (_txt() != "")
        rotate(ROT) offset(delta = 0.01) text(_txt(), size = _tsize(), font = _fonte(), halign = "center", valign = "center");
}

// ---------- peças, na posição montada (corpo com o fundo em z=0) ----------
module patilha(a) {
    rotate(a - LUG_ANG/2) rotate_extrude(angle = LUG_ANG, $fn = 180)
        polygon([[_Ri() + 0.01, _zlug() - LUG_D], [_Ri() + 0.01, _zlug() + LUG_H],
                 [_Ri() - LUG_D, _zlug() + LUG_H], [_Ri() - LUG_D, _zlug()]]);   // chanfro a 45° por baixo
}

// trinco: saliência estreita em cima de cada patilha; arrasta no tecto da ranhura e,
// fechado, cai na cova da tampa (dá o "clique" e não deixa a tampa desapertar com a vibração)
module trinco(a) {
    zt = _H() - TOPO_LUG;
    rotate(a - 2) rotate_extrude(angle = 4, $fn = 180)
        polygon([[_Ri() + 0.01, zt - 0.01], [_Ri() + 0.01, zt + 0.4], [_Ri() - LUG_D + 0.3, zt + 0.4], [_Ri() - LUG_D + 0.3, zt - 0.01]]);
}

module calha() {   // cauda de andorinha no fundo, ao longo de X, aberta em -X e fechada a meio
    translate([-_D(), 0, -0.01]) rotate([90, 0, 90])
        linear_extrude(_D() + CLIP_W/2 + _folga())
            polygon([[-DT_W0/2, 0], [DT_W0/2, 0], [DT_W1/2, DT_H + 0.01], [-DT_W1/2, DT_H + 0.01]]);
}

module argola() {
    R = _D()/2; ro = 5; ri = 2.6;
    translate([0, R + ro - 1, 0]) linear_extrude(3) difference() {
        union() { circle(ro); translate([-ro, -ro - 2]) square([2*ro, ro + 2]); }
        circle(ri);
    }
}

module corpo() {
    difference() {
        union() {
            linear_extrude(_H()) contorno2d();
            if (_argola()) argola();
        }
        translate([0, 0, _F()]) cylinder(r = _Ri(), h = _H());
        if (_fundoF()) translate([0, 0, -1]) linear_extrude(_F() + 2)
            padrao2d(_Ri() - 1.5, 0, _clip() ? DT_W1 + 3 : 0);
        if (_clip()) calha();
    }
    for (i = [0:2]) { patilha(i*120); trinco(i*120); }
}

module ranhura_baioneta(a) {   // entrada vertical + ranhura horizontal, cortadas na saia
    ra = _Ri() - LUG_D - _folga();     // a ranhura vai deste raio para fora
    z0 = _zlug() - LUG_D - _folga();
    z1 = _H() - TOPO_LUG + _folga();
    rotate(a) {
        // entrada (de baixo até à ranhura)
        translate([0, 0, _H() - SAIA_H - 1]) linear_extrude(z1 - (_H() - SAIA_H - 1))
            difference() { setor(_D(), -LUG_ANG/2 - 2, LUG_ANG/2 + 2); circle(ra); }
        // ranhura (roda ROT graus e pára aí)
        translate([0, 0, z0]) linear_extrude(z1 - z0)
            difference() { setor(_D(), -LUG_ANG/2 - 2, LUG_ANG/2 + ROT + 0.5); circle(ra); }
        // cova do trinco no tecto da ranhura, na posição fechada
        translate([0, 0, z1 - 0.01]) linear_extrude(0.5)
            difference() { setor(_D(), ROT - 3, ROT + 3); circle(ra); }
    }
}

module tampa_toda() {   // tampa montada (face de z=H a H+T_TAMPA), sem o texto tirado
    difference() {
        union() {
            translate([0, 0, _H()]) linear_extrude(T_TAMPA) contorno2d();
            translate([0, 0, _H() - SAIA_H]) linear_extrude(SAIA_H + 0.01)
                difference() { circle(_sro()); circle(_sri()); }
        }
        for (i = [0:2]) ranhura_baioneta(i*120);
        translate([0, 0, _H() - 1]) linear_extrude(T_TAMPA + 2)
            if (_reg()) { rasgos2d(); circle(PINO_D/2 + _folga(), $fn = 32); }
            else padrao2d(_sri() - 0.8, _banda(), 0);
        if (_reg()) translate([0, 0, _H() + T_TAMPA - 0.4]) linear_extrude(1) marcas2d();
    }
}

// disco do regulador, montado em cima da tampa (rasgos alinhados = posição de origem), com
// uma patilha para rodar que aponta para as marcas e o pino de encaixe por baixo
module disco_m() {
    z0 = _H() + T_TAMPA + 0.2;
    translate([0, 0, z0]) linear_extrude(DISCO_E) difference() {
        union() {
            circle(_rd());
            rotate(90) hull() { translate([_rd() - 2, 0]) circle(2.2, $fn = 24); translate([_rd() + 1.2, 0]) circle(0.6, $fn = 12); }
        }
        rasgos2d();
    }
    // pino: haste pela tampa e cabeça cónica partida ao meio (encaixa por pressão e roda)
    difference() {
        union() {
            translate([0, 0, _H() - 0.15]) cylinder(d = PINO_D, h = z0 - _H() + 0.16, $fn = 32);
            translate([0, 0, _H() - 1.95]) cylinder(d1 = PINO_D - 0.6, d2 = PINO_D + 1.4, h = 1.8, $fn = 32);
        }
        translate([-0.6, -PINO_D, _H() - 2]) cube([1.2, 2*PINO_D, 2 + T_TAMPA - 0.4]);
    }
}

module texto3d() { translate([0, 0, _H() + T_TAMPA - INLAY]) linear_extrude(INLAY + 0.01) texto2d(); }
module tampa_m() { difference() { tampa_toda(); translate([0, 0, 0.005]) texto3d(); } }

module clip_perfil() {   // perfil do clip (u = através da calha, v = para fora do fundo)
    g = _grelha(); f = _folga(); e = 1.6;
    union() {
        // trilho (cauda de andorinha), um pouco mais pequeno que a calha
        polygon([[-DT_W0/2 + f, 0.2], [DT_W0/2 - f, 0.2], [DT_W1/2 - f, -DT_H + f], [-DT_W1/2 + f, -DT_H + f]]);
        translate([-2, 0]) square([4, 4.6]);                                    // pé
        translate([-(g/2 + e), 4]) square([g + 2*e, e]);                         // travessa
        for (s = [-1, 1]) {
            translate([s > 0 ? g/2 : -g/2 - e, 4]) square([e, DENTE_L]);         // dentes
            translate([s*(g/2 + 0.05), 4 + DENTE_L - 3.5]) circle(0.45, $fn = 16); // farpas
            hull() {                                                            // ponta aberta
                translate([s*(g/2 + e/2), 4 + DENTE_L - 0.01]) square([e, 0.02], center = true);
                translate([s*(g/2 + e/2 + 0.9), 4 + DENTE_L + 2]) circle(e/2, $fn = 16);
            }
        }
    }
}

// clip na posição montada: trilho dentro da calha, dentes para baixo (−z), centrado em x
module clip_m() {
    translate([-CLIP_W/2, 0, 0]) rotate([90, 0, 90]) linear_extrude(CLIP_W) mirror([0, 1]) clip_perfil();
}

// ---------- na mesa ----------
function _dx() = _D() + 12;
module na_mesa_tampa() { translate([_dx(), 0, _H() + T_TAMPA]) rotate([180, 0, 0]) children(); }
module na_mesa_disco() { translate([-_dx(), 0, _H() + T_TAMPA + 0.2 + DISCO_E]) rotate([180, 0, 0]) children(); }
module na_mesa_clip()  { translate([0, -_D()/2 - 32, 0]) linear_extrude(CLIP_W) rotate(180) clip_perfil(); }

if (_modo() == "corpo"  || _modo() == "tudo") corpo();
if (_modo() == "tampa"  || _modo() == "tudo") na_mesa_tampa() tampa_m();
if (_modo() == "texto"  || _modo() == "tudo") na_mesa_tampa() texto3d();
if ((_modo() == "disco" || _modo() == "tudo") && _reg()) na_mesa_disco() disco_m();
if ((_modo() == "clip"  || _modo() == "tudo") && _clip()) na_mesa_clip();
if (_modo() == "montado") { corpo(); rotate(-ROT) { tampa_m(); texto3d(); if (_reg()) disco_m(); } if (_clip()) clip_m(); }   // só para conferir
