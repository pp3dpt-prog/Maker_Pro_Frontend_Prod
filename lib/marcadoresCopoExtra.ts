// Pré-visualização em tempo real dos outros marcadores de copo (parâmetro escondido marcador):
//   "copo_bailarina" → marcador_copo_bailarina   (bailarina com gancho na mão e palco com o nome)
//   "copo_gengibre"  → marcador_copo_gengibre    (boneco de gengibre com argola, cobertura e laço)
//   "copo_borda"     → marcador_copo_nome_borda  (nome numa barra que acaba num gancho em "U")
// Templates em prod_designs (scad_template). As mesmas fórmulas: formas 2D (Clipper) extrudidas,
// arrumadas na mesa como no ficheiro final. Se mudares um .scad, muda também aqui.
// Coordenadas como no .scad (deitado na mesa, z para cima). Cada peça leva o nome da parte do 3MF
// (corpo, nome, cobertura, laco_<i>) — a cor é a de cor_<parte>.

import ClipperLib from 'clipper-lib';
import type { Font } from 'three-stdlib';
// @ts-ignore — módulo JS partilhado (extrusão de regiões Clipper em triângulos)
import { fatiasParaTriangulos } from '@/lib/vetorGeom';
import { textoShapes, fatorEscala, larguraTexto, EM_POR_SIZE } from '@/lib/etiquetaMochila';

export type ModeloMarcadorExtra = 'bailarina' | 'gengibre' | 'borda' | 'foto';
const MODELOS: Record<string, ModeloMarcadorExtra> = { copo_bailarina: 'bailarina', copo_gengibre: 'gengibre', copo_borda: 'borda', copo_foto: 'foto' };
export const modeloMarcadorExtra = (p: Record<string, any> | null | undefined): ModeloMarcadorExtra | null => (p && MODELOS[String(p.marcador)]) || null;
export const FONTE_OMISSAO: Record<ModeloMarcadorExtra, string> = { bailarina: 'Pacifico', gengibre: 'Luckiest Guy', borda: 'Luckiest Guy', foto: 'Pacifico' };
export const COR_OMISSAO: Record<string, string> = {
  corpo: '#111111', nome: '#F472B6', cobertura: '#FFFFFF', acento: '#E0A526',
  laco_1: '#16A34A', laco_2: '#DC2626', laco_3: '#FACC15', laco_4: '#7C3AED', laco_5: '#1E3A8A', laco_6: '#F472B6', laco_7: '#F97316', laco_8: '#38BDF8',
};
// Paleta de reserva para as cores da imagem (marcador "foto"), só até se saber a cor real detetada.
export const PALETA_CORES_IMAGEM = ['#E11D48', '#2563EB', '#16A34A', '#F59E0B', '#7C3AED', '#0EA5E9'];

const num = (v: unknown, d: number) => (v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v)) ? Number(v) : d);
const lim = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const RAD = Math.PI / 180;
type V2 = [number, number];

// ── Clipper (µm) ──
const ESC = 1000;
type Pt = { X: number; Y: number };
type Path = Pt[];
const P = (x: number, y: number): Pt => ({ X: Math.round(x * ESC), Y: Math.round(y * ESC) });
const poligono = (pts: V2[], buraco = false): Path => { const p = pts.map(([x, y]) => P(x, y)); return ClipperLib.Clipper.Orientation(p) !== buraco ? p : p.reverse(); };
const ret = (x: number, y: number, w: number, h: number): Path => poligono([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
const circ = (cx: number, cy: number, r: number, n = 32): V2[] => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((2 * Math.PI * i) / n), cy + r * Math.sin((2 * Math.PI * i) / n)] as V2);
const circulo = (cx: number, cy: number, r: number, n = 32): Path => poligono(circ(cx, cy, r, n));
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
  if (!paths.length) return [];
  const co = new ClipperLib.ClipperOffset(2, 0.02 * ESC);
  co.AddPaths(paths, redondo ? ClipperLib.JoinType.jtRound : ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon);
  const out: Path[] = [];
  co.Execute(out, d * ESC);
  return out;
}
/** Linha (aberta) com espessura 2r e pontas redondas — a cadeia de osso() do .scad. */
function linha(pts: V2[], r: number): Path[] {
  const co = new ClipperLib.ClipperOffset(2, 0.02 * ESC);
  co.AddPath(pts.map(([x, y]) => P(x, y)), ClipperLib.JoinType.jtRound, ClipperLib.EndType.etOpenRound);
  const out: Path[] = [];
  co.Execute(out, r * ESC);
  return out;
}
const osso = (a: V2, b: V2, r: number) => linha([a, b], r);
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
const escalar = (reg: Path[], k: number) => transformar(reg, (x, y) => [x * k, y * k]);
/** Caixa (mm) de uma região; xmin/ymin = +Infinity e xmax/ymax = -Infinity se vazia. */
function bbox(paths: Path[]): { xmin: number; xmax: number; ymin: number; ymax: number } {
  let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
  for (const path of paths) for (const pt of path) {
    const x = pt.X / ESC, y = pt.Y / ESC;
    if (x < xmin) xmin = x; if (x > xmax) xmax = x;
    if (y < ymin) ymin = y; if (y > ymax) ymax = y;
  }
  return { xmin, xmax, ymin, ymax };
}
const rodar = (reg: Path[], ang: number) => { const c = Math.cos(ang * RAD), s = Math.sin(ang * RAD); return transformar(reg, (x, y) => [x * c - y * s, x * s + y * c]); };
function extrudir(out: number[], regiao: Path[], z0: number, z1: number, dx = 0, dy = 0) {
  if (!regiao.length || z1 - z0 < 1e-6) return;
  const tri: number[] = fatiasParaTriangulos([{ z0, z1, regiao }]);
  for (let i = 0; i < tri.length; i += 3) out.push(tri[i] + dx, tri[i + 1] + dy, tri[i + 2]);
}

// ── texto ──
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
/** Texto centrado (halign/valign = "center"), com o tamanho já multiplicado. */
const textoCentro = (font: Font, txt: string, size: number) => (txt ? shapesParaRegiao(textoShapes(font, txt, size, 1, 0, 0)) : []);
/** Texto com halign = "center" e valign = "baseline". */
function textoBase(font: Font, txt: string, size: number): Path[] {
  if (!txt) return [];
  const adv = larguraTexto(font, txt, size);
  const shapes = font.generateShapes(txt, size * EM_POR_SIZE);
  return transformar(shapesParaRegiao(shapes as any), (x, y) => [x - adv / 2, y]);
}

export type PecasMarcador = Record<string, number[]>;
const nomesDe = (p: Record<string, any>, n: number, def: string[] = []) =>
  Array.from({ length: n }, (_, i) => String(p[`nome_${i + 1}`] ?? def[i] ?? ''));

// ══ Bailarina ══
const BAILARINA: V2[] = [
  [-4.13,62],[-4.59,61.94],[-5.43,61.32],[-6.44,60.83],[-6.78,60.49],[-7,60.06],[-7.03,58.73],[-7.21,58.27],[-7.21,56.33],[-7.4,55.86],
  [-7.4,54.11],[-7.58,53.64],[-7.58,50.41],[-7.43,50.07],[-7.4,49.67],[-7.95,47.54],[-7.95,47.08],[-8.6,44.83],[-8.94,44.64],[-9.22,44.86],
  [-9.62,45.47],[-9.8,46.06],[-9.13,47.14],[-8.76,48.28],[-9.28,49.48],[-9.13,50.13],[-9.25,50.59],[-9.09,50.96],[-9.09,51.43],[-9.5,52.07],
  [-10.05,52.5],[-10.67,52.72],[-11.07,52.75],[-11.53,52.94],[-12.73,52.94],[-13.07,52.78],[-13.6,52.72],[-14.95,51.95],[-15.66,51.24],[-16.06,50.62],
  [-16.28,49.95],[-16.31,48.99],[-17.17,48.22],[-17.2,47.45],[-17.36,47.11],[-17.39,46.71],[-17.14,46.15],[-16.71,45.69],[-16.56,45.2],[-16.37,45.04],
  [-15.97,44.95],[-15.51,44.52],[-15.08,44.3],[-14.86,44.27],[-14.18,44.49],[-13.78,44.8],[-13.38,44.77],[-13.16,44.52],[-13.13,44.12],[-12.95,43.66],
  [-12.95,43.19],[-13.2,42.64],[-14.18,42.05],[-15.88,41.41],[-17.33,39.96],[-17.82,39.12],[-18.65,38.08],[-21.52,35.24],[-22.91,34.56],[-24.02,33.82],
  [-27.81,30.8],[-28.92,30.06],[-29.57,29.75],[-30.86,28.83],[-31.69,28.02],[-31.97,27.9],[-32.37,27.38],[-32.09,26.76],[-31.29,26.76],[-31.08,26.45],
  [-31.26,25.9],[-31.26,25.25],[-31.42,24.91],[-31.66,23.65],[-32.19,22.2],[-32.16,21.43],[-31.79,21.03],[-30.98,20.63],[-30.65,20.56],[-30.4,20.35],
  [-30.15,19.79],[-30.09,18.22],[-29.75,17.88],[-29.32,17.67],[-28.8,17.6],[-28.15,17.36],[-27.96,17.14],[-27.69,16.37],[-26.98,15.66],[-24.88,14.52],
  [-23.62,14.46],[-23.28,14.18],[-22.48,13.78],[-21.8,13.57],[-19.67,13.57],[-19.33,13.72],[-18.93,13.75],[-17.54,13.2],[-15.42,13.2],[-14.49,13.57],
  [-14.31,13.5],[-13.9,13.07],[-13.9,12.18],[-14.12,11.75],[-15.66,9.8],[-16.62,7.89],[-17.6,4.96],[-18.56,2.87],[-19.11,2.13],[-19.67,1.85],
  [-20.04,1.39],[-20.78,1.11],[-20.93,0.96],[-20.87,0.83],[-20.29,0.77],[-19.39,0.43],[-18.93,0.43],[-17.54,0.06],[-16.19,0.03],[-15.97,0.34],
  [-15.72,1.23],[-15.32,2.03],[-15.08,2.31],[-14.21,3.88],[-13.47,4.99],[-13.04,5.46],[-12.55,6.29],[-12.02,6.78],[-11.87,6.78],[-11.68,6.6],
  [-9.28,1.79],[-8.79,0.12],[-8.39,0.06],[-7.92,0.25],[-7.28,0.25],[-6.81,0.43],[-6.23,0.46],[-5.64,0.74],[-6.47,3.11],[-6.51,3.51],
  [-7.25,6.2],[-7.25,6.66],[-7.8,8.6],[-7.8,9.06],[-7.99,9.53],[-7.99,9.99],[-8.14,10.45],[-7.8,11.56],[-7.8,12.95],[-7.99,13.41],
  [-7.99,14.24],[-7.74,14.8],[-7.49,15.01],[-6.41,15.26],[-5.98,15.48],[-5.09,16.31],[-4.56,16.37],[-3.02,16.96],[-2.81,17.3],[-2.84,18.07],
  [-3.14,18.65],[-3.21,19.18],[-3.51,19.76],[-3.58,20.29],[-4.25,22.35],[-4.29,22.75],[-4.47,23.22],[-4.47,23.68],[-4.66,24.14],[-4.66,24.79],
  [-4.84,25.25],[-4.84,28.67],[-4.66,29.13],[-4.66,29.97],[-4.47,30.43],[-4.47,30.89],[-4.29,31.35],[-4.29,31.82],[-4.1,32.28],[-4.1,32.74],
  [-3.73,34.13],[-3.73,34.96],[-3.21,36.23],[-3.18,36.81],[-2.99,37.27],[-3.02,37.86],[-3.42,38.85],[-4.59,40.23],[-5.21,41.16],[-5.21,42.73],
  [-5.03,43.19],[-5.03,44.21],[-4.84,44.67],[-4.84,45.69],[-4.66,46.15],[-4.66,49.02],[-4.47,49.48],[-4.47,51.06],[-4.66,51.52],[-4.66,54.38],
  [-4.84,54.85],[-4.84,58.64],[-4.75,58.86],[-4.41,59.07],[-2.28,59.07],[-1.82,58.89],[-1.23,58.92],[-0.8,59.23],[-0.77,59.87],[0,60.24],
  [-0.12,60.49],[-0.86,60.86],[-11.31,33.05],[-11.28,31.72],[-11.53,31.17],[-12.98,29.72],[-13.38,29.13],[-14.18,28.3],[-15.05,26.91],[-15.42,26.55],
  [-16.22,26.14],[-18.99,25.22],[-19.39,25.19],[-19.85,25],[-20.5,25],[-20.96,24.82],[-21.98,24.82],[-22.44,25],[-23.09,25],[-23.43,25.16],
  [-23.96,25.22],[-25.68,25.99],[-25.96,26.24],[-27.53,27.1],[-27.93,27.56],[-27.87,27.78],[-27.47,28.21],[-27.16,29.04],[-26.79,29.41],[-21.33,32.13],
  [-21.06,32.37],[-20.41,32.68],[-19.21,33.85],[-17.45,35.09],[-15.14,37],[-14.71,37.21],[-14.37,37.21],[-14.12,37],[-12.89,35.05],
];
const BAILARINA_REG = uniao([poligono(BAILARINA.slice(0, 222)), poligono(BAILARINA.slice(222), true)]);

function bailarina(p: Record<string, any>, font: Font | null): PecasMarcador {
  const q = lim(Math.round(num(p.quantidade, 6)), 1, 12), tam = lim(num(p.tamanho_nome, 7), 4, 12);
  const etiq = String(p.palco ?? 'Nome em relevo') === 'Rebaixo para etiqueta', fita = lim(num(p.fita, 9), 4, 14);
  const larg = lim(num(p.largura, 44), 30, 80), alt = lim(num(p.altura_figura, 62), 45, 90), esp = lim(num(p.espessura, 3), 2.4, 5);
  const vidro = lim(num(p.espessura_vidro, 2.5), 1, 6), afast = lim(num(p.afastamento, 2), 0, 15);
  const NOMINAL = 62, k = alt / NOMINAL, W = 2.2, PERNA = 18, PONTA = 3, REL = 0.8, REB = 0.4;
  const REBW = 1.2, REL_ACENTO = 0.5; // largura e relevo do rebordo do palco (mm)
  const ANG_PONTA = 25; // abertura da ponta do gancho (fechada um pouco, para apertar melhor no copo)
  const temRebordo = String(p.rebordo ?? 'Sem rebordo') === 'Com rebordo';
  const gU = vidro + 1.2, gP = Math.max(0.6, vidro - 0.6), rc = (gU + W) / 2, hp = etiq ? fita + 3 : tam * 1.3 + 3;
  const xc = Math.min(-16 * k - afast, W / 2 - afast - larg / 2), yc = -hp / 2 + 0.6, top = NOMINAL * k;
  const sAng = Math.sin(ANG_PONTA * RAD), cAng = Math.cos(ANG_PONTA * RAD);
  const b: V2 = [W + gP, top - PERNA];
  const gancho = [
    ...osso([0, top], [0, top - PERNA], W / 2), ...osso([0, top - PERNA], [-afast, yc], W / 2),
    ...intersecao(diferenca([circulo(rc, top, rc + W / 2, 48)], [circulo(rc, top, rc - W / 2, 48)]), [ret(-W, top, 2 * rc + 2 * W, rc + W)]),
    ...osso([2 * rc, top], b, W / 2), ...osso(b, [b[0] + PONTA * sAng, b[1] - PONTA * cAng], W / 2),
  ];
  const palco = offset(offset([ret(xc - larg / 2, yc - hp / 2, larg, hp)], -1.2, false), 1.2);
  const corpo2d = uniao([...mover(escalar(BAILARINA_REG, k), -afast, 0), hull(circ(-afast - 1.6 * k, 60.0 * k, W / 2), circ(0, top, W / 2), circ(0, 60.1 * k, W / 2)), ...gancho, ...palco]);
  // rebordo (moldura à volta do palco), em relevo, com cor própria — só quando "Com rebordo"
  const palcoInterior = offset(offset([ret(xc - (larg - 2 * REBW) / 2, yc - (hp - 2 * REBW) / 2, larg - 2 * REBW, hp - 2 * REBW)], -1.2, false), 1.2);
  const acento2d = temRebordo ? diferenca(palco, palcoInterior) : [];
  const recesso = etiq ? offset([ret(xc - (larg - 4 - 1.2) / 2, yc - (fita + 0.6 - 1.2) / 2, larg - 4 - 1.2, fita + 0.6 - 1.2)], 0.6) : [];
  const cols = q > 6 ? 4 : Math.min(q, 3), passoX = Math.max(larg, 30 * k) + afast + 2 * rc + 2 * W + 6, passoY = NOMINAL * k + hp + rc + 6;
  const def = ['Marina', 'Leonor', 'Beatriz', 'Sofia', 'Inês', 'Matilde'];
  const out: PecasMarcador = { corpo: [], nome: [], acento: [] };
  nomesDe(p, q, def).forEach((nome, i) => {
    const dx = (i % cols) * passoX, dy = -Math.floor(i / cols) * passoY;
    if (etiq) { extrudir(out.corpo, corpo2d, 0, esp - REB, dx, dy); extrudir(out.corpo, diferenca(corpo2d, recesso), esp - REB, esp, dx, dy); }
    else extrudir(out.corpo, corpo2d, 0, esp, dx, dy);
    if (temRebordo) extrudir(out.acento, acento2d, esp - 0.01, esp + REL_ACENTO, dx, dy);
    if (!etiq && nome && font) {
      const esc = Math.max(0.05, fatorEscala(font, nome, tam, larg - 6));
      extrudir(out.nome, mover(textoCentro(font, nome, tam * esc), xc, yc), esp - 0.01, esp + REL, dx, dy);
    }
  });
  return out;
}

export const imagemCorpoFoto = (p: Record<string, any>) => { const v = p.imagem_corpo; return typeof v === 'string' && v.startsWith('uploads/') ? v : ''; };
export const larguraImagemFoto = (p: Record<string, any>) => lim(num(p.largura_imagem, 35), 20, 55);
export const numCoresCorpoFoto = (p: Record<string, any>) =>
  String(p.cores_imagem_corpo ?? '') === 'Cores da imagem' ? Math.max(2, Math.min(6, Math.round(Number(p.num_cores_corpo)) || 3)) : 0;

// ══ Foto (imagem carregada, em vez da bailarina) ══
// Mesmo gancho, palco, nome e rebordo da bailarina (ver bailarina() acima); só a silhueta muda —
// em vez do desenho da bailarina, é o contorno da imagem carregada, com uma haste reta a ligá-la
// ao gancho. Sem AMS (ou sem "Cores da imagem"): tudo numa peça só, uma cor, como a bailarina.
// Com AMS e "Cores da imagem": o corpo (gancho + palco, sem a imagem) fica à parte e cada cor da
// imagem sai como a sua própria peça ("cores"), já tratadas por lib/imagemCores.js (sem sobreposições).
function foto(
  p: Record<string, any>, font: Font | null,
  imagem: { uma: Path[]; cores: { regiao: Path[]; hex: string }[] } | null,
): { corpo: number[]; nome: number[]; acento: number[]; cores: { tri: number[]; hex: string }[] } {
  const q = lim(Math.round(num(p.quantidade, 6)), 1, 12), tam = lim(num(p.tamanho_nome, 7), 4, 12);
  const etiq = String(p.palco ?? 'Nome em relevo') === 'Rebaixo para etiqueta', fita = lim(num(p.fita, 9), 4, 14);
  const larg = lim(num(p.largura, 44), 30, 80), esp = lim(num(p.espessura, 3), 2.4, 5);
  const vidro = lim(num(p.espessura_vidro, 2.5), 1, 6), afast = lim(num(p.afastamento, 2), 0, 15);
  const W = 2.2, PERNA = 18, PONTA = 3, REL = 0.8, REB = 0.4, ESTICA = 12; // ESTICA: haste imagem → gancho (mm)
  const REBW = 1.2, REL_ACENTO = 0.5;
  const ANG_PONTA = 25;
  const temRebordo = String(p.rebordo ?? 'Sem rebordo') === 'Com rebordo';
  const gU = vidro + 1.2, gP = Math.max(0.6, vidro - 0.6), rc = (gU + W) / 2, hp = etiq ? fita + 3 : tam * 1.3 + 3;

  // imagem: com cores próprias (AMS) usa-se cada região à parte; senão a silhueta toda junta
  const multi = !!imagem?.cores?.length;
  const silhueta = multi ? uniao(imagem!.cores.flatMap((c) => c.regiao)) : (imagem?.uma ?? []);
  const bb = bbox(silhueta);
  const imgH = Number.isFinite(bb.ymax) ? Math.max(0, bb.ymax - bb.ymin) : 0;
  const dxImg = -afast, dyImg = Number.isFinite(bb.ymin) ? -bb.ymin : 0;   // centra em x = -afast, base em y = 0
  const top = Math.max(imgH + ESTICA, PERNA + 15);

  const sAng = Math.sin(ANG_PONTA * RAD), cAng = Math.cos(ANG_PONTA * RAD);
  const xc = Math.min(-afast, W / 2 - afast - larg / 2), yc = -hp / 2 + 0.6;
  const b: V2 = [W + gP, top - PERNA];
  const gancho = [
    ...osso([0, top], [0, top - PERNA], W / 2), ...osso([0, top - PERNA], [-afast, yc], W / 2),
    ...osso([-afast, imgH], [0, top], W / 2),   // haste: liga o topo da imagem ao gancho
    ...intersecao(diferenca([circulo(rc, top, rc + W / 2, 48)], [circulo(rc, top, rc - W / 2, 48)]), [ret(-W, top, 2 * rc + 2 * W, rc + W)]),
    ...osso([2 * rc, top], b, W / 2), ...osso(b, [b[0] + PONTA * sAng, b[1] - PONTA * cAng], W / 2),
  ];
  const palco = offset(offset([ret(xc - larg / 2, yc - hp / 2, larg, hp)], -1.2, false), 1.2);
  const palcoInterior = offset(offset([ret(xc - (larg - 2 * REBW) / 2, yc - (hp - 2 * REBW) / 2, larg - 2 * REBW, hp - 2 * REBW)], -1.2, false), 1.2);
  const acento2d = temRebordo ? diferenca(palco, palcoInterior) : [];
  const recesso = etiq ? offset([ret(xc - (larg - 4 - 1.2) / 2, yc - (fita + 0.6 - 1.2) / 2, larg - 4 - 1.2, fita + 0.6 - 1.2)], 0.6) : [];

  // sem cores próprias: a imagem entra no corpo (uma peça só, uma cor, como a bailarina)
  const imgUma = multi ? [] : mover(silhueta, dxImg, dyImg);
  const corpo2d = uniao([...gancho, ...palco, ...imgUma]);

  const cols = q > 6 ? 4 : Math.min(q, 3), passoX = Math.max(larg, 30) + afast + 2 * rc + 2 * W + 6, passoY = top + hp + rc + 6;
  const out = { corpo: [] as number[], nome: [] as number[], acento: [] as number[], cores: [] as { tri: number[]; hex: string }[] };
  const corTri: number[][] = multi ? imagem!.cores.map(() => []) : [];
  nomesDe(p, q).forEach((nome, i) => {
    const dx = (i % cols) * passoX, dy = -Math.floor(i / cols) * passoY;
    if (etiq) { extrudir(out.corpo, corpo2d, 0, esp - REB, dx, dy); extrudir(out.corpo, diferenca(corpo2d, recesso), esp - REB, esp, dx, dy); }
    else extrudir(out.corpo, corpo2d, 0, esp, dx, dy);
    if (multi) imagem!.cores.forEach((c, ci) => extrudir(corTri[ci], mover(c.regiao, dxImg, dyImg), 0, esp, dx, dy));
    if (temRebordo) extrudir(out.acento, acento2d, esp - 0.01, esp + REL_ACENTO, dx, dy);
    if (!etiq && nome && font) {
      const esc = Math.max(0.05, fatorEscala(font, nome, tam, larg - 6));
      extrudir(out.nome, mover(textoCentro(font, nome, tam * esc), xc, yc), esp - 0.01, esp + REL, dx, dy);
    }
  });
  if (multi) imagem!.cores.forEach((c, ci) => out.cores.push({ tri: corTri[ci], hex: c.hex }));
  return out;
}
export const construirMarcadorFoto = foto;

// ══ Boneco de gengibre ══
function gengibre(p: Record<string, any>, font: Font | null): PecasMarcador {
  const q = lim(Math.round(num(p.quantidade, 4)), 1, 8), alt = lim(num(p.altura_boneco, 38), 28, 55), esp = lim(num(p.espessura, 3), 2.4, 4);
  const pe = lim(num(p.diametro_pe, 8), 4, 14);
  const NOMINAL = 36, k = alt / NOMINAL, ALT_COB = 0.6, LINHA = 0.9, PAREDE = 1.8, ABERTURA = 0.75, ANG = 145, TAM_NOME = 3.2, LARG_NOME = 11;
  const L_LACO = 9.5, ESP_LACO = 2, ALT_SAL = 1.0, SAL: V2 = [4.2, 2.4], MAO: V2 = [-12.5, 8.5], PESCOCO: V2 = [0, 4.6];
  const silhueta = offset(offset(uniao([
    circulo(0, 11, 7.2), ...osso([0, 2], [0, -3.5], 6.6), ...osso([-4, 3.5], MAO, 3.3), ...osso([4, 3.5], [12, 1.5], 3.3),
    ...osso([-3, -5], [-6.5, -14.5], 3.7), ...osso([3, -5], [6.5, -14.5], 3.7),
  ]), 1.2), -1.2);
  // argola (mm reais)
  const ri = pe / 2, ro = ri + PAREDE, dir: V2 = [-0.62, 0.78];
  const cc: V2 = [MAO[0] * k + dir[0] * (ro + 1.6 * k), MAO[1] * k + dir[1] * (ro + 1.6 * k)];
  const a2 = 2 * Math.asin(Math.min(0.99, (ABERTURA * pe) / 2 / (ri + PAREDE / 2))) / RAD;
  const cunha = mover(rodar([poligono([[0, 0], [3 * ro * Math.cos((-a2 / 2) * RAD), 3 * ro * Math.sin((-a2 / 2) * RAD)], [3 * ro * Math.cos((a2 / 2) * RAD), 3 * ro * Math.sin((a2 / 2) * RAD)]])], ANG), cc[0], cc[1]);
  const anel = diferenca([circulo(cc[0], cc[1], ro, 48)], [circulo(cc[0], cc[1], ri, 48), ...cunha]);
  const pontas = [-1, 1].map((s) => { const a = (ANG + (s * a2) / 2) * RAD; return circulo(cc[0] + (ri + PAREDE / 2) * Math.cos(a), cc[1] + (ri + PAREDE / 2) * Math.sin(a), PAREDE / 2, 20); });
  const braco = hull(circ(MAO[0] * k, MAO[1] * k, 2.4 * k), circ(cc[0] - dir[0] * (ro - 0.6), cc[1] - dir[1] * (ro - 0.6), 1.6));
  const corpo2d = uniao([...escalar(silhueta, k), ...anel, ...pontas, braco]);
  const sal = (t: number) => offset([ret(-(SAL[0] - 1.2) / 2, -(SAL[1] - 1.2) / 2, SAL[0] - 1.2, SAL[1] - 1.2)], 0.6 + t);
  const laco2d = (t: number) => {
    const w = L_LACO, h = w * 0.62;
    const u = uniao([
      ...[-1, 1].map((s) => hull([[-1.2, -h * 0.225], [1.2, -h * 0.225], [1.2, h * 0.225], [-1.2, h * 0.225]], circ((s * w) / 2 * 0.82, h * 0.32, w * 0.09), circ((s * w) / 2 * 0.82, -h * 0.32, w * 0.09))),
      ret(-w * 0.14, -h * 0.31, w * 0.28, h * 0.62),
    ]);
    const r = offset(offset(u, -0.8), 0.8);   // offset(r=0.8) offset(r=-0.8): abre (tira bicos finos)
    return t ? offset(r, t) : r;
  };
  const onda = (c: V2, ang: number, L: number, n = 2, amp = 0.7) =>
    mover(rodar(linha(Array.from({ length: 24 * n + 1 }, (_, i) => { const t = i / (24 * n); return [(t - 0.5) * L, amp * Math.sin(2 * Math.PI * n * t)] as V2; }), LINHA / 2 / k), ang), c[0], c[1]);
  const sorriso = intersecao(diferenca([circulo(0, 10.2, 3.0, 48)], [circulo(0, 10.2, 3.0 - LINHA / k, 48)]), [ret(-5, 2, 10, 8.2)]);
  const decoracao = uniao([circulo(-2.6, 12.4, 1.0), circulo(2.6, 12.4, 1.0), ...sorriso, ...onda([-11.0, 7.6], 59, 5.6), ...onda([10.4, 1.9], 104, 5.6), ...onda([-5.5, -12.0], 21, 6.4, 2.5), ...onda([5.5, -12.0], -21, 6.4, 2.5)]);
  const zonaLaco = mover(laco2d(0.3), PESCOCO[0], PESCOCO[1]);
  const cols = Math.min(q, 4), passo: V2 = [44 * k + pe / 2 + PAREDE + 4, 42 * k + 4];
  const out: PecasMarcador = { corpo: [], cobertura: [] };
  const lk = L_LACO * k, hk = lk * 0.62;
  const laco = laco2d(0);
  nomesDe(p, q).forEach((nome, i) => {
    const dx = (i % cols) * passo[0], dy = -Math.floor(i / cols) * passo[1];
    extrudir(out.corpo, corpo2d, 0, esp, dx, dy);
    extrudir(out.corpo, mover(sal(0), PESCOCO[0] * k, PESCOCO[1] * k), esp - 0.01, esp + ALT_SAL, dx, dy);
    const esc = font && nome ? Math.max(0.05, fatorEscala(font, nome, TAM_NOME, LARG_NOME)) : 1;
    const txt = font && nome ? mover(textoCentro(font, nome, TAM_NOME * esc), 0, -2.6) : [];
    extrudir(out.cobertura, escalar(diferenca(uniao([...decoracao, ...txt]), zonaLaco), k), esp - 0.01, esp + ALT_COB, dx, dy);
    // laço ao lado dos pés (com o nó e as dobras por cima; o encaixe por baixo não se vê)
    const lx = dx + 19 * k + 1, ly = dy - 13 * k, parte = `laco_${i + 1}`;
    out[parte] = [];
    extrudir(out[parte], escalar(laco, k), 0, ESP_LACO, lx, ly);
    extrudir(out[parte], offset(offset([ret(-lk * 0.14, -hk * 0.31, lk * 0.28, hk * 0.62)], -0.4), 0.4), ESP_LACO - 0.01, ESP_LACO + 0.5, lx, ly);
    for (const s of [-1, 1]) extrudir(out[parte], mover(rodar([ret(-0.35, -hk * 0.2, 0.7, hk * 0.4)], s * 25), s * lk * 0.3, 0), ESP_LACO - 0.01, ESP_LACO + 0.35, lx, ly);
  });
  return out;
}

// ══ Nome na borda ══
const FONTES_BORDA: Record<string, [number, number, number]> = {          // [limiar, esticão, base] (ver o .scad)
  'Luckiest Guy': [1.015, 0.162, 0.066], Anton: [1.214, 0.135, 0.001], 'Sigmar One': [0.984, 0.153, 0.006], Oswald: [1.15, 0.185, 0],
  'Racing Sans One': [0.906, 0.164, 0], 'Baloo 2': [0.875, 0.15, 0], Chewy: [1.072, 0.156, 0], Pacifico: [1.228, 0.156, 0], Lobster: [1.061, 0.156, 0],
  Aladin: [1.025, 0.122, 0], Amarante: [1.095, 0.179, 0], 'Press Start 2P': [1.399, 0, 0.174], 'Open Sans': [1.017, 0.161, 0.001],
};
function borda(p: Record<string, any>, font: Font | null): PecasMarcador {
  const q = lim(Math.round(num(p.quantidade, 6)), 1, 12), tam = lim(num(p.tamanho_nome, 8), 5, 16), larg = lim(num(p.largura, 45), 25, 80);
  const esp = lim(num(p.espessura, 3), 2, 5), vidro = lim(num(p.espessura_vidro, 2.5), 1, 6);
  const W = 2.0, SOBRE = 0.4, PERNA = 22, PONTA = 3;
  const ANG_PONTA = 25; // abertura da ponta do gancho (fechada um pouco, para apertar melhor no copo)
  const gP = Math.max(0.6, vidro - 0.6), rc = (vidro + 1.2 + W) / 2, xi = -4 - larg - 2;
  const a: V2 = [0, -2 * rc], b: V2 = [-PERNA, -(gP + W)];
  const gancho = uniao([
    ...osso([xi, 0], [0, 0], W / 2),
    ...intersecao(diferenca([circulo(0, -rc, rc + W / 2, 48)], [circulo(0, -rc, rc - W / 2, 48)]), [ret(0, -2 * rc - W, rc + W, 2 * rc + 2 * W)]),
    ...osso(a, b, W / 2), ...osso(b, [b[0] - PONTA * Math.cos(ANG_PONTA * RAD), b[1] - PONTA * Math.sin(ANG_PONTA * RAD)], W / 2),
  ]);
  const met = FONTES_BORDA[String(p.fonte ?? 'Luckiest Guy')] ?? [1.02, 0.19, 0.07];
  const maius = /^s/i.test(String(p.maiusculas ?? '').trim());
  const porcol = q > 6 ? Math.ceil(q / 2) : q, passoY = tam * 1.55 + 2 * rc + W + 2, passoX = larg + 6 + 2 * rc + W + 8;
  const out: PecasMarcador = { corpo: [], nome: [] };
  nomesDe(p, q).forEach((n0, i) => {
    const nome = maius ? n0.toUpperCase() : n0;
    const dx = Math.floor(i / porcol) * passoX, dy = -(i % porcol) * passoY;
    extrudir(out.corpo, gancho, 0, esp, dx, dy);
    if (nome && font) {
      const s = tam * Math.max(0.05, fatorEscala(font, nome, tam, larg));
      const txt = intersecao(textoBase(font, nome, s), [ret(-500, -W + SOBRE + met[2] * s, 1000, 100)]);   // nada para baixo da barra
      extrudir(out.nome, diferenca(mover(txt, xi + 2 + larg / 2, W / 2 - SOBRE - met[2] * s), gancho), 0, esp, dx, dy);
    }
  });
  return out;
}

export function construirMarcadorExtra(p: Record<string, any>, font: Font | null): PecasMarcador {
  const m = modeloMarcadorExtra(p);
  return m === 'bailarina' ? bailarina(p, font) : m === 'gengibre' ? gengibre(p, font) : m === 'borda' ? borda(p, font) : {};
}
export const temNomesMarcadorExtra = (p: Record<string, any>) => {
  const m = modeloMarcadorExtra(p);
  if ((m === 'bailarina' || m === 'foto') && String(p.palco ?? 'Nome em relevo') === 'Rebaixo para etiqueta') return false;
  return true;
};
