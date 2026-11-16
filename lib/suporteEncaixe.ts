// Pré-visualização em tempo real do "Suporte de telemóvel de secretária em duas peças (encaixe)" —
// as mesmas fórmulas de Maker_Pro_Docker_Prod/templates/suporte_telemovel_encaixe.scad: as costas
// (placa + apoio em V com rebordo) entram numa ranhura inclinada da base. Se mudares o .scad, muda
// também aqui.
//
// Coordenadas como no .scad: x para trás a partir da frente da base, y para cima, z na largura
// (posição de uso com o y para cima do three.js). As costas definem-se em (u ao longo da placa,
// w para trás) e passam para o mundo por B0 + u·V + w·N. Mostra-se montado; "afastar" sobe as
// costas ao longo da placa para se ver o encaixe.

import ClipperLib from 'clipper-lib';
// @ts-ignore — módulo JS partilhado (extrusão de regiões Clipper em triângulos)
import { fatiasParaTriangulos } from '@/lib/vetorGeom';

/** Parâmetro escondido suporte = "telemovel_encaixe". */
export function isSuporteEncaixe(p: Record<string, any> | null | undefined): boolean {
  return !!p && p.suporte === 'telemovel_encaixe';
}

const num = (v: unknown, d: number) => (v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v)) ? Number(v) : d);
const bool = (v: unknown, d: boolean) => (v === undefined || v === null || v === '' ? d : v === true || v === 1 || v === 'true');
const RAD = Math.PI / 180;
type V2 = [number, number];

// ── Clipper (µm, como lib/vetorGeom.js) ──
const ESC = 1000;
type Pt = { X: number; Y: number };
type Path = Pt[];
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

type T3 = (u: number, v: number, z: number) => [number, number, number];
function extrudir(out: number[], regiao: Path[], z0: number, z1: number, tf: T3 = (u, v, z) => [u, v, z], refletir = false) {
  const tri: number[] = fatiasParaTriangulos([{ z0, z1, regiao }]);
  for (let i = 0; i < tri.length; i += 9) {
    const a = tf(tri[i], tri[i + 1], tri[i + 2]), b = tf(tri[i + 3], tri[i + 4], tri[i + 5]), c = tf(tri[i + 6], tri[i + 7], tri[i + 8]);
    if (refletir) out.push(...a, ...c, ...b); else out.push(...a, ...b, ...c);
  }
}

function medidas(p: Record<string, any>) {
  const W = num(p.largura, 80), Lc = num(p.altura_costas, 140), a = num(p.angulo, 20), Hs = num(p.altura_apoio, 55);
  const g = num(p.espessura_telemovel, 13), hl = num(p.altura_labio, 10), e = num(p.espessura, 6);
  const Db = num(p.profundidade_base, 100), hb = num(p.altura_base, 20), dr0 = num(p.profundidade_encaixe, 12);
  const f = num(p.folga_encaixe, 0.25), rc = bool(p.ranhura_cabo, true), wr = Math.min(num(p.largura_ranhura, 15), W - 20);
  const s = Math.sin(a * RAD), c = Math.cos(a * RAD), t = Math.tan(a * RAD);
  const pw = 4, el = Math.max(e, 6), tt = 4, Dl = g + hl + tt, cg = 4;
  const dr = Math.max(4, Math.min(dr0, hb - 3 - f * c - (e + f) * s));
  const xs = Math.max(0.3 * Db, 3 + dr * t + f * (s + c) + 1);
  const B0: V2 = [xs - dr * t, hb - dr];
  const ut = (hb - B0[1]) / c;
  const ha = rc ? ut + 14 : 0;
  const us = Math.max(Math.min((Hs - B0[1]) / c, Lc - hl - 10), (rc ? ha : ut) + el + 3);
  const D = Math.max(Db, B0[0] + Lc * s + e * c + 5);
  return { W, Lc, g, hl, e, hb, f, rc, wr, s, c, pw, el, Dl, cg, xs, B0, ha, us, D, z0: (W - wr) / 2, z1: (W + wr) / 2 };
}
type M = ReturnType<typeof medidas>;

const paraMundo = (m: M, u: number, w: number): V2 => [m.B0[0] + u * m.s + w * m.c, m.B0[1] + u * m.c - w * m.s];

function perfilCostas(m: M, comApoio = true): Path[] {
  const { us, el, hl, g, Dl } = m;
  const polys = [ret(0, 0, m.Lc, m.e)];
  if (comApoio) polys.push(poligono([[us - el, 0], [us - el, -Dl], [us + hl, -Dl], [us + hl, -(g + hl)], [us, -g], [us, 0]]));
  return uniao(polys);
}
function perfilBase(m: M, ranhura = true, canal = false): Path[] {
  const cortes: Path[] = [];
  if (ranhura) cortes.push(poligono(([[-m.f, -m.f], [m.Lc, -m.f], [m.Lc, m.e + m.f], [-m.f, m.e + m.f]] as V2[]).map(([u, w]) => paraMundo(m, u, w))));
  if (canal) cortes.push(ret(Math.max(3, m.xs - 20), m.hb - m.cg, m.D, m.cg + 1));
  return diferenca([ret(0, 0, m.D, m.hb)], cortes);
}

/** Base e costas (triângulos em mm, coordenadas do .scad). afastar: mm que as costas sobem ao longo da placa. */
export function construirSuporteEncaixe(p: Record<string, any>, afastar = 0): { base: number[]; costas: number[] } {
  const m = medidas(p);
  const base: number[] = [], costas: number[] = [];
  const { W, f, pw } = m;

  extrudir(base, perfilBase(m, false), -pw, -f);
  extrudir(base, perfilBase(m, false), W + f, W + pw);
  if (m.rc) {
    extrudir(base, perfilBase(m), -f, m.z0);
    extrudir(base, perfilBase(m, true, true), m.z0, m.z1);
    extrudir(base, perfilBase(m), m.z1, W + f);
  } else extrudir(base, perfilBase(m), -f, W + f);

  // (u, w, z) → mundo; a matriz [[s, c], [c, -s]] troca a orientação
  const tf: T3 = (u, w, z) => { const [x, y] = paraMundo(m, u + afastar, w); return [x, y, z]; };
  if (m.rc) {
    extrudir(costas, perfilCostas(m), 0, m.z0, tf, true);
    extrudir(costas, [ret(m.ha, 0, m.Lc - m.ha, m.e)], m.z0, m.z1, tf, true);
    extrudir(costas, perfilCostas(m), m.z1, W, tf, true);
  } else extrudir(costas, perfilCostas(m), 0, W, tf, true);

  return { base, costas };
}
