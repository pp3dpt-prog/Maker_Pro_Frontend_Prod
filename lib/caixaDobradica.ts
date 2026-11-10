// Pré-visualização em tempo real das caixas com dobradiça print-in-place e fecho de encaixe
// (caixa-dobradica, caixa-dobradica-bijuteria, caixa-dobradica-arrumacao).
//
// Replica a geometria de Maker_Pro_Docker_Prod/templates/caixa_dobradica.scad — mesmas
// funções e as mesmas contas; se mudares uma medida lá, muda aqui também. Coordenadas com a
// caixa FECHADA (origem no canto frente-esquerda-baixo, z para cima). A tampa vai num grupo
// que roda em torno do eixo da dobradiça: `abertura` 0 = fechada, 1 = aberta a 180° (como
// sai da impressora). O STL final continua a vir do OpenSCAD.

import * as THREE from 'three';
import { ConvexGeometry } from 'three-stdlib';
import type { Font } from 'three-stdlib';
import { textoShapes } from '@/lib/etiquetaMochila';

const num = (v: unknown, d: number) => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
  return typeof n === 'number' && Number.isFinite(n) ? n : d;
};
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);
const bool = (v: unknown, d: boolean) => (v === undefined || v === null ? d : v === true || v === 1 || v === '1' || v === 'true');

/** Detecção pelo parâmetro escondido `caixa_dobradica` (generica | bijuteria | arrumacao). */
export function isCaixaDobradica(p: Record<string, any> | null | undefined): boolean {
  return !!p && typeof p.caixa_dobradica === 'string' && p.caixa_dobradica !== '';
}

export function medidasDobradica(p: Record<string, any>) {
  const W = clamp(num(p.largura, 80), 20, 250);
  const D = clamp(num(p.profundidade, 60), 20, 250);
  const H = clamp(num(p.altura, 35), 12, 120);
  const WALL = clamp(num(p.parede, 2), 1.2, 4);
  const BOT = clamp(num(p.fundo, 1.6), 1.2, 4);
  const FOLGA = clamp(num(p.folga, 0.35), 0.2, 0.7);
  const GAPT = clamp(num(p.folga_tampa, 0.25), 0.1, 0.6);
  const FECHO = bool(p.fecho, true);
  const NX = Math.round(clamp(num(p.divisoes_x, 1), 1, 8));
  const NY = Math.round(clamp(num(p.divisoes_y, 1), 1, 8));
  const ANEIS = bool(p.apoio_aneis, false);
  const TXT = typeof p.texto === 'string' ? p.texto : '';
  const TS = clamp(num(p.tamanho_texto, 10), 4, 40);

  const EW = W + 2 * WALL, EL = D + 2 * WALL, HB = BOT + H;
  const LIDT = Math.max(WALL, 1.6), LIPH = Math.min(3, H - 4), LIPT = 1.2;

  const RP = 1.4, R = RP + FOLGA + 1.5, CL = FOLGA + 0.2;
  const YA = EL + R + CL, ZA = (HB + LIDT) / 2;
  const HM = 2, SPAN = EW - 2 * HM;
  const NSEG = Math.max(3, 2 * Math.floor(SPAN / 12 / 2) + 1);
  const SEG = SPAN / NSEG, GA = FOLGA + 0.1;

  const LW = 12, TT = 1.6, DR = 0.8, ZR = HB - 4;
  const NFECHOS = EW > 140 ? 2 : 1;
  const xfecho = (i: number) => (NFECHOS === 1 ? EW / 2 : (EW * (i + 1)) / 3);

  const DT = 1.2, HD = Math.max(H - LIPH - 0.6, 3);
  return { W, D, H, WALL, BOT, FOLGA, GAPT, FECHO, NX, NY, ANEIS, TXT, TS, EW, EL, HB, LIDT, LIPH, LIPT,
    RP, R, CL, YA, ZA, HM, SPAN, NSEG, SEG, GA, LW, TT, DR, ZR, NFECHOS, xfecho, DT, HD };
}
type M = ReturnType<typeof medidasDobradica>;

const caixa = (x: number, y: number, z: number, w: number, d: number, h: number) => {
  const g = new THREE.BoxGeometry(w, d, h);
  g.translate(x + w / 2, y + d / 2, z + h / 2);
  return g;
};
const cilindroX = (x0: number, len: number, y: number, z: number, r: number, seg = 24) => {
  const g = new THREE.CylinderGeometry(r, r, len, seg);
  g.rotateZ(-Math.PI / 2);              // eixo Y → eixo X
  g.translate(x0 + len / 2, y, z);
  return g;
};
// Perfil (y, z) extrudido ao longo de x ∈ [x0, x0 + len] — como rotate([90,0,90]) linear_extrude.
function perfilX(pts: [number, number][], x0: number, len: number): THREE.BufferGeometry {
  const s = new THREE.Shape(pts.map(([y, z]) => new THREE.Vector2(y, z)));
  const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false });
  // (u, v, w) = (y, z, x)
  const Y = new THREE.Vector3(0, 1, 0), Z = new THREE.Vector3(0, 0, 1), X = new THREE.Vector3(1, 0, 0);
  g.applyMatrix4(new THREE.Matrix4().makeBasis(Y, Z, X));
  g.translate(x0, 0, 0);
  return g;
}
// hull() de um cilindro (eixo X) com caixas — ConvexGeometry, como no caixaPcb.ts
function hullNo(x0: number, x1: number, yc: number, zc: number, r: number, caixas: [number, number, number, number][]) {
  const pts: THREE.Vector3[] = [];
  for (const x of [x0, x1]) {
    for (let i = 0; i < 32; i++) {
      const a = (2 * Math.PI * i) / 32;
      pts.push(new THREE.Vector3(x, yc + r * Math.cos(a), zc + r * Math.sin(a)));
    }
    for (const [y0, y1, z0, z1] of caixas)
      for (const y of [y0, y1]) for (const z of [z0, z1]) pts.push(new THREE.Vector3(x, y, z));
  }
  return new ConvexGeometry(pts);
}

function corpo(m: M): THREE.BufferGeometry[] {
  const g: THREE.BufferGeometry[] = [];
  const { EW, EL, HB, WALL, BOT, W, D } = m;
  g.push(caixa(0, 0, 0, EW, EL, BOT));
  g.push(caixa(0, 0, 0, EW, WALL, HB), caixa(0, EL - WALL, 0, EW, WALL, HB));
  g.push(caixa(0, WALL, 0, WALL, EL - 2 * WALL, HB), caixa(EW - WALL, WALL, 0, WALL, EL - 2 * WALL, HB));
  for (let i = 1; i < m.NX; i++) g.push(caixa(WALL + (i * W) / m.NX - m.DT / 2, WALL, BOT, m.DT, D, m.HD));
  for (let j = 1; j < m.NY; j++) g.push(caixa(WALL, WALL + (j * D) / m.NY - m.DT / 2, BOT, W, m.DT, m.HD));
  if (m.ANEIS) {
    const y0 = WALL, y1 = WALL + D / Math.max(m.NY, 2) - (m.NY > 1 ? m.DT / 2 : 0);
    const hb = Math.max(m.HD * 0.7, 4);
    for (let y = y0 + 3; y <= y1 - 1.5 + 1e-6; y += 5) {
      g.push(caixa(WALL, y - 1.5, BOT, W, 3, hb - 1.5));
      g.push(cilindroX(WALL, W, y, BOT + hb - 1.5, 1.5, 16));
    }
  }
  if (m.FECHO)
    for (let i = 0; i < m.NFECHOS; i++)
      g.push(perfilX([[0, m.ZR], [-m.DR, m.ZR], [0, m.ZR + m.DR * 1.6]], m.xfecho(i) - m.LW / 2, m.LW));
  for (let i = 0; i < m.NSEG; i += 2) {
    const x0 = m.HM + i * m.SEG;
    g.push(hullNo(x0, x0 + m.SEG, m.YA, m.ZA, m.R, [[EL - WALL, EL, 0, m.ZA + m.R]]));
  }
  g.push(cilindroX(m.HM, m.SPAN, m.YA, m.ZA, m.RP));
  return g;
}

function tampa(m: M): THREE.BufferGeometry[] {
  const g: THREE.BufferGeometry[] = [];
  const { EW, EL, HB, WALL, W, D, LIDT, LIPH, LIPT, GAPT } = m;
  g.push(caixa(0, 0, HB, EW, EL, LIDT));
  // rebordo (4 tiras) que entra na cavidade
  const ox = WALL + GAPT, oy = WALL + GAPT, ow = W - 2 * GAPT, od = D - 2 * GAPT, z0 = HB - LIPH;
  g.push(caixa(ox, oy, z0, ow, LIPT, LIPH), caixa(ox, oy + od - LIPT, z0, ow, LIPT, LIPH));
  g.push(caixa(ox, oy + LIPT, z0, LIPT, od - 2 * LIPT, LIPH), caixa(ox + ow - LIPT, oy + LIPT, z0, LIPT, od - 2 * LIPT, LIPH));
  for (let i = 1; i < m.NSEG; i += 2) {
    const x0 = m.HM + i * m.SEG + m.GA, x1 = m.HM + (i + 1) * m.SEG - m.GA;
    g.push(hullNo(x0, x1, m.YA, m.ZA, m.R, [[m.YA - m.R, m.YA + m.R, HB, HB + LIDT]]));
    g.push(caixa(x0, EL - 1, HB, x1 - x0, m.YA - EL + 1, LIDT));
  }
  if (m.FECHO)
    for (let i = 0; i < m.NFECHOS; i++) {
      const xc = m.xfecho(i), yi = -(m.DR + 0.2), zb = m.ZR - m.DR * 1.6 - 2;
      g.push(caixa(xc - m.LW / 2, yi - m.TT, zb, m.LW, m.TT, HB + LIDT - zb));
      g.push(caixa(xc - m.LW / 2, yi - m.TT, HB, m.LW, m.TT - yi + 0.01, LIDT));
      g.push(perfilX([[yi - 0.3, m.ZR - 0.25], [-0.2, m.ZR - 0.25], [-0.2, m.ZR - 0.45], [yi - 0.3, m.ZR - 0.25 - m.DR * 1.6 - 0.3]], xc - m.LW / 2, m.LW));
    }
  return g;
}

/**
 * Caixa (corpo) + tampa num grupo que roda em torno do eixo da dobradiça.
 * Devolve { grupo, pivo }: muda `pivo.rotation.x` com definirAbertura().
 */
export function construirCaixaDobradica(
  params: Record<string, any>, font: Font | null,
  cores = { corpo: '#3b82f6', tampa: '#60a5fa', texto: '#1e3a8a' },
) {
  const m = medidasDobradica(params);
  const matCorpo = new THREE.MeshStandardMaterial({ color: cores.corpo, metalness: 0.1, roughness: 0.55 });
  const matTampa = new THREE.MeshStandardMaterial({ color: cores.tampa, metalness: 0.1, roughness: 0.55 });
  const grupo = new THREE.Group();
  for (const g of corpo(m)) grupo.add(new THREE.Mesh(g, matCorpo));

  // pivô no eixo da dobradiça; a tampa (em coordenadas da caixa fechada) vai deslocada por -eixo
  const pivo = new THREE.Group();
  pivo.position.set(0, m.YA, m.ZA);
  const t = new THREE.Group();
  t.position.set(0, -m.YA, -m.ZA);
  for (const g of tampa(m)) t.add(new THREE.Mesh(g, matTampa));
  // texto gravado no topo: no preview mostra-se como uma inserção mais escura (0.6 mm)
  if (font && m.TXT.trim()) {
    const shapes = textoShapes(font, m.TXT, m.TS, 1, m.EW / 2, m.EL / 2);
    if (shapes.length) {
      const tg = new THREE.ExtrudeGeometry(shapes, { depth: 0.62, bevelEnabled: false, curveSegments: 10 });
      tg.translate(0, 0, m.HB + m.LIDT - 0.6);
      t.add(new THREE.Mesh(tg, new THREE.MeshStandardMaterial({ color: cores.texto, roughness: 0.7 })));
    }
  }
  pivo.add(t);
  grupo.add(pivo);
  grupo.userData.medidas = m;
  return { grupo, pivo, m };
}

/** 0 = fechada; 1 = aberta 180° (deitada na mesa, como sai da impressora). */
export function definirAbertura(pivo: THREE.Group, abertura: number) {
  // rotação de -180° em torno de X: a tampa abre para trás (+y) e desce até à mesa
  pivo.rotation.x = -Math.PI * clamp(abertura, 0, 1);
}

export function libertarCaixaDobradica(grupo: THREE.Group) {
  const mats = new Set<THREE.Material>();
  grupo.traverse((o) => {
    const me = o as THREE.Mesh;
    if (me.geometry) me.geometry.dispose();
    if (me.material) mats.add(me.material as THREE.Material);
  });
  mats.forEach((x) => x.dispose());
}
