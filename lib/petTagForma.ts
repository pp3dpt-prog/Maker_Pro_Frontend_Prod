// Geometria das pet tags para a pré-visualização — réplica 2D das formas dos
// scad_template em prod_designs (tag-redonda, tag-coracao, tag-osso, tag-hexagono,
// tag-pata, tag-estrela, tag-gato, tag-escudo, tag-peixe, tag-nuvem, tag-coroa, tag-casinha,
// tag-barril).
// Antes a pré-visualização carregava STLs em branco (/models/blank_*.stl), mas os da
// redonda e do osso tinham medidas diferentes dos templates; agora a chapa e o
// rebordo saem das mesmas medidas que o OpenSCAD usa no ficheiro final.
//
// Se mudares uma forma no scad_template, muda-a também aqui.
import ClipperLib from 'clipper-lib';
// @ts-ignore — módulo JS partilhado (extrusão de regiões Clipper em triângulos)
import { fatiasParaTriangulos } from '@/lib/vetorGeom';

export type FormaPetTag = 'redondo' | 'coracao' | 'osso' | 'hexagono' | 'pata' | 'estrela' | 'gato' | 'escudo'
  | 'peixe' | 'nuvem' | 'coroa' | 'casinha' | 'barril';

const ESC = 1000; // µm, igual a lib/vetorGeom.js
export const ALTURA_PET_TAG = 3; // altura_fixa dos templates

type Pt = { X: number; Y: number };
type Path = Pt[];

/** Identifica a forma pelo STL em branco associado ao design. */
export function formaPetTag(stlFilePath: string | null | undefined): FormaPetTag | null {
  const m = /blank_(redondo|coracao|osso|hexagono|pata|estrela|gato|escudo|peixe|nuvem|coroa|casinha|barril)/.exec(stlFilePath ?? '');
  return (m?.[1] as FormaPetTag) ?? null;
}

const circulo = (cx: number, cy: number, r: number, seg = 72): Path =>
  Array.from({ length: seg }, (_, i) => {
    const a = (i / seg) * Math.PI * 2;
    return { X: Math.round((cx + r * Math.cos(a)) * ESC), Y: Math.round((cy + r * Math.sin(a)) * ESC) };
  });
/** scale([rx, ry]) circle(1) rodado `rot` graus e colocado em (cx, cy) — como no SCAD. */
const elipse = (cx: number, cy: number, rx: number, ry: number, rot = 0, seg = 72): Path => {
  const a = (rot * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a);
  return Array.from({ length: seg }, (_, i) => {
    const t = (i / seg) * Math.PI * 2, x = rx * Math.cos(t), y = ry * Math.sin(t);
    return { X: Math.round((cx + x * ca - y * sa) * ESC), Y: Math.round((cy + x * sa + y * ca) * ESC) };
  });
};

/** offset(r = +r) offset(r = −r) do OpenSCAD: fecha os vãos estreitos com cantos redondos. */
function fechar(paths: Path[], r: number): Path[] {
  const off = (ps: Path[], d: number) => {
    const co = new ClipperLib.ClipperOffset(2, 0.02 * ESC);
    co.AddPaths(ps, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
    const out: Path[] = [];
    co.Execute(out, d * ESC);
    return out;
  };
  return off(off(paths, r), -r);
}

// Sempre no sentido anti-horário: a união usa NonZero, e um polígono no sentido contrário
// anulava a zona onde se sobrepõe a outro (p.ex. a cauda do peixe sobre o corpo).
const poligono = (pts: [number, number][]): Path => {
  const p = pts.map(([x, y]) => ({ X: Math.round(x * ESC), Y: Math.round(y * ESC) }));
  return ClipperLib.Clipper.Orientation(p) ? p : p.reverse();
};

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

/** offset(r = +r) do OpenSCAD: alarga com cantos redondos. */
function alargar(paths: Path[], r: number): Path[] {
  const co = new ClipperLib.ClipperOffset(2, 0.02 * ESC);
  co.AddPaths(paths, ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
  const out: Path[] = [];
  co.Execute(out, r * ESC);
  return out;
}

/** offset(r = +r) offset(delta = −r) do OpenSCAD: arredonda os cantos convexos (pontas). */
function arredondar(paths: Path[], r: number): Path[] {
  const co = new ClipperLib.ClipperOffset(2, 0.02 * ESC);
  co.AddPaths(encolher(paths, r), ClipperLib.JoinType.jtRound, ClipperLib.EndType.etClosedPolygon);
  const out: Path[] = [];
  co.Execute(out, r * ESC);
  return out;
}

/** Corpo da chapa (sem argola), argola e furo — medidas dos scad_template. */
// `rebordo` (opcional): formas cujo contorno o rebordo desenha; por omissão, o corpo.
// `dedos` / `almofada` (só na pata): para os estilos de rebordo com dedos cheios.
function formas(f: FormaPetTag, deitado = false): {
  corpo: Path[]; rebordo?: Path[]; dedos?: Path[]; almofada?: Path[]; argola: Path; furo: Path;
} {
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
    case 'pata': {
      // 5 "feijões" separados (almofada + 4 dedos). A medalha é o contorno deles alargado
      // 1,6 mm, com o interior cheio e um fecho de 1,2 mm; o rebordo desenha cada feijão.
      const almofada = [elipse(0, -5.5, 12, 9)];
      const dedos = [
        elipse(-5.3, 10, 3.8, 5, 10), elipse(5.3, 10, 3.8, 5, -10),
        elipse(-13, 5, 3.3, 4.5, 40), elipse(13, 5, 3.3, 4.5, -40),
      ];
      const feijoes = [...almofada, ...dedos];
      return {
        corpo: fechar(uniao([
          ...alargar(feijoes, 1.6),
          poligono([[-13, 5], [-5.3, 10], [-2.5, 15], [2.5, 15], [5.3, 10], [13, 5], [0, -5.5]]),
        ]), 1.2),
        rebordo: feijoes, dedos, almofada,
        argola: circulo(0, 18, 4.5), furo: circulo(0, 18, 2.4),
      };
    }
    case 'hexagono':
      return {
        corpo: [poligono(Array.from({ length: 6 }, (_, i) => [15 * Math.cos((i * Math.PI) / 3), 15 * Math.sin((i * Math.PI) / 3)] as [number, number]))],
        argola: circulo(0, 15, 5), furo: circulo(0, 15, 2.5),
      };
    case 'estrela':
      // 5 pontas (raio 19 / 9), pontas arredondadas com 2 mm; argola na ponta de cima
      return {
        corpo: arredondar([poligono(Array.from({ length: 10 }, (_, i) => {
          const a = ((90 + i * 36) * Math.PI) / 180, r = i % 2 === 0 ? 19 : 9;
          return [r * Math.cos(a), r * Math.sin(a)] as [number, number];
        }))], 2),
        argola: circulo(0, 15.5, 4.5), furo: circulo(0, 15.5, 2.4),
      };
    case 'gato':
      // cabeça (círculo) + 2 orelhas; fecho de 1 mm na ligação e pontas arredondadas com 1,5 mm
      return {
        corpo: arredondar(fechar(uniao([
          circulo(0, 0, 14, 96),
          poligono([[-13.5, 4.5], [-5, 12.8], [-11, 21]]),
          poligono([[13.5, 4.5], [5, 12.8], [11, 21]]),
        ]), 1), 1.5),
        argola: circulo(0, 15.5, 4.5), furo: circulo(0, 15.5, 2.4),
      };
    case 'escudo':
      return {
        corpo: arredondar([poligono([[-14, 12], [14, 12], [14, 1], [9, -9], [0, -17], [-9, -9], [-14, 1]])], 2),
        argola: circulo(0, 15, 5), furo: circulo(0, 15, 2.5),
      };
    case 'peixe':
      // corpo em elipse + cauda; fecho de 1 mm na ligação e pontas arredondadas com 1,5 mm
      return {
        corpo: arredondar(fechar(uniao([elipse(-3, 0, 15, 10), poligono([[9, 0], [19, 9], [16, 0], [19, -9]])]), 1), 1.5),
        argola: circulo(-3, 12.5, 4.5), furo: circulo(-3, 12.5, 2.4),
      };
    case 'nuvem':
      // 5 círculos + base direita; o fecho de 1,5 mm arredonda os encontros
      return {
        corpo: fechar(uniao([
          circulo(0, 3, 9), circulo(-10, -2, 7), circulo(10, -2, 7), circulo(-16, -5, 4.5), circulo(16, -5, 4.5),
          poligono([[-16, -9.5], [16, -9.5], [16, -5], [-16, -5]]),
        ]), 1.5),
        argola: circulo(0, 14, 4.5), furo: circulo(0, 14, 2.4),
      };
    case 'coroa':
      // base com 3 pontas e uma bola em cada ponta; fecho de 1 mm e cantos de 1,5 mm
      return {
        corpo: arredondar(fechar(uniao([
          poligono([[-15, -10], [15, -10], [15, 8], [8, 0], [0, 9], [-8, 0], [-15, 8]]),
          circulo(-13.5, 8, 2.8), circulo(13.5, 8, 2.8), circulo(0, 9, 4),
        ]), 1), 1.5),
        argola: circulo(0, 14, 4.5), furo: circulo(0, 14, 2.4),
      };
    case 'casinha':
      return {
        corpo: arredondar(uniao([
          poligono([[-13, -14], [13, -14], [13, 2], [-13, 2]]),
          poligono([[-17, 1], [17, 1], [0, 16]]),
        ]), 1.5),
        argola: circulo(0, 15, 4.5), furo: circulo(0, 15, 2.4),
      };
    case 'barril': {
      // laterais em arco (elipse 13 × 16 mm cortada a ±13 mm), topo e fundo direitos
      const pts: [number, number][] = [];
      for (let i = 0; i <= 26; i++) { const y = -13 + i; pts.push([13 * Math.sqrt(1 - (y / 16) ** 2), y]); }
      for (let i = 0; i <= 26; i++) { const y = 13 - i; pts.push([-13 * Math.sqrt(1 - (y / 16) ** 2), y]); }
      // deitado (orientacao = "Deitado"): rodado 90° e esticado em x (32 × 26 mm), tampos dos lados
      const p2: [number, number][] = deitado ? pts.map(([x, y]) => [(-y * 16) / 13, x]) : pts;
      return { corpo: arredondar([poligono(p2)], 1.5), argola: circulo(0, 15.5, 4.5), furo: circulo(0, 15.5, 2.4) };
    }
  }
}

/** Triângulos da chapa (corpo + argola − furo), z 0..3, e o centro da caixa envolvente. */
export function corpoPetTag(f: FormaPetTag, deitado = false): { tri: number[]; centro: [number, number] } {
  const { corpo, argola, furo } = formas(f, deitado);
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

/** Aros do barril (tag-barril, aros = true): duas faixas de 1,6 mm perto dos tampos, em relevo como o rebordo. */
export function arosBarril(deitado: boolean, altura: number): number[] {
  const { corpo } = formas('barril', deitado);
  const faixa = (x0: number, y0: number, x1: number, y1: number) => poligono([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
  const faixas = deitado ? [-1, 1].map((s) => faixa(s * 13.6 - 0.8, -20, s * 13.6 + 0.8, 20))
    : [-1, 1].map((s) => faixa(-20, s * 9.8 - 0.8, 20, s * 9.8 + 0.8));
  const regiao = executar(ClipperLib.ClipType.ctIntersection, encolher(corpo, 0.6), faixas);
  return fatiasParaTriangulos([{ z0: ALTURA_PET_TAG, z1: ALTURA_PET_TAG + altura, regiao }]);
}

/**
 * Rebordo: faixa de `largura` mm junto ao contorno do corpo, com `altura` mm, por cima da chapa.
 * Na pata, `estilo` (rebordo_estilo do template): "Contorno em todos" (omissão), "Dedos cheios"
 * ou "Dedos cheios + contorno do nome".
 */
export function rebordoPetTag(f: FormaPetTag, largura: number, altura: number, estilo?: string, deitado = false): number[] {
  const { corpo, rebordo, dedos, almofada, furo } = formas(f, deitado);
  const anel = (ps: Path[]) => diferenca(ps, [...encolher(ps, largura), furo]);
  let regiao: Path[];
  if (dedos && almofada && estilo === 'Dedos cheios') regiao = dedos;
  else if (dedos && almofada && estilo === 'Dedos cheios + contorno do nome') regiao = uniao([...dedos, ...anel(almofada)]);
  else regiao = anel(rebordo ?? corpo);
  return fatiasParaTriangulos([{ z0: ALTURA_PET_TAG, z1: ALTURA_PET_TAG + altura, regiao }]);
}
