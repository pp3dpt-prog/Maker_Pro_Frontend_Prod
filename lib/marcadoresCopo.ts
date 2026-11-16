// Pré-visualização em tempo real dos marcadores de copo com clip por trás (parâmetro escondido
// marcador = "copo_clip") — template marcadores_copo_clip em prod_designs (scad_template).
// As mesmas fórmulas do .scad: placas = nome + enfeite + patilha com borda (Clipper), nomes e
// enfeites em relevo, clips de lado com a língua em cauda de andorinha, arrumados na mesa como no
// ficheiro final. Se mudares o .scad, muda também aqui.
//
// Coordenadas como no .scad (deitado na mesa, z para cima).

import ClipperLib from 'clipper-lib';
import type { Font } from 'three-stdlib';
// @ts-ignore — módulo JS partilhado (extrusão de regiões Clipper em triângulos)
import { fatiasParaTriangulos } from '@/lib/vetorGeom';
import { textoShapes, fatorEscala } from '@/lib/etiquetaMochila';

export const isMarcadoresCopo = (p: Record<string, any> | null | undefined) => !!p && p.marcador === 'copo_clip';

const num = (v: unknown, d: number) => (v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v)) ? Number(v) : d);
const lim = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
type V2 = [number, number];
type V3 = [number, number, number];

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
function offset(paths: Path[], d: number, redondo = true): Path[] {
  const co = new ClipperLib.ClipperOffset(2, 0.02 * ESC);
  co.AddPaths(paths, redondo ? ClipperLib.JoinType.jtRound : ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon);
  const out: Path[] = [];
  co.Execute(out, d * ESC);
  return out;
}
function hull(...grupos: V2[][]): Path {
  const pts = grupos.flat().slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o: V2, a: V2, b: V2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo: V2[] = [], hi: V2[] = [];
  for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
  for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], p) <= 0) hi.pop(); hi.push(p); }
  return poligono([...lo.slice(0, -1), ...hi.slice(0, -1)]);
}
const transformar = (paths: Path[], f: (x: number, y: number) => V2): Path[] =>
  paths.map((p) => { const q = p.map((pt) => { const [x, y] = f(pt.X / ESC, pt.Y / ESC); return P(x, y); }); return ClipperLib.Clipper.Orientation(q) === ClipperLib.Clipper.Orientation(p) ? q : q.reverse(); });
const mover = (reg: Path[], dx: number, dy: number) => transformar(reg, (x, y) => [x + dx, y + dy]);
function extrudir(out: number[], regiao: Path[], z0: number, z1: number, tf: (p: V3) => V3 = (p) => p, refletir = false) {
  if (!regiao.length || z1 - z0 < 1e-6) return;
  const tri: number[] = fatiasParaTriangulos([{ z0, z1, regiao }]);
  for (let i = 0; i < tri.length; i += 9) {
    const a = tf([tri[i], tri[i + 1], tri[i + 2]]), b = tf([tri[i + 3], tri[i + 4], tri[i + 5]]), c = tf([tri[i + 6], tri[i + 7], tri[i + 8]]);
    if (refletir) out.push(...a, ...c, ...b); else out.push(...a, ...b, ...c);
  }
}
const yMin = (reg: Path[]) => reg.reduce((m, p) => p.reduce((mm, q) => Math.min(mm, q.Y / ESC), m), Infinity);

// ══ constantes do .scad ══
const RB = 2.2, HT = 8, WT = 12, LT = 7, WI = 8, DC = 1.6, CH = 0.6, TS = 1.6, TBR = 2.4, TL = 1.8, LL = 11, PIN = 0.8;
const WM = WI - 2 * (DC - CH);

export const nomesMarcadores = (p: Record<string, any>): string[] => {
  const def = ['Marina', 'Rita', 'Tiago', 'Sofia', '', '', '', ''];
  const n = lim(Math.round(num(p.quantidade, 4)), 1, 8);
  return Array.from({ length: n }, (_, i) => String(p[`nome_${i + 1}`] ?? def[i]));
};
export const enfeiteMarcadores = (p: Record<string, any>) => String(p.enfeite ?? 'Coração');
export const imagemEnfeite = (p: Record<string, any>) => { const v = p.imagem_enfeite; return enfeiteMarcadores(p) === 'Imagem' && typeof v === 'string' && v.startsWith('uploads/') ? v : ''; };
export const numCoresEnfeite = (p: Record<string, any>) =>
  enfeiteMarcadores(p) === 'Imagem' && String(p.cores_imagem_enfeite ?? '') === 'Cores da imagem' ? Math.max(2, Math.min(6, Math.round(Number(p.num_cores_enfeite)) || 3)) : 0;

function textoRegiao(font: Font, txt: string, size: number, esc: number): Path[] {
  const paths: Path[] = [];
  for (const sh of textoShapes(font, txt, size, esc, 0, 0)) {
    const ext = sh.extractPoints(10);
    const fora = ext.shape.map((q) => P(q.x, q.y));
    if (fora.length >= 3) paths.push(ClipperLib.Clipper.Orientation(fora) ? fora : fora.reverse());
    for (const h of ext.holes) { const b = h.map((q) => P(q.x, q.y)); if (b.length >= 3) paths.push(ClipperLib.Clipper.Orientation(b) ? b.reverse() : b); }
  }
  return ClipperLib.Clipper.SimplifyPolygons(paths, ClipperLib.PolyFillType.pftNonZero);
}

/**
 * Peças (triângulos, mm), como as do 3MF: placas, clips, nomes, enfeite (uma cor) e as cores da
 * imagem. imagem: regiões já à escala (uma = imagem de uma cor; cores = uma região por cor).
 */
export function construirMarcadores(
  p: Record<string, any>, font: Font | null,
  imagem: { uma: Path[]; cores: { regiao: Path[]; hex: string }[] } | null,
): { placas: number[]; clips: number[]; nomes: number[]; enfeite: number[]; cores: { tri: number[]; hex: string }[] } {
  const nomes = nomesMarcadores(p), n = nomes.length;
  const s = lim(num(p.tamanho_nome, 10), 5, 18), Wmax = lim(num(p.largura, 45), 25, 80), enf = enfeiteMarcadores(p), se = lim(num(p.tamanho_enfeite, 10), 4, 30);
  const tp = lim(num(p.espessura, 3.2), 2.8, 4.5), rel = lim(num(p.relevo, 1), 0.4, 2.5), vid = lim(num(p.espessura_copo, 2.5), 1, 7), f = lim(num(p.folga, 0.25), 0.1, 0.5);
  const dx = lim(num(p.enfeite_x, 0), -40, 40), dy = lim(num(p.enfeite_y, 0), -15, 15);

  // enfeite (antes de colocar): formas ou imagem com o fundo em y = 0
  let enfUma: Path[] = [];
  let enfCores: { regiao: Path[]; hex: string }[] = [];
  if (enf === 'Coração') { const k = se / 22; enfUma = mover(uniao([...[-1, 1].map((sg) => poligono(circulo(sg * 5.5 * k, 2 * k, 5.6 * k, 48))), poligono([[-10.9 * k, 0.6 * k], [10.9 * k, 0.6 * k], [0, -11.5 * k]])]), 0, se * 0.42); }
  else if (enf === 'Estrela') { const r = se / 2; enfUma = mover([poligono(Array.from({ length: 10 }, (_, k) => { const a = ((90 + k * 36) * Math.PI) / 180, rr = k % 2 === 0 ? r : 0.45 * r; return [rr * Math.cos(a), rr * Math.sin(a)] as V2; }))], 0, se * 0.45); }
  else if (enf === 'Flor') { const r = se / 2; enfUma = mover(uniao([...Array.from({ length: 5 }, (_, k) => { const a = ((k * 72 + 90) * Math.PI) / 180; return poligono(circulo(-0.55 * r * Math.sin(a), 0.55 * r * Math.cos(a), 0.45 * r)); }), poligono(circulo(0, 0, 0.4 * r))]), 0, se * 0.47); }
  else if (enf === 'Imagem' && imagem) {
    const todas = imagem.cores.length ? uniao(imagem.cores.flatMap((c) => c.regiao)) : imagem.uma;
    const y0 = todas.length ? yMin(todas) : 0;
    if (imagem.cores.length) enfCores = imagem.cores.slice(0, 6).map((c) => ({ regiao: mover(c.regiao, 0, -y0), hex: c.hex }));
    else enfUma = mover(imagem.uma, 0, -y0);
  }
  const temEnf = enfUma.length > 0 || enfCores.length > 0;
  const enfTodo = enfCores.length ? uniao(enfCores.flatMap((c) => c.regiao)) : enfUma;

  // arrumação (as mesmas fórmulas do .scad)
  const cols = n <= 4 ? 2 : 3, px = Wmax + 2 * RB + 6, py = s + se + HT + 14, linhas = Math.ceil(n / cols);
  const y0m = ((linhas - 1) * py + py / 2 + 6) / 2;
  const pos = (i: number): V2 => [((i % cols) - (cols - 1) / 2) * px, y0m - Math.floor(i / cols) * py];
  const yclips = y0m - linhas * py + py / 2 - 6;
  const g = vid + 0.4;

  const out = { placas: [] as number[], clips: [] as number[], nomes: [] as number[], enfeite: [] as number[], cores: enfCores.map((c) => ({ tri: [] as number[], hex: c.hex })) };
  nomes.forEach((nome, i) => {
    const esc = font && nome ? Math.max(0.05, fatorEscala(font, nome, s, Wmax)) : 1;
    const hn = 0.62 * s * esc, yr = -hn + 0.6, ytb = yr - HT, ye = hn + 0.6 + dy;
    if (!nome && !temEnf) return;
    const txt = font && nome ? textoRegiao(font, nome, s, esc) : [];
    const enfC = temEnf ? mover(enfTodo, dx, ye) : [];
    const pat = [...offset([ret(-WT / 2 + 2, ytb + 2, WT - 4, HT + 1 - 4)], 2), ret(-(WI / 2 + 1.6), ytb, WI + 3.2, HT + LT + 1.6)];
    const placa = offset(offset(offset(uniao([...txt, ...enfC, ...pat]), RB), 1.2, false), -1.2);
    const [ox, oy] = pos(i);
    const T = ([x, y, z]: V3): V3 => [x + ox, y + oy, z];
    // calha (de baixo): a boca e a cauda — duas camadas recortadas, como na peça impressa
    const yc0 = ytb - 1, yc1 = yr + LT + f;
    extrudir(out.placas, diferenca(placa, [ret(-(WM / 2 + f), yc0, WM + 2 * f, yc1 - yc0)]), 0, DC - CH, T);
    extrudir(out.placas, diferenca(placa, [ret(-(WI / 2 + f), yc0, WI + 2 * f, yc1 - yc0)]), DC - CH, DC + f, T);
    extrudir(out.placas, placa, DC + f, tp, T);
    if (txt.length) extrudir(out.nomes, txt, tp - 0.01, tp + rel, T);
    if (temEnf) {
      const livre = txt.length ? offset(txt, 0.7) : [];
      if (enfCores.length) enfCores.forEach((c, k) => extrudir(out.cores[k].tri, diferenca(mover(c.regiao, dx, ye), livre), tp - 0.01, tp + rel, T));
      else extrudir(out.enfeite, diferenca(enfC, livre), tp - 0.01, tp + rel, T);
    }
  });
  // clips de lado: perfil (x, y) extrudido em z (0..WI) + a língua em cauda de andorinha
  const perfil = uniao([ret(0, 0, TS, LT), ret(0, 0, g + TL, TBR), hull([[g, 0], [g + TL, 0], [g + TL, TBR], [g, TBR]], circulo(g - PIN + TL / 2, -LL + TL / 2, TL / 2, 24))]);
  const yb = -(HT - 1.5), a = WI / 2, b = WM / 2;
  const cauda = poligono([[-b, -0.01], [b, -0.01], [a, DC - CH], [a, DC], [-a, DC], [-a, DC - CH]]);   // (largura, profundidade)
  for (let i = 0; i < n; i++) {
    const cx = (i - (n - 1) / 2) * (g + TL + DC + 8);
    extrudir(out.clips, perfil, 0, WI, ([x, y, z]) => [x + cx, y + yclips, z]);
    // secção (w, d) extrudida em y: (w, d, t) → (x = -d, y = yb + t, z = WI/2 - w)
    extrudir(out.clips, [cauda], 0, LT - yb, ([w, d, t]) => [cx - d, yclips + yb + t, WI / 2 - w]);   // rotação (det = +1)
  }
  return out;
}
