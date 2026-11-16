// Pré-visualização em tempo real do porta-chaves suporte de telemóvel dobrável (parâmetro escondido
// porta_chaves = "suporte_dobravel") — template porta_chaves_suporte_telemovel em prod_designs
// (scad_template). As mesmas fórmulas do .scad: formas 2D (Clipper) extrudidas, a faixa da
// dobradiça como perfis (y, z) extrudidos em x e os nós como perfis rodados. Se mudares o .scad,
// muda também aqui.
//
// Coordenadas como no .scad: x na largura, y da frente (argola) para trás, z para cima (deitado,
// como se imprime). A aba roda à volta do eixo da dobradiça (abrir = 0 fechado … 1 aberto, a
// encostar ao batente). Os enchimentos (texto/imagem) ficam 0,05 mm para fora da face, sem
// recortar o rebaixo (como nos outros modelos personalizados).

import ClipperLib from 'clipper-lib';
import type { Font } from 'three-stdlib';
// @ts-ignore — módulo JS partilhado (extrusão de regiões Clipper em triângulos)
import { fatiasParaTriangulos } from '@/lib/vetorGeom';
import { textoShapes, fatorEscala } from '@/lib/etiquetaMochila';

export const isPortaChavesSuporte = (p: Record<string, any> | null | undefined) => !!p && p.porta_chaves === 'suporte_dobravel';

const num = (v: unknown, d: number) => (v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v)) ? Number(v) : d);
const lim = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const RAD = Math.PI / 180;
type V2 = [number, number];
type V3 = [number, number, number];

// ── Clipper (µm) ──
const ESC = 1000;
type Pt = { X: number; Y: number };
export type Path = Pt[];
const P = (x: number, y: number): Pt => ({ X: Math.round(x * ESC), Y: Math.round(y * ESC) });
const poligono = (pts: V2[]): Path => { const p = pts.map(([x, y]) => P(x, y)); return ClipperLib.Clipper.Orientation(p) ? p : p.reverse(); };
const ret = (x: number, y: number, w: number, h: number): Path => poligono([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
const circulo = (cx: number, cy: number, r: number, n = 40): V2[] => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)] as V2);
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
function offset(paths: Path[], d: number, redondo = true): Path[] {
  const co = new ClipperLib.ClipperOffset(2, 0.02 * ESC);
  co.AddPaths(paths, redondo ? ClipperLib.JoinType.jtRound : ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon);
  const out: Path[] = [];
  co.Execute(out, d * ESC);
  return out;
}
/** Invólucro convexo (hull do OpenSCAD) de vários conjuntos de pontos. */
function hull(...grupos: V2[][]): Path {
  const pts = grupos.flat().slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o: V2, a: V2, b: V2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: V2[] = [], hi: V2[] = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  return poligono([...lo.slice(0, -1), ...hi.slice(0, -1)]);
}
const quad = (x: number, y: number, w: number, h: number): V2[] => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const transformar = (paths: Path[], f: (x: number, y: number) => V2): Path[] =>
  paths.map((p) => { const q = p.map((pt) => { const [x, y] = f(pt.X / ESC, pt.Y / ESC); return P(x, y); }); return ClipperLib.Clipper.Orientation(q) === ClipperLib.Clipper.Orientation(p) ? q : q.reverse(); });

/** Extrusão de uma região entre z0 e z1, com uma transformação; refletir = a transformação troca a orientação. */
function extrudir(out: number[], regiao: Path[], z0: number, z1: number, tf: (p: V3) => V3 = (p) => p, refletir = false) {
  if (!regiao.length || z1 - z0 < 1e-6) return;
  const tri: number[] = fatiasParaTriangulos([{ z0, z1, regiao }]);
  for (let i = 0; i < tri.length; i += 9) {
    const a = tf([tri[i], tri[i + 1], tri[i + 2]]), b = tf([tri[i + 3], tri[i + 4], tri[i + 5]]), c = tf([tri[i + 6], tri[i + 7], tri[i + 8]]);
    if (refletir) out.push(...a, ...c, ...b); else out.push(...a, ...b, ...c);
  }
}
/** Perfil (r, x) rodado à volta de uma reta paralela a x que passa em (y0, z0) — rotate_extrude do .scad. */
function rodar(out: number[], perfil: V2[], y0: number, z0: number, n = 32) {
  for (let k = 0; k < perfil.length; k++) {
    const [r1, x1] = perfil[k], [r2, x2] = perfil[(k + 1) % perfil.length];
    for (let j = 0; j < n; j++) {
      const a = (2 * Math.PI * j) / n, b = (2 * Math.PI * (j + 1)) / n;
      const p = (r: number, x: number, t: number): V3 => [x, y0 + r * Math.cos(t), z0 + r * Math.sin(t)];
      const A = p(r1, x1, a), B = p(r2, x2, a), C = p(r2, x2, b), D = p(r1, x1, b);
      out.push(...A, ...C, ...B, ...A, ...D, ...C);   // perfis com x a crescer por fora → normais para fora
    }
  }
}

// ══ medidas (as funções do .scad) ══
const RAIL = 5, MF = 2.5, RC = 7, DB = 7, RA = 0.7, MARG = 1.4, MS = 0.8;
function medidas(p: Record<string, any>) {
  const forma = String(p.forma ?? 'Gato');
  const W = lim(num(p.largura, 34), 28, 50), tb = lim(num(p.espessura, 4), 3.5, 6), lf = lim(num(p.comprimento_aba, 24), 16, 40);
  const e = lim(num(p.espessura_telemovel, 11), 6, 18), b = lim(num(p.angulo, 20), 5, 35);
  const hs = lim(num(p.altura_batente, 4), 2, 10), hl = lim(num(p.altura_labios, 4), 2, 8), fd = lim(num(p.furo_d, 4.5), 3, 7), c = lim(num(p.folga, 0.3), 0.15, 0.6);
  const R = tb / 2, ws = W - 2 * RAIL, wa = ws - 2 * c, ys0 = MF, yh = Math.max(ys0 + c + lf, e + 9), la = yh - ys0 - c;
  const yl = yh - e - 3, L = yh + R + c + DB, za = R, n = ws >= 30 ? 5 : 3;
  const bk = (k: number) => -ws / 2 + (k * ws) / n;
  const rc = Math.max(0.8, R - 0.6), hc = rc, rh = fd / 2, rt = rh + 2.3, yt = -(rh + 1.4);
  const eh = forma === 'Gato' ? Math.min(0.32 * la, 0.4 * wa) : forma === 'Urso' ? 0.17 * wa : forma === 'Coelho' ? Math.min(0.42 * la, 0.75 * wa) : forma === 'Coração' ? 0.25 * wa : 0.5 * wa;
  const ys = (R + c + R * Math.sin(b * RAD)) / Math.cos(b * RAD) + 0.05;
  const yp = (zz: number) => yh + (R + c + (zz - za) * Math.sin(b * RAD)) / Math.cos(b * RAD);
  const dp = Math.max(0.4, Math.min(num(p.profundidade_embutido, 0.6), (tb - 1.6) / 2));
  return { forma, W, tb, e, b, hs, hl, fd, c, R, ws, wa, ys0, yh, la, yl, L, za, n, bk, rc, hc, rh, rt, yt, eh, ys, yp, dp, rb: 0.2 * wa };
}
type M = ReturnType<typeof medidas>;

// ══ silhueta do bicho (local: u na largura, v do eixo para a ponta) ══
function silhuetaBruta(m: M): Path[] {
  const { wa, la, eh, forma: f, rb } = m, vb = la - eh;
  const base = quad(-wa / 2, -3, wa, 1);
  if (f === 'Arco') return [hull(base, circulo(0, la - wa / 2, wa / 2, 64))];
  const cantos = [-1, 1].map((s) => circulo(s * (wa / 2 - rb), vb - rb, rb));
  const partes: Path[] = [hull(base, ...cantos)];
  if (f === 'Gato') {
    partes.push(hull(...cantos, circulo(0, vb + 0.3 * eh - 0.3 * wa, 0.3 * wa, 64)));
    for (const k of [-1, 1]) partes.push(hull(circulo(k * (wa / 2 - 0.6), vb - 3, 0.6, 16), circulo(k * 0.14 * wa, vb - 1, 0.6, 16), circulo(k * (wa / 2 - 0.13 * wa), la - 1.4, 1.4, 32)));
  }
  if (f === 'Urso') for (const s of [-1, 1]) partes.push(poligono(circulo(s * (wa / 2 - 0.2 * wa), la - 0.17 * wa, 0.17 * wa, 48)));
  if (f === 'Coelho') for (const s of [-1, 1]) partes.push(hull(circulo(s * 0.2 * wa, vb - 2, 0.13 * wa, 32), circulo(s * 0.24 * wa, la - 0.12 * wa, 0.12 * wa, 32)));
  if (f === 'Coração') for (const s of [-1, 1]) partes.push(poligono(circulo((s * wa) / 4, la - wa / 4, wa / 4, 64)));
  return uniao(partes);
}
function silhuetaLocal(m: M): Path[] {
  const suave = offset(offset(silhuetaBruta(m), 1, false), -1);          // cantos côncavos redondos
  return intersecao(suave, [ret(-m.wa / 2, -3, m.wa, m.la + 3)]);
}
const localMundo = (m: M, paths: Path[]) => transformar(paths, (u, v) => [u, m.yh - v]);

// ══ geometria ══
export type GeoPortaChaves = { base: number[]; aba: number[]; eixo: [number, number]; abertura: number; zonas: Record<'aba' | 'verso', { para: (q: Path[]) => Path[] }>; leitura: Path[]; hz: number; tb: number; dp: number; ajuste: number };

export function construirPortaChaves(p: Record<string, any>): GeoPortaChaves {
  const m = medidas(p);
  const { W, tb, c, R, ws, yh, za, n, bk, rc, hc, ys, yp, L, yt, rt, rh, hl, hs, yl } = m;
  const sil = silhuetaLocal(m);
  const aba2d = intersecao(localMundo(m, sil), [ret(-50, -50, 100, yh + 50)]);
  const rasgo = uniao([...offset(aba2d, c, false), ret(-ws / 2, yh - R - c - 1.5, ws, R + c + 1.51)]);
  const contorno = uniao([
    ...offset(offset([ret(-W / 2, 0, W, L)], -RC, false), RC),
    hull(circulo(0, yt, rt, 48), quad(-rt - 2, 0, 2 * rt + 4, RC)),
  ]);
  const furos = uniao([...rasgo, poligono(circulo(0, yt, rh))]);
  const base2d = diferenca(contorno, [...furos, ret(-ws / 2, yh - 1, ws, ys + 1)]);

  const base: number[] = [];
  extrudir(base, base2d, 0, tb);
  // faixa da dobradiça: perfil (y, z) extrudido em x, nó a nó
  const faixa = poligono([[yh, 0], [yh + ys, 0], [yh + ys, tb], [yp(tb), tb], [yp(za), za], [yh, za]]);
  const emX = (x0: number) => ([u, v, w]: V3): V3 => [x0 + w, u, v];
  for (let k = 0; k < n; k++) {
    const perfil = k % 2 === 0 ? [faixa] : diferenca([faixa], [poligono(circulo(yh, za, R + c))]);
    extrudir(base, perfil, 0, bk(k + 1) - bk(k), emX(bk(k)));   // (u, v, w) → (w, u, v): rotação, não reflexão
  }
  for (let k = 0; k < n; k += 2) {                                         // nós da base, com os cones
    const x0 = bk(k), x1 = bk(k + 1), cl = k > 0, cr = k < n - 1;
    rodar(base, [[0, x0 - (cl ? hc : 0)], ...(cl ? [[rc, x0] as V2] : []), [R, x0], [R, x1], ...(cr ? [[rc, x1] as V2] : []), [0, x1 + (cr ? hc : 0)]], yh, za);
  }
  // patinhas (cúpula em 3 andares) e lomba (chanfrada), como os hull do .scad
  const pata = (s: number) => { const x0 = ws / 2 + 0.9, x1 = W / 2 - 0.9; return offset([ret(s * (x0 + x1) / 2 - Math.max(0.2, x1 - x0 - 4.8) / 2, yl - 3 - 0.6, Math.max(0.2, x1 - x0 - 4.8), 1.2)], 2.4); };
  for (const s of [-1, 1]) {
    const pt = pata(s);
    extrudir(base, pt, tb - 0.6, tb + hl * 0.55);
    extrudir(base, offset(pt, -0.45, false), tb + hl * 0.55, tb + hl * 0.82);
    extrudir(base, offset(pt, -1.1, false), tb + hl * 0.82, tb + hl);
  }
  const lomba2d = intersecao(offset(contorno, -1.2, false), [ret(-50, yh + R + c + 0.6, 100, 100)]);
  const ch = Math.min(2.5, hs * 0.6);
  for (const s of [-1, 1]) {
    const lado = intersecao(lomba2d, [ret(s > 0 ? ws / 2 : -50, -50, 50 - ws / 2, 500)]);
    extrudir(base, lado, tb - 0.6, tb + hs - ch);
    extrudir(base, offset(lado, -ch / 2, false), tb + hs - ch, tb + hs - ch / 2);
    extrudir(base, offset(lado, -ch, false), tb + hs - ch / 2, tb + hs);
  }
  {
    const y0 = yh + R + c + 0.6, y1 = L - 1.6, z0 = tb - 0.6, z1 = tb + hs;
    const meio = intersecao([poligono([[y0, z0], [y1, z0], [y1, z1 - ch], [y1 - ch, z1], [y0 + ch, z1], [y0, z1 - ch]])], [poligono([[yp(z0), z0], [100, z0], [100, z1 + 1], [yp(z1 + 1), z1 + 1]])]);
    extrudir(base, meio, 0, ws, emX(-ws / 2));
  }

  // aba: corpo plano (pára antes dos cones da base) + os nós dela com os encaixes cónicos
  const corpoAba = diferenca(
    intersecao(aba2d, [ret(-50, -50, 100, 50 + yh - (rc + 1.42 * c + 0.1))]),
    Array.from({ length: n }, (_, k) => k).filter((k) => k % 2 === 0).map((k) => ret(bk(k) - c, yh - R - c, bk(k + 1) - bk(k) + 2 * c, 50)),
  );
  const aba: number[] = [];
  extrudir(aba, corpoAba, 0, tb);
  for (let k = 1; k < n; k += 2) {
    const x0 = bk(k), x1 = bk(k + 1), e = 1.42 * c, h = hc + e, r = rc + e;
    rodar(aba, [[0, x0 + h], [r - c, x0 + c], [R, x0 + c], [R, x1 - c], [r - c, x1 - c], [0, x1 - h]], yh, za);
  }

  // zonas de texto/imagem: referencial de leitura (p, q) → mundo
  const v0 = R + c + MS, v1 = m.forma === 'Arco' ? m.la - 0.22 * m.wa : m.la - m.eh - 0.4, vc = (v0 + v1) / 2, hz = (v1 - v0) / 2;
  const leitura = intersecao(transformar(offset(sil, -(MARG + RA)), (u, v) => [u, v - vc]), [ret(-50, -hz, 100, 2 * hz)]);
  const para = (sinal: number) => (q: Path[]) => transformar(q, (pp, qq) => [sinal * pp, yh - (vc + qq)]);
  return {
    base, aba, eixo: [yh, za], abertura: 90 + m.b, leitura, hz, tb, dp: m.dp, ajuste: W - 15,
    zonas: { aba: { para: para(-1) }, verso: { para: para(1) } },
  };
}

// ── conteúdo de cada zona (usar_texto_<z>, texto_<z>, tamanho_texto_<z>, usar_imagem_<z>, imagem_<z>, largura_imagem_<z>) ──
export const ZONAS_PC = ['aba', 'verso'] as const;
export type ZonaPC = (typeof ZONAS_PC)[number];
const bool = (v: unknown, d: boolean) => (v === undefined || v === null || v === '' ? d : v === true || v === 1 || v === 'true' || v === '1');
export const usaTexto = (p: Record<string, any>, z: ZonaPC) => bool(p[`usar_texto_${z}`], z === 'aba');
export const usaImagem = (p: Record<string, any>, z: ZonaPC) => bool(p[`usar_imagem_${z}`], false);
export const textoZona = (p: Record<string, any>, z: ZonaPC) => String(p[`texto_${z}`] ?? (z === 'aba' ? 'pp3d' : ''));
export const imagemZona = (p: Record<string, any>, z: ZonaPC) => { const v = p[`imagem_${z}`]; return usaImagem(p, z) && typeof v === 'string' && v.startsWith('uploads/') ? v : ''; };
export const larguraImagemZona = (p: Record<string, any>, z: ZonaPC) => num(p[`largura_imagem_${z}`], 10);
export const numCoresZona = (p: Record<string, any>, z: ZonaPC) =>
  usaImagem(p, z) && String(p[`cores_imagem_${z}`] ?? '') === 'Cores da imagem' ? Math.max(2, Math.min(6, Math.round(Number(p[`num_cores_${z}`])) || 3)) : 0;

/** Região do texto (centrado, ajustado à largura útil como lib/textFit.js). */
function regiaoTexto(font: Font, txt: string, size: number, ajuste: number): { reg: Path[]; esc: number } {
  if (!txt) return { reg: [], esc: 1 };
  const esc = Math.max(0.05, fatorEscala(font, txt, size, ajuste));
  const paths: Path[] = [];
  for (const sh of textoShapes(font, txt, size, esc, 0, 0)) {
    const ext = sh.extractPoints(12);
    const fora = ext.shape.map((q) => P(q.x, q.y));
    if (fora.length >= 3) paths.push(ClipperLib.Clipper.Orientation(fora) ? fora : fora.reverse());
    for (const h of ext.holes) { const b = h.map((q) => P(q.x, q.y)); if (b.length >= 3) paths.push(ClipperLib.Clipper.Orientation(b) ? b.reverse() : b); }
  }
  return { reg: ClipperLib.Clipper.SimplifyPolygons(paths, ClipperLib.PolyFillType.pftNonZero), esc };
}
const mover = (reg: Path[], dy: number) => transformar(reg, (x, y) => [x, y + dy]);

/**
 * Enchimentos de cada zona (triângulos, mm): "texto" (texto + imagem de uma cor, na cor da zona) e
 * as cores da imagem ("c1"…), cada uma com a sua região. imagens: região já à escala, por cor (ou uma).
 */
export function construirEnchimentosPC(
  geo: GeoPortaChaves, p: Record<string, any>, z: ZonaPC, font: Font | null,
  imagem: { uma: Path[]; cores: { regiao: Path[]; hex: string }[] } | null,
): { principal: number[]; cores: { tri: number[]; hex: string }[] } {
  const usaT = usaTexto(p, z), txt = textoZona(p, z), size = num(p[`tamanho_texto_${z}`], 5);
  const temImg = !!imagem && (imagem.uma.length > 0 || imagem.cores.length > 0);
  const t = usaT && txt && font ? regiaoTexto(font, txt, size, geo.ajuste) : { reg: [] as Path[], esc: 1 };
  const ambos = temImg && t.reg.length > 0;
  const qt = -geo.hz + size * t.esc * 0.62, qi = (qt + size * t.esc * 0.62 + geo.hz) / 2;
  const recortar = (reg: Path[]) => intersecao(reg, geo.leitura);
  const zz: [number, number] = z === 'aba' ? [geo.tb - geo.dp, geo.tb + 0.05] : [-0.05, geo.dp];
  const extr = (reg: Path[]) => { const out: number[] = []; extrudir(out, geo.zonas[z].para(recortar(reg)), zz[0], zz[1], (q) => q, false); return out; };
  const texto = ambos ? mover(t.reg, qt) : t.reg;
  const umaCor = imagem && !imagem.cores.length ? (ambos ? mover(imagem.uma, qi) : imagem.uma) : [];
  return {
    principal: extr(uniao([...texto, ...umaCor])),
    cores: (imagem?.cores ?? []).slice(0, 6).map((c) => ({ tri: extr(ambos ? mover(c.regiao, qi) : c.regiao), hex: c.hex })),
  };
}
