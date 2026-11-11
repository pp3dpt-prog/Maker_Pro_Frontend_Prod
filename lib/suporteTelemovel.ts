// Pré-visualização em tempo real do "Suporte de telemóvel para debaixo do monitor" — as mesmas
// fórmulas de Maker_Pro_Docker_Prod/templates/suporte_telemovel_monitor.scad (perfil em C + rampa
// + curva + reforço, abas com rosca fêmea, parafusos de cabeça serrilhada). Se mudares o .scad,
// muda também aqui.
//
// Coordenadas como no .scad (perfil em XY, largura em Z): com o y do three.js para cima o suporte
// já aparece de pé, na posição de uso. Os parafusos aparecem enfiados nas abas.

import * as THREE from 'three';

export function isSuporteTelemovel(p: Record<string, any> | null | undefined): boolean {
  return !!p && p.suporte === 'telemovel_monitor';
}

const num = (v: unknown, d: number) => (v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v)) ? Number(v) : d);
const RAD = Math.PI / 180;
const frac = (x: number) => x - Math.floor(x);
type V3 = [number, number, number];
type V2 = [number, number];

function medidas(p: Record<string, any>) {
  const a = num(p.angulo_rampa, 18), tr = num(p.espessura_rampa, 6), Lr = num(p.comprimento_rampa, 50);
  const tl = num(p.espessura_labio, 6), vao = num(p.vao, 50), ha = num(p.altura_aba, 13);
  const H = tl + vao + ha;
  const d = num(p.diametro_rosca, 12), lado = Math.max(num(p.lado_aba, 25), d + 6), W = num(p.largura, 70);
  return {
    W, vao, tp: num(p.espessura_placa, 6.5), tl, ll: num(p.comprimento_labio, 12), ha, H,
    np: num(p.num_parafusos, 2) >= 2 && W >= 2 * lado + 2 ? 2 : 1, Lr, a, tr,
    R: Math.max(tr / 2 + 1, num(p.raio_curva, 13.5)), sw: num(p.angulo_curva, 120),
    ref: String(p.reforco ?? 'Inteiro'),
    bg: Math.min(num(p.base_reforco, 25), Lr * Math.cos(a * RAD) - 2),
    hg: Math.min(num(p.altura_reforco, 37), H),
    en: num(p.espessura_nervura, 8),
    rc: p.ranhura_cabo === true || p.ranhura_cabo === 1 || p.ranhura_cabo === 'true',
    wr: num(p.largura_ranhura, 12),
    d, P: num(p.passo_rosca, 2.5), fg: num(p.folga_rosca, 0.35), Ls: num(p.comprimento_parafuso, 40),
    Dh: num(p.diametro_cabeca, 19), hh: num(p.altura_cabeca, 8),
    lado,
  };
}
type M = ReturnType<typeof medidas>;

// ── rosca (igual ao .scad) ──
const prof = (u: number) => (u < 0.2 ? 0 : u < 0.5 ? (u - 0.2) / 0.3 : u < 0.7 ? 1 : (1 - u) / 0.3);
const rRosca = (m: M, ang: number, z: number, extra: number) => {
  const hd = 0.52 * m.P;
  return m.d / 2 - hd + hd * prof(frac(z / m.P - ang / 360)) + extra;
};
const NA = 36;
const angI = (i: number) => (i * 360) / NA;
const anel = (rf: (a: number) => number, z: number): V3[] =>
  Array.from({ length: NA }, (_, i) => { const a = angI(i), r = rf(a); return [r * Math.cos(a * RAD), r * Math.sin(a * RAD), z] as V3; });
function rRect(a: number, hx: number, hy: number, q: number) {
  const c = Math.abs(Math.cos(a * RAD)), s = Math.abs(Math.sin(a * RAD)), Cx = hx - q, Cy = hy - q;
  if ((s * hx) / Math.max(c, 1e-9) <= Cy) return hx / Math.max(c, 1e-9);
  if ((c * hy) / Math.max(s, 1e-9) <= Cx) return hy / Math.max(s, 1e-9);
  const b = c * Cx + s * Cy;
  return b + Math.sqrt(b * b - (Cx * Cx + Cy * Cy - q * q));
}

// Triângulos com as faces do .scad (sentido dos ponteiros do relógio visto de fora) → três.js quer o contrário.
function emitir(out: number[], pts: V3[], faces: number[][], tf: (p: V3) => V3) {
  const t = pts.map(tf);
  for (const [a, b, c] of faces) out.push(...t[a], ...t[c], ...t[b]);
}
function solidoAneis(out: number[], R: V3[][], cb: V3, ct: V3, tf: (p: V3) => V3) {
  const Mn = R.length, pts = [...R.flat(), cb, ct], B = Mn * NA, T = B + 1;
  const id = (k: number, i: number) => k * NA + (i % NA);
  const f: number[][] = [];
  for (let k = 0; k < Mn - 1; k++) for (let i = 0; i < NA; i++) f.push([id(k, i), id(k + 1, i), id(k + 1, i + 1)], [id(k, i), id(k + 1, i + 1), id(k, i + 1)]);
  for (let i = 0; i < NA; i++) f.push([B, id(0, i), id(0, i + 1)], [T, id(Mn - 1, i + 1), id(Mn - 1, i)]);
  emitir(out, pts, f, tf);
}
function tubo(out: number[], Ro: V3[][], Ri: V3[][], tf: (p: V3) => V3) {
  const Mo = Ro.length, Mi = Ri.length, pts = [...Ro.flat(), ...Ri.flat()], O = Mo * NA;
  const io = (k: number, i: number) => k * NA + (i % NA), ii = (k: number, i: number) => O + k * NA + (i % NA);
  const f: number[][] = [];
  for (let k = 0; k < Mo - 1; k++) for (let i = 0; i < NA; i++) f.push([io(k, i), io(k + 1, i), io(k + 1, i + 1)], [io(k, i), io(k + 1, i + 1), io(k, i + 1)]);
  for (let k = 0; k < Mi - 1; k++) for (let i = 0; i < NA; i++) f.push([ii(k, i), ii(k + 1, i + 1), ii(k + 1, i)], [ii(k, i), ii(k, i + 1), ii(k + 1, i + 1)]);
  for (let i = 0; i < NA; i++) {
    f.push([io(Mo - 1, i), ii(Mi - 1, i), ii(Mi - 1, i + 1)], [io(Mo - 1, i), ii(Mi - 1, i + 1), io(Mo - 1, i + 1)]);
    f.push([io(0, i), io(0, i + 1), ii(0, i + 1)], [io(0, i), ii(0, i + 1), ii(0, i)]);
  }
  emitir(out, pts, f, tf);
}

// ── perfil 2D (polígonos simples, sobrepostos — o .scad une-os) ──
function poligonosPerfil(m: M): V2[][] {
  const { tp, tr, a, R, sw, H } = m;
  const n: V2 = [-Math.sin(a * RAD), Math.cos(a * RAD)];
  const B1: V2 = [-m.Lr * Math.cos(a * RAD), -m.Lr * Math.sin(a * RAD)];
  const E: V2 = [B1[0] + (tr / 2) * n[0], B1[1] + (tr / 2) * n[1]];
  const C: V2 = [E[0] - R * n[0], E[1] - R * n[1]];
  const f0 = 90 + a, Bp: V2 = [tp, tp * Math.tan(a * RAD)];
  const nseg = Math.max(8, Math.ceil(sw / 4));
  const arco = (r: number, j: number): V2 => { const f = (f0 + (sw * j) / nseg) * RAD; return [C[0] + r * Math.cos(f), C[1] + r * Math.sin(f)]; };
  const fim = (f0 + sw) * RAD, P: V2 = [C[0] + R * Math.cos(fim), C[1] + R * Math.sin(fim)];
  return [
    [[0, 0], [tp, 0], [tp, H], [0, H]],
    [[0, 0], [tp + m.ll, 0], [tp + m.ll, m.tl], [0, m.tl]],
    [Bp, B1, [B1[0] + tr * n[0], B1[1] + tr * n[1]], [Bp[0] + tr * n[0], Bp[1] + tr * n[1]]],
    [...Array.from({ length: nseg + 1 }, (_, j) => arco(R + tr / 2, j)), ...Array.from({ length: nseg + 1 }, (_, j) => arco(R - tr / 2, nseg - j))],
    Array.from({ length: 32 }, (_, i) => [P[0] + (tr / 2) * Math.cos((i * 2 * Math.PI) / 32), P[1] + (tr / 2) * Math.sin((i * 2 * Math.PI) / 32)] as V2),
  ];
}
function poligonoReforco(m: M): V2[] {
  const t = Math.tan(m.a * RAD), c0 = (0.5 * m.tr) / Math.cos(m.a * RAD);
  return [[m.tp / 2, (m.tp / 2) * t + c0], [m.tp / 2, m.hg], [-m.bg, -m.bg * t + c0]];
}

/** Extrusão de um polígono simples entre z0 e z1, faces para fora (CCW, como o three.js quer). */
function extrudir(out: number[], pol: V2[], z0: number, z1: number) {
  let area = 0;
  for (let i = 0; i < pol.length; i++) { const [x0, y0] = pol[i], [x1, y1] = pol[(i + 1) % pol.length]; area += x0 * y1 - x1 * y0; }
  const p = area < 0 ? [...pol].reverse() : pol;
  const tris = THREE.ShapeUtils.triangulateShape(p.map(([x, y]) => new THREE.Vector2(x, y)), []);
  for (const t of tris) {
    let [a, b, c] = t;
    const cr = (p[b][0] - p[a][0]) * (p[c][1] - p[a][1]) - (p[b][1] - p[a][1]) * (p[c][0] - p[a][0]);
    if (cr < 0) [b, c] = [c, b];                   // garantir CCW visto de cima
    out.push(p[a][0], p[a][1], z1, p[b][0], p[b][1], z1, p[c][0], p[c][1], z1);
    out.push(p[a][0], p[a][1], z0, p[c][0], p[c][1], z0, p[b][0], p[b][1], z0);
  }
  for (let i = 0; i < p.length; i++) {
    const [ax, ay] = p[i], [bx, by] = p[(i + 1) % p.length];
    out.push(ax, ay, z0, bx, by, z0, bx, by, z1, ax, ay, z0, bx, by, z1, ax, ay, z1);
  }
}
/** Corta um polígono pelo semiplano x >= xs (Sutherland–Hodgman). */
function cortarX(pol: V2[], xs: number, manterDireita: boolean): V2[] {
  const dentro = (q: V2) => (manterDireita ? q[0] >= xs : q[0] <= xs);
  const out: V2[] = [];
  for (let i = 0; i < pol.length; i++) {
    const A = pol[i], B = pol[(i + 1) % pol.length];
    if (dentro(A)) out.push(A);
    if (dentro(A) !== dentro(B)) { const t = (xs - A[0]) / (B[0] - A[0]); out.push([xs, A[1] + t * (B[1] - A[1])]); }
  }
  return out;
}

const zAbas = (m: M) => (m.np === 1 ? [m.W / 2] : [m.lado / 2, m.W - m.lado / 2]);

/** Triângulos (mm) do suporte (perfil + reforço + abas com rosca). */
export function construirSuporteTelemovel(p: Record<string, any>): number[] {
  const m = medidas(p), out: number[] = [];
  const W = m.W;
  // ranhura do cabo: entre z = (W - wr)/2 e (W + wr)/2 só fica a parte com x >= -xs
  const xs = m.ref === 'Sem' || m.ref === 'Duas nervuras' ? m.Lr * Math.cos(m.a * RAD) * 0.55 : m.bg + 3;
  const za = (W - m.wr) / 2, zb = (W + m.wr) / 2;
  for (const pol of poligonosPerfil(m)) {
    if (!m.rc) { extrudir(out, pol, 0, W); continue; }
    extrudir(out, pol, 0, za); extrudir(out, pol, zb, W);
    const meio = cortarX(pol, -xs, true);
    if (meio.length >= 3) extrudir(out, meio, za, zb);
  }
  const rf = poligonoReforco(m);
  if (m.ref === 'Inteiro') extrudir(out, rf, 0, W);
  else if (m.ref === 'Duas nervuras') { extrudir(out, rf, 0, m.en); extrudir(out, rf, W - m.en, W); }
  else if (m.ref === 'Central') extrudir(out, rf, (W - m.en) / 2, (W + m.en) / 2);

  // abas: eixo local z → +y, rotate([-90,0,0]) = (x, y, z) → (x, z, -y)
  const h = m.lado / 2, K = Math.max(4, Math.ceil(m.ha / (m.P / 6)));
  const Ro = [anel((a) => rRect(a, h, h, 1.5), 0), anel((a) => rRect(a, h, h, 1.5), m.ha)];
  const Ri = Array.from({ length: K + 1 }, (_, k) => {
    const z = (m.ha * k) / K;
    return anel((a) => rRosca(m, a, z, m.fg) + Math.max(0, 1 - z) + Math.max(0, 1 - (m.ha - z)), z);
  });
  for (const zc of zAbas(m)) {
    const cx = m.tp + h - 0.5, cy = m.H - m.ha;
    tubo(out, Ro, Ri, ([x, y, z]) => [cx + x, cy + z, zc - y]);
  }
  return out;
}

/** Triângulos (mm) dos parafusos, enfiados nas abas (cabeça por cima). */
export function construirParafusosTelemovel(p: Record<string, any>): number[] {
  const m = medidas(p), out: number[] = [];
  const Rh = m.Dh / 2, ch = 0.8, kd = 0.7, N = Math.max(12, Math.round((Math.PI * m.Dh) / 2.4));
  const tri = (x: number) => 1 - 2 * Math.abs(frac(x) - 0.5);
  const serr = (a: number) => Rh - kd * tri((a * N) / 360);
  const zt = m.hh + m.Ls, rtip = m.d / 2 - 0.52 * m.P - 0.3, K = Math.max(4, Math.ceil(m.Ls / (m.P / 6)));
  const R: V3[][] = [anel((a) => serr(a) - ch, 0), anel(serr, ch), anel(serr, m.hh - ch), anel((a) => serr(a) - ch, m.hh)];
  for (let k = 0; k <= K; k++) { const z = m.hh + (m.Ls * k) / K; R.push(anel((a) => Math.min(rRosca(m, a, z, 0), rtip + (zt - z)), z)); }
  // eixo local z → -y (cabeça em cima): (x, y, z) → (x, topo - z, y), rotação própria
  const cx = m.tp + m.lado / 2 - 0.5, topo = m.H + m.hh + 1;
  for (const zc of zAbas(m)) solidoAneis(out, R, [0, 0, 0], [0, 0, zt], ([x, y, z]) => [cx + x, topo - z, zc + y]);
  return out;
}

/** Caixa (mm) do conjunto, para centrar a câmara. */
export function caixaSuporteTelemovel(p: Record<string, any>) {
  const m = medidas(p);
  const yMin = -(m.Lr * Math.sin(m.a * RAD)) - 2 * m.R - m.tr;
  return { xMin: -(m.Lr * Math.cos(m.a * RAD)) - m.R - m.tr, xMax: m.tp + m.lado, yMin, yMax: m.H + m.hh, W: m.W };
}
