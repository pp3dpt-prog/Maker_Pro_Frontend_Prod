// Pré-visualização em tempo real da "Base para copos" — réplica 2D (Clipper) da geometria de
// Maker_Pro_Docker_Prod/templates/base_copos.scad: forma, padrão em relevo recortado pelo
// interior, rebordo e logótipo à face com o padrão. O STL final continua a ser gerado pelo
// OpenSCAD no backend. Se mudares o .scad, muda também aqui.
import ClipperLib from 'clipper-lib';
// @ts-ignore — módulo JS partilhado (extrusão de regiões Clipper em triângulos)
import { fatiasParaTriangulos } from '@/lib/vetorGeom';

const ESC = 1000; // µm, igual a lib/vetorGeom.js
type Pt = { X: number; Y: number };
type Path = Pt[];

const P = (x: number, y: number): Pt => ({ X: Math.round(x * ESC), Y: Math.round(y * ESC) });
const poligono = (pts: [number, number][]): Path => {
  const p = pts.map(([x, y]) => P(x, y));
  return ClipperLib.Clipper.Orientation(p) ? p : p.reverse();
};
const circulo = (cx: number, cy: number, r: number, seg = 48, a0 = 0): Path =>
  Array.from({ length: seg }, (_, i) => { const a = a0 + (i / seg) * Math.PI * 2; return P(cx + r * Math.cos(a), cy + r * Math.sin(a)); });

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
const intersecao = (a: Path[], b: Path[]) => executar(ClipperLib.ClipType.ctIntersection, a, b);
function offset(paths: Path[], d: number, redondo: boolean): Path[] {
  const co = new ClipperLib.ClipperOffset(4, 0.02 * ESC);
  co.AddPaths(paths, redondo ? ClipperLib.JoinType.jtRound : ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon);
  const out: Path[] = [];
  co.Execute(out, d * ESC);
  return out;
}

export type ParamsBaseCopos = Record<string, any>;

/** Deteção pelo schema: só a base para copos tem padrao + tamanho_padrao + relevo. */
export function isBaseCopos(p: Record<string, any> | null | undefined): boolean {
  return !!p && typeof p.padrao === 'string' && p.tamanho_padrao !== undefined && p.relevo !== undefined && p.textura === undefined;
}

const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Number(v) : d);

function forma2d(forma: string, L: number): Path[] {
  if (forma === 'Quadrada') {
    const h = L / 2 - 8;
    return offset([poligono([[-h, -h], [h, -h], [h, h], [-h, h]])], 8, true);
  }
  if (forma === 'Hexagonal') {
    const R = L / 2 / Math.cos(Math.PI / 6);               // largura = distância entre lados
    return [poligono(Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 6 + (i * Math.PI) / 3; return [R * Math.cos(a), R * Math.sin(a)] as [number, number]; }))];
  }
  return [circulo(0, 0, L / 2, 160)];
}

function padraoBruto(tipo: string, L: number, cel: number, linha: number): Path[] {
  const n = Math.ceil(L / cel / 2) + 2;
  const rect = (x: number, y: number, w: number, h: number, rot = 0) => {
    const c = Math.cos(rot), s = Math.sin(rot);
    return poligono([[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([a, b]) => [a * c - b * s, a * s + b * c] as [number, number]));
  };
  const out: Path[] = [];
  if (tipo === 'Hexágonos') {
    const R = cel / 2, Ri = R - linha / 2 / Math.cos(Math.PI / 6);
    for (let i = -n; i <= n; i++) for (let j = -n; j <= n; j++) {
      const cx = i * 1.5 * R, cy = (j + (Math.abs(i) % 2) / 2) * Math.sqrt(3) * R;
      out.push(...diferenca([circulo(cx, cy, R, 6)], [circulo(cx, cy, Ri, 6)]));
    }
  } else if (tipo === 'Riscas') {
    for (let i = -2 * n; i <= 2 * n; i++) out.push(rect(i * cel / 2 - linha / 2, -L, linha, 2 * L, Math.PI / 4));
  } else if (tipo === 'Grelha' || tipo === 'Losangos') {
    const rot = tipo === 'Losangos' ? Math.PI / 4 : 0;
    for (let i = -n; i <= n; i++) {
      out.push(rect(i * cel - linha / 2, -L, linha, 2 * L, rot));
      out.push(rect(-L, i * cel - linha / 2, 2 * L, linha, rot));
    }
  } else if (tipo === 'Pontos') {
    for (let i = -n; i <= n; i++) for (let j = -2 * n; j <= 2 * n; j++)
      out.push(circulo((i + (Math.abs(j) % 2) / 2) * cel, (j * cel * Math.sqrt(3)) / 2, cel * 0.28, 24));
  } else if (tipo === 'Ondas') {
    const A = cel * 0.3, lambda = cel * 2.4;
    for (let k = -2 * n; k <= 2 * n; k++) {
      const y0 = (k * cel) / 2, cima: [number, number][] = [], baixo: [number, number][] = [];
      for (let x = -L; x <= L; x += 1) {
        const y = y0 + A * Math.sin((2 * Math.PI * x) / lambda);
        cima.push([x, y + linha / 2]); baixo.unshift([x, y - linha / 2]);
      }
      out.push(poligono([...cima, ...baixo]));
    }
  }
  return uniao(out);
}

/** Silhueta do vetorizador (anéis em píxeis) → região em mm centrada, com a largura pedida. */
export function logoParaRegiao(vetor: any, largura: number): Path[] {
  if (!vetor?.silhueta?.length) return [];
  const bb = vetor.ancoras?.bbox || [0, 0, vetor.w - 1, vetor.h - 1];
  const s = largura / Math.max(1, bb[2] - bb[0] + 1), cx = (bb[0] + bb[2]) / 2, cy = (bb[1] + bb[3]) / 2;
  const aneis: Path[] = vetor.silhueta.map((a: number[]) => {
    const p: Path = [];
    for (let i = 0; i + 1 < a.length; i += 2) p.push(P((a[i] - cx) * s, (cy - a[i + 1]) * s));
    return p;
  });
  return ClipperLib.Clipper.SimplifyPolygons(aneis, ClipperLib.PolyFillType.pftEvenOdd);
}

export type PartesBaseCopos = { base: number[]; padrao: number[]; logo: number[] };

/** Triângulos (mm) de cada parte — as mesmas do 3MF: base, padrão + rebordo, logótipo. */
export function construirBaseCopos(p: ParamsBaseCopos, logoRegiao: Path[] = []): PartesBaseCopos {
  const L = num(p.largura, 95), esp = num(p.espessura, 3.5), cel = Math.max(2, num(p.tamanho_padrao, 8));
  const linha = num(p.linha, 1.2), relevo = num(p.relevo, 0.8);
  const reb = p.rebordo === true || p.rebordo === 1 || p.rebordo === '1';
  const rebL = num(p.rebordo_largura, 3);
  const forma = forma2d(String(p.forma ?? 'Redonda'), L);
  const interior = offset(forma, -(reb ? rebL : 1.5), false);
  const logo = logoRegiao.length ? intersecao(interior, logoRegiao) : [];
  let padrao = intersecao(interior, padraoBruto(String(p.padrao ?? 'Hexágonos'), L, cel, linha));
  if (logo.length) padrao = diferenca(padrao, offset(logo, 2, true));
  const relevoReg = intersecao(forma, uniao([...padrao, ...(reb ? diferenca(forma, interior) : [])]));
  return {
    base: fatiasParaTriangulos([{ z0: 0, z1: esp, regiao: forma }]),
    padrao: fatiasParaTriangulos([{ z0: esp, z1: esp + relevo, regiao: relevoReg }]),
    logo: logo.length ? fatiasParaTriangulos([{ z0: esp - 0.6, z1: esp + relevo, regiao: logo }]) : [],
  };
}
