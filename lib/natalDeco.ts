// Pré-visualização em tempo real dos modelos de Natal da família "Decoração":
//   rena, anjo, gorro_bombom, casinha, cena_led, silhueta_porta, arvore_nomes
// As mesmas contas de Maker_Pro_Docker_Prod/templates/decoracao/partes/<modelo>.scad e
// _natal_comum.scad; as formas 2D (lib/natalDeco.json) vêm de scripts/gerar_natal_deco.mjs
// (backend) — os mesmos pontos que o OpenSCAD usa. Se mudares um .scad, muda também aqui.
//
// Os modelos trazem no schema o parâmetro escondido `deco` com o nome do modelo.
// Tudo em mm, z para cima (como no .scad). As peças que saem deitadas no STL (molduras, árvore,
// silhueta) aparecem aqui já montadas de pé, que é como o cliente as vai ver.

import * as THREE from 'three';
import type { Font } from 'three-stdlib';
import ClipperLib from 'clipper-lib';
import dados from './natalDeco.json';
import { fatorEscala, textoShapes } from './etiquetaMochila';

type Pt = [number, number];
type Cont = Pt[][];
const D = dados as unknown as {
  haste: Cont; orelha: Cont; asa: Cont; estrela: Cont;
  cenas: Record<string, { contornos: Cont; largura: number; altura: number }>;
  molduras: Record<string, { fora: Pt[]; dentro: Pt[]; largura: number; altura: number }>;
  arvore: Cont; arvore_zonas: [number, number, number, number][];
};
export const CENAS_NATAL = Object.keys(D.cenas);
export const MOLDURAS_NATAL = Object.keys(D.molduras);
/** Zonas dos nomes da árvore: [cx, cy, largura útil, tamanho da letra] (para o ajuste_texto do schema). */
export const ZONAS_ARVORE_NOMES = D.arvore_zonas;

export type ModeloNatal = 'rena' | 'anjo' | 'gorro_bombom' | 'casinha' | 'cena_led' | 'silhueta_porta' | 'arvore_nomes';
const MODELOS: ModeloNatal[] = ['rena', 'anjo', 'gorro_bombom', 'casinha', 'cena_led', 'silhueta_porta', 'arvore_nomes'];
export function modeloNatalDeco(p: Record<string, any> | null | undefined): ModeloNatal | null {
  const m = p?.deco;
  return typeof m === 'string' && (MODELOS as string[]).includes(m) ? (m as ModeloNatal) : null;
}
export function isNatalDeco(p: Record<string, any> | null | undefined): boolean {
  return modeloNatalDeco(p) !== null;
}

/** Uma parte da pré-visualização: geometria + cor (só visual). */
export type Parte = { geo: THREE.BufferGeometry; cor: string };

const num = (v: unknown, d: number) => (v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v)) ? Number(v) : d);
const cl = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const sim = (v: unknown, d: boolean) => (v === undefined || v === null || v === '' ? d : v === true || v === 1 || v === '1' || v === 'true');
const str = (v: unknown, d: string) => (typeof v === 'string' && v ? v : d);
const RAD = Math.PI / 180;
const cosd = (a: number) => Math.cos(a * RAD), sind = (a: number) => Math.sin(a * RAD);

// ── malhas de revolução (iguais a solido_polar / casca_polar do .scad) ──
// O .scad escreve as faces no sentido dos ponteiros do relógio vistas de fora (OpenSCAD);
// aqui é o contrário (three.js).
type Rp = (a: number, z: number) => number;
type Cx = (z: number) => number;
const zero: Cx = () => 0;

function malha(pts: number[][], faces: number[][]): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3));
  g.setIndex(faces.flatMap((f) => [f[0], f[2], f[1]]));   // inverte (OpenSCAD → three.js)
  g.computeVertexNormals();
  return g;
}
function solidoPolar(rp: Rp, H: number, N: number, K: number, curva = true, cx: Cx = zero) {
  const R = K + 1, pts: number[][] = [], f: number[][] = [];
  const zs = (t: number) => (curva ? H * Math.sin((Math.PI / 2) * t) : H * t);
  for (let i = 0; i < N; i++) for (let j = 0; j <= K; j++) {
    const a = (i * 360) / N, z = zs(j / K), r = rp(a, z);
    pts.push([cx(z) + r * cosd(a), r * sind(a), z]);
  }
  const B = pts.length; pts.push([cx(0), 0, 0]); const T = pts.length; pts.push([cx(H), 0, H]);
  for (let i = 0; i < N; i++) {
    const n = ((i + 1) % N) * R, c = i * R;
    for (let j = 0; j < K; j++) f.push([c + j, n + j + 1, n + j], [c + j, c + j + 1, n + j + 1]);
    f.push([T, n + K, c + K], [B, c, n]);
  }
  return malha(pts, f);
}
function cascaPolar(rp: Rp, ri: (z: number) => number, H: number, Hi: number, N: number, K: number, Ki: number, cx: Cx = zero) {
  const R = K + 1, Ri = Ki + 1, pts: number[][] = [], f: number[][] = [];
  for (let i = 0; i < N; i++) for (let j = 0; j <= K; j++) {
    const a = (i * 360) / N, z = (H * j) / K, r = rp(a, z); pts.push([cx(z) + r * cosd(a), r * sind(a), z]);
  }
  const O = pts.length;
  for (let i = 0; i < N; i++) for (let j = 0; j <= Ki; j++) {
    const a = (i * 360) / N, z = (Hi * j) / Ki, r = ri(z); pts.push([cx(z) + r * cosd(a), r * sind(a), z]);
  }
  const T = pts.length; pts.push([cx(H), 0, H]); const Ti = pts.length; pts.push([cx(Hi), 0, Hi]);
  for (let i = 0; i < N; i++) {
    const c = i * R, n = ((i + 1) % N) * R, ci = O + i * Ri, ni = O + ((i + 1) % N) * Ri;
    for (let j = 0; j < K; j++) f.push([c + j, n + j + 1, n + j], [c + j, c + j + 1, n + j + 1]);
    for (let j = 0; j < Ki; j++) f.push([ci + j, ni + j, ni + j + 1], [ci + j, ni + j + 1, ci + j + 1]);
    f.push([T, n + K, c + K], [Ti, ci + Ki, ni + Ki], [c, n, ni], [c, ni, ci]);
  }
  return malha(pts, f);
}

// ── 2D (clipper, como o OpenSCAD por baixo) ──
type CPath = { X: number; Y: number }[];
const S = 1000;
const cp = (pts: Pt[]): CPath => pts.map(([x, y]) => ({ X: Math.round(x * S), Y: Math.round(y * S) }));
/** forma2d(c) do .scad: contornos com a regra par-ímpar. */
const f2d = (c: Cont, k = 1, dx = 0, dy = 0): CPath[] => c.map((q) => cp(q.map(([x, y]) => [x * k + dx, y * k + dy])));
function bool(tipo: number, a: CPath[], b: CPath[] = [], fa = ClipperLib.PolyFillType.pftEvenOdd): CPath[] {
  const c = new ClipperLib.Clipper(), sol: CPath[] = [];
  c.AddPaths(a, ClipperLib.PolyType.ptSubject, true);
  if (b.length) c.AddPaths(b, ClipperLib.PolyType.ptClip, true);
  c.Execute(tipo, sol, fa, ClipperLib.PolyFillType.pftEvenOdd);
  return sol;
}
const uniao = (a: CPath[]) => bool(ClipperLib.ClipType.ctUnion, a, [], ClipperLib.PolyFillType.pftNonZero);
const dif = (a: CPath[], b: CPath[]) => bool(ClipperLib.ClipType.ctDifference, a, b);
const inter = (a: CPath[], b: CPath[]) => bool(ClipperLib.ClipType.ctIntersection, a, b);
const circ = (cx: number, cy: number, r: number, n: number): CPath =>
  cp(Array.from({ length: n }, (_, i): Pt => [cx + r * cosd((i * 360) / n), cy + r * sind((i * 360) / n)]));
const rect = (x0: number, y0: number, w: number, h: number): CPath => cp([[x0, y0], [x0 + w, y0], [x0 + w, y0 + h], [x0, y0 + h]]);

/** Caminhos (par-ímpar) → THREE.Shape com buracos. */
function shapes(paths: CPath[]): THREE.Shape[] {
  const c = new ClipperLib.Clipper(), tree = new ClipperLib.PolyTree();
  c.AddPaths(paths, ClipperLib.PolyType.ptSubject, true);
  c.Execute(ClipperLib.ClipType.ctUnion, tree, ClipperLib.PolyFillType.pftEvenOdd, ClipperLib.PolyFillType.pftEvenOdd);
  const v = (p: CPath) => p.map((q) => new THREE.Vector2(q.X / S, q.Y / S));
  const out: THREE.Shape[] = [];
  const visitar = (n: any) => {
    for (const ch of n.Childs()) {
      const s = new THREE.Shape(v(ch.Contour()));
      for (const h of ch.Childs()) { s.holes.push(new THREE.Path(v(h.Contour()))); visitar(h); }
      out.push(s);
    }
  };
  visitar(tree);
  return out;
}
/** linear_extrude(e) (z de 0 a e); centro = true → de -e/2 a e/2. */
function extrudir(sh: THREE.Shape[], e: number, centro = false): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(sh, { depth: e, bevelEnabled: false, curveSegments: 12 });
  if (centro) g.translate(0, 0, -e / 2);
  return g;
}
/** placa_xz(e): placa vertical no plano XZ (y da forma → z), centrada em y. */
function placaXZ(sh: THREE.Shape[], e: number) { return extrudir(sh, e, true).rotateX(Math.PI / 2); }
/** mirror([1,0,0]) / mirror([0,0,1]) — espelhar inverte o sentido das faces, por isso corrige-se. */
function espelhar(g: THREE.BufferGeometry, eixo: 'x' | 'y' | 'z'): THREE.BufferGeometry {
  const h = g.index ? g.toNonIndexed() : g.clone();
  h.scale(eixo === 'x' ? -1 : 1, eixo === 'y' ? -1 : 1, eixo === 'z' ? -1 : 1);
  const p = h.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i += 3) {
    for (let k = 0; k < 3; k++) { const t = p.getComponent(i + 1, k); p.setComponent(i + 1, k, p.getComponent(i + 2, k)); p.setComponent(i + 2, k, t); }
  }
  h.computeVertexNormals();
  return h;
}
const esfera = (r: number, x: number, y: number, z: number) => new THREE.SphereGeometry(r, 48, 32).rotateX(Math.PI / 2).translate(x, y, z);

// ── modelos ──

function rena(p: Record<string, any>): Parte[] {
  const H = cl(num(p.altura, 130), 60, 220), R = cl(num(p.largura, 60), 30, 120) / 2;
  const ne = Math.round(cl(num(p.estrias, 24), 8, 60)), re = cl(num(p.relevo, 1.5), 0, 4), hs = cl(num(p.hastes, 100), 50, 160) / 100;
  const hh = Math.min(0.3 * H, 0.95 * R), rh = 0.84 * R, zc = H - hh;
  const ss = (a: number, b: number, x: number) => { const t = cl((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const corpo = (z: number) => R * (1 - (0.05 * z) / H) * (1 - 0.3 * ss(0.3 * zc, zc, z));
  const cabeca = (z: number) => { const t = (z - zc) / hh; return Math.abs(t) >= 1 ? 0 : rh * Math.sqrt(1 - t * t); };
  const perfil = (z: number) => (z > zc ? cabeca(z) : Math.max(corpo(z), cabeca(z)));
  const rp: Rp = (a, z) => { const b = perfil(z); return Math.max(0.05, b - re * (0.5 + 0.5 * cosd(ne * a)) * Math.min(1, (1.6 * b) / R)); };
  const zcup = (f: number) => zc + hh * Math.sqrt(1 - f * f);
  const out: Parte[] = [{ geo: solidoPolar(rp, H, Math.max(96, 6 * ne), 70), cor: '#C9A27A' }];
  const s = (1.25 * hs * R) / 30;
  const haste = placaXZ(shapes(f2d(D.haste, s)), 3.6 * Math.max(1, s * 0.8)).rotateY(-6 * RAD).translate(0.34 * rh, 0, zcup(0.4) - 2 * s);
  const partes = [haste];
  if (sim(p.orelhas, true)) {
    const so = (1.3 * R) / 30;
    // rotate(32) no plano da forma = rotação em torno de -y depois de deitada em XZ
    partes.push(placaXZ(shapes(f2d(D.orelha.map((q) => q.map(([x, y]): Pt => [(x * cosd(32) - y * sind(32)) * so, (x * sind(32) + y * cosd(32)) * so])))), 2.6)
      .translate(0.7 * rh, 0, zcup(0.8)));
  }
  for (const g of partes) out.push({ geo: g, cor: '#8B5A2B' }, { geo: espelhar(g, 'x'), cor: '#8B5A2B' });
  return out;
}

function anjo(p: Record<string, any>): Parte[] {
  const H = cl(num(p.altura, 110), 60, 200), R = cl(num(p.largura, 60), 30, 120) / 2;
  const ne = Math.round(cl(num(p.estrias, 24), 8, 60)), re = cl(num(p.relevo, 1.5), 0, 4), as = cl(num(p.asas, 100), 50, 160) / 100;
  const rc = Math.max(6, Math.min(0.14 * H, 0.55 * R)), Hb = H - 1.85 * rc, rn = 0.7 * rc, zh = Hb + 0.85 * rc;
  const saia = (z: number) => { const u = z / Hb; return rn + (R - rn) * Math.pow(1 - u, 1.35) + 0.05 * R * Math.pow(1 - u, 8); };
  // saia e cabeça num só perfil (o maior dos dois)
  const cabeca = (z: number) => { const t = z - zh; return Math.abs(t) < rc ? Math.sqrt(rc * rc - t * t) : 0; };
  const rp: Rp = (a, z) => Math.max(0.05, z <= Hb ? saia(z) - re * (0.5 + 0.5 * cosd(ne * a)) * cl((Hb - z) / (0.18 * Hb), 0, 1) : 0, cabeca(z));
  // cores das partes do 3MF (cor_corpo / cor_aureola); as asas um pouco mais escuras, só para se verem
  const hex = (v: unknown, d: string) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : d);
  const corCorpo = hex(p.cor_corpo, '#F1E7D6'), corAureola = hex(p.cor_aureola, '#E0A526');
  const out: Parte[] = [{ geo: solidoPolar(rp, zh + rc, Math.max(96, 6 * ne), 100, false), cor: corCorpo }];
  const s = (1.6 * as * R) / 30, zw = 0.56 * Hb;
  const asa = placaXZ(shapes(f2d(D.asa, s)), 3).translate(1.5, 0.42 * saia(zw), zw);
  const corAsa = '#' + new THREE.Color(corCorpo).multiplyScalar(0.9).getHexString();
  out.push({ geo: asa, cor: corAsa }, { geo: espelhar(asa, 'x'), cor: corAsa });
  if (sim(p.aureola, true)) {
    // a auréola é uma peça à parte (sem AMS imprime-se deitada e cola-se atrás da cabeça); aqui
    // mostra-se montada — a parte que fica dentro da cabeça não se vê
    const anel = shapes(dif([circ(0, 0, 1.12 * rc, 72)], [circ(0, 0, 0.9 * rc, 72)]));
    out.push({ geo: placaXZ(anel, 2.4).translate(0, 0.4 * rc, zh + 0.5 * rc), cor: corAureola });
  }
  return out;
}

function gorroBombom(p: Record<string, any>): Parte[] {
  const d = cl(num(p.diametro_bombom, 31), 18, 50), Hg = cl(num(p.altura, 45), 25, 100);
  const ne = Math.round(cl(num(p.estrias, 28), 12, 60)), pp = sim(p.pompom, true), pecas = str(p.pecas, 'Gorro e base');
  const PAREDE = 1.6, rd = d / 2, Rb = 0.92 * rd + 2.6, hb = Math.max(6, 0.24 * Hg);
  const rpp = pp ? Math.max(4, 0.13 * Hg + 0.08 * d) : 0, rt = pp ? 0.65 * rpp : 2, Hc = Hg - (pp ? 0.2 * rpp : 0);
  const Rcp = 0.8 * rd + 3, hcp = Math.max(8, 0.34 * d);
  const cone = (z: number) => { const r0 = 0.88 * Rb; return z <= hb ? Rb : r0 + ((rt - r0) * (z - hb)) / (Hc - hb); };
  const cx: Cx = (z) => (z > hb ? 0.2 * Hg * Math.pow((Math.min(z, Hc) - hb) / (Hc - hb), 2) : 0);
  // o pompom faz parte do perfil do gorro (o maior dos dois raios)
  const zp = Hc + 0.2 * rpp, Ht = pp ? zp + rpp : Hc;
  const pompom = (z: number) => (pp && Math.abs(z - zp) < rpp ? Math.sqrt(rpp * rpp - (z - zp) ** 2) : 0);
  const rpG: Rp = (a, z) => (z <= hb ? Rb - 1.1 * (0.5 + 0.5 * cosd(ne * a)) * cl(Math.min(z, hb - z) / 0.6, 0, 1) : Math.max(z <= Hc ? cone(z) : 0, pompom(z), 0.05));
  const riG = (z: number) => Math.max(0.4, Math.min(0.86 * rd + 0.0001 * z, cone(z) - PAREDE));
  const rpC: Rp = (a, z) => Rcp - 1 * (0.5 + 0.5 * cosd(ne * a)) * cl(Math.min(z, hcp - z) / 0.6, 0, 1);
  const N = Math.max(96, 6 * ne);
  const zb = hcp + Math.sqrt(rd * rd - Math.pow(0.8 * rd, 2)), zg = zb + Math.sqrt(rd * rd - Math.pow(0.86 * rd, 2));
  const soG = pecas === 'Só o gorro', soB = pecas === 'Só a base';
  const out: Parte[] = [];
  if (!soB) {
    const z0 = soG ? 0 : zg;
    out.push({ geo: cascaPolar(rpG, riG, Ht, Hc - 2.2, N, 90, 40, cx).translate(0, 0, z0), cor: '#C62828' });
  }
  if (!soG) {
    // copo: casca virada ao contrário (cavidade em cima)
    const copo = espelhar(cascaPolar(rpC, () => 0.8 * rd, hcp, hcp - 2, N, 8, 4), 'z').translate(0, 0, hcp);
    out.push({ geo: copo, cor: '#F5F5F4' });
    if (!soB) out.push({ geo: esfera(rd, 0, 0, zb), cor: '#7B4A1E' });   // o bombom (só para ver)
  }
  return out;
}

function casinha(p: Record<string, any>): Parte[] {
  const W = cl(num(p.largura, 60), 40, 160), P = cl(num(p.profundidade, 50), 30, 160), Hw = cl(num(p.altura, 50), 25, 160);
  const th = cl(num(p.inclinacao, 45), 40, 60), nj = Math.round(cl(num(p.janelas, 2), 0, 4)), t = cl(num(p.parede, 2), 1.2, 4);
  const Hr = (W / 2) * Math.tan(th * RAD), tr = t + 0.4, BEIRAL = 2.5;
  const janela = (x: number, z: number, w: number, h: number): CPath[] => {
    const b = Math.max(1.2, 0.09 * w), out: CPath[] = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1])
      out.push(rect(x + (sx < 0 ? -w / 2 : b / 2), z + (sz < 0 ? -h / 2 : b / 2), w / 2 - b / 2, h / 2 - b / 2));
    return out;
  };
  const porta = (w: number, h: number): CPath[] => uniao([rect(-w / 2, -1, w, h - w / 2 + 1), circ(0, h - w / 2, w / 2, 48)]);
  const empena = (frente: boolean) => {
    const jw = Math.min(0.2 * W, 0.34 * Hw), jh = 0.36 * Hw, buracos: CPath[] = [];
    if (frente) {
      buracos.push(...porta(Math.min(0.24 * W, 0.4 * Hw), 0.62 * Hw));
      if (W >= 45) for (const s of [-1, 1]) buracos.push(...janela(s * 0.31 * W, 0.56 * Hw, jw, jh));
    } else for (let i = 1; i <= nj; i++) buracos.push(...janela(-W / 2 + (W * i) / (nj + 1), 0.55 * Hw, Math.min(jw, (0.7 * W) / (nj + 1)), jh));
    if (Hr > 16) buracos.push(circ(0, Hw + 0.4 * Hr, Math.min(0.16 * Hr, 0.09 * W), 40));
    return shapes(dif([cp([[-W / 2, 0], [W / 2, 0], [W / 2, Hw], [0, Hw + Hr], [-W / 2, Hw]])], buracos));
  };
  const lado = () => {
    const jw = Math.min((0.7 * P) / (nj + 1), 0.34 * Hw), jh = 0.36 * Hw, b: CPath[] = [];
    for (let i = 1; i <= nj; i++) b.push(...janela(-P / 2 + (P * i) / (nj + 1), 0.55 * Hw, jw, jh));
    return shapes(dif([rect(-P / 2, 0, P, Hw)], b));
  };
  const v = tr / cosd(th);
  const A: Pt = [W / 2 + BEIRAL * cosd(th), Hw - BEIRAL * sind(th)];
  const agua = placaXZ(shapes([cp([A, [0, Hw + Hr], [0, Hw + Hr + v], [A[0], A[1] + v]])]), P + 2 * BEIRAL);
  const parede = '#B5651D', telhado = '#7F1D1D';
  const out: Parte[] = [
    { geo: placaXZ(empena(true), t).translate(0, -P / 2 + t / 2, 0), cor: parede },
    { geo: placaXZ(empena(false), t).translate(0, P / 2 - t / 2, 0), cor: parede },
    { geo: agua, cor: telhado }, { geo: espelhar(agua, 'x'), cor: telhado },
  ];
  for (const s of [-1, 1]) out.push({ geo: extrudir(lado(), t, true).rotateX(Math.PI / 2).rotateZ(Math.PI / 2).translate(s * (W / 2 - t / 2), 0, 0), cor: parede });
  if (sim(p.chamine, true)) {
    const zr = (x: number) => Hw + Hr * (1 - x / (W / 2)) + v;
    const x1 = 0.22 * W, x2 = x1 + Math.max(6, 0.14 * W), zt = Hw + Hr + v + 0.12 * Hr;
    out.push({ geo: placaXZ(shapes([cp([[x1, zr(x1) - 1.5], [x2, zr(x2) - 1.5], [x2, zt], [x1, zt]])]), Math.max(6, 0.14 * W)).translate(0, 0.18 * P, 0), cor: telhado });
  }
  return out;
}

// base com cavidades para velas (base_vela no .scad). A ranhura fica tapada pela placa montada,
// por isso aqui só se mostram as cavidades das velas (6 mm de fundo).
function baseVela(Wb: number, Db: number, hb: number, velas: Pt[], dv: number): Parte[] {
  const rc = 6;
  const contorno = uniao([rect(-Wb / 2 + rc, -Db / 2, Wb - 2 * rc, Db), rect(-Wb / 2, -Db / 2 + rc, Wb, Db - 2 * rc),
    ...[-1, 1].flatMap((sx) => [-1, 1].map((sy) => circ(sx * (Wb / 2 - rc), sy * (Db / 2 - rc), rc, 32)))]);
  const furos = velas.map(([x, y]) => circ(x, y, dv / 2, 72));
  return [
    { geo: extrudir(shapes(contorno), hb - 6), cor: '#F5F5F4' },
    { geo: extrudir(shapes(dif(contorno, furos)), 6).translate(0, 0, hb - 6), cor: '#F5F5F4' },
  ];
}

function cenaLed(p: Record<string, any>): Parte[] {
  const nm = D.molduras[str(p.moldura, 'Círculo')] ? str(p.moldura, 'Círculo') : 'Círculo';
  const M = D.molduras[nm], C = D.cenas[str(p.cena, 'Renas')] ?? D.cenas.Renas;
  const W = cl(num(p.largura, 120), 70, 220), e = cl(num(p.espessura, 4), 2.4, 8), dv = cl(num(p.diametro_vela, 39.5), 30, 60);
  const pecas = str(p.pecas, 'Moldura e base'), k = W / M.largura;
  const pos = nm === 'Estrela' ? [0.18, 0.56] : nm === 'Arco' ? [4 / 96, 68 / 76] : [0.13, 0.86];
  const sc = (pos[1] * M.largura) / 100;
  const anel = dif(f2d([M.fora], k), f2d([M.dentro], k));
  const cena = inter(f2d([M.dentro], k), f2d(C.contornos, sc * k, 0, (pos[0] * M.altura + 3 * sc) * k));
  const arte = shapes(uniao([...anel, ...cena]));
  const hb = 9, prof = 4, Db = dv + e + 19, Wb = Math.max(nm === 'Arco' ? W + 12 : 0.8 * W, dv + 16), ys = -Db / 2 + 10;
  const out: Parte[] = [];
  if (pecas !== 'Só a base') out.push({ geo: placaXZ(arte, e).translate(0, ys, pecas === 'Só a moldura' ? 0 : hb - prof), cor: '#8B5A2B' });
  if (pecas !== 'Só a moldura') out.push(...baseVela(Wb, Db, hb, [[0, ys + e / 2 + 3 + dv / 2]], dv));
  return out;
}

function silhuetaPorta(p: Record<string, any>): Parte[] {
  const C = D.cenas[str(p.cena, 'Trenó')] ?? D.cenas['Trenó'];
  const W = cl(num(p.largura, 220), 80, 250), e = cl(num(p.espessura, 3), 2, 6), aba = cl(num(p.aba, 15), 0, 40), k = W / 100;
  // no STL sai deitada; aqui mostra-se de pé (y da forma → z) com a aba para trás
  const pecas: THREE.BufferGeometry[] = [extrudir(shapes(f2d(C.contornos, k, 0, 3 * k)), e)];
  if (aba > 0) pecas.push(new THREE.BoxGeometry(100 * k, Math.min(2.4, 3.6 * k), e + aba).translate(0, Math.min(2.4, 3.6 * k) / 2, (e + aba) / 2));
  const out = pecas.map((g) => {
    let h = g.rotateX(Math.PI / 2);              // z (espessura) → -y
    h = espelhar(h, 'y');                         // espessura e aba para trás (+y)
    if (sim(p.espelhar, false)) h = espelhar(h, 'x');
    return { geo: h, cor: '#1F2937' };
  });
  return out;
}

function arvoreNomes(p: Record<string, any>, font: Font | null): Parte[] {
  const W = cl(num(p.largura, 140), 80, 240), e = cl(num(p.espessura, 4), 2.4, 8), dv = cl(num(p.diametro_vela, 39.5), 30, 60);
  const pecas = str(p.pecas, 'Árvore e base'), k = W / 100, ALT = 1.2;
  const nomes = [p.nome1 ?? 'Maria', p.nome2 ?? 'João', p.nome3 ?? 'Ana', p.nome4 ?? 'Rui'].map((n) => String(n));
  const hb = 9, prof = 4, Db = dv + e + 19, Wb = Math.max(0.62 * W, 2 * dv + 20), ys = Db / 2 - 10;
  const out: Parte[] = [];
  if (pecas !== 'Só a base') {
    const z0 = pecas === 'Só a árvore' ? 0 : hb - prof;
    const pos = (g: THREE.BufferGeometry) => g.translate(0, 0, -e / 2).rotateX(Math.PI / 2).translate(0, ys, z0);
    out.push({ geo: pos(extrudir(shapes(f2d(D.arvore, k)), e)), cor: '#166534' });
    if (font) {
      const sh: THREE.Shape[] = [];
      D.arvore_zonas.forEach(([zx, zy, zw, tam], i) => {
        const txt = nomes[i]; if (!txt) return;
        const esc = fatorEscala(font, txt, tam, zw);   // igual ao esc_nomeN do servidor (não depende da largura)
        sh.push(...textoShapes(font, txt, tam * k, esc, zx * k, zy * k));
      });
      if (sh.length) out.push({ geo: pos(extrudir(sh, ALT).translate(0, 0, e)), cor: '#FACC15' });
    }
  }
  if (pecas !== 'Só a árvore') {
    const y = ys - e / 2 - 3 - dv / 2, x = Math.max(dv / 2 + 3, 0.2 * W);
    out.push(...baseVela(Wb, Db, hb, [[-x, y], [x, y]], dv));
  }
  return out;
}

/** Partes (mm, z para cima, z = 0 em baixo) do modelo indicado em p.deco. font só para a árvore com nomes. */
export function construirNatalDeco(p: Record<string, any>, font: Font | null = null): Parte[] {
  switch (modeloNatalDeco(p)) {
    case 'rena': return rena(p);
    case 'anjo': return anjo(p);
    case 'gorro_bombom': return gorroBombom(p);
    case 'casinha': return casinha(p);
    case 'cena_led': return cenaLed(p);
    case 'silhueta_porta': return silhuetaPorta(p);
    case 'arvore_nomes': return arvoreNomes(p, font);
    default: return [];
  }
}
