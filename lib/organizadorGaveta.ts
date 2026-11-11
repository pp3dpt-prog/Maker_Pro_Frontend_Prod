// Organizador de gaveta: módulos à medida que o cliente escolhe numa lista e coloca na gaveta.
//
// Partilhado pelo editor (components/EditorGaveta.tsx) e pela pré-visualização (Preview3D).
// O STL vem de Maker_Pro_Docker_Prod/templates/organizador_gaveta.scad, que faz as mesmas
// contas: se mudares uma medida aqui, muda lá também.
//
// Um módulo é [x, y, largura, profundidade, div_x, div_y, tipo] em mm, com x e y a partir do
// canto frente-esquerda da gaveta. tipo 0 = normal, 1 = fundo côncavo na frente.

import * as THREE from 'three';

export type Modulo = [number, number, number, number, number, number, number];

export const SNAP = 5;          // grelha do editor (mm)
export const MIN_MOD = 20;      // medida mínima de um módulo no editor (o .scad aceita ≥ 10)
export const MAX_MODULOS = 60;  // limite do backend

const num = (v: unknown, d: number) => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : d;
};
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

/** Detecção pelo parâmetro escondido `organizador_gaveta`. */
export function isOrganizadorGaveta(p: Record<string, any> | null | undefined): boolean {
  return !!p && p.organizador_gaveta === 'gaveta';
}

export function medidasGaveta(p: Record<string, any>) {
  const GW = clamp(num(p.gaveta_largura, 300), 40, 1000);
  const GD = clamp(num(p.gaveta_profundidade, 400), 40, 1000);
  const GH = clamp(num(p.gaveta_altura, 60), 15, 300);
  const HM = Math.min(clamp(num(p.altura_modulos, 50), 10, 250), GH - 1);
  const WALL = clamp(num(p.parede, 1.6), 0.8, 4);
  const BOT = clamp(num(p.fundo, 1.2), 0.8, 4);
  const RAIO = clamp(num(p.raio, 4), 0.5, 15);
  const FOLGA = clamp(num(p.folga, 0.6), 0, 3);
  return { GW, GD, GH, HM, WALL, BOT, RAIO, FOLGA, DT: 1.2 };
}

/** Normaliza a lista que vem dos params (pode vir como JSON em texto). */
export function lerModulos(v: unknown): Modulo[] {
  let l: unknown = v;
  if (typeof v === 'string') { try { l = JSON.parse(v); } catch { l = []; } }
  if (!Array.isArray(l)) return [];
  const out: Modulo[] = [];
  for (const m of l.slice(0, MAX_MODULOS)) {
    if (!Array.isArray(m) || m.length < 4 || !m.slice(0, 4).every((x) => typeof x === 'number' && Number.isFinite(x))) continue;
    out.push([m[0], m[1], m[2], m[3], Math.round(num(m[4], 1)), Math.round(num(m[5], 1)), Math.round(num(m[6], 0))]);
  }
  return out;
}

/** Igual ao _ok() do .scad: dentro da gaveta e com medidas mínimas. */
export function moduloValido(m: Modulo, GW: number, GD: number): boolean {
  return m[2] >= 10 && m[3] >= 10 && m[0] >= 0 && m[1] >= 0 && m[0] + m[2] <= GW + 0.01 && m[1] + m[3] <= GD + 0.01;
}

export function sobrepoe(a: Modulo, b: Modulo): boolean {
  const e = 0.01;
  return a[0] < b[0] + b[2] - e && b[0] < a[0] + a[2] - e && a[1] < b[1] + b[3] - e && b[1] < a[1] + a[3] - e;
}

/** Cabe na gaveta sem tocar em nenhum outro (ignora o índice `ignorar`). */
export function cabe(mods: Modulo[], m: Modulo, GW: number, GD: number, ignorar = -1): boolean {
  if (!moduloValido(m, GW, GD)) return false;
  return mods.every((o, i) => i === ignorar || !sobrepoe(o, m));
}

// ── lista de módulos que o cliente pode escolher ──
export type Preset = { id: string; nome: string; w: number; d: number; dx: number; dy: number; tipo: number; nota: string };
export const PRESETS: Preset[] = [
  { id: 'peq',   nome: 'Pequeno',       w: 50,  d: 50,  dx: 1, dy: 1, tipo: 0, nota: 'clips, elásticos' },
  { id: 'qua',   nome: 'Quadrado',      w: 100, d: 100, dx: 1, dy: 1, tipo: 0, nota: 'tudo e mais alguma coisa' },
  { id: 'ret',   nome: 'Retangular',    w: 100, d: 50,  dx: 1, dy: 1, tipo: 0, nota: 'cabos, carregadores' },
  { id: 'comp',  nome: 'Comprido',      w: 50,  d: 200, dx: 1, dy: 1, tipo: 0, nota: 'talheres, canetas' },
  { id: 'div2',  nome: '2 divisórias',  w: 100, d: 100, dx: 2, dy: 1, tipo: 0, nota: 'separar por tipo' },
  { id: 'grel',  nome: 'Grelha 3×3',    w: 150, d: 150, dx: 3, dy: 3, tipo: 0, nota: 'bijuteria, sementes' },
  { id: 'paraf', nome: 'Peças miúdas',  w: 100, d: 100, dx: 2, dy: 2, tipo: 1, nota: 'fundo côncavo: parafusos' },
  { id: 'tab',   nome: 'Tabuleiro',     w: 200, d: 100, dx: 1, dy: 1, tipo: 0, nota: 'objetos maiores' },
];

const snap = (v: number) => Math.round(v / SNAP) * SNAP;

/** Primeiro lugar livre (de frente para trás, da esquerda para a direita) para um módulo w×d. */
export function lugarLivre(mods: Modulo[], w: number, d: number, GW: number, GD: number): [number, number] | null {
  w = Math.min(w, GW); d = Math.min(d, GD);
  const xs = new Set<number>([0, GW - w]); const ys = new Set<number>([0, GD - d]);
  for (const o of mods) { xs.add(o[0] + o[2]); ys.add(o[1] + o[3]); xs.add(o[0] - w); ys.add(o[1] - d); }
  for (let x = 0; x <= GW - w; x += SNAP) xs.add(x);
  for (let y = 0; y <= GD - d; y += SNAP) ys.add(y);
  const X = [...xs].filter((x) => x >= 0 && x + w <= GW + 0.01).sort((a, b) => a - b);
  const Y = [...ys].filter((y) => y >= 0 && y + d <= GD + 0.01).sort((a, b) => a - b);
  for (const y of Y) for (const x of X) if (cabe(mods, [x, y, w, d, 1, 1, 0], GW, GD)) return [x, y];
  return null;
}

/**
 * Preenche o espaço livre com módulos (cada um até `max` mm de lado). Usa uma grelha com as
 * arestas dos módulos, as paredes da gaveta e linhas a cada `max/2` mm, e junta células livres
 * em retângulos — por isso enche até às paredes, mesmo que a gaveta não seja múltipla de 5.
 */
export function preencherLivre(mods: Modulo[], GW: number, GD: number, max = 100): Modulo[] {
  const passo = Math.max(MIN_MOD, max / 2);
  const linhas = (L: number, arestas: number[]) => {
    const s = new Set<number>([0, L, ...arestas.filter((v) => v > 0 && v < L)]);
    for (let v = passo; v < L; v += passo) s.add(v);
    // tira linhas que deixariam células minúsculas (< MIN_MOD/2) junto de outra linha
    const a = [...s].sort((p, q) => p - q);
    const fixas = new Set<number>([0, L, ...arestas]);
    const out: number[] = [];
    for (const v of a) {
      if (out.length && v - out[out.length - 1] < MIN_MOD / 2 && !fixas.has(v)) continue;
      out.push(v);
    }
    return out;
  };
  const X = linhas(GW, mods.flatMap((m) => [m[0], m[0] + m[2]]));
  const Y = linhas(GD, mods.flatMap((m) => [m[1], m[1] + m[3]]));
  const nx = X.length - 1, ny = Y.length - 1;
  const ocup: boolean[][] = Array.from({ length: ny }, (_, j) => Array.from({ length: nx }, (_, i) => {
    const c: Modulo = [X[i], Y[j], X[i + 1] - X[i], Y[j + 1] - Y[j], 1, 1, 0];
    return mods.some((m) => sobrepoe(m, c));
  }));
  const novos: Modulo[] = [];
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    if (ocup[j][i]) continue;
    let i2 = i;
    while (i2 + 1 < nx && !ocup[j][i2 + 1] && X[i2 + 2] - X[i] <= max + 0.01) i2++;
    let j2 = j;
    const linhaLivre = (jj: number) => { for (let k = i; k <= i2; k++) if (ocup[jj][k]) return false; return true; };
    while (j2 + 1 < ny && linhaLivre(j2 + 1) && Y[j2 + 2] - Y[j] <= max + 0.01) j2++;
    for (let jj = j; jj <= j2; jj++) for (let k = i; k <= i2; k++) ocup[jj][k] = true;
    const w = X[i2 + 1] - X[i], d = Y[j2 + 1] - Y[j];
    if (w >= 10 && d >= 10) novos.push([X[i], Y[j], w, d, 1, 1, 0]);
  }
  return [...mods, ...novos].slice(0, MAX_MODULOS);
}

/** Área ocupada (0–1) e maior folga livre, para o aviso do editor. */
export function ocupacao(mods: Modulo[], GW: number, GD: number): number {
  const a = mods.reduce((s, m) => s + m[2] * m[3], 0);
  return Math.min(1, a / (GW * GD));
}

/** Aproximação "magnética": encosta a paredes e a arestas de outros módulos (até 4 mm). */
export function iman(v: number, alvos: number[]): number {
  let best = snap(v), dist = Math.abs(best - v);
  for (const a of alvos) { const d = Math.abs(a - v); if (d < 4 && d <= dist) { best = a; dist = d; } }
  return best;
}

// ── geometria 3D (gaveta montada) ──
const CORES = ['#3b82f6', '#60a5fa', '#2563eb', '#93c5fd', '#1d4ed8', '#38bdf8', '#818cf8', '#0ea5e9'];

function rrectShape(w: number, d: number, r: number, ox = 0, oy = 0, s: THREE.Shape | THREE.Path = new THREE.Shape()) {
  r = Math.max(0.01, Math.min(r, w / 2 - 0.01, d / 2 - 0.01));
  s.moveTo(ox + r, oy);
  s.lineTo(ox + w - r, oy); s.absarc(ox + w - r, oy + r, r, -Math.PI / 2, 0, false);
  s.lineTo(ox + w, oy + d - r); s.absarc(ox + w - r, oy + d - r, r, 0, Math.PI / 2, false);
  s.lineTo(ox + r, oy + d); s.absarc(ox + r, oy + d - r, r, Math.PI / 2, Math.PI, false);
  s.lineTo(ox, oy + r); s.absarc(ox + r, oy + r, r, Math.PI, 1.5 * Math.PI, false);
  return s;
}
const ext = (s: THREE.Shape, h: number, z = 0) => {
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: false, curveSegments: 6 });
  g.translate(0, 0, z); return g;
};
const caixa = (x: number, y: number, z: number, w: number, d: number, h: number) => {
  const g = new THREE.BoxGeometry(w, d, h); g.translate(x + w / 2, y + d / 2, z + h / 2); return g;
};

function geometriaModulo(m: Modulo, k: ReturnType<typeof medidasGaveta>): THREE.BufferGeometry[] {
  const { HM, WALL, BOT, RAIO, FOLGA, DT } = k;
  const x = m[0] + FOLGA / 2, y = m[1] + FOLGA / 2, w = m[2] - FOLGA, d = m[3] - FOLGA;
  const r = Math.min(RAIO, w / 2 - 0.01, d / 2 - 0.01), ri = Math.max(r - WALL, 0.01);
  const iw = w - 2 * WALL, id = d - 2 * WALL;
  const g: THREE.BufferGeometry[] = [];
  g.push(ext(rrectShape(w, d, r, x, y) as THREE.Shape, BOT));
  const anel = rrectShape(w, d, r, x, y) as THREE.Shape;
  anel.holes.push(rrectShape(iw, id, ri, x + WALL, y + WALL, new THREE.Path()) as THREE.Path);
  g.push(ext(anel, HM - BOT, BOT));
  const hd = HM - BOT - 2;
  for (let i = 1; i < m[4]; i++) g.push(caixa(x + WALL + (i * iw) / m[4] - DT / 2, y + WALL, BOT, DT, id, hd));
  for (let j = 1; j < m[5]; j++) g.push(caixa(x + WALL, y + WALL + (j * id) / m[5] - DT / 2, BOT, iw, DT, hd));
  if (m[6] === 1) {
    const rc = Math.min(15, (HM - BOT) * 0.6, (id / m[5]) * 0.6);
    for (let j = 0; j < m[5]; j++) {
      // perfil (y, z) da rampa côncava, extrudido ao longo de x
      const p = new THREE.Shape();
      p.moveTo(0, 0); p.lineTo(rc, 0);
      for (let a = 0; a <= 12; a++) { const t = (a / 12) * (Math.PI / 2); p.lineTo(rc - rc * Math.sin(t), rc - rc * Math.cos(t)); }
      p.lineTo(0, 0);
      const gg = new THREE.ExtrudeGeometry(p, { depth: iw, bevelEnabled: false });
      gg.applyMatrix4(new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0)));
      gg.translate(x + WALL, y + WALL + (j * id) / m[5] + (j > 0 ? DT / 2 : 0), BOT);
      g.push(gg);
    }
  }
  return g;
}

/** Gaveta (fundo e contorno, só visual) + módulos montados. Origem no canto frente-esquerda. */
export function construirOrganizador(params: Record<string, any>, selecionado = -1): THREE.Group {
  const k = medidasGaveta(params);
  const mods = lerModulos(params.modulos).filter((m) => moduloValido(m, k.GW, k.GD));
  const grupo = new THREE.Group();
  const matGaveta = new THREE.MeshStandardMaterial({ color: '#334155', roughness: 0.9, transparent: true, opacity: 0.55 });
  grupo.add(new THREE.Mesh(caixa(-3, -3, -2, k.GW + 6, k.GD + 6, 2), matGaveta));
  const contorno = rrectShape(k.GW + 6, k.GD + 6, 1, -3, -3) as THREE.Shape;
  contorno.holes.push(rrectShape(k.GW, k.GD, 0.5, 0, 0, new THREE.Path()) as THREE.Path);
  grupo.add(new THREE.Mesh(ext(contorno, k.GH, 0), new THREE.MeshStandardMaterial({ color: '#475569', roughness: 0.9, transparent: true, opacity: 0.18, depthWrite: false })));
  mods.forEach((m, i) => {
    const mat = new THREE.MeshStandardMaterial({ color: i === selecionado ? '#f59e0b' : CORES[i % CORES.length], roughness: 0.55, metalness: 0.05 });
    for (const g of geometriaModulo(m, k)) grupo.add(new THREE.Mesh(g, mat));
  });
  grupo.userData.medidas = k;
  return grupo;
}

export function libertarOrganizador(grupo: THREE.Group) {
  const mats = new Set<THREE.Material>();
  grupo.traverse((o) => {
    const me = o as THREE.Mesh;
    if (me.geometry) me.geometry.dispose();
    if (me.material) mats.add(me.material as THREE.Material);
  });
  mats.forEach((x) => x.dispose());
}

export const COR_MODULO = (i: number) => CORES[i % CORES.length];
