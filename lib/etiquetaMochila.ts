// Pré-visualização em tempo real da "Etiqueta para mochila".
//
// Replica a geometria de Maker_Pro_Docker_Prod/templates/etiqueta_mochila.scad
// (placa com a forma escolhida, aba com furo, borda, nome em relevo, verso escavado) a partir
// das fontes typeface.js em /public/fonts, sem ir ao servidor — por isso responde
// ao mudar a fonte ou o tamanho da letra. O STL final continua a ser gerado pelo
// OpenSCAD no backend.
//
// Mantém duas coisas alinhadas com o backend (lib/textFit.js):
//  - o tamanho: OpenSCAD text(size = s) tem um em-square de s * 100/72 mm;
//  - o ajuste à largura útil: factor = min(1, largura_util / soma dos avanços dos
//    glifos), arredondado a 4 casas, sem kerning.

import * as THREE from 'three';
import type { Font } from 'three-stdlib';
import formasJson from './formasEtiqueta.json';
import ClipperLib from 'clipper-lib';

export const EM_POR_SIZE = 100 / 72;

// Têm de coincidir com as constantes do .scad.
export const GEO = {
  esp: 3.5, r_furo: 3.8,
  borda_larg: 2.5, borda_esp: 0.8, alt_texto: 1.2, prof_verso: 1.3,
} as const;

// Contornos das formas: ficheiro gerado no backend (scripts/gerar_formas.mjs) e copiado
// para aqui — são os mesmos pontos que o OpenSCAD usa.
export type FormaEtiqueta = {
  nome: string; cx: number; cy: number; util: number; topo: number; bw: number; bh: number;
  // recuo da aba para dentro do corpo, furo acima do topo, aba acima do furo
  aba: { w: number; r: number; de: number; dhy: number; dtopo: number };
  outer: [number, number][];
};
export const FORMAS: FormaEtiqueta[] = (formasJson as unknown as { formas: FormaEtiqueta[] }).formas;
export const FORMA_DEFAULT = 'Retangular';

/**
 * Largura/altura da placa em % da forma base → factor (mesmo limite 50–200 % que _esc()
 * no .scad). Vazio ou inválido = 1.
 */
export function fatorPct(pct: unknown): number {
  if (pct === '' || pct === null || pct === undefined) return 1;
  const n = Number(pct);
  return Number.isFinite(n) && n > 0 ? Math.max(0.5, Math.min(2, n / 100)) : 1;
}

/** Recuo do contorno (como offset(delta = -d) do OpenSCAD); devolve 0..n polígonos. */
function recuar(poly: [number, number][], d: number): [number, number][][] {
  const K = 1000;
  const co = new ClipperLib.ClipperOffset(1000, 0.05 * K);
  const out: { X: number; Y: number }[][] = [];
  co.AddPath(poly.map(([x, y]) => ({ X: Math.round(x * K), Y: Math.round(y * K) })), ClipperLib.JoinType.jtMiter, ClipperLib.EndType.etClosedPolygon);
  co.Execute(out, -d * K);
  return out
    .filter((p) => p.length >= 3)
    .map((p) => p.map(({ X, Y }) => [X / K, Y / K] as [number, number]));
}

export function obterForma(nome?: string): FormaEtiqueta {
  return FORMAS.find((f) => f.nome === nome) ?? FORMAS[0];
}

// Largura útil do texto da forma por defeito (= generation_schema.ajuste_texto.largura_util)
export const LARGURA_UTIL = FORMAS[0].util;

type FontComDados = Font & {
  data: { resolution: number; glyphs: Record<string, { ha: number }> };
};

export type ParamsEtiqueta = {
  nome?: string;
  linha2?: string;
  verso?: string;
  fontSize?: number;
  forma?: string;
  largura_pct?: number | string;   // largura da placa em % da forma (100 = normal)
  altura_pct?: number | string;    // altura da placa em %
};

/**
 * Deteção pelo schema (como os restantes previews ao vivo): só a etiqueta de mochila
 * tem nome + linha2 + verso + fonte + fontSize (número). O schema antigo chamava
 * "texto2" ao verso, por isso a prévia funciona antes e depois do UPDATE do SQL. Os pet-tags também têm
 * "verso", mas são tratados antes (têm stlFilePath) e não têm linha2/fontSize.
 */
export function isEtiquetaMochila(params: Record<string, any> | null | undefined): boolean {
  return !!params
    && typeof params.nome === 'string'
    && typeof params.linha2 === 'string'
    && (typeof params.verso === 'string' || typeof params.texto2 === 'string') // texto2: schema antigo
    && typeof params.fonte === 'string'
    && typeof params.fontSize === 'number';
}

/** Largura (mm) do texto: soma dos avanços dos glifos, sem kerning. */
export function larguraTexto(font: Font, texto: string, sizeMm: number): number {
  const { resolution, glyphs } = (font as FontComDados).data;
  const k = (sizeMm * EM_POR_SIZE) / resolution;
  let w = 0;
  for (const c of texto) w += (glyphs[c] ?? glyphs['?'])?.ha ?? 0;
  return w * k;
}

/** Factor 0–1 que o texto leva para caber na largura útil. */
export function fatorEscala(font: Font, texto: string, sizeMm: number, util = LARGURA_UTIL): number {
  if (!texto) return 1;
  const w = larguraTexto(font, texto, sizeMm);
  if (!(w > 0)) return 1;
  return Math.round(Math.min(1, util / w) * 10000) / 10000;
}

// Texto centrado em (cx, cy): horizontal pela largura de avanço, vertical pelo centro
// da tinta — como halign/valign = "center" do OpenSCAD.
function textoShapes(
  font: Font, txt: string, sizeMm: number, esc: number, cx: number, cy: number, espelhar = false,
): THREE.Shape[] {
  if (!txt) return [];
  const raw = font.generateShapes(txt, sizeMm * EM_POR_SIZE);
  if (!raw.length) return [];

  const ext = raw.map((s) => s.extractPoints(12));
  let y1 = Infinity, y2 = -Infinity;
  for (const e of ext) for (const p of e.shape) { y1 = Math.min(y1, p.y); y2 = Math.max(y2, p.y); }
  if (!Number.isFinite(y1)) return [];

  const adv = larguraTexto(font, txt, sizeMm);
  const yc = (y1 + y2) / 2;
  const sx = espelhar ? -1 : 1;
  const T = (p: THREE.Vector2) => new THREE.Vector2(sx * (p.x - adv / 2) * esc + cx, (p.y - yc) * esc + cy);

  return ext.map((e) => {
    const s = new THREE.Shape(e.shape.map(T));
    s.holes = e.holes.map((h) => new THREE.Path(h.map(T)));
    return s;
  });
}

function rrect(x: number, y: number, w: number, h: number, r: number, s: THREE.Shape | THREE.Path = new THREE.Shape()) {
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);     s.absarc(x + w - r, y + r,     r, -Math.PI / 2, 0, false);
  s.lineTo(x + w, y + h - r); s.absarc(x + w - r, y + h - r, r, 0, Math.PI / 2, false);
  s.lineTo(x + r, y + h);     s.absarc(x + r, y + h - r,     r, Math.PI / 2, Math.PI, false);
  s.lineTo(x, y + r);         s.absarc(x + r, y + r,         r, Math.PI, 1.5 * Math.PI, false);
  return s;
}

function extrudir(shapes: THREE.Shape[], depth: number, z: number): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: false, curveSegments: 16 });
  g.translate(0, 0, z);
  return g;
}

/** Constrói a etiqueta (mesmas coordenadas do SCAD: contorno da forma com origem em (0,0)). */
// Cores por omissão de cada parte — iguais às do .scad e aos defaults do generation_schema.
export const CORES_ETIQUETA = { placa: '#1E3A8A', borda: '#FFFFFF', texto: '#FFFFFF' };
export type CoresEtiqueta = typeof CORES_ETIQUETA;

/** Cores a partir dos params (cor_base, cor_borda, cor_texto); valor inválido = omissão. */
export function coresDeParams(params: Record<string, any> | null | undefined): CoresEtiqueta {
  const ok = (v: unknown, d: string) => (typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : d);
  const texto = ok(params?.cor_texto, CORES_ETIQUETA.texto);
  // Sem AMS há uma só troca de cor (a 3,5 mm): a borda imprime-se com o filamento do texto,
  // e o seletor da borda fica escondido — a pré-visualização tem de mostrar isso.
  const semAms = /^sem/i.test(String(params?.impressao ?? '').trim());
  return {
    placa: ok(params?.cor_base, CORES_ETIQUETA.placa),
    borda: semAms ? texto : ok(params?.cor_borda, CORES_ETIQUETA.borda),
    texto,
  };
}

/**
 * Muda só as cores dos materiais (cada mesh tem userData.parte = placa | borda | texto),
 * sem reconstruir a geometria — o seletor de cor dispara muitas vezes por segundo.
 */
export function aplicarCoresEtiqueta(grupo: THREE.Group, cores: CoresEtiqueta) {
  grupo.traverse((o) => {
    const m = o as THREE.Mesh;
    const parte = m.userData?.parte as keyof CoresEtiqueta | undefined;
    if (parte && m.material) (m.material as THREE.MeshStandardMaterial).color.set(cores[parte]);
  });
}

export function construirEtiqueta(
  p: ParamsEtiqueta, font: Font, cores: CoresEtiqueta = CORES_ETIQUETA,
): THREE.Group {
  const G = GEO;
  const F0 = obterForma(p.forma);
  // dimensões ajustáveis (%): escala x/y do contorno; aba, furo e texto só mudam de posição
  const sx = fatorPct(p.largura_pct), sy = fatorPct(p.altura_pct);
  const F = {
    ...F0,
    cx: F0.cx * sx, cy: F0.cy * sy, util: F0.util * sx,
    outer: F0.outer.map(([x, y]) => [x * sx, y * sy] as [number, number]),
    topo: F0.topo * sy,
  };
  const nome = p.nome ?? '', linha2 = p.linha2 ?? '', verso = p.verso ?? '';
  const fs = Number(p.fontSize) > 0 ? Number(p.fontSize) : 9;

  const matPlaca = new THREE.MeshStandardMaterial({ color: cores.placa, metalness: 0.1, roughness: 0.5 });
  const matBorda = new THREE.MeshStandardMaterial({ color: cores.borda, metalness: 0.1, roughness: 0.5 });
  const matTexto = new THREE.MeshStandardMaterial({ color: cores.texto, metalness: 0.1, roughness: 0.5 });
  const parteDe = new Map<THREE.Material, keyof CoresEtiqueta>([[matPlaca, 'placa'], [matBorda, 'borda'], [matTexto, 'texto']]);
  const grupo = new THREE.Group();
  const add = (g: THREE.BufferGeometry, m: THREE.Material) => {
    const mesh = new THREE.Mesh(g, m);
    mesh.userData.parte = parteDe.get(m);
    grupo.add(mesh);
  };
  const contorno = () => new THREE.Shape(F.outer.map(([x, y]) => new THREE.Vector2(x, y)));

  // Placa — com o verso escavado a partir da face de baixo (z = 0).
  const buracos: THREE.Path[] = [];
  const ilhas: THREE.Shape[] = [];
  if (verso) {
    const esc = fatorEscala(font, verso, fs, F.util);
    for (const s of textoShapes(font, verso, fs, esc, F.cx, F.cy, true)) {
      buracos.push(new THREE.Path(s.getPoints(12)));
      for (const h of s.holes) ilhas.push(new THREE.Shape(h.getPoints(12))); // miolos de o, a, e...
    }
  }
  if (buracos.length) {
    const baixo = contorno();
    baixo.holes.push(...buracos);
    add(extrudir([contorno()], G.esp - G.prof_verso, G.prof_verso), matPlaca);
    add(extrudir([baixo], G.prof_verso, 0), matPlaca);
    if (ilhas.length) add(extrudir(ilhas, G.prof_verso, 0), matPlaca);
  } else {
    add(extrudir([contorno()], G.esp, 0), matPlaca);
  }

  // Aba de fixação com furo para o cordão.
  const A = F.aba;
  const ybase = F.topo - A.de, hy = F.topo + A.dhy, ytopo = hy + A.dtopo;
  const aba = rrect(F.cx - A.w / 2, ybase, A.w, ytopo - ybase, A.r) as THREE.Shape;
  const furo = new THREE.Path();
  furo.absarc(F.cx, hy, G.r_furo, 0, Math.PI * 2, true);
  aba.holes.push(furo);
  add(extrudir([aba], G.esp, 0), matPlaca);

  // Borda em relevo: contorno menos o contorno recuado (borda_larg).
  const interior = recuar(F.outer, G.borda_larg);
  if (interior.length) {
    const borda = contorno();
    for (const poly of interior) borda.holes.push(new THREE.Path(poly.map(([x, y]) => new THREE.Vector2(x, y))));
    add(extrudir([borda], G.borda_esp, G.esp), matBorda);
  }

  // Texto da frente em relevo (1 ou 2 linhas).
  const frente: THREE.Shape[] = [];
  const linha = (t: string, dy: number) => {
    if (t) frente.push(...textoShapes(font, t, fs, fatorEscala(font, t, fs, F.util), F.cx, F.cy + dy));
  };
  if (linha2) { linha(nome, fs * 0.55); linha(linha2, -fs * 0.55); } else { linha(nome, 0); }
  if (frente.length) add(extrudir(frente, G.alt_texto, G.esp), matTexto);

  return grupo;
}

export function libertarEtiqueta(grupo: THREE.Group) {
  const mats = new Set<THREE.Material>();
  grupo.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    if (m.material) mats.add(m.material as THREE.Material);
  });
  mats.forEach((m) => m.dispose());
}
