// Pré-visualização em tempo real das "Árvores de Natal" — as mesmas fórmulas de
// Maker_Pro_Docker_Prod/templates/natal/partes/*.scad. Se mudares um .scad, muda também aqui.
//
// Os modelos trazem no schema um parâmetro escondido `arvore` com o nome do modelo
// (arvore_espiral, arvore_camadas, arvore_texturizada, arvore_lowpoly, arvore_encaixe).
// Devolve a árvore e a estrela do topo em malhas separadas (para terem cores diferentes);
// no STL vão as duas no mesmo polyhedron.

import * as THREE from 'three';

export type ModeloArvore = 'arvore_espiral' | 'arvore_camadas' | 'arvore_texturizada' | 'arvore_lowpoly' | 'arvore_encaixe';
const MODELOS: ModeloArvore[] = ['arvore_espiral', 'arvore_camadas', 'arvore_texturizada', 'arvore_lowpoly', 'arvore_encaixe'];

export function modeloArvore(p: Record<string, any> | null | undefined): ModeloArvore | null {
  const m = p?.arvore;
  return typeof m === 'string' && (MODELOS as string[]).includes(m) ? (m as ModeloArvore) : null;
}
export function isArvoreNatal(p: Record<string, any> | null | undefined): boolean {
  return modeloArvore(p) !== null;
}

const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) && v !== '' && v !== null && v !== undefined ? Number(v) : d);
const RAD = Math.PI / 180;
const cosd = (a: number) => Math.cos(a * RAD);
const sind = (a: number) => Math.sin(a * RAD);
const frac = (x: number) => x - Math.floor(x);
const mod = (a: number, m: number) => ((a % m) + m) % m;
const rampa = (v: number, a: number, b: number) => { if (v <= a) return 0; if (v >= b) return 1; const u = (v - a) / (b - a); return u * u * (3 - 2 * u); };
const oca = (p: Record<string, any>) => String(p.base_arvore ?? '') === 'Oca por baixo (vela LED)';

type P3 = number[];
type Malha = { pts: P3[]; faces: number[][] }; // faces no sentido anti-horário vistas de fora

function triangulos(m: Malha): number[] {
  const out: number[] = [];
  for (const f of m.faces) for (const i of f) out.push(...m.pts[i]);
  return out;
}
const quad = (a: number, b: number, c: number, d: number) => [[a, b, c], [a, c, d]];

// ── estrela (igual a _estrela_topo.scad) ──
function estrelaMalha(np: number, R: number, ri: number, b: number, h: number, a0: number): Malha {
  const M = 2 * np;
  const pt = (i: number, z: number) => { const a = a0 + (i * 180) / np, r = i % 2 === 0 ? R : ri; return [r * cosd(a), r * sind(a), z]; };
  const pts = [...Array.from({ length: M }, (_, i) => pt(i, 0)), ...Array.from({ length: M }, (_, i) => pt(i, b)), [0, 0, 0], [0, 0, b + h]];
  const C = 2 * M, A = C + 1, faces: number[][] = [];
  for (let i = 0; i < M; i++) {
    const j = (i + 1) % M;
    faces.push([C, j, i], ...quad(i, j, M + j, M + i), [A, M + i, M + j]);
  }
  return { pts, faces };
}
function estrelaTopo(p: Record<string, any>, topoAlt: number, rMax: number): number[] {
  const tipo = String(p.estrela_topo ?? 'No topo'), rs = num(p.tamanho_estrela, 15);
  if (tipo === 'No topo') {
    const e = 3, zc = topoAlt - 2 + rs, m = estrelaMalha(5, rs, 0.45 * rs, e, 0, 270);
    return triangulos({ pts: m.pts.map(([x, y, z]) => [x, -z + e / 2, y + zc]), faces: m.faces });
  }
  if (tipo === 'À parte (para colar)') {
    const dx = rMax + 6 + rs, m = estrelaMalha(5, rs, 0.45 * rs, 1.6, 0.35 * rs, 90);
    return triangulos({ pts: m.pts.map(([x, y, z]) => [x + dx, y, z]), faces: m.faces });
  }
  return [];
}

// ── árvore polar (igual a _arvore.scad) ──
type Polar = {
  NA: number; zrows: number[]; rAt: (a: number, z: number) => number;
  oco: boolean; zirows: number[]; rcAt: (z: number) => number;
};
function arvorePolar(s: Polar): number[] {
  const { NA, zrows: ZR } = s, K = ZR.length - 1, R = K + 1;
  const ang = (i: number) => (i * 360) / NA;
  const pts: P3[] = [];
  for (let i = 0; i < NA; i++) { const a = ang(i); for (let k = 0; k <= K; k++) { const r = s.rAt(a, ZR[k]); pts.push([r * cosd(a), r * sind(a), ZR[k]]); } }
  const T = NA * R; pts.push([0, 0, ZR[K]]);
  const faces: number[][] = [];
  for (let i = 0; i < NA; i++) {
    const j = (i + 1) % NA;
    for (let k = 0; k < K; k++) faces.push(...quad(i * R + k, j * R + k, j * R + k + 1, i * R + k + 1));
    faces.push([T, i * R + K, j * R + K]);
  }
  const ZI = s.oco ? s.zirows : [0];
  const RC = ZI.map((z) => (s.oco ? s.rcAt(z) : -1));
  const mau = RC.findIndex((r) => r < 3);
  const kc = mau < 0 ? RC.length - 1 : mau - 1;
  if (kc >= 1) {
    const Ri = kc + 1, O = pts.length;
    for (let i = 0; i < NA; i++) { const a = ang(i); for (let k = 0; k <= kc; k++) pts.push([RC[k] * cosd(a), RC[k] * sind(a), ZI[k]]); }
    const C = pts.length; pts.push([0, 0, ZI[kc]]);
    for (let i = 0; i < NA; i++) {
      const j = (i + 1) % NA;
      faces.push(...quad(i * R, O + i * Ri, O + j * Ri, j * R));                                         // anel do fundo
      for (let k = 0; k < kc; k++) faces.push(...quad(O + i * Ri + k, O + i * Ri + k + 1, O + j * Ri + k + 1, O + j * Ri + k)); // cavidade
      faces.push([C, O + j * Ri + kc, O + i * Ri + kc]);                                                 // tecto
    }
  } else {
    const B = pts.length; pts.push([0, 0, 0]);
    for (let i = 0; i < NA; i++) faces.push([B, ((i + 1) % NA) * R, i * R]);
  }
  return triangulos({ pts, faces });
}
const linhas = (H: number, passo: number, min: number) => { const K = Math.max(min, Math.ceil(H / passo)); return Array.from({ length: K + 1 }, (_, k) => (H * k) / K); };

// ── modelos (iguais aos .scad; a pré-visualização usa as resoluções do modo "preview") ──

function espiral(p: Record<string, any>) {
  const np = Math.max(3, Math.round(num(p.pontas, 6))), R = num(p.raio, 45), H = num(p.altura, 150), pr = num(p.profundidade, 30) / 100;
  const tw = num(p.torcao, 180), s = Math.min(1, Math.max(0, num(p.arredondar, 0.3))), c = num(p.curvatura, 1), t = num(p.parede, 2);
  const perfil = (z: number) => 1.5 + (R - 1.5) * Math.pow(1 - Math.min(1, z / H), c);
  const dperfil = (z: number) => ((R - 1.5) * c * Math.pow(1 - Math.min(0.999, z / H), c - 1)) / H;
  const forma = (a: number) => { const w = Math.abs(mod(np * a, 360) - 180) / 180; return (1 - s) * w + s * (0.5 + 0.5 * cosd(np * a)); };
  const arv = arvorePolar({
    NA: 240, zrows: linhas(H, 3, 24), oco: oca(p), zirows: linhas(H, 4, 8),
    rAt: (a, z) => perfil(z) * (1 - pr * (1 - forma(a - (tw * z) / H))),
    rcAt: (z) => {
      if (z > H - 6) return -1;
      const rv = perfil(z) * (1 - pr), d = dperfil(z) * (1 - pr), ti = (rv * tw * RAD) / H;
      return rv - t * Math.sqrt(1 + d * d + ti * ti);
    },
  });
  return { arvore: arv, estrela: estrelaTopo(p, H, R) };
}

function camadas(p: Record<string, any>) {
  const N = Math.max(2, Math.round(num(p.niveis, 5))), R = num(p.raio, 55), H = num(p.altura, 160);
  const rtr = num(p.raio_tronco, 9), htr = num(p.altura_tronco, 15), nw = Math.max(0, Math.round(num(p.ondas, 8)));
  const ow = nw === 0 ? 0 : num(p.onda, 3), e = num(p.estreitar, 55) / 100, t = num(p.parede, 2);
  const zt = rtr > 0 && htr > 0 ? htr : 0, h = (H - zt) / N;
  const rb = (i: number) => R * (1 - (0.82 * i) / N);
  const neck = (i: number) => (i >= N - 1 ? 1.5 : e * rb(i + 1));
  const rprev = (i: number) => (i === 0 ? (zt > 0 ? rtr : rb(0)) : neck(i - 1));
  const rbe = (i: number) => Math.max(rprev(i), Math.min(rb(i), rprev(i) + 0.6 * h));
  const fl = (i: number) => rbe(i) - rprev(i);
  const zi = (i: number) => zt + i * h;
  const tier = (z: number) => Math.max(0, Math.min(N - 1, Math.floor((z - zt) / h)));
  const rbase = (z: number) => {
    if (zt > 0 && z <= zt) return rtr;
    const i = tier(z), dz = z - zi(i);
    return dz < fl(i) ? rprev(i) + dz : rbe(i) + ((neck(i) - rbe(i)) * (dz - fl(i))) / (h - fl(i));
  };
  const fonda = (z: number) => {
    if (zt > 0 && z <= zt) return 0;
    const i = tier(z), dz = z - zi(i);
    return dz < fl(i) ? dz / fl(i) : Math.max(0, 1 - (dz - fl(i)) / (h - fl(i)));
  };
  const Z: number[] = [0];
  if (zt > 0) Z.push(zt);
  for (let i = 0; i < N; i++) { if (fl(i) > 0.01) Z.push(zi(i) + fl(i)); Z.push(zi(i) + h); }
  const rows: number[] = [];
  for (let s = 0; s < Z.length - 1; s++) { const m = Math.max(1, Math.ceil((Z[s + 1] - Z[s]) / 3)); for (let q = 0; q < m; q++) rows.push(Z[s] + ((Z[s + 1] - Z[s]) * q) / m); }
  rows.push(Z[Z.length - 1]);
  const incl = (z: number) => Math.max(Math.abs(rbase(z + 0.01) - rbase(z)), Math.abs(rbase(z) - rbase(Math.max(0, z - 0.01)))) / 0.01;
  const arv = arvorePolar({
    NA: 360, zrows: rows, oco: oca(p), zirows: rows,
    rAt: (a, z) => rbase(z) + ow * fonda(z) * cosd(nw * a + (tier(z) * 180) / Math.max(1, nw)),
    rcAt: (z) => (z > H - 6 ? -1 : rbase(z) - ow * fonda(z) - t * Math.sqrt(1 + incl(z) ** 2)),
  });
  return { arvore: arv, estrela: estrelaTopo(p, H, R + ow) };
}

function texturizada(p: Record<string, any>) {
  const R = num(p.raio, 50), H = num(p.altura, 140), c = num(p.curvatura, 1), tex = String(p.textura ?? 'Escamas');
  const lam = Math.max(3, num(p.tamanho_textura, 9)), A = num(p.relevo, 1.5), t = num(p.parede, 2);
  const perfil = (z: number) => 1.5 + (R - 1.5) * Math.pow(1 - Math.min(1, z / H), c);
  const dperfil = (z: number) => ((R - 1.5) * c * Math.pow(1 - Math.min(0.999, z / H), c - 1)) / H;
  const lv = lam * 0.75;
  const ncic = (z: number) => Math.max(3, Math.round((2 * Math.PI * perfil(z)) / lam));
  const padrao = (a: number, z: number) => {
    const y = z / lv, fy = Math.floor(y), yy = y - fy;
    const x = (ncic((fy + 0.5) * lv) * a) / 360 + (fy % 2) * 0.5, xx = frac(x) - 0.5;
    switch (tex) {
      case 'Escamas': { const yb = 0.45 * (1 - Math.sqrt(Math.max(0, 1 - 4 * xx * xx))); return yy < yb ? 0 : (1 - (yy - yb) / (1 - yb)) * rampa(yy - yb, 0, 0.12); }
      case 'Bolas': return Math.sqrt(Math.max(0, 1 - (xx * xx + (yy - 0.5) ** 2) / (0.38 * 0.38)));
      case 'Diamantes': return Math.max(0, 1 - 2 * (Math.abs(xx) + Math.abs(yy - 0.5)));
      case 'Grinalda': { const f = frac(z / (lam * 3) - a / 360) - 0.5, w = 0.3; return Math.abs(f) < w / 2 ? 0.5 + 0.5 * cosd((360 * f) / w) : 0; }
      default: return 0;
    }
  };
  const arv = arvorePolar({
    NA: 360, zrows: linhas(H, 2.4, 24), oco: oca(p), zirows: linhas(H, 4, 8),
    rAt: (a, z) => perfil(z) + A * padrao(a, z) * rampa(z, 1.2, 3) * rampa(H - 8 - z, 0, 6),
    rcAt: (z) => (z > H - 6 ? -1 : perfil(z) - t * Math.sqrt(1 + dperfil(z) ** 2)),
  });
  return { arvore: arv, estrela: estrelaTopo(p, H, R + A) };
}

function lowpoly(p: Record<string, any>) {
  const n = Math.max(3, Math.round(num(p.lados, 7))), M = Math.max(2, Math.round(num(p.aneis, 6))), R = num(p.raio, 45), H = num(p.altura, 140);
  const irr = num(p.irregularidade, 12) / 100, sem = num(p.semente, 7), rtr = num(p.raio_tronco, 0), htr = num(p.altura_tronco, 12);
  const tronco = rtr > 0 && htr > 0, seg = 360 / n;
  const hash = (i: number, j: number, c: number) => { const v = sind(i * 127.1 + j * 311.7 + c * 74.7 + sem * 17.3) * 43758.5453; return v - Math.floor(v); };
  const zc0 = tronco ? htr + (R - rtr) * 1.05 : 0, NK = (tronco ? 2 : 0) + M, hz = (H - zc0) / M;
  const vert = (k: number, i: number): P3 => {
    const rot = (k * seg) / 2, j = k - (tronco ? 2 : 0);
    if (j < 0) { const a = rot + i * seg; return [rtr * cosd(a), rtr * sind(a), j === -2 ? 0 : htr]; }
    const fr = j === 0 ? 0.3 : 1;
    const r = R * (1 - j / M) * (1 + fr * irr * (2 * hash(i, j, 0) - 1));
    const a = rot + i * seg + ((irr * seg) / 2) * (2 * hash(i, j, 1) - 1);
    const z = zc0 + j * hz + (j === 0 ? 0 : irr * hz * 0.5 * (2 * hash(i, j, 2) - 1));
    return [r * cosd(a), r * sind(a), z];
  };
  const pts: P3[] = [];
  for (let k = 0; k < NK; k++) for (let i = 0; i < n; i++) pts.push(vert(k, i));
  const B = pts.length, A = B + 1; pts.push([0, 0, 0], [0, 0, H]);
  const faces: number[][] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push([B, j, i], [A, (NK - 1) * n + i, (NK - 1) * n + j]);
    for (let k = 0; k < NK - 1; k++) faces.push([k * n + i, k * n + j, (k + 1) * n + i], [(k + 1) * n + i, k * n + j, (k + 1) * n + j]);
  }
  return { arvore: triangulos({ pts, faces }), estrela: estrelaTopo(p, H, R * (1 + irr)) };
}

/** Prisma de um polígono simples (x, y) com espessura h, deslocado dx em x. */
function extrudir(contorno: [number, number][], h: number, dx: number): number[] {
  let c = contorno.map(([x, y]) => new THREE.Vector2(x + dx, y));
  if (THREE.ShapeUtils.isClockWise(c)) c = c.reverse();
  const tris = THREE.ShapeUtils.triangulateShape(c, []);
  const out: number[] = [];
  for (const [a, b, d] of tris) {
    out.push(c[a].x, c[a].y, h, c[b].x, c[b].y, h, c[d].x, c[d].y, h);   // cima
    out.push(c[a].x, c[a].y, 0, c[d].x, c[d].y, 0, c[b].x, c[b].y, 0);   // baixo
  }
  for (let i = 0; i < c.length; i++) {
    const p = c[i], q = c[(i + 1) % c.length];
    out.push(p.x, p.y, 0, q.x, q.y, 0, q.x, q.y, h, p.x, p.y, 0, q.x, q.y, h, p.x, p.y, h);
  }
  return out;
}

function encaixe(p: Record<string, any>) {
  const N = Math.max(1, Math.round(num(p.niveis, 4))), W = num(p.largura, 100), H = num(p.altura, 150);
  const esp = num(p.espessura, 3), s = esp + num(p.folga, 0.3), tw = num(p.largura_tronco, 16), ht = num(p.altura_tronco, 15);
  const e = num(p.estreitar, 55) / 100, tronco = tw > 0 && ht > 0;
  const tw2 = Math.max(tw / 2, s / 2 + 2), zt = tronco ? ht : 0, hc = (H - zt) / N;
  const w = (i: number) => (W / 2) * (1 - (0.7 * i) / N);
  const neck = (i: number) => Math.max(s / 2 + 1.5, e * w(i + 1));
  const y = (i: number) => zt + i * hc;
  const d: [number, number][] = tronco ? [[tw2, 0], [tw2, zt]] : [];
  for (let i = 0; i < N; i++) { d.push([w(i), y(i)]); if (i < N - 1) d.push([neck(i), y(i + 1)]); }
  d.push([0, H]);
  const espelho = (pts: [number, number][]) => pts.slice().reverse().map(([x, yy]) => [-x, yy] as [number, number]);
  const ym = H / 2;

  // placa A: ranhura de cima até meio
  const dirA: [number, number][] = [];
  let k = 0;
  for (; k < d.length && d[k][1] < ym; k++) dirA.push(d[k]);
  const [x0, y0] = d[k - 1], [x1, y1] = d[k];
  if (y1 > ym) dirA.push([x0 + ((x1 - x0) * (ym - y0)) / (y1 - y0), ym]);
  for (; k < d.length && d[k][0] > s / 2; k++) dirA.push(d[k]);
  const [xa, ya] = d[k - 1], [xb, yb] = d[k];
  dirA.push([s / 2, ya + ((yb - ya) * (s / 2 - xa)) / (xb - xa)]);
  const placaA: [number, number][] = [...dirA, [s / 2, ym], [-s / 2, ym], ...espelho(dirA)];

  // placa B: ranhura de baixo até meio
  const placaB: [number, number][] = [[s / 2, 0], ...d, ...espelho(d.slice(0, -1)), [-s / 2, 0], [-s / 2, ym], [s / 2, ym]];

  const wm = Math.max(W / 2, tw2);
  return { arvore: [...extrudir(placaA, esp, -(wm + 3)), ...extrudir(placaB, esp, wm + 3)], estrela: [] as number[] };
}

/** Triângulos (mm, z para cima) da árvore e da estrela do topo, do modelo indicado em p.arvore. */
export function construirArvoreNatal(p: Record<string, any>): { arvore: number[]; estrela: number[] } {
  switch (modeloArvore(p)) {
    case 'arvore_espiral': return espiral(p);
    case 'arvore_camadas': return camadas(p);
    case 'arvore_texturizada': return texturizada(p);
    case 'arvore_lowpoly': return lowpoly(p);
    case 'arvore_encaixe': return encaixe(p);
    default: return { arvore: [], estrela: [] };
  }
}
