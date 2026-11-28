/**
 * Termoformagem / Prensagem manual — partilhado TAL E QUAL entre o backend
 * (Maker_Pro_Docker_Prod/app/termoformagem.js) e o frontend (Maker_Pro_Frontend_Prod/
 * lib/termoformagem.js): a pré-visualização no browser é exatamente o que sai no download.
 *
 * Dois modelos (params.modelo, ou o gerador do design):
 *
 *  • "kit" (gerador termoformagem-molde) — kit de molde para folha de plástico comprada
 *    (PETG/PVC/acetato): molde macho, molde fêmea (com ventilação) e moldura em 2 peças
 *    (com pinos) para prender a folha. A forma vem de uma imagem/SVG carregada ou de uma
 *    forma pronta (app/formasTermo.js). Com imagem a várias cores, as cores (menos a de fundo)
 *    podem sair em RELEVO por cima da forma.
 *
 *  • "enfeite" (gerador termoformagem-enfeite) — enfeite em 2 metades iguais, com a folha
 *    IMPRESSA em rede (malha hexagonal) e um contorno liso para unir à outra metade: moldes em
 *    cúpula, duas folhas (A com rosca, B com furo passante, na lingueta de cima) e o parafuso
 *    com argola que as une e serve para pendurar — uma peça só.
 *
 * Geometria em "fatias" (regiões 2D do Clipper extrudidas em z — vetorGeom.js:
 * fatiasParaTriangulos). Inclinações e cúpulas são aproximadas por muitas fatias finas (o mesmo
 * "staircase" com que o slicer imprime superfícies inclinadas).
 *
 * Molde fêmea: imprime-se com a cavidade virada para cima e depois VIRA-SE por cima do macho
 * (rotação de 180° em torno do eixo Y: x → −x, z → −z). Por isso a cavidade é o macho
 * ESPELHADO em x e INVERTIDO em z (junto à base da fêmea fica o topo do macho), alargado da
 * espessura da folha. Pinos nos cantos do macho entram em furos na fêmea e alinham os dois.
 */
import ClipperLib from 'clipper-lib';
import { fatiasParaTriangulos } from './vetorGeom.js';
import { formaPronta, FORMAS_TERMO } from './formasTermo.js';

const ESC = 1000; // Clipper em inteiros: 1 unidade = 1 µm
const C = ClipperLib;
const FILL_NZ = C.PolyFillType.pftNonZero;
const FILL_EO = C.PolyFillType.pftEvenOdd;
const TAU = Math.PI * 2;

function executar(tipo, sujeito, recorte = [], fill = FILL_NZ) {
  const c = new C.Clipper();
  if (sujeito.length) c.AddPaths(sujeito, C.PolyType.ptSubject, true);
  if (recorte.length) c.AddPaths(recorte, C.PolyType.ptClip, true);
  const sol = new C.Paths();
  c.Execute(tipo, sol, fill, fill);
  return sol;
}
const uniao = (a, b = [], fill = FILL_NZ) => executar(C.ClipType.ctUnion, a, b, fill);
const diferenca = (a, b) => (b.length && a.length ? executar(C.ClipType.ctDifference, a, b) : a);
const intersecao = (a, b) => (a.length && b.length ? executar(C.ClipType.ctIntersection, a, b) : []);

function offset(paths, mm, arcoMm = 0.05) {
  if (!paths.length || Math.abs(mm) < 1e-4) return paths;
  const co = new C.ClipperOffset(2, arcoMm * ESC);
  co.AddPaths(paths, C.JoinType.jtRound, C.EndType.etClosedPolygon);
  const out = new C.Paths();
  co.Execute(out, mm * ESC);
  return out;
}
const area = (paths) => paths.reduce((s, q) => s + C.Clipper.Area(q), 0) / (ESC * ESC);

function aneisParaPaths(aneis, s, H) {
  return aneis.map(a => {
    const p = [];
    for (let i = 0; i < a.length; i += 2) p.push({ X: Math.round(a[i] * s * ESC), Y: Math.round((H - a[i + 1]) * s * ESC) });
    return p;
  });
}

const P = (x, y) => ({ X: Math.round(x * ESC), Y: Math.round(y * ESC) });
function circulo(cx, cy, r, seg = 24) {
  const p = [];
  for (let i = 0; i < seg; i++) { const a = (i / seg) * TAU; p.push(P(cx + r * Math.cos(a), cy + r * Math.sin(a))); }
  return p;
}
function bbox(paths) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const q of paths) for (const pt of q) {
    if (pt.X < minX) minX = pt.X; if (pt.X > maxX) maxX = pt.X;
    if (pt.Y < minY) minY = pt.Y; if (pt.Y > maxY) maxY = pt.Y;
  }
  return { minX: minX / ESC, minY: minY / ESC, maxX: maxX / ESC, maxY: maxY / ESC, w: (maxX - minX) / ESC, h: (maxY - minY) / ESC };
}
const retangulo = (minX, minY, maxX, maxY) => [[P(minX, minY), P(maxX, minY), P(maxX, maxY), P(minX, maxY)]];
/** Espelho em x (x → −x), mantendo a orientação dos anéis. */
const espelhoX = (paths) => paths.map(q => q.map(p => ({ X: -p.X, Y: p.Y })).reverse());

const num = (v, def, min, max) => {
  const n = Number(v);
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : def));
};
const liga = (v, def) => (v === undefined || v === null || v === '' ? def : !(v === 0 || v === '0' || v === false || v === 'nao'));

export const FAMILIA_TERMO = 'termoformagem';
export const GERADOR_KIT = 'termoformagem-molde';
export const GERADOR_ENFEITE = 'termoformagem-enfeite';

/** Rosca do parafuso/porca do enfeite (mm). Impressa de pé: aguenta bem em PLA/PETG. */
export const ROSCA = { dMaior: 8, passo: 2, prof: 1.0, folga: 0.25, seg: 64 };

export function termoGeometria(p, modeloForcado = null) {
  const modelo = modeloForcado ?? (p?.modelo === 'enfeite' ? 'enfeite' : 'kit');
  const enfeite = modelo === 'enfeite';
  const alturaMm = num(p?.altura_mm, enfeite ? 18 : 20, 5, 50);
  return {
    modelo,
    fonte: p?.fonte === 'imagem' ? 'imagem' : p?.fonte === 'pronta' ? 'pronta' : null,
    forma: typeof p?.forma === 'string' && FORMAS_TERMO[p.forma] ? p.forma : (enfeite ? 'bola_natal' : 'coracao'),
    larguraMm: num(p?.largura_mm, enfeite ? 80 : 60, 20, 200),
    alturaMm,                                                    // profundidade da forma (altura do macho)
    perfil: enfeite ? 'cupula' : (p?.perfil === 'cupula' ? 'cupula' : 'saida'),
    espChapaMm: enfeite ? num(p?.espessura_folha_mm, 0.8, 0.4, 2) : num(p?.espessura_chapa_mm, 0.5, 0.2, 2),
    contornoMm: num(p?.contorno_mm, enfeite ? 14 : 10, 5, 30),   // margem lisa à volta da forma
    espBaseMm: num(p?.espessura_base_mm, 4, 2, 10),
    draftGraus: num(p?.draft_graus, 5, 0, 15),
    raioTopoMm: Math.min(num(p?.raio_topo_mm, 1.5, 0, 4), alturaMm * 0.4),
    relevoMm: enfeite ? 0 : num(p?.relevo_mm, 0, 0, 8),          // cores em relevo por cima da forma (só imagem)
    pinos: liga(p?.pinos, true),
    molduraLargMm: num(p?.moldura_largura_mm, 18, 10, 35),
    molduraEspMm: num(p?.espessura_moldura_mm, 4, 2, 8),
    furoVentMm: num(p?.furo_ventilacao_mm, 1.2, 0.8, 2),
    passoVentMm: num(p?.espaco_ventilacao_mm, 8, 4, 15),
    // enfeite
    abaMm: num(p?.aba_mm, 6, 3, 15),                             // contorno liso da folha (união das metades)
    celulaMm: num(p?.celula_mm, 6, 3, 15),                       // malha hexagonal da folha
    hasteMm: num(p?.haste_mm, 1.2, 0.8, 3),
    bossMm: num(p?.altura_rosca_mm, 5, 3, 10),                   // altura do reforço da rosca na lingueta
  };
}

// ── Silhueta ────────────────────────────────────────────────────────────────

/** Silhueta (e regiões de relevo) em mm, centradas na origem. */
function fonteForma(vetor, g) {
  const usaImagem = g.fonte === 'imagem' || (g.fonte === null && vetor);
  if (usaImagem) {
    if (!vetor) throw Object.assign(new Error('Carrega uma imagem/SVG ou escolhe uma forma pronta.'), { status: 400 });
    const bb = vetor.ancoras?.bbox;
    const larguraPx = bb ? Math.max(1, bb[2] - bb[0] + 1) : vetor.w;
    const s = g.larguraMm / larguraPx;
    const H = vetor.h;
    let silhueta = uniao(aneisParaPaths(vetor.silhueta, s, H), [], FILL_EO);
    if (!silhueta.length) throw Object.assign(new Error('Não foi possível extrair uma forma da imagem/SVG carregado.'), { status: 400 });
    // cores: a de maior área é o "fundo" da forma; as outras podem sair em relevo
    const cores = (vetor.cores ?? []).map(c => uniao(aneisParaPaths(c.aneis, s, H), [], FILL_EO)).filter(r => r.length);
    let relevo = [];
    if (cores.length > 1) {
      const iFundo = cores.reduce((m, r, i) => (area(r) > area(cores[m]) ? i : m), 0);
      relevo = uniao(cores.filter((_, i) => i !== iFundo).flat());
    }
    const { minX, minY, maxX, maxY } = bbox(silhueta);
    const dx = Math.round(((minX + maxX) / 2) * ESC), dy = Math.round(((minY + maxY) / 2) * ESC);
    const mv = (paths) => paths.map(q => q.map(pt => ({ X: pt.X - dx, Y: pt.Y - dy })));
    return { silhueta: mv(silhueta), relevo: mv(relevo), origem: 'imagem' };
  }
  return { silhueta: formaPronta(g.forma, g.larguraMm), relevo: [], origem: 'pronta' };
}

/** Raio da maior circunferência inscrita (aprox.): o maior recuo que ainda deixa forma. */
function raioInscrito(sil) {
  let lo = 0, hi = Math.max(bbox(sil).w, bbox(sil).h) / 2;
  for (let k = 0; k < 14; k++) {
    const m = (lo + hi) / 2;
    if (offset(sil, -m, 0.3).length) lo = m; else hi = m;
  }
  return lo;
}

// ── Macho: secção a cada altura ──────────────────────────────────────────────

/** Recuo do contorno do macho à altura z (0 = base da forma). */
function recuoNaAltura(z, g, rIn) {
  if (g.perfil === 'cupula') {
    const t = Math.min(0.995, Math.max(0, z / g.alturaMm));
    return rIn * (1 - Math.sqrt(1 - t * t));
  }
  const draft = z * Math.tan((g.draftGraus * Math.PI) / 180);
  const zFilete = g.alturaMm - g.raioTopoMm;
  if (g.raioTopoMm <= 0 || z <= zFilete) return draft;
  const t = (z - zFilete) / g.raioTopoMm;
  return draft + g.raioTopoMm * (1 - Math.cos((t * Math.PI) / 2));
}

/**
 * Fatias da forma do macho (z a partir do topo da base): o corpo (com o ângulo de saída ou em
 * cúpula) e, se houver, o relevo das cores por cima. Cada fatia guarda `zm` (altura média).
 */
function fatiasForma(sil, relevoBruto, g, final) {
  const rIn = g.perfil === 'cupula' ? raioInscrito(sil) : 0;
  const NS = final ? (g.perfil === 'cupula' ? 48 : 36) : (g.perfil === 'cupula' ? 14 : 10);
  const out = [];
  for (let i = 0; i < NS; i++) {
    // na cúpula as fatias ficam mais finas em cima (onde a superfície é mais deitada)
    const f = (k) => (g.perfil === 'cupula' ? Math.sin((k / NS) * (Math.PI / 2)) : k / NS);
    const z0 = f(i) * g.alturaMm, z1 = f(i + 1) * g.alturaMm, zm = (z0 + z1) / 2;
    const regiao = offset(sil, -recuoNaAltura(zm, g, rIn));
    if (regiao.length) out.push({ z0, z1, zm, regiao });
  }
  let relevo = [];
  if (g.relevoMm > 0 && relevoBruto.length && g.perfil !== 'cupula') {
    const topo = out.length ? out[out.length - 1].regiao : [];
    relevo = offset(offset(intersecao(relevoBruto, offset(topo, -0.6)), -0.3), 0.3);   // sem fiapos
    const NR = final ? 8 : 3;
    const tan = Math.tan((Math.max(g.draftGraus, 3) * Math.PI) / 180);
    for (let i = 0; i < NR && relevo.length; i++) {
      const z0 = g.alturaMm + (i / NR) * g.relevoMm, z1 = g.alturaMm + ((i + 1) / NR) * g.relevoMm, zm = (z0 + z1) / 2;
      const regiao = offset(relevo, -(zm - g.alturaMm) * tan);
      if (regiao.length) out.push({ z0, z1, zm, regiao });
    }
  }
  return { fatias: out, alturaTotal: out.length ? out[out.length - 1].z1 : g.alturaMm, temRelevo: relevo.length > 0, rIn };
}

/** Pontos ao longo do contorno de `paths`, de `passo` em `passo` mm. */
function pontosNoContorno(paths, passo) {
  const out = [];
  for (const q of paths) {
    let resto = 0;
    for (let k = 0; k < q.length; k++) {
      const A = q[k], B = q[(k + 1) % q.length];
      const L = Math.hypot(B.X - A.X, B.Y - A.Y) / ESC;
      let t = resto;
      while (t < L) { out.push([(A.X + (B.X - A.X) * (t / L)) / ESC, (A.Y + (B.Y - A.Y) * (t / L)) / ESC]); t += passo; }
      resto = t - L;
    }
  }
  return out;
}

/**
 * Ventilação da fêmea (coordenadas do MACHO; a fêmea espelha-as): colunas verticais de furos
 * finos. Grelha dentro da forma + uma fiada ao longo das arestas de cima (onde o ar fica preso
 * nos cantos) e à volta do relevo.
 */
function pontosVentilacao(sil, forma, g) {
  const r = g.furoVentMm / 2;
  const dentro = offset(sil, -(g.furoVentMm + r));
  if (!dentro.length) return [];
  const pts = [];
  const { minX, minY, maxX, maxY } = bbox(sil);
  const nx = Math.floor((maxX - minX) / g.passoVentMm), ny = Math.floor((maxY - minY) / g.passoVentMm);
  const x0 = (minX + maxX) / 2 - (nx / 2) * g.passoVentMm, y0 = (minY + maxY) / 2 - (ny / 2) * g.passoVentMm;
  for (let i = 0; i <= nx; i++) for (let j = 0; j <= ny; j++) pts.push([x0 + i * g.passoVentMm, y0 + j * g.passoVentMm]);
  // fiada nas arestas do topo da forma e do relevo (cantos fundos da cavidade da fêmea)
  const corpo = forma.fatias.filter(f => f.zm <= g.alturaMm);
  const topo = corpo.length ? corpo[corpo.length - 1].regiao : [];
  const arestas = [offset(topo, -(r + 0.6))];
  const rel = forma.fatias.filter(f => f.zm > g.alturaMm);
  if (rel.length) arestas.push(offset(rel[rel.length - 1].regiao, -(r + 0.4)));
  for (const a of arestas) pts.push(...pontosNoContorno(a, Math.max(3, g.passoVentMm * 0.6)));
  const dentroPt = (x, y) => dentro.some(poly => C.Clipper.PointInPolygon(P(x, y), poly) !== 0);
  // sem furos colados uns aos outros
  const escolhidos = [];
  const minD2 = (g.furoVentMm * 2.2) ** 2;
  for (const [x, y] of pts) {
    if (!dentroPt(x, y)) continue;
    if (escolhidos.some(([a, b]) => (a - x) ** 2 + (b - y) ** 2 < minD2)) continue;
    escolhidos.push([x, y]);
  }
  return escolhidos;
}

// ── Peças ───────────────────────────────────────────────────────────────────

const PINO_D = 5, PINO_FOLGA = 0.6, PINO_MARGEM = 7;

/**
 * Macho + fêmea para uma silhueta. `extras`: regiões que têm de caber na base (lingueta do
 * enfeite); `bolsas`: círculos [x, y, r] (coords do macho) a furar na fêmea (reforço da rosca).
 */
function moldes(sil, relevo, g, final, { extras = [], bolsas = [] } = {}) {
  const forma = fatiasForma(sil, relevo, g, final);
  const Hf = forma.alturaTotal;
  const margem2d = uniao(offset(sil, g.contornoMm, 0.2), extras);
  const bb = bbox(margem2d);
  const m = g.pinos ? PINO_MARGEM + PINO_D : 2;
  // base retangular SIMÉTRICA (para o espelho da fêmea coincidir com o macho)
  const hx = Math.max(Math.abs(bb.minX), Math.abs(bb.maxX)) + m, hy = Math.max(Math.abs(bb.minY), Math.abs(bb.maxY)) + m;
  const base = retangulo(-hx, -hy, hx, hy);
  const pinos = g.pinos ? [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([sx, sy]) => [sx * (hx - PINO_MARGEM), sy * (hy - PINO_MARGEM)]) : [];
  const alturaPino = g.espChapaMm + 3;

  // Macho
  const macho = [{ z0: 0, z1: g.espBaseMm, regiao: base }];
  for (const f of forma.fatias) macho.push({ z0: g.espBaseMm + f.z0, z1: g.espBaseMm + f.z1, regiao: f.regiao });
  if (pinos.length) macho.push({ z0: g.espBaseMm, z1: g.espBaseMm + alturaPino, regiao: uniao(pinos.map(([x, y]) => circulo(x, y, PINO_D / 2, 32))) });

  // Fêmea (coordenadas da fêmea = macho espelhado em x; z invertido na forma)
  const vent = pontosVentilacao(sil, forma, g);
  const furos = uniao([
    ...vent.map(([x, y]) => circulo(-x, y, g.furoVentMm / 2, 12)),
    ...pinos.map(([x, y]) => circulo(-x, y, (PINO_D + PINO_FOLGA) / 2, 32)),
    ...bolsas.map(([x, y, r]) => circulo(-x, y, r, 32)),
  ]);
  const femea = [{ z0: 0, z1: g.espBaseMm, regiao: diferenca(base, furos) }];
  for (const f of forma.fatias) {
    const cavidade = espelhoX(offset(f.regiao, g.espChapaMm));
    femea.push({ z0: g.espBaseMm + (Hf - f.z1), z1: g.espBaseMm + (Hf - f.z0), regiao: diferenca(diferenca(base, cavidade), furos) });
  }
  return { macho, femea, forma, base, hx, hy, Hf, nVent: vent.length, alturaPino };
}

/** Moldura em 2 peças (baixo com pinos, cima com furos) que prende a folha comprada. */
function molduras(hx, hy, g) {
  const gap = 3;
  const wx = hx + gap, wy = hy + gap, ox = wx + g.molduraLargMm, oy = wy + g.molduraLargMm;
  const aro = diferenca(retangulo(-ox, -oy, ox, oy), retangulo(-wx, -wy, wx, wy));
  const mx = (wx + ox) / 2, my = (wy + oy) / 2;
  const pts = [[-mx, -my], [mx, -my], [mx, my], [-mx, my], [0, -my], [0, my]];
  const d = Math.min(5, g.molduraLargMm * 0.35);
  const baixo = [{ z0: 0, z1: g.molduraEspMm, regiao: aro },
    { z0: g.molduraEspMm, z1: g.molduraEspMm + g.espChapaMm + g.molduraEspMm * 0.7, regiao: uniao(pts.map(([x, y]) => circulo(x, y, d / 2, 28))) }];
  const cima = [{ z0: 0, z1: g.molduraEspMm, regiao: diferenca(aro, uniao(pts.map(([x, y]) => circulo(x, y, (d + 0.6) / 2, 28)))) }];
  return { baixo, cima, janela: [wx, wy] };
}

/** Peça formada (pré-visualização): casca com a espessura da folha por cima do macho. */
function pecaFormada(sil, forma, g, alargar = 0) {
  const out = [{ z0: -g.espChapaMm, z1: 0, regiao: diferenca(offset(sil, g.contornoMm * 0.7 + alargar), offset(sil, g.espChapaMm)) }];
  const fs = forma.fatias;
  for (let i = 0; i < fs.length; i++) {
    const f = fs[i];
    const casca = diferenca(offset(f.regiao, g.espChapaMm), f.regiao);
    if (casca.length) out.push({ z0: f.z0, z1: f.z1, regiao: casca });
    // o "teto" de cada degrau: o que a fatia seguinte já não cobre
    const seg = fs[i + 1]?.regiao ?? [];
    const teto = diferenca(offset(f.regiao, g.espChapaMm), seg.length ? offset(seg, g.espChapaMm) : []);
    if (teto.length) out.push({ z0: f.z1, z1: f.z1 + g.espChapaMm, regiao: diferenca(teto, seg) });
  }
  return out;
}

// ── Enfeite: folha em rede, lingueta com rosca e parafuso com argola ─────────

/** Raio do perfil da rosca (trapezoidal) no ângulo a, à altura z. */
function raioRosca(a, z, rMaior, R = ROSCA) {
  let u = (a / TAU - z / R.passo) % 1;
  if (u < 0) u += 1;
  // crista [0, .15], flanco ↓ [.15, .5], raiz [.5, .65], flanco ↑ [.65, 1]
  const s = u < 0.15 ? 0 : u < 0.5 ? (u - 0.15) / 0.35 : u < 0.65 ? 1 : 1 - (u - 0.65) / 0.35;
  return rMaior - R.prof * s;
}
function seccaoRosca(cx, cy, z, rMaior, R = ROSCA) {
  const q = [];
  for (let i = 0; i < R.seg; i++) {
    const a = (i / R.seg) * TAU, r = raioRosca(a, z, rMaior, R);
    q.push(P(cx + r * Math.cos(a), cy + r * Math.sin(a)));
  }
  return q;
}
/** Fatias de um furo roscado (para subtrair) entre z0 e z1. */
function fatiasFuroRosca(cx, cy, z0, z1, final, R = ROSCA) {
  const dz = final ? 0.2 : 0.6;
  const n = Math.max(1, Math.ceil((z1 - z0) / dz));
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = z0 + ((z1 - z0) * i) / n, b = z0 + ((z1 - z0) * (i + 1)) / n;
    out.push({ z0: a, z1: b, furo: [seccaoRosca(cx, cy, (a + b) / 2, R.dMaior / 2 + R.folga, R)] });
  }
  return out;
}

/** Hexágonos da malha (furos da rede) dentro de `zona`. */
function malhaHex(zona, g) {
  const c = g.celulaMm, h = g.hasteMm;
  const rHex = (c - h) / Math.sqrt(3);          // raio do furo (entre vértices)
  if (rHex < 0.6) return [];
  const { minX, minY, maxX, maxY } = bbox(zona);
  const dy = (c * Math.sqrt(3)) / 2;
  const furos = [];
  for (let j = 0, y = minY - c; y <= maxY + c; j++, y += dy) {
    for (let x = minX - c + (j % 2 ? c / 2 : 0); x <= maxX + c; x += c) {
      const hex = [];
      for (let k = 0; k < 6; k++) { const a = Math.PI / 6 + (k * TAU) / 6; hex.push(P(x + rHex * Math.cos(a), y + rHex * Math.sin(a))); }
      furos.push(hex);
    }
  }
  // só a parte dos furos dentro da zona, e sem lascas (deixam hastes partidas)
  const dentro = intersecao(uniao(furos), zona);
  return dentro.filter(q => Math.abs(C.Clipper.Area(q)) > 0.6 * rHex * rHex * ESC * ESC);
}

/** Lingueta de cima da folha (onde fica a rosca): região + centro do reforço. */
function lingueta(sil, g) {
  const { maxY } = bbox(sil);
  // meio do topo da forma (média dos pontos a menos de 0,5 mm do ponto mais alto)
  let sx = 0, n = 0;
  for (const q of sil) for (const p of q) if (p.Y / ESC >= maxY - 0.5) { sx += p.X / ESC; n++; }
  const xt = n ? sx / n : 0;
  const rBoss = ROSCA.dMaior / 2 + 2.6;
  const cy = maxY + g.abaMm + rBoss + 0.5;
  const regiao = uniao([retangulo(xt - rBoss, maxY - 2, xt + rBoss, cy)[0], circulo(xt, cy, rBoss, 48)]);
  return { regiao, cx: xt, cy, rBoss };
}

function folhaEmRede(sil, g, lig, comRosca, final) {
  const contorno = uniao(offset(sil, g.abaMm, 0.1), lig.regiao);
  const furosRede = malhaHex(offset(sil, -g.hasteMm * 0.5), g);
  const t = g.espChapaMm;
  const furoLiso = [circulo(lig.cx, lig.cy, ROSCA.dMaior / 2 + 0.4, 48)];
  const out = [];
  const corpo = diferenca(contorno, furosRede);
  if (comRosca) {
    // folha e reforço com furo roscado (fatias finas para seguir a hélice)
    const zonaRosca = [circulo(lig.cx, lig.cy, lig.rBoss, 48)];
    out.push({ z0: 0, z1: t, regiao: diferenca(corpo, zonaRosca) });
    for (const f of fatiasFuroRosca(lig.cx, lig.cy, 0, t + g.bossMm, final)) {
      out.push({ z0: f.z0, z1: f.z1, regiao: diferenca(zonaRosca, f.furo) });
    }
  } else {
    out.push({ z0: 0, z1: t, regiao: diferenca(corpo, furoLiso) });
    out.push({ z0: t, z1: t + g.bossMm, regiao: diferenca([circulo(lig.cx, lig.cy, lig.rBoss, 48)], furoLiso) });
  }
  return out;
}

/** Parafuso com argola (de pé: cabeça e argola deitadas na mesa, haste roscada para cima). */
function parafusoArgola(g, final) {
  const R = ROSCA, rCab = R.dMaior / 2 + 2.6, hCab = 2.4;
  const argola = diferenca([circulo(0, rCab + 5, 7, 48)], [circulo(0, rCab + 5, 3.5, 32)]);
  const out = [{ z0: 0, z1: hCab, regiao: uniao([circulo(0, 0, rCab, 48)], argola) }];
  // atravessa a folha B + reforço B + folha A + reforço A (fica 0,6 mm aquém do fim)
  const L = 2 * (g.espChapaMm + g.bossMm) - 0.6;
  const dz = final ? 0.2 : 0.6;
  const n = Math.ceil(L / dz);
  for (let i = 0; i < n; i++) {
    const a = (L * i) / n, b = (L * (i + 1)) / n, zm = (a + b) / 2;
    const chanfro = Math.max(0, zm - (L - 0.8));     // ponta chanfrada, entra melhor
    out.push({ z0: hCab + a, z1: hCab + b, regiao: [seccaoRosca(0, 0, zm, R.dMaior / 2 - 0.1 - chanfro, R)] });
  }
  return { fatias: out, comprimento: L };
}

/** A forma é simétrica esquerda/direita? (as 2 metades do enfeite usam o mesmo molde) */
function simetrica(sil) {
  const xor = executar(C.ClipType.ctXor, sil, espelhoX(sil));
  return Math.abs(area(xor)) < 0.02 * Math.abs(area(sil));
}

// ── Entrada única ────────────────────────────────────────────────────────────

const COR = { macho: '#e9b96e', femea: '#6ea8e9', moldura: '#9e9e9e', folha: '#f472b6', folhaB: '#c084fc', parafuso: '#facc15', formada: '#bfe3ff' };

/**
 * Gera todas as peças. `vetor`: resultado de vetorizarImagem (ou null para forma pronta).
 * Devolve { g, pecas: [{ id, ficheiro, nome, cor, fatias, tris }], formada, info, avisos,
 * macho, femea, moldura } — macho/femea/moldura (triângulos) mantidos por compatibilidade.
 */
export function gerarTermoformagem(vetor, params, { final = true, modelo = null } = {}) {
  const g = termoGeometria(params, modelo);
  const { silhueta, relevo, origem } = fonteForma(vetor, g);
  const avisos = [];
  const pecas = [];
  const add = (id, ficheiro, nome, cor, fatias) => pecas.push({ id, ficheiro, nome, cor, fatias, tris: fatiasParaTriangulos(fatias) });
  const bbS = bbox(silhueta);
  let info = {};

  if (g.modelo === 'enfeite') {
    const lig = lingueta(silhueta, g);
    const bolsas = [[lig.cx, lig.cy, lig.rBoss + 0.8]];
    const M = moldes(silhueta, [], g, final, { extras: [offset(lig.regiao, 2)].flat(), bolsas });
    add('macho', 'macho.stl', 'Molde macho', COR.macho, M.macho);
    add('femea', 'femea.stl', 'Molde fêmea', COR.femea, M.femea);
    const sim = simetrica(silhueta);
    if (!sim) {
      // metade B tem de ser formada num molde espelhado (para encostar costas com costas)
      const silB = espelhoX(silhueta);
      const ligB = lingueta(silB, g);
      const MB = moldes(silB, [], g, final, { extras: [offset(ligB.regiao, 2)].flat(), bolsas: [[ligB.cx, ligB.cy, ligB.rBoss + 0.8]] });
      add('macho_b', 'macho_B.stl', 'Molde macho (metade B)', COR.macho, MB.macho);
      add('femea_b', 'femea_B.stl', 'Molde fêmea (metade B)', COR.femea, MB.femea);
      add('folha_a', 'folha_A_rosca.stl', 'Folha em rede A (com rosca)', COR.folha, folhaEmRede(silhueta, g, lig, true, final));
      add('folha_b', 'folha_B_furo.stl', 'Folha em rede B (com furo)', COR.folhaB, folhaEmRede(silB, g, ligB, false, final));
      avisos.push('A forma não é simétrica: a metade B tem moldes próprios (espelhados) — macho_B e femea_B.');
    } else {
      add('folha_a', 'folha_A_rosca.stl', 'Folha em rede A (com rosca)', COR.folha, folhaEmRede(silhueta, g, lig, true, final));
      add('folha_b', 'folha_B_furo.stl', 'Folha em rede B (com furo)', COR.folhaB, folhaEmRede(silhueta, g, lig, false, final));
    }
    const pa = parafusoArgola(g, final);
    add('parafuso', 'parafuso_argola.stl', 'Parafuso com argola', COR.parafuso, pa.fatias);
    if (g.celulaMm < g.hasteMm * 3) avisos.push('Células da rede muito pequenas para a haste: a folha fica quase cheia.');
    if (M.forma.rIn < g.alturaMm * 0.6) avisos.push(`A cúpula é alta para a largura da forma (${g.alturaMm.toFixed(0)} mm de altura): a rede vai esticar muito — baixa a altura ou alarga a forma.`);
    info = { hx: M.hx, hy: M.hy, Hf: M.Hf, simetrica: sim, nVent: M.nVent, lingueta: lig, parafusoMm: pa.comprimento };
    pecas.formada = pecaFormada(silhueta, M.forma, g, g.abaMm - g.contornoMm * 0.7);
  } else {
    const M = moldes(silhueta, relevo, g, final);
    add('macho', 'macho.stl', 'Molde macho', COR.macho, M.macho);
    add('femea', 'femea.stl', 'Molde fêmea', COR.femea, M.femea);
    const mol = molduras(M.hx, M.hy, g);
    add('moldura_baixo', 'moldura_baixo.stl', 'Moldura de baixo (com pinos)', COR.moldura, mol.baixo);
    add('moldura_cima', 'moldura_cima.stl', 'Moldura de cima', COR.moldura, mol.cima);
    if (g.relevoMm > 0 && origem === 'imagem' && !M.forma.temRelevo) avisos.push('Relevo pedido, mas a imagem só tem uma cor (ou as cores ficam fora do topo da forma): aumenta o número de cores.');
    if (g.relevoMm > 0 && origem !== 'imagem') avisos.push('O relevo das cores só funciona com uma imagem carregada.');
    if (g.alturaMm > Math.min(bbS.w, bbS.h) * 0.6) avisos.push('Forma funda para o tamanho: a folha vai afinar muito nas paredes. Aumenta o ângulo de saída ou baixa a profundidade.');
    if (g.draftGraus < 2 && g.perfil === 'saida') avisos.push('Com menos de 2° de saída a peça formada agarra-se ao macho.');
    info = { hx: M.hx, hy: M.hy, Hf: M.Hf, nVent: M.nVent, janela: mol.janela, temRelevo: M.forma.temRelevo };
    pecas.formada = pecaFormada(silhueta, M.forma, g);
  }

  const formada = pecas.formada;
  delete pecas.formada;
  const byId = Object.fromEntries(pecas.map(p => [p.id, p]));
  return {
    g, pecas, avisos, origem,
    formada: fatiasParaTriangulos(formada),
    info: { ...info, larguraForma: bbS.w, alturaForma: bbS.h },
    // compatibilidade (versão antiga)
    macho: byId.macho?.tris ?? [], femea: byId.femea?.tris ?? [],
    moldura: byId.moldura_baixo?.tris ?? byId.folha_a?.tris ?? [],
    larguraTotal: 2 * (info.hx ?? 0), profundMolde: g.espBaseMm + (info.Hf ?? g.alturaMm),
  };
}

export function guiaTermoformagem(g, res = null) {
  const fmt = (v) => Number(v).toFixed(1);
  const sep = '='.repeat(49);
  const forma = res?.origem === 'pronta' ? `forma pronta: ${FORMAS_TERMO[g.forma]?.nome ?? g.forma}` : 'a partir da tua imagem';
  const L = [];
  if (g.modelo === 'enfeite') {
    L.push(sep, '  ENFEITE TERMOFORMADO EM 2 METADES', sep, '');
    L.push(`  Forma           : ${forma}, largura ${fmt(g.larguraMm)} mm, cupula ${fmt(g.alturaMm)} mm`);
    L.push(`  Folha em rede   : ${fmt(g.espChapaMm)} mm, celulas ${fmt(g.celulaMm)} mm, hastes ${fmt(g.hasteMm)} mm`);
    L.push(`  Rosca           : M${ROSCA.dMaior} passo ${ROSCA.passo} mm (folga ${fmt(ROSCA.folga)} mm)`);
    L.push('', sep, '', '  PECAS:');
    L.push('  1) macho.stl / femea.stl - moldes em PETG ou ASA, de pe, sem suportes.');
    if (res?.info && res.info.simetrica === false) L.push('     + macho_B.stl / femea_B.stl - moldes espelhados para a metade B.');
    L.push('  2) folha_A_rosca.stl e folha_B_furo.stl - as duas metades, PLA,');
    L.push('     deitadas, sem suportes. A rede estica ao formar; o contorno liso');
    L.push('     fica plano e e por onde as metades se unem.');
    L.push('  3) parafuso_argola.stl - de pe (cabeca e argola na mesa), PLA/PETG,');
    L.push('     camada 0,12-0,16 mm para a rosca sair bem.');
    L.push('', sep, '', '  FORMAR CADA METADE:');
    L.push('  * Pousa a folha no macho, com o reforco da rosca virado para CIMA,');
    L.push('    a rede por cima da cupula e a lingueta na base, encostada aos pinos.');
    L.push('  * Aquece a folha com soprador termico (ou agua a ~80 C) ate amolecer.');
    L.push('  * Vira a femea e prensa-a por cima: os pinos dos cantos alinham, o');
    L.push('    furo grande da femea deixa passar o reforco da rosca. Segura 30 s.');
    L.push('  * Repete com a outra folha (metade B, no molde B se existir).');
    L.push('', sep, '', '  UNIR AS METADES:');
    L.push('  * Encosta as metades pelo lado de dentro (costas com costas), com os');
    L.push('    contornos lisos alinhados. Opcional: ponto de cola no contorno.');
    L.push('  * Enfia o parafuso pelo furo da metade B e aperta-o na rosca da A.');
    L.push('    A argola da cabeca fica para cima: e por ali que se pendura.');
    L.push('  * Podes por dentro uma luz LED pequena, papel, pinhas, etc. antes de fechar.');
  } else {
    L.push(sep, '  TERMOFORMAGEM / PRENSAGEM MANUAL', sep, '');
    L.push(`  Forma           : ${forma}, largura ${fmt(g.larguraMm)} mm, profundidade ${fmt(g.alturaMm)} mm`);
    L.push(`  Perfil          : ${g.perfil === 'cupula' ? 'cupula (almofadado)' : `angulo de saida ${fmt(g.draftGraus)} graus, raio do topo ${fmt(g.raioTopoMm)} mm`}`);
    if (g.relevoMm > 0 && res?.info?.temRelevo) L.push(`  Relevo das cores: ${fmt(g.relevoMm)} mm por cima da forma`);
    L.push(`  Folha de plastico: ${fmt(g.espChapaMm)} mm (folga da cavidade da femea)`);
    L.push(`  Ventilacao       : ${res?.info?.nVent ?? '?'} furos de ${fmt(g.furoVentMm)} mm (grelha + arestas)`);
    L.push('', sep, '', '  PECAS:');
    L.push('  1) macho.stl  - molde positivo com pinos nos cantos. PETG ou ASA');
    L.push('     (resiste ao calor). De pe, sem suportes.');
    L.push('  2) femea.stl  - molde negativo (cavidade para cima), com furos de');
    L.push('     ventilacao e furos para os pinos. PETG/ASA, de pe, sem suportes.');
    L.push('  3) moldura_baixo.stl + moldura_cima.stl - prendem a folha: os pinos da');
    L.push('     de baixo furam a borda da folha e entram na de cima. PLA/PETG.');
    L.push('', sep, '', '  MONTAGEM E USO:');
    L.push('  * Corta a folha do tamanho da moldura e prende-a entre as duas molduras.');
    L.push('  * Aquece a folha com soprador termico ate amolecer (fica mole/brilhante)');
    L.push('    — NAO uses chama direta.');
    L.push('  * Desce a moldura com a folha por cima do macho (a janela da moldura');
    L.push('    passa a volta da base).');
    L.push('  * VIRA a femea (cavidade para baixo) e prensa-a por cima: os pinos do');
    L.push('    macho furam a folha nos cantos e entram nos furos da femea, que fica');
    L.push('    sempre alinhada. Pressao firme 20-30 s, ate arrefecer.');
    L.push('  * Os furos da femea deixam sair o ar dos cantos (sem eles ficam bolhas).');
    L.push('  * Recorta o excesso de plastico a volta da peca formada.');
  }
  L.push('', '  NOTA: confirma a folga da femea com a tua folha real antes de produzir', '  em serie (a folha encolhe um pouco ao arrefecer).', '', sep);
  return L.join('\r\n');
}
