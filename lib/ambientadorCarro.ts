// Pré-visualização em tempo real do ambientador para o carro (parâmetro escondido
// ambientador = "carro") — template ambientador_carro em prod_designs (scad_template; cópia em
// scripts/scad/ambientador_carro.scad). As mesmas medidas e fórmulas do .scad: corpo com a
// cavidade para o algodão e as patilhas da baioneta, tampa perfurada com a saia e as ranhuras,
// texto embutido à face e o clip da grelha na calha do fundo. Se mudares o .scad, muda aqui.
//
// Coordenadas como no .scad, na posição montada (fundo do corpo em z = 0, z para cima). A tampa
// vem na posição "aberta" (patilhas na entrada); fecha-se rodando -ROT graus.
// Tampa regulável: rasgos em raio na tampa e um disco com os mesmos rasgos por cima (peça "disco",
// filha da tampa); o disco na origem = rasgos alinhados (máximo); roda REG_FECHO (45°) graus = fechado.

import ClipperLib from 'clipper-lib';
import type { Font } from 'three-stdlib';
// @ts-ignore — módulo JS partilhado (extrusão de regiões Clipper em triângulos)
import { fatiasParaTriangulos } from '@/lib/vetorGeom';
import { textoShapes, fatorEscala } from '@/lib/etiquetaMochila';

export const isAmbientadorCarro = (p: Record<string, any> | null | undefined) => !!p && p.ambientador === 'carro';

const num = (v: unknown, d: number) => (v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v)) ? Number(v) : d);
const lim = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const RAD = Math.PI / 180;
type V2 = [number, number];

// ── constantes (iguais ao .scad) ──
const PAREDE = 2, T_TAMPA = 2, INLAY = 0.6, SAIA_E = 2.2, SAIA_H = 5;
const LUG_D = 1.0, LUG_H = 1.6, LUG_ANG = 24, TOPO_LUG = 0.8;
export const ROT = 60;
const TAM_TXT = 6, LARG_TXT = 34;
const DT_W0 = 6, DT_W1 = 8, DT_H = 1.6, CLIP_W = 10, DENTE_L = 16;
const N_RASGO = 4, A_RASGO = 20, DISCO_E = 1.6, PINO_D = 4;
export const REG_FECHO = 180 / N_RASGO;   // rodar o disco isto fecha os rasgos

// ── Clipper (µm) ──
const ESC = 1000;
type Pt = { X: number; Y: number };
type Path = Pt[];
const P = (x: number, y: number): Pt => ({ X: Math.round(x * ESC), Y: Math.round(y * ESC) });
const poligono = (pts: V2[]): Path => { const p = pts.map(([x, y]) => P(x, y)); return ClipperLib.Clipper.Orientation(p) ? p : p.reverse(); };
const circ = (cx: number, cy: number, r: number, n = 72): V2[] => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)] as V2);
const circulo = (cx: number, cy: number, r: number, n = 72): Path => poligono(circ(cx, cy, r, n));
const ret = (cx: number, cy: number, w: number, h: number, ang = 0): Path => {
  const c = Math.cos(ang * RAD), s = Math.sin(ang * RAD);
  return poligono(([[-w / 2, -h / 2], [w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2]] as V2[]).map(([x, y]) => [cx + x * c - y * s, cy + x * s + y * c] as V2));
};
function executar(tipo: number, a: Path[], b: Path[] = []): Path[] {
  const c = new ClipperLib.Clipper();
  if (a.length) c.AddPaths(a, ClipperLib.PolyType.ptSubject, true);
  if (b.length) c.AddPaths(b, ClipperLib.PolyType.ptClip, true);
  const sol: Path[] = [];
  c.Execute(tipo, sol, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  return sol;
}
const uniao = (a: Path[]) => executar(ClipperLib.ClipType.ctUnion, a);
const diferenca = (a: Path[], b: Path[]) => (b.length && a.length ? executar(ClipperLib.ClipType.ctDifference, a, b) : a);
const intersecao = (a: Path[], b: Path[]) => (a.length && b.length ? executar(ClipperLib.ClipType.ctIntersection, a, b) : []);
function offset(paths: Path[], d: number): Path[] {
  if (!paths.length) return [];
  const co = new ClipperLib.ClipperOffset(2, 0.02 * ESC);
  co.AddPaths(paths, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
  const out: Path[] = [];
  co.Execute(out, d * ESC);
  return out;
}
/** Fatia de pizza de a0 a a1 graus (como setor() no .scad). */
function setor(r: number, a0: number, a1: number): Path {
  const n = Math.max(2, Math.ceil((a1 - a0) / 4));
  return poligono([[0, 0], ...Array.from({ length: n + 1 }, (_, i) => { const a = (a0 + ((a1 - a0) * i) / n) * RAD; return [r * Math.cos(a), r * Math.sin(a)] as V2; })]);
}
const anel = (ro: number, ri: number) => diferenca([circulo(0, 0, ro, 120)], [circulo(0, 0, ri, 120)]);
const rodar = (reg: Path[], ang: number) => {
  const c = Math.cos(ang * RAD), s = Math.sin(ang * RAD);
  return reg.map((p) => p.map((pt) => { const x = pt.X / ESC, y = pt.Y / ESC; return P(x * c - y * s, x * s + y * c); }));
};

type Fatia = { z0: number; z1: number; regiao: Path[] };
const tri = (fatias: Fatia[]): number[] => fatiasParaTriangulos(fatias.filter((f) => f.regiao.length && f.z1 - f.z0 > 1e-6));

// ── parâmetros ──
export function medidasAmbientador(p: Record<string, any>) {
  const forma = String(p.forma ?? 'Redonda');
  const D = lim(num(p.diametro, 50), 40, 70);
  const prof = lim(num(p.profundidade, 8), 5, 15);
  const padrao = String(p.padrao_furos ?? 'Furos redondos');
  const furo = lim(num(p.tamanho_furo, 3), 2, 5);
  const fundoF = !(p.furos_fundo === false || p.furos_fundo === 0 || p.furos_fundo === '0' || p.furos_fundo === 'false');
  const fix = String(p.fixacao ?? 'Clip para a grelha da ventilação');
  const clip = fix === 'Clip para a grelha da ventilação', argola = fix === 'Argola para pendurar';
  const grelha = lim(num(p.espessura_grelha, 2), 0.8, 4);
  const folga = lim(num(p.folga, 0.25), 0.1, 0.5);
  // como no .scad: só com "Com texto"; texto vazio → "Carro" (a peça do texto nunca sai vazia)
  const reg = p.regulador === 'Tampa regulável';
  const texto = !reg && p.texto_tampa === 'Com texto' ? (String(p.texto ?? '') || 'Carro') : '';
  const F = clip ? 1.6 + DT_H : 1.6, H = F + prof, Ri = D / 2 - PAREDE;
  const sro = Ri - folga, sri = sro - SAIA_E, zlug = H - TOPO_LUG - LUG_H;
  const r1 = PINO_D / 2 + 2.2, r2 = sri - 0.8, rd = r2 + 1.5;
  return { reg, r1, r2, rd, forma, D, prof, padrao, furo, fundoF, clip, argola, grelha, folga, texto, F, H, Ri, sro, sri, zlug, k: D / 50 };
}
type M = ReturnType<typeof medidasAmbientador>;

// ── 2D ──
function contorno(m: M): Path[] {
  const R = m.D / 2;
  if (m.forma === 'Hexagonal') return [poligono(Array.from({ length: 6 }, (_, i) => { const a = (30 + 60 * i) * RAD, r = R / Math.cos(30 * RAD); return [r * Math.cos(a), r * Math.sin(a)] as V2; }))];
  if (m.forma === 'Flor') {
    const u = uniao([circulo(0, 0, R), ...Array.from({ length: 6 }, (_, i) => { const a = (i * 60 + 30) * RAD; return circulo(R * 0.88 * Math.cos(a), R * 0.88 * Math.sin(a), R * 0.3, 40); })]);
    return offset(offset(u, 1.5), -1.5);
  }
  return diferenca([circulo(0, 0, R, 120)], Array.from({ length: 12 }, (_, i) => { const a = i * 30 * RAD; return circulo((R + 0.35) * Math.cos(a), (R + 0.35) * Math.sin(a), 0.9, 16); }));
}

function padrao(m: M, rmax: number, banda = 0, calha = 0): Path[] {
  const d = m.furo, s = d + 1.6, n = Math.ceil(rmax / s);
  const furos: Path[] = [];
  if (m.padrao === 'Ranhuras') {
    for (let j = -n; j <= n; j++) furos.push(...offset([ret(0, j * s, 2 * rmax, 0.02)], d / 2 - 0.01));
  } else {
    const favo = m.padrao === 'Favo';
    for (let j = -n; j <= n; j++) for (let i = -n - 1; i <= n + 1; i++) {
      const sh = j % 2 === 0 ? 0 : 0.5;
      if (favo) {
        const cx = (i + sh) * s * 1.08, cy = j * s * 0.94, r = d * 0.62;
        furos.push(poligono(Array.from({ length: 6 }, (_, q) => { const a = (30 + 60 * q) * RAD; return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as V2; })));
      } else furos.push(circulo((i + sh) * s, j * s * 0.866, d / 2, 20));
    }
  }
  let reg = intersecao([circulo(0, 0, rmax, 120)], uniao(furos));
  if (banda > 0) reg = diferenca(reg, [ret(0, 0, 4 * rmax, banda, ROT)]);
  if (calha > 0) reg = diferenca(reg, [ret(0, 0, 4 * rmax, calha)]);
  return reg;
}

/** Regulador: as aberturas (rasgos em raio), iguais na tampa e no disco. */
function rasgos(m: M): Path[] {
  const passo = 360 / N_RASGO;
  return diferenca(anel(m.r2, m.r1), Array.from({ length: N_RASGO }, (_, i) => setor(m.r2 + 1, i * passo + A_RASGO, (i + 1) * passo)));
}
/** Marcas gravadas na tampa: ponto = alinhado (máximo), traço = desencontrado (mínimo). */
function marcas(m: M): Path[] {
  const rm = (m.rd + m.D / 2) / 2 - 0.3, passo = 360 / N_RASGO, out: Path[] = [];
  for (let i = 0; i < N_RASGO; i++) {
    const a = (90 + i * passo) * RAD, b = 90 + i * passo + passo / 2;
    out.push(circulo(rm * Math.cos(a), rm * Math.sin(a), 0.7, 16));
    out.push(ret(rm * Math.cos(b * RAD), rm * Math.sin(b * RAD), 2, 0.7, b));
  }
  return out;
}

function shapesParaRegiao(shapes: ReturnType<typeof textoShapes>): Path[] {
  const paths: Path[] = [];
  for (const sh of shapes) {
    const ext = sh.extractPoints(10);
    const fora = ext.shape.map((q) => P(q.x, q.y));
    if (fora.length >= 3) paths.push(ClipperLib.Clipper.Orientation(fora) ? fora : fora.reverse());
    for (const h of ext.holes) { const b = h.map((q) => P(q.x, q.y)); if (b.length >= 3) paths.push(ClipperLib.Clipper.Orientation(b) ? b.reverse() : b); }
  }
  return ClipperLib.Clipper.SimplifyPolygons(paths, ClipperLib.PolyFillType.pftNonZero);
}

/** Tamanho real da letra (mm) — como ajuste_texto no servidor: encolhe para caber em LARG_TXT. */
function tamanhoTexto(m: M, font: Font | null) {
  const esc = font && m.texto ? fatorEscala(font, m.texto, TAM_TXT, LARG_TXT) : 1;
  return TAM_TXT * m.k * esc;
}

// ── peças (posição montada, tampa aberta) ──
export type PecasAmbientador = { corpo: number[]; tampa: number[]; texto: number[]; clip: number[]; disco: number[] };

export function construirAmbientador(p: Record<string, any>, font: Font | null): PecasAmbientador {
  const m = medidasAmbientador(p);
  const cont = contorno(m);

  // corpo
  const corpoF: Fatia[] = [];
  let base = cont;
  if (m.argola) {
    const R = m.D / 2, ro = 5, ri = 2.6, cy = R + ro - 1;
    const arg = diferenca(uniao([circulo(0, cy, ro, 40), ret(0, cy - (ro + 2) / 2, 2 * ro, ro + 2)]), [circulo(0, cy, ri, 32)]);
    corpoF.push({ z0: 0, z1: 3, regiao: diferenca(arg, cont) });
  }
  const furosFundo = m.fundoF ? padrao(m, m.Ri - 1.5, 0, m.clip ? DT_W1 + 3 : 0) : [];
  base = diferenca(base, furosFundo);
  if (m.clip) {
    // calha em cauda de andorinha (3 degraus), aberta em -x e fechada em x = CLIP_W/2 + folga
    const xf = CLIP_W / 2 + m.folga, passos = 3;
    for (let i = 0; i < passos; i++) {
      const z0 = (DT_H * i) / passos, z1 = (DT_H * (i + 1)) / passos;
      const w = DT_W0 + ((DT_W1 - DT_W0) * (i + 0.5)) / passos;
      const calha = poligono([[-m.D, -w / 2], [xf, -w / 2], [xf, w / 2], [-m.D, w / 2]]);
      corpoF.push({ z0, z1, regiao: diferenca(base, [calha]) });
    }
    corpoF.push({ z0: DT_H, z1: m.F, regiao: base });
  } else corpoF.push({ z0: 0, z1: m.F, regiao: base });
  corpoF.push({ z0: m.F, z1: m.H, regiao: diferenca(cont, [circulo(0, 0, m.Ri, 120)]) });
  // patilhas (chanfro por baixo em 3 degraus) e trincos
  const patilhas = (dr: number, a0 = -LUG_ANG / 2, a1 = LUG_ANG / 2) =>
    uniao([0, 120, 240].flatMap((a) => intersecao([setor(m.D, a + a0, a + a1)], anel(m.Ri + 0.01, m.Ri - dr))));
  for (let i = 0; i < 3; i++) {
    const z0 = m.zlug - LUG_D + (LUG_D * i) / 3, z1 = m.zlug - LUG_D + (LUG_D * (i + 1)) / 3;
    corpoF.push({ z0, z1, regiao: patilhas((LUG_D * (i + 1)) / 3) });
  }
  corpoF.push({ z0: m.zlug, z1: m.zlug + LUG_H, regiao: patilhas(LUG_D) });
  corpoF.push({ z0: m.H - TOPO_LUG, z1: m.H - TOPO_LUG + 0.4, regiao: patilhas(LUG_D - 0.3, -2, 2) });

  // tampa (montada, aberta)
  const tsize = m.texto ? tamanhoTexto(m, font) : 0;
  const banda = m.texto ? tsize * 1.5 + 2 : 0;
  const face = m.reg ? diferenca(cont, [...rasgos(m), circulo(0, 0, PINO_D / 2 + m.folga, 32)]) : diferenca(cont, padrao(m, m.sri - 0.8, banda));
  const txt = font && m.texto ? rodar(shapesParaRegiao(textoShapes(font, m.texto, tsize, 1, 0, 0)), ROT) : [];
  const saia = anel(m.sro, m.sri);
  const ra = m.Ri - LUG_D - m.folga;
  const z0g = m.zlug - LUG_D - m.folga, z1g = m.H - TOPO_LUG + m.folga;
  const corte = (a0: number, a1: number) => diferenca(uniao([0, 120, 240].map((a) => setor(m.D, a + a0, a + a1))), [circulo(0, 0, ra, 120)]);
  const entrada = corte(-LUG_ANG / 2 - 2, LUG_ANG / 2 + 2);
  const ranhura = corte(-LUG_ANG / 2 - 2, LUG_ANG / 2 + ROT + 0.5);
  const cova = corte(ROT - 3, ROT + 3);
  const zs = m.H - SAIA_H;
  const tampaF: Fatia[] = [
    { z0: zs, z1: z0g, regiao: diferenca(saia, entrada) },
    { z0: z0g, z1: z1g, regiao: diferenca(saia, ranhura) },
    { z0: z1g, z1: z1g + 0.5, regiao: diferenca(saia, cova) },
    { z0: z1g + 0.5, z1: m.H, regiao: saia },
    ...(m.reg ? [
      { z0: m.H, z1: m.H + T_TAMPA - 0.4, regiao: face },
      { z0: m.H + T_TAMPA - 0.4, z1: m.H + T_TAMPA, regiao: diferenca(face, marcas(m)) },
    ] : [
      { z0: m.H, z1: m.H + T_TAMPA - INLAY, regiao: face },
      { z0: m.H + T_TAMPA - INLAY, z1: m.H + T_TAMPA, regiao: diferenca(face, txt) },
    ]),
  ];

  // disco do regulador (com patilha a apontar para as marcas) e pino partido com cabeça cónica
  let disco: number[] = [];
  if (m.reg) {
    const z0 = m.H + T_TAMPA + 0.2;
    const patilha = cascoConvexo([...circ(0, m.rd - 2, 2.2, 24), ...circ(0, m.rd + 1.2, 0.6, 12)]);
    const corpoDisco = diferenca(uniao([circulo(0, 0, m.rd, 120), patilha]), rasgos(m));
    const fenda = [ret(0, 0, 1.2, 2 * PINO_D)];
    const fatias: Fatia[] = [
      { z0, z1: z0 + DISCO_E, regiao: corpoDisco },
      { z0: m.H - 0.15, z1: m.H + T_TAMPA - 0.4, regiao: diferenca([circulo(0, 0, PINO_D / 2, 32)], fenda) },   // haste partida
      { z0: m.H + T_TAMPA - 0.4, z1: z0 + 0.01, regiao: [circulo(0, 0, PINO_D / 2, 32)] },
    ];
    // cabeça cónica (4 degraus), de d = PINO_D − 0.6 em baixo a PINO_D + 1.4 em cima, com a fenda
    for (let i = 0; i < 4; i++) {
      const za = m.H - 1.95 + (1.8 * i) / 4, zb = m.H - 1.95 + (1.8 * (i + 1)) / 4, d = PINO_D - 0.6 + (2 * (i + 0.5)) / 4;
      fatias.push({ z0: za, z1: zb, regiao: diferenca([circulo(0, 0, d / 2, 32)], fenda) });
    }
    disco = tri(fatias);
  }
  const textoT = txt.length ? tri([{ z0: m.H + T_TAMPA - INLAY + 0.01, z1: m.H + T_TAMPA, regiao: txt }]) : [];

  // clip: perfil (u através da calha, v para fora do fundo), extrudido ao longo de x
  let clip: number[] = [];
  if (m.clip) {
    const g = m.grelha, f = m.folga, e = 1.6;
    const sq = (x: number, y: number, w: number, h: number) => poligono([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
    const partes: Path[] = [
      poligono([[-DT_W0 / 2 + f, 0.2], [DT_W0 / 2 - f, 0.2], [DT_W1 / 2 - f, -DT_H + f], [-DT_W1 / 2 + f, -DT_H + f]]),
      sq(-2, 0, 4, 4.6), sq(-(g / 2 + e), 4, g + 2 * e, e),
    ];
    for (const s of [-1, 1]) {
      partes.push(sq(s > 0 ? g / 2 : -g / 2 - e, 4, e, DENTE_L));
      partes.push(circulo(s * (g / 2 + 0.05), 4 + DENTE_L - 3.5, 0.45, 16));
      // ponta aberta (hull de um segmento e de um círculo)
      const pts: V2[] = [[s * (g / 2 + e / 2) - e / 2, 4 + DENTE_L], [s * (g / 2 + e / 2) + e / 2, 4 + DENTE_L], ...circ(s * (g / 2 + e / 2 + 0.9), 4 + DENTE_L + 2, e / 2, 16)];
      partes.push(cascoConvexo(pts));
    }
    const perfil = uniao(partes);
    const t = tri([{ z0: 0, z1: CLIP_W, regiao: perfil }]);
    // (u, v, w) → (x = w − CLIP_W/2, y = u, z = −v)
    clip = new Array(t.length);
    for (let i = 0; i < t.length; i += 9) {
      // a troca de eixos inverte a orientação: troca dois vértices para manter as normais para fora
      const v = [0, 2, 1].map((q) => [t[i + 3 * q + 2] - CLIP_W / 2, t[i + 3 * q], -t[i + 3 * q + 1]]);
      for (let q = 0; q < 3; q++) for (let c = 0; c < 3; c++) clip[i + 3 * q + c] = v[q][c];
    }
  }

  return { corpo: tri(corpoF), tampa: tri(tampaF), texto: textoT, clip, disco };
}

function cascoConvexo(pontos: V2[]): Path {
  const pts = pontos.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o: V2, a: V2, b: V2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: V2[] = [], hi: V2[] = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  return poligono([...lo.slice(0, -1), ...hi.slice(0, -1)]);
}

export const CORES_AMBIENTADOR = { corpo: '#38BDF8', tampa: '#FFFFFF', texto: '#1E3A8A', disco: '#38BDF8' };
