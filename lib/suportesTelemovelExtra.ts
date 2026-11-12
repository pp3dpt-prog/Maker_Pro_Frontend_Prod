// Pré-visualização em tempo real dos suportes de telemóvel personalizados (só para makers):
//   suporte = "secretaria_personalizado" → templates/suporte_telemovel_secretaria_personalizado.scad
//   suporte = "dock_personalizado"       → templates/suporte_telemovel_dock_personalizado.scad
//   suporte = "dobravel_personalizado"   → templates/suporte_telemovel_dobravel_personalizado.scad
// (Maker_Pro_Docker_Prod). As mesmas fórmulas do .scad: perfis 2D (Clipper) extrudidos pela
// largura e o texto/imagem à face de cada zona. Se mudares um .scad, muda também aqui.
//
// Coordenadas como no .scad: x para trás a partir da frente, y para cima, z na largura — que é já
// a posição de uso com o y para cima do three.js. O desmontável mostra-se montado.
// Os enchimentos (texto/imagem) ficam 0,05 mm para fora da face, sem recortar o rebaixo no corpo
// (como em lib/suporteTelemovel.ts).

import ClipperLib from 'clipper-lib';
import type { Font } from 'three-stdlib';
// @ts-ignore — módulo JS partilhado (extrusão de regiões Clipper em triângulos)
import { fatiasParaTriangulos } from '@/lib/vetorGeom';
import { textoShapes, fatorEscala } from '@/lib/etiquetaMochila';

export type ModeloExtra = 'secretaria' | 'dock' | 'dobravel';
const MODELOS: Record<string, ModeloExtra> = {
  secretaria_personalizado: 'secretaria',
  dock_personalizado: 'dock',
  dobravel_personalizado: 'dobravel',
};
export function modeloSuporteExtra(p: Record<string, any> | null | undefined): ModeloExtra | null {
  return (p && MODELOS[String(p.suporte)]) || null;
}
/** Zonas de texto/imagem de cada modelo (a 1.ª é a que tem texto por omissão). */
export const ZONAS: Record<ModeloExtra, [string, string]> = {
  secretaria: ['encosto', 'labio'],
  dock: ['frente', 'inclinada'],
  dobravel: ['frente', 'lados'],
};
const TAM_OMISSAO: Record<ModeloExtra, [number, number]> = { secretaria: [12, 8], dock: [14, 10], dobravel: [10, 7] };

const num = (v: unknown, d: number) => (v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v)) ? Number(v) : d);
const RAD = Math.PI / 180;
type V2 = [number, number];
type V3 = [number, number, number];

// ── Clipper (µm, como lib/vetorGeom.js) ──
const ESC = 1000;
type Pt = { X: number; Y: number };
export type Path = Pt[];
const P = (x: number, y: number): Pt => ({ X: Math.round(x * ESC), Y: Math.round(y * ESC) });
const poligono = (pts: V2[]): Path => { const p = pts.map(([x, y]) => P(x, y)); return ClipperLib.Clipper.Orientation(p) ? p : p.reverse(); };
const ret = (x: number, y: number, w: number, h: number): Path => poligono([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]);
function executar(tipo: number, a: Path[], b: Path[] = []): Path[] {
  const c = new ClipperLib.Clipper();
  if (a.length) c.AddPaths(a, ClipperLib.PolyType.ptSubject, true);
  if (b.length) c.AddPaths(b, ClipperLib.PolyType.ptClip, true);
  const sol: Path[] = [];
  c.Execute(tipo, sol, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  return sol;
}
const uniao = (a: Path[]) => executar(ClipperLib.ClipType.ctUnion, a);
const diferenca = (a: Path[], b: Path[]) => (b.length ? executar(ClipperLib.ClipType.ctDifference, a, b) : a);
const intersecao = (a: Path[], b: Path[]) => (a.length && b.length ? executar(ClipperLib.ClipType.ctIntersection, a, b) : []);
function offsetRedondo(paths: Path[], d: number): Path[] {
  const co = new ClipperLib.ClipperOffset(2, 0.02 * ESC);
  co.AddPaths(paths, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
  const out: Path[] = [];
  co.Execute(out, d * ESC);
  return out;
}
const transformar = (paths: Path[], f: (x: number, y: number) => V2): Path[] =>
  paths.map((p) => { const q = p.map((pt) => { const [x, y] = f(pt.X / ESC, pt.Y / ESC); return P(x, y); }); return ClipperLib.Clipper.Orientation(q) === ClipperLib.Clipper.Orientation(p) ? q : q.reverse(); });

/** Extrusão de uma região entre z0 e z1, com uma transformação; refletir = a transformação troca a orientação. */
function extrudir(out: number[], regiao: Path[], z0: number, z1: number, tf: (p: V3) => V3 = (p) => p, refletir = false) {
  const tri: number[] = fatiasParaTriangulos([{ z0, z1, regiao }]);
  for (let i = 0; i < tri.length; i += 9) {
    const a = tf([tri[i], tri[i + 1], tri[i + 2]]), b = tf([tri[i + 3], tri[i + 4], tri[i + 5]]), c = tf([tri[i + 6], tri[i + 7], tri[i + 8]]);
    if (refletir) out.push(...a, ...c, ...b); else out.push(...a, ...b, ...c);
  }
}
/** Matriz 4×4 do .scad (linhas) → função. */
const mat = (M: number[][]) => ([u, v, w]: V3): V3 => [
  M[0][0] * u + M[0][1] * v + M[0][2] * w + M[0][3],
  M[1][0] * u + M[1][1] * v + M[1][2] * w + M[1][3],
  M[2][0] * u + M[2][1] * v + M[2][2] * w + M[2][3],
];

// Cada zona tem uma ou mais colocações: matriz face → peça (u = leitura, v = para cima, w para
// fora) e a região útil no plano da face. ajuste: largura útil do texto (o mesmo cálculo do
// servidor, lib/textFit.js) ou null quando o texto não é ajustado (só recortado).
type Colocacao = { M: (p: V3) => V3; regiao: Path[] };
type ZonaGeo = { colocacoes: Colocacao[]; ajuste: number | null };
export type GeoExtra = { corpo: number[]; zonas: Record<string, ZonaGeo>; dp: number };
const MARG = 4, MV = 1;

// ══ Secretária ══
function secretaria(p: Record<string, any>): GeoExtra {
  const W = num(p.largura, 75), a = num(p.angulo, 22), Le = num(p.altura_encosto, 110), e = num(p.espessura, 6);
  const g = num(p.espessura_telemovel, 12), hl = Math.max(e + 3, num(p.altura_labio, 16));
  const ref = String(p.reforco ?? 'Inteiro');
  const rc = !(p.ranhura_cabo === false || p.ranhura_cabo === 0 || p.ranhura_cabo === 'false');
  const wr = num(p.largura_ranhura, 12);
  const s = Math.sin(a * RAD), c = Math.cos(a * RAD);
  const x0 = e + g, V: V2 = [s, c], Nb: V2 = [c, -s], F0: V2 = [x0, e];
  const ad = (A: V2, B: V2, k = 1): V2 => [A[0] + k * B[0], A[1] + k * B[1]];
  const Pk = ad(ad(F0, V, 0.6 * Le), Nb, e);
  const Lb = Math.max(num(p.profundidade_base, 90), x0 + 0.75 * Le * s + e * c + e, Pk[0] + e);

  const polys: Path[] = [
    ret(0, 0, Lb, e), ret(0, 0, e, hl),
    poligono([F0, ad(F0, V, Le), ad(ad(F0, V, Le), Nb, e), ad(F0, Nb, e)]),
  ];
  if (ref === 'Inteiro') polys.push(poligono([F0, Pk, [Lb, e]]));
  else if (ref === 'Barra') {
    const Q: V2 = [Lb - 0.75 * e, e / 2], L = Math.hypot(Q[0] - Pk[0], Q[1] - Pk[1]);
    const np: V2 = [-(Q[1] - Pk[1]) / L, (Q[0] - Pk[0]) / L];
    polys.push(poligono([ad(Pk, np, e / 2), ad(Q, np, e / 2), ad(Q, np, -e / 2), ad(Pk, np, -e / 2)]));
  }
  const perfil = uniao(polys);
  const corpo: number[] = [];
  if (rc) {
    const za = (W - wr) / 2, zb = (W + wr) / 2;
    extrudir(corpo, perfil, 0, za); extrudir(corpo, perfil, zb, W);
    extrudir(corpo, diferenca(perfil, [ret(-1, -1, x0 + 1, hl + 2)]), za, zb);
  } else extrudir(corpo, perfil, 0, W);

  const sc = (Le * Math.max(0, Math.min(100, num(p.posicao_encosto, 70)))) / 100;
  const O = ad(F0, V, sc);
  let regLabio = [ret(-(W / 2 - MARG), -(hl / 2 - MV), W - 2 * MARG, hl - 2 * MV)];
  if (rc) regLabio = diferenca(regLabio, [ret(-wr / 2 - 1, -hl, wr + 2, 2 * hl)]);
  return {
    corpo,
    dp: Math.max(0.4, Math.min(num(p.profundidade_embutido, 1), e - 1.5)),
    zonas: {
      encosto: { ajuste: W - 2 * MARG, colocacoes: [{ M: mat([[0, s, -c, O[0]], [0, c, s, O[1]], [1, 0, 0, W / 2]]), regiao: [ret(-(W / 2 - MARG), MV - sc, W - 2 * MARG, Le - 2 * MV)] }] },
      labio: { ajuste: W - 2 * MARG, colocacoes: [{ M: mat([[0, 0, -1, 0], [0, 1, 0, hl / 2], [1, 0, 0, W / 2]]), regiao: regLabio }] },
    },
  };
}

// ══ Dock vertical ══
function dock(p: Record<string, any>): GeoExtra {
  const W = num(p.largura, 90), D = num(p.profundidade, 75), H = num(p.altura, 50);
  const Hf = Math.max(8, Math.min(H - 5, num(p.altura_frente, 28)));
  const a = num(p.angulo, 12), g = num(p.espessura_telemovel, 12), ds = Math.min(H - 12, num(p.profundidade_ranhura, 18));
  const wf = num(p.largura_ficha, 13), tf = num(p.espessura_ficha, 8), wc = Math.min(wf, num(p.diametro_cabo, 5));
  const s = Math.sin(a * RAD), c = Math.cos(a * RAD);
  const Vp: V2 = [s, c], Np: V2 = [c, -s], gc = g / (2 * c);
  const xs = Math.max(gc + 14, Math.min(0.55 * D, D - gc - 10 - ds * s));
  const B: V2 = [xs - ds * s, H - ds * c];
  const xf = xs - gc - 3, Px = B[0] - B[1] * Math.tan(a * RAD);
  const q = (k: number, l: number): V2 => [B[0] + k * Np[0] + l * Vp[0], B[1] + k * Np[1] + l * Vp[1]];

  const bloco = poligono([[0, 0], [D, 0], [D, H], [xf, H], [0, Hf]]);
  const L = ds + 30;
  const perfil = diferenca([bloco], [poligono([q(-g / 2, 0), q(g / 2, 0), q(g / 2, L), q(-g / 2, L)])]);
  const Lf = (B[1] + 2) / c;
  const furo = poligono([q(-tf / 2, 1), q(tf / 2, 1), q(tf / 2, -Lf), q(-tf / 2, -Lf)]);
  const canal = ret(Px - wc / 2, -1, D - Px + wc / 2 + 1, wc + 1);
  const corpo: number[] = [];
  const zf = [(W - wf) / 2, (W + wf) / 2], zc = [(W - wc) / 2, (W + wc) / 2];
  extrudir(corpo, perfil, 0, zf[0]); extrudir(corpo, perfil, zf[1], W);
  const semFuro = diferenca(perfil, [furo]);
  if (zc[0] > zf[0]) { extrudir(corpo, semFuro, zf[0], zc[0]); extrudir(corpo, semFuro, zc[1], zf[1]); }
  extrudir(corpo, diferenca(semFuro, [canal]), zc[0], zc[1]);

  const Li = Math.hypot(xf, H - Hf), vi: V2 = [xf / Li, (H - Hf) / Li];
  return {
    corpo,
    dp: Math.max(0.4, Math.min(num(p.profundidade_embutido, 1), 3)),
    zonas: {
      frente: { ajuste: W - 2 * MARG, colocacoes: [{ M: mat([[0, 0, -1, 0], [0, 1, 0, Hf / 2], [1, 0, 0, W / 2]]), regiao: [ret(-(W / 2 - MARG), -(Hf / 2 - MV), W - 2 * MARG, Hf - 2 * MV)] }] },
      inclinada: { ajuste: W - 2 * MARG, colocacoes: [{ M: mat([[0, vi[0], -vi[1], xf / 2], [0, vi[1], vi[0], (Hf + H) / 2], [1, 0, 0, W / 2]]), regiao: [ret(-(W / 2 - MARG), -(Li / 2 - MV), W - 2 * MARG, Li - 2 * MV)] }] },
    },
  };
}

// ══ Desmontável (de bolso), montado ══
const OV = 6, XB0 = 4, WE = 12, MF = 9;
function dobravel(p: Record<string, any>): GeoExtra {
  const W = num(p.largura, 80), t = num(p.espessura, 4), a = num(p.angulo, 20), Le = num(p.altura_encosto, 90);
  const g = num(p.espessura_telemovel, 12), hb = num(p.altura_travessa, 18), f = num(p.folga_encaixe, 0.25);
  const s = Math.sin(a * RAD), c = Math.cos(a * RAD);
  const xg0 = 2 * XB0 + t, xg1 = xg0 + g, yf = Math.min(6, hb - 4);
  const T: V2 = [xg1 + Le * s, yf + Le * c], Tb: V2 = [T[0] + WE * c, T[1] - WE * s];
  const Lb = Math.max(Tb[0] + 4, xg1 + 30), xr = Lb - XB0 - t;

  const lateral = diferenca(
    [poligono([[0, 0], [Lb, 0], [Lb, hb], Tb, T, [xg1, yf], [xg0, yf], [xg0, hb], [0, hb]])],
    [XB0, xr].map((x) => ret(x - f / 2, -1, t + f, hb / 2 + f / 2 + 1)),
  );
  const travessa = diferenca([ret(-OV, 0, W + 2 * OV, hb)], [0, W - t].map((z0) => ret(z0 - f / 2, hb / 2 - f / 2, t + f, hb)));
  const corpo: number[] = [];
  extrudir(corpo, lateral, 0, t);
  extrudir(corpo, lateral, W - t, W);
  // travessa: perfil em (z, y), espessura em x — (x, y, z) → (z, y, x) troca a orientação
  for (const x0 of [XB0, xr]) extrudir(corpo, travessa, 0, t, ([x, y, z]) => [x0 + z, y, x], true);

  const Cy = yf + 0.35 * (T[1] - yf);
  const xa = xg1 + (Cy - yf) * Math.tan(a * RAD);
  const xb = Cy <= hb ? Lb : Lb - ((Cy - hb) * (Lb - Tb[0])) / (Tb[1] - hb);
  const Cx = (xa + xb) / 2;
  const interior = offsetRedondo(lateral, -MARG);
  return {
    corpo,
    dp: Math.max(0.4, Math.min(num(p.profundidade_embutido, 1), t - 1.5)),
    zonas: {
      frente: { ajuste: W - 2 * MF, colocacoes: [{ M: mat([[0, 0, -1, XB0], [0, 1, 0, hb / 2], [1, 0, 0, W / 2]]), regiao: [ret(-(W / 2 - MF), -(hb / 2 - MV), W - 2 * MF, hb - 2 * MV)] }] },
      lados: {
        ajuste: null,
        colocacoes: [
          { M: mat([[-1, 0, 0, Cx], [0, 1, 0, Cy], [0, 0, -1, 0]]), regiao: transformar(interior, (x, y) => [-(x - Cx), y - Cy]) },
          { M: mat([[1, 0, 0, Cx], [0, 1, 0, Cy], [0, 0, 1, W]]), regiao: transformar(interior, (x, y) => [x - Cx, y - Cy]) },
        ],
      },
    },
  };
}

export function construirSuporteExtra(p: Record<string, any>): GeoExtra | null {
  const m = modeloSuporteExtra(p);
  return m === 'secretaria' ? secretaria(p) : m === 'dock' ? dock(p) : m === 'dobravel' ? dobravel(p) : null;
}

// ── conteúdo de cada zona (parâmetros conteudo_<z>, texto_<z>, tamanho_texto_<z>, imagem_<z>, largura_imagem_<z>) ──
export function conteudoZonaExtra(p: Record<string, any>, z: string): 'Nada' | 'Texto' | 'Imagem' {
  const m = modeloSuporteExtra(p);
  const omissao = m && ZONAS[m][0] === z ? 'Texto' : 'Nada';
  const v = String(p[`conteudo_${z}`] ?? omissao);
  return v === 'Texto' || v === 'Imagem' ? v : 'Nada';
}
export function textoZonaExtra(p: Record<string, any>, z: string): string {
  const m = modeloSuporteExtra(p);
  return String(p[`texto_${z}`] ?? (m && ZONAS[m][0] === z ? 'pp3d' : ''));
}
export function tamanhoZonaExtra(p: Record<string, any>, z: string): number {
  const m = modeloSuporteExtra(p);
  return num(p[`tamanho_texto_${z}`], m ? TAM_OMISSAO[m][ZONAS[m][0] === z ? 0 : 1] : 10);
}
export function imagemZonaExtra(p: Record<string, any>, z: string): string {
  const v = p[`imagem_${z}`];
  return typeof v === 'string' && v.startsWith('uploads/') ? v : '';
}
export const larguraImagemZonaExtra = (p: Record<string, any>, z: string) => num(p[`largura_imagem_${z}`], 40);

/** Região (Clipper, µm) do texto centrado; ajuste = largura útil (como lib/textFit.js) ou null. */
export function regiaoTextoExtra(font: Font, p: Record<string, any>, z: string, ajuste: number | null): Path[] {
  const txt = textoZonaExtra(p, z);
  if (!txt) return [];
  const size = tamanhoZonaExtra(p, z);
  const esc = ajuste ? Math.max(0.05, fatorEscala(font, txt, size, ajuste)) : 1;
  const paths: Path[] = [];
  for (const sh of textoShapes(font, txt, size, esc, 0, 0)) {
    const ext = sh.extractPoints(12);
    const fora = ext.shape.map((q) => P(q.x, q.y));
    if (fora.length >= 3) paths.push(ClipperLib.Clipper.Orientation(fora) ? fora : fora.reverse());
    for (const h of ext.holes) {
      const b = h.map((q) => P(q.x, q.y));
      if (b.length >= 3) paths.push(ClipperLib.Clipper.Orientation(b) ? b.reverse() : b);
    }
  }
  return ClipperLib.Clipper.SimplifyPolygons(paths, ClipperLib.PolyFillType.pftNonZero);
}

/** Enchimentos (triângulos, mm) de cada zona, recortados pela região útil de cada colocação. */
export function construirEmbutidosExtra(geo: GeoExtra, regioes: Record<string, Path[] | undefined>): Record<string, number[]> {
  const out: Record<string, number[]> = {};
  for (const [z, zona] of Object.entries(geo.zonas)) {
    out[z] = [];
    const reg = regioes[z];
    if (!reg?.length) continue;
    for (const col of zona.colocacoes) {
      const dentro = intersecao(reg, col.regiao);
      if (dentro.length) extrudir(out[z], dentro, -geo.dp, 0.05, col.M);
    }
  }
  return out;
}
