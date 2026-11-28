/**
 * Formas prontas para a termoformagem (kit de molde e enfeite em 2 metades) — o cliente escolhe
 * uma forma em vez de carregar uma imagem.
 *
 * Partilhado TAL E QUAL entre o backend (Maker_Pro_Docker_Prod/app/formasTermo.js) e o frontend
 * (Maker_Pro_Frontend_Prod/lib/formasTermo.js). Se mudares um, copia para o outro.
 *
 * Cada forma devolve um ou mais anéis [[x, y], …] (mm, sentido anti-horário) numa escala
 * qualquer; formaPronta() escala para a largura pedida e converte para Clipper.
 */
import ClipperLib from 'clipper-lib';

const ESC = 1000;
const C = ClipperLib;
const TAU = Math.PI * 2;

const amostra = (n, f) => Array.from({ length: n }, (_, i) => f((i / n) * TAU, i));
const circ = (cx, cy, r, n = 96) => amostra(n, a => [cx + r * Math.cos(a), cy + r * Math.sin(a)]);
const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

function retArredondado(w, h, r, n = 16) {
  const out = [];
  const cantos = [[w / 2 - r, -h / 2 + r, -Math.PI / 2], [w / 2 - r, h / 2 - r, 0], [-w / 2 + r, h / 2 - r, Math.PI / 2], [-w / 2 + r, -h / 2 + r, Math.PI]];
  for (const [cx, cy, a0] of cantos) for (let i = 0; i <= n; i++) {
    const a = a0 + (i / n) * (Math.PI / 2);
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
  return out;
}

function estrela(pontas, rExt, rInt, arred = 0) {
  const out = [];
  for (let i = 0; i < pontas * 2; i++) {
    const a = Math.PI / 2 + (i / (pontas * 2)) * TAU;
    const r = i % 2 ? rInt : rExt;
    out.push([r * Math.cos(a), r * Math.sin(a)]);
  }
  return out;
}

/** Catálogo: id → { nome, emoji, aneis(), simetrica } (simetrica = espelho esquerda/direita). */
export const FORMAS_TERMO = {
  circulo: { nome: 'Círculo', emoji: '⚪', aneis: () => [circ(0, 0, 50, 128)] },
  oval: { nome: 'Oval', emoji: '🥚', aneis: () => [amostra(128, a => [38 * Math.cos(a), 50 * Math.sin(a)])] },
  ovo: {
    nome: 'Ovo', emoji: '🥚',
    // ovo de Páscoa: mais largo em baixo
    aneis: () => [amostra(128, a => { const y = 50 * Math.sin(a); return [36 * Math.cos(a) * (1 - 0.18 * Math.sin(a)), y]; })],
  },
  coracao: {
    nome: 'Coração', emoji: '❤️',
    aneis: () => [amostra(160, t => [16 * Math.sin(t) ** 3, 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)])],
  },
  estrela: { nome: 'Estrela', emoji: '⭐', aneis: () => [estrela(5, 50, 22)] },
  estrela6: { nome: 'Estrela de 6 pontas', emoji: '✡️', aneis: () => [estrela(6, 50, 29)] },
  hexagono: { nome: 'Hexágono', emoji: '⬡', aneis: () => [amostra(6, a => [50 * Math.cos(a), 50 * Math.sin(a)])] },
  quadrado: { nome: 'Quadrado arredondado', emoji: '⬛', aneis: () => [retArredondado(100, 100, 14)] },
  gota: {
    nome: 'Gota', emoji: '💧',
    aneis: () => [amostra(128, t => { const s = Math.sin(t / 2); return [30 * Math.sin(t) * s, 40 * Math.cos(t)]; })],
  },
  nuvem: {
    nome: 'Nuvem', emoji: '☁️',
    aneis: () => [circ(-30, -6, 18), circ(-4, 8, 26), circ(26, 0, 20), retArredondado(96, 36, 16).map(([x, y]) => [x - 2, y - 14])],
  },
  pinheiro: {
    nome: 'Pinheiro de Natal', emoji: '🎄',
    aneis: () => [[[-46, -34], [-10, 6], [-30, 6], [-4, 34], [-18, 34], [0, 58], [18, 34], [4, 34], [30, 6], [10, 6], [46, -34]], rect(-9, -50, 9, -33)],
  },
  bola_natal: {
    nome: 'Bola de Natal', emoji: '🔴',
    aneis: () => [circ(0, 0, 46, 128), rect(-10, 40, 10, 54)],
  },
  sino: {
    nome: 'Sino', emoji: '🔔',
    aneis: () => {
      // perfil do sino (lado direito), espelhado
      const dir = [];
      for (let i = 0; i <= 40; i++) {
        const y = -40 + (i / 40) * 84;
        const t = (y + 40) / 84;                       // 0 em baixo → 1 em cima
        const x = 8 + 34 * (1 - t) ** 1.6 + 8 * Math.sin(Math.PI * t) * (1 - t);
        dir.push([Math.max(6, x), y]);
      }
      const topo = Array.from({ length: 13 }, (_, k) => { const a = (k / 12) * Math.PI; return [12 * Math.cos(a), 44 + 8 * Math.sin(a)]; });
      const esq = dir.map(([x, y]) => [-x, y]).reverse();
      return [[[-46, -40], [46, -40], ...dir, ...topo, ...esq], circ(0, -44, 8, 32)];
    },
  },
  lua: {
    nome: 'Lua', emoji: '🌙', simetrica: false,
    aneis: () => [circ(0, 0, 50, 128)],          // o recorte é feito em formaPronta (diferença de círculos)
    recorte: () => [circ(26, 16, 44, 128)],
  },
  presente: {
    nome: 'Presente', emoji: '🎁',
    aneis: () => [retArredondado(90, 70, 6), circ(-14, 42, 13, 48), circ(14, 42, 13, 48)],
  },
};

export const LISTA_FORMAS = Object.entries(FORMAS_TERMO).map(([id, f]) => ({ id, nome: f.nome, emoji: f.emoji }));

const paraClipper = (anel) => {
  const q = anel.map(([x, y]) => ({ X: Math.round(x * ESC), Y: Math.round(y * ESC) }));
  if (C.Clipper.Area(q) < 0) q.reverse();
  return q;
};

/**
 * Forma pronta → Clipper paths (µm) com `larguraMm` de largura, centrada na origem
 * (caixa envolvente). null se o id não existir.
 */
export function formaPronta(id, larguraMm) {
  const f = FORMAS_TERMO[id];
  if (!f) return null;
  const c = new C.Clipper();
  c.AddPaths(f.aneis().map(paraClipper), C.PolyType.ptSubject, true);
  if (f.recorte) c.AddPaths(f.recorte().map(paraClipper), C.PolyType.ptClip, true);
  let sol = new C.Paths();
  c.Execute(f.recorte ? C.ClipType.ctDifference : C.ClipType.ctUnion, sol, C.PolyFillType.pftNonZero, C.PolyFillType.pftNonZero);
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const q of sol) for (const p of q) { minX = Math.min(minX, p.X); maxX = Math.max(maxX, p.X); minY = Math.min(minY, p.Y); maxY = Math.max(maxY, p.Y); }
  const s = (larguraMm * ESC) / (maxX - minX);
  const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
  return sol.map(q => q.map(p => ({ X: Math.round((p.X - cx) * s), Y: Math.round((p.Y - cy) * s) })));
}
