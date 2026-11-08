// Pré-visualização em tempo real dos "Enfeites de Natal" (placa a 2 cores).
//
// Replica Maker_Pro_Docker_Prod/templates/enfeite_natal.scad: as formas (lib/enfeitesNatal.json)
// são geradas no backend por scripts/gerar_enfeites.mjs e copiadas para aqui — os mesmos pontos
// que o OpenSCAD usa. As contas 2D (offset redondo, traços com pontas redondas, união,
// intersecção) fazem-se com o clipper, que é o que o OpenSCAD usa por baixo.
// Se mudares alguma constante ou conta, muda também no .scad.

import * as THREE from 'three';
import type { Font } from 'three-stdlib';
import ClipperLib from 'clipper-lib';
import dados from './enfeitesNatal.json';
import { EM_POR_SIZE, fatorEscala } from './etiquetaMochila';
import { corOu } from './coresMulticor';

type Pt = [number, number];
type Forma = {
  nome: string; sil: Pt[]; linhas: Pt[][]; pontos: [number, number, number][]; argola: Pt;
  nome_zona: [number, number, number, number, number] | null;
  sem_nome: { linhas: number[]; pontos: number[] };
};
const D = dados as unknown as { nominal: number; r_aba: number; r_furo: number; formas: Forma[] };
export const FORMAS_ENFEITE = D.formas;

// iguais ao .scad
const ALT_RELEVO = 1.2, MARGEM = 1.8;
export const CORES_ENFEITE = { base: '#6B3A1E', relevo: '#E0A526' };

export function isEnfeiteNatal(p: Record<string, any> | null | undefined): boolean {
  return !!p && p.enfeite === 'natal';
}
export function formaEnfeite(nome: unknown): Forma {
  return D.formas.find((f) => f.nome === nome) ?? D.formas[1];
}
/** A forma escolhida leva nome (há zona e o texto não está vazio)? */
export function temNome(p: Record<string, any>): boolean {
  return !!formaEnfeite(p.forma).nome_zona && String(p.nome ?? '').trim().length > 0;
}

// ── clipper (inteiros: 1 unidade = 1/1000 mm) ──
const K = 1000;
type CPath = { X: number; Y: number }[];
const cp = (pts: Pt[]): CPath => pts.map(([x, y]) => ({ X: Math.round(x * K), Y: Math.round(y * K) }));
const ARC = 0.01 * K;   // ~ $fn alto do STL final
function circ(x: number, y: number, r: number): CPath {
  const n = Math.max(24, Math.ceil(Math.PI / Math.acos(Math.max(-1, 1 - ARC / (r * K)))));
  return cp(Array.from({ length: n }, (_, i) => [x + r * Math.cos((2 * Math.PI * i) / n), y + r * Math.sin((2 * Math.PI * i) / n)] as Pt));
}
function offset(paths: CPath[], d: number, aberto = false): CPath[] {
  const co = new ClipperLib.ClipperOffset(2, ARC), out: CPath[] = [];
  co.AddPaths(paths, ClipperLib.JoinType.jtRound, aberto ? ClipperLib.EndType.etOpenRound : ClipperLib.EndType.etClosedPolygon);
  co.Execute(out, d * K);
  return out;
}
function op(tipo: number, a: CPath[], b: CPath[] = []): CPath[] {
  const c = new ClipperLib.Clipper(), out: CPath[] = [];
  c.AddPaths(a, ClipperLib.PolyType.ptSubject, true);
  if (b.length) c.AddPaths(b, ClipperLib.PolyType.ptClip, true);
  c.Execute(tipo, out, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  return out;
}
const uniao = (a: CPath[]) => op(ClipperLib.ClipType.ctUnion, a);
const dif = (a: CPath[], b: CPath[]) => op(ClipperLib.ClipType.ctDifference, a, b);
const inter = (a: CPath[], b: CPath[]) => op(ClipperLib.ClipType.ctIntersection, a, b);

// caminhos clipper (com buracos) → THREE.Shape[] pela árvore de contornos
function paraShapes(paths: CPath[]): THREE.Shape[] {
  const c = new ClipperLib.Clipper(), tree = new ClipperLib.PolyTree();
  c.AddPaths(paths, ClipperLib.PolyType.ptSubject, true);
  c.Execute(ClipperLib.ClipType.ctUnion, tree, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  const v = (p: CPath) => p.map(({ X, Y }) => new THREE.Vector2(X / K, Y / K));
  const out: THREE.Shape[] = [];
  const visitar = (no: any) => {
    for (const filho of no.Childs()) {
      if (!filho.IsHole()) {
        const s = new THREE.Shape(v(filho.Contour()));
        for (const b of filho.Childs()) { s.holes.push(new THREE.Path(v(b.Contour()))); visitar(b); }
        out.push(s);
      }
    }
  };
  visitar(tree);
  return out;
}

// texto como o text(halign/valign = "center") do OpenSCAD: horizontal pela largura de avanço
// (soma dos avanços, sem kerning — igual a lib/textFit.js), vertical pelo centro da tinta
function textoPaths(font: Font, txt: string, size: number, esc: number, cx: number, cy: number, rot: number): CPath[] {
  const raw = font.generateShapes(txt, size * EM_POR_SIZE);
  if (!raw.length) return [];
  const ext = raw.map((s) => s.extractPoints(12));
  let y1 = Infinity, y2 = -Infinity;
  for (const e of ext) for (const p of e.shape) { y1 = Math.min(y1, p.y); y2 = Math.max(y2, p.y); }
  const { resolution, glyphs } = (font as unknown as { data: { resolution: number; glyphs: Record<string, { ha: number }> } }).data;
  let adv = 0;
  for (const ch of txt) adv += (glyphs[ch] ?? glyphs['?'])?.ha ?? 0;
  adv *= (size * EM_POR_SIZE) / resolution;
  const yc = (y1 + y2) / 2, c = Math.cos((rot * Math.PI) / 180), s = Math.sin((rot * Math.PI) / 180);
  const T = (p: THREE.Vector2): Pt => {
    const x = (p.x - adv / 2) * esc, y = (p.y - yc) * esc;
    return [cx + x * c - y * s, cy + x * s + y * c];
  };
  const out: CPath[] = [];
  for (const e of ext) {
    const fora = [cp(e.shape.map(T))], buracos = e.holes.map((h) => cp(h.map(T)));
    out.push(...(buracos.length ? dif(fora, buracos) : fora));
  }
  return uniao(out);
}

export type ParamsEnfeite = Record<string, any>;

/** Base e relevo do enfeite (coordenadas do .scad: z = 0 por baixo). font só é precisa com nome. */
export function construirEnfeite(p: ParamsEnfeite, font: Font | null) {
  const F = formaEnfeite(p.forma);
  const tam = Math.max(40, Math.min(150, Number(p.tamanho) || 80)), k = tam / D.nominal;
  const L = Math.max(1.2, Math.min(4, Number(p.largura_linha) || 2.2));
  const esp = Number(p.espessura) > 0 ? Number(p.espessura) : 3;
  const sc = ([x, y]: Pt): Pt => [x * k, y * k];
  const sil = [cp(F.sil.map(sc))];
  const [ax, ay] = sc(F.argola);

  const base = dif(uniao([...sil, circ(ax, ay, D.r_aba)]), [circ(ax, ay, D.r_furo)]);

  const comNome = temNome(p) && !!font;
  const escondida = (lista: number[], j: number) => comNome && lista.includes(j);
  const interior = offset(sil, -MARGEM);
  const partes: CPath[] = [...dif(interior, offset(sil, -MARGEM - L))];
  F.linhas.forEach((l, j) => { if (!escondida(F.sem_nome.linhas, j)) partes.push(...offset([cp(l.map(sc))], L / 2, true)); });
  F.pontos.forEach(([x, y, r], j) => { if (!escondida(F.sem_nome.pontos, j)) partes.push(circ(x * k, y * k, r * k)); });
  if (comNome && F.nome_zona && font) {
    const [zx, zy, zw, zs, rot] = F.nome_zona, txt = String(p.nome);
    const esc = fatorEscala(font, txt, zs, zw);       // igual ao esc_nome do servidor (não depende do tamanho)
    partes.push(...textoPaths(font, txt, zs * k, esc, zx * k, zy * k, rot));
  }
  const relevo = dif(inter(uniao(partes), interior), [circ(ax, ay, D.r_furo + 0.8)]);

  const extr = (paths: CPath[], depth: number, z: number) => {
    const g = new THREE.ExtrudeGeometry(paraShapes(paths), { depth, bevelEnabled: false, curveSegments: 12 });
    g.translate(0, 0, z);
    return g;
  };
  return { base: extr(base, esp, 0), relevo: extr(relevo, ALT_RELEVO, esp) };
}

export function coresEnfeite(p: ParamsEnfeite | null | undefined) {
  return { base: corOu(p?.cor_base, CORES_ENFEITE.base), relevo: corOu(p?.cor_relevo, CORES_ENFEITE.relevo) };
}
