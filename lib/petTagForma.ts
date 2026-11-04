// Geometria das pet tags para a pré-visualização — réplica 2D das formas dos
// scad_template em prod_designs (tag-redonda, tag-coracao, tag-osso, tag-hexagono).
// Antes a pré-visualização carregava STLs em branco (/models/blank_*.stl), mas os da
// redonda e do osso tinham medidas diferentes dos templates; agora a chapa e o
// rebordo saem das mesmas medidas que o OpenSCAD usa no ficheiro final.
//
// Se mudares uma forma no scad_template, muda-a também aqui.
import ClipperLib from 'clipper-lib';
// @ts-ignore — módulo JS partilhado (extrusão de regiões Clipper em triângulos)
import { fatiasParaTriangulos } from '@/lib/vetorGeom';

export type FormaPetTag = 'redondo' | 'coracao' | 'osso' | 'hexagono';

const ESC = 1000; // µm, igual a lib/vetorGeom.js
export const ALTURA_PET_TAG = 3; // altura_fixa dos templates

type Pt = { X: number; Y: number };
type Path = Pt[];

/** Identifica a forma pelo STL em branco associado ao design. */
export function formaPetTag(stlFilePath: string | null | undefined): FormaPetTag | null {
  const m = /blank_(redondo|coracao|osso|hexagono)/.exec(stlFilePath ?? '');
  return (m?.[1] as FormaPetTag) ?? null;
}

const circulo = (cx: number, cy: number, r: number, seg = 72): Path =>
  Array.from({ length: seg }, (_, i) => {
    const a = (i / seg) * Math.PI * 2;
    return { X: Math.round((cx + r * Math.cos(a)) * ESC), Y: Math.round((cy + r * Math.sin(a)) * ESC) };
  });
const poligono = (pts: [number, number][]): Path => pts.map(([x, y]) => ({ X: Math.round(x * ESC), Y: Math.round(y * ESC) }));

function executar(tipo: number, a: Path[], b: Path[] = []): Path[] {
  const c = new ClipperLib.Clipper();
  c.AddPaths(a, ClipperLib.PolyType.ptSubject, true);
  if (b.length) c.AddPaths(b, ClipperLib.PolyType.ptClip, true);
  const sol: Path[] = [];
  c.Execute(tipo, sol, ClipperLib.PolyFillType.pftNonZero, ClipperLib.PolyFillType.pftNonZero);
  return sol;
}
const uniao = (a: Path[]) => executar(ClipperLib.ClipType.ctUnion, a);
const diferenca = (a: Path[], b: Path[]) => executar(ClipperLib.ClipType.ctDifference, a, b);

/** offset(delta = −d) do OpenSCAD: cantos vivos (miter). */
function encolher(paths: Path[], d: number): Path[] {
  const co = new ClipperLib.ClipperOffset(4, 0.02 * ESC);
  co.AddPaths(paths, ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon);
  const out: Path[] = [];
  co.Execute(out, -d * ESC);
  return out;
}

/** Corpo da chapa (sem argola), argola e furo — medidas dos scad_template. */
function formas(f: FormaPetTag): { corpo: Path[]; argola: Path; furo: Path } {
  switch (f) {
    case 'redondo':
      return { corpo: [circulo(0, 0, 15)], argola: circulo(0, 18, 6), furo: circulo(0, 18, 3) };
    case 'coracao': {
      // cube([25,25]) rodado 45° em [0,-17]: cantos (0,0) (25,0) (25,25) (0,25) → rodados
      const k = 25 / Math.SQRT2;
      return {
        corpo: uniao([circulo(-9, 9, 12), circulo(9, 9, 12), poligono([[0, -17], [k, -17 + k], [0, -17 + 2 * k], [-k, -17 + k]])]),
        argola: circulo(0, 22, 7), furo: circulo(0, 22, 3.5),
      };
    }
    case 'osso':
      return {
        corpo: uniao([poligono([[-15, -8], [15, -8], [15, 8], [-15, 8]]), circulo(-15, 6, 8), circulo(-15, -6, 8), circulo(15, 6, 8), circulo(15, -6, 8)]),
        argola: circulo(0, 10, 5.5), furo: circulo(0, 10, 2.8),
      };
    case 'hexagono':
      return {
        corpo: [poligono(Array.from({ length: 6 }, (_, i) => [15 * Math.cos((i * Math.PI) / 3), 15 * Math.sin((i * Math.PI) / 3)] as [number, number]))],
        argola: circulo(0, 15, 5), furo: circulo(0, 15, 2.5),
      };
  }
}

/** Triângulos da chapa (corpo + argola − furo), z 0..3, e o centro da caixa envolvente. */
export function corpoPetTag(f: FormaPetTag): { tri: number[]; centro: [number, number] } {
  const { corpo, argola, furo } = formas(f);
  const regiao = diferenca(uniao([...corpo, argola]), [furo]);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of regiao) for (const q of p) {
    minX = Math.min(minX, q.X); maxX = Math.max(maxX, q.X); minY = Math.min(minY, q.Y); maxY = Math.max(maxY, q.Y);
  }
  return {
    tri: fatiasParaTriangulos([{ z0: 0, z1: ALTURA_PET_TAG, regiao }]),
    centro: [(minX + maxX) / 2 / ESC, (minY + maxY) / 2 / ESC],
  };
}

/** Rebordo: faixa de `largura` mm junto ao contorno do corpo, com `altura` mm, por cima da chapa. */
export function rebordoPetTag(f: FormaPetTag, largura: number, altura: number): number[] {
  const { corpo, furo } = formas(f);
  const regiao = diferenca(corpo, [...encolher(corpo, largura), furo]);
  return fatiasParaTriangulos([{ z0: ALTURA_PET_TAG, z1: ALTURA_PET_TAG + altura, regiao }]);
}
