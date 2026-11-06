// Pré-visualização em tempo real do "Nome flexível" — réplica de
// Maker_Pro_Docker_Prod/templates/nome_flexivel.scad: cada letra é um segmento com barra, e
// entre letras há uma dobradiça (2 nós da letra da esquerda + nó do meio da da direita). O pino
// e o furo ficam por dentro dos nós e não aparecem. A medição das letras é a mesma do backend
// (lib/textFit.js: aplicarLetrasFlexi — tinta de cada glifo, altura das maiúsculas).
import * as THREE from 'three';
import type { Font } from 'three-stdlib';
import { EM_POR_SIZE } from '@/lib/etiquetaMochila';

export function isNomeFlexivel(p: Record<string, any> | null | undefined): boolean {
  return !!p && p.barra !== undefined && p.teste_folgas !== undefined && typeof p.nome === 'string';
}

/** Igual ao backend: maiúsculas, sem acentos, só A–Z e 0–9, no máximo 12. */
export function normalizarNome(s: unknown, max = 12): string {
  return String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, max);
}

const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Number(v) : d);

function formasLetra(font: Font, c: string, size: number) {
  const shapes = font.generateShapes(c, size * EM_POR_SIZE);
  let x0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const s of shapes) for (const p of s.getPoints(8)) { x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  if (!Number.isFinite(x0)) { x0 = 0; x1 = size * 0.7; y1 = size * 0.75; }
  return { shapes, x0, w: Math.max(0.5, x1 - x0), topo: y1 };
}

/** Grupo com uma malha por peça; cores alternadas (cor_impares / cor_pares). */
export function construirNomeFlexivel(p: Record<string, any>, font: Font): THREE.Group {
  const nome = normalizarNome(p.nome);
  const size = num(p.tamanho, 20), T = num(p.espessura, 6), R = T / 2;
  const teste = p.teste_folgas === true || p.teste_folgas === 1;
  const folga = (j: number) => (teste ? 0.3 + 0.05 * j : num(p.folga, 0.35));
  const gap = (j: number) => 2 * R + 2 * folga(j) + 0.6;
  const cap = formasLetra(font, 'H', size).topo;
  const b = Math.min(num(p.barra, 8), cap), yc = cap / 2, yb0 = yc - b / 2, yb1 = yc + b / 2;
  const yMeio0 = (j: number) => yc - b / 6 + folga(j) / 2, yMeio1 = (j: number) => yc + b / 6 - folga(j) / 2;

  const corI = typeof p.cor_impares === 'string' ? p.cor_impares : '#7C3AED';
  const corP = typeof p.cor_pares === 'string' ? p.cor_pares : '#38BDF8';
  const mats = [corI, corP].map((c) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.1, roughness: 0.45 }));

  const letras = [...nome].map((c) => formasLetra(font, c, size));
  const pos: number[] = [];
  letras.forEach((l, i) => pos.push(i === 0 ? 0 : pos[i - 1] + letras[i - 1].w + gap(i - 1)));

  const grupo = new THREE.Group();
  const caixa = (x0: number, x1: number, y0: number, y1: number, m: THREE.Material) => {
    const g = new THREE.BoxGeometry(x1 - x0, y1 - y0, T); g.translate((x0 + x1) / 2, (y0 + y1) / 2, T / 2);
    grupo.add(new THREE.Mesh(g, m));
  };
  const no = (x: number, y0: number, y1: number, m: THREE.Material) => {      // cilindro de eixo Y
    const g = new THREE.CylinderGeometry(R, R, y1 - y0, 32); g.translate(x, (y0 + y1) / 2, R);
    grupo.add(new THREE.Mesh(g, m));
  };

  letras.forEach((l, i) => {
    const m = mats[i % 2], xa = pos[i], xb = pos[i] + l.w;
    const g = new THREE.ExtrudeGeometry(l.shapes, { depth: T, bevelEnabled: false, curveSegments: 10 });
    g.translate(xa - l.x0, 0, 0);
    grupo.add(new THREE.Mesh(g, m));
    caixa(xa, xb, yb0, yb1, m);                                                   // barra
    if (i < letras.length - 1) {                                                  // nós exteriores
      const xg = xb + gap(i) / 2;
      for (const [y0, y1] of [[yb0, yMeio0(i) - folga(i)], [yMeio1(i) + folga(i), yb1]]) { caixa(xb, xg, y0, y1, m); no(xg, y0, y1, m); }
    }
    if (i > 0) {                                                                  // nó do meio
      const xg = xa - gap(i - 1) / 2;
      caixa(xg, xa, yMeio0(i - 1), yMeio1(i - 1), m); no(xg, yMeio0(i - 1), yMeio1(i - 1), m);
    }
  });
  return grupo;
}

export function libertarGrupo(g: THREE.Group) {
  const mats = new Set<THREE.Material>();
  g.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); if (m.material) mats.add(m.material as THREE.Material); });
  mats.forEach((m) => m.dispose());
}
