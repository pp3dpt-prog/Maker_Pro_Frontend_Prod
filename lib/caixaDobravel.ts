// Caixa dobrável (impressa plana, dobradiças finas) — planificação partilhada pela
// pré-visualização; o STL é gerado por Maker_Pro_Docker_Prod/templates/caixa_dobravel.scad,
// que faz exactamente as mesmas contas. Se mudares uma medida aqui, muda lá também.
//
// Coordenadas da planificação (mm): x para a direita, y para cima, a base em [0,L]×[0,P];
// imprime com a face de baixo (z = 0) na mesa — essa face fica por FORA da caixa.
// Todas as dobras são "em vale" vistas de cima: entre dois painéis há um V (chanfros a 45°
// a partir de z = h) e, no fundo, uma tira com a espessura da dobradiça (h).
//
//   ┌────────── aba de fecho ──────────┐
//   │              tampa               │
//   │               trás  (+ abas)     │
//  SI│ lombo │ lateral │  base  │ lateral │ lombo │SI
//   │               frente (+ abas)    │
//
// Laterais duplas: lateral (fora) → lombo (em cima) → SI (dentro), com patilhas que entram em
// ranhuras da base. As abas da frente/trás ficam presas entre a lateral e a SI.

export type Ret = [number, number, number, number]; // x0, y0, x1, y1
export type Painel = {
  id: string;
  r: Ret;                       // retângulo principal
  extra: Ret[];                 // patilhas (sem chanfro)
  furos: Ret[];                 // ranhuras (atravessam)
  pai: string | null;
  dobra: [number, number, number, number] | null; // linha da dobradiça com o pai: x0,y0,x1,y1
  angulo: number;               // ângulo da dobra quando fechada (graus)
};

export function isCaixaDobravel(p: Record<string, any> | null | undefined): boolean {
  return !!p && p.dobravel === 'caixa';
}

const num = (v: unknown, d: number, a: number, b: number) => {
  const n = Number(v);
  return Math.max(a, Math.min(b, Number.isFinite(n) ? n : d));
};

export function medidasCaixa(p: Record<string, any>) {
  const L = num(p.largura, 80, 30, 220), P = num(p.profundidade, 60, 30, 220), A = num(p.altura, 40, 15, 150);
  const t = num(p.espessura, 1.2, 0.8, 2.4), h = num(p.dobradica, 0.4, 0.2, 0.8);
  const c = 0.3;                                   // folga entre camadas
  const g = 1.0;                                   // largura da tira da dobradiça (no fundo)
  const aS = A - t - c;                            // altura da lateral (fica abaixo da tampa)
  const lombo = 3 * t + 2 * c;                     // lateral + aba + SI, lado a lado
  const lSI = aS - t - c;                          // SI: da esquina do lombo até à base (+ folga c)
  const df = Math.min(P * 0.4, 25);                // fundo das abas da frente/trás
  const tf = Math.min(A * 0.5, 22);                // aba de fecho da tampa
  const prof = P - t - c;                          // tampa: das costas até dentro da frente
  const xIn = t + c;                               // frente/trás ficam entre as laterais
  return { L, P, A, t, h, c, g, aS, lombo, lSI, df, tf, prof, xIn };
}

export function planificacao(p: Record<string, any>): Painel[] {
  const m = medidasCaixa(p);
  const { L, P, A, t, c, aS, lombo, lSI, df, tf, prof, xIn } = m;
  const out: Painel[] = [];
  const add = (id: string, r: Ret, pai: string | null, dobra: Painel['dobra'], angulo = 90, extra: Ret[] = [], furos: Ret[] = []) =>
    out.push({ id, r, extra, furos, pai, dobra, angulo });

  // ranhuras na base para as patilhas das SI (SI fica a 2t+2c..3t+2c da face de fora da lateral)
  const yIn0 = t + c, yIn1 = P - t - c, comp = yIn1 - yIn0;
  const wPat = Math.min(10, comp / 4);
  const patY = [yIn0 + comp * 0.25, yIn0 + comp * 0.75];
  const s0 = 2 * t + 2 * c - 0.2, s1 = 3 * t + 2 * c + 0.2;
  const ranhuras: Ret[] = [];
  for (const yc of patY) {
    ranhuras.push([s0, yc - wPat / 2 - 0.2, s1, yc + wPat / 2 + 0.2]);
    ranhuras.push([L - s1, yc - wPat / 2 - 0.2, L - s0, yc + wPat / 2 + 0.2]);
  }
  add('base', [0, 0, L, P], null, null, 0, [], ranhuras);

  // frente e trás (entre as laterais), com abas nos lados
  const z0 = t + c, z1 = aS - t - c;               // altura útil das abas (entre a base e o lombo)
  add('frente', [xIn, -A, L - xIn, 0], 'base', [xIn, 0, L - xIn, 0]);
  add('frente_ae', [xIn - df, -z1, xIn, -z0], 'frente', [xIn, -z1, xIn, -z0]);
  add('frente_ad', [L - xIn, -z1, L - xIn + df, -z0], 'frente', [L - xIn, -z1, L - xIn, -z0]);
  add('tras', [xIn, P, L - xIn, P + A], 'base', [xIn, P, L - xIn, P]);
  add('tras_ae', [xIn - df, P + z0, xIn, P + z1], 'tras', [xIn, P + z0, xIn, P + z1]);
  add('tras_ad', [L - xIn, P + z0, L - xIn + df, P + z1], 'tras', [L - xIn, P + z0, L - xIn, P + z1]);

  // tampa (presa à trás) e aba de fecho (entra por dentro da frente)
  const yT = P + A;
  add('tampa', [0, yT, L, yT + prof], 'tras', [xIn, yT, L - xIn, yT]);
  const mTf = 3 * t + 3 * c;
  add('fecho', [mTf, yT + prof, L - mTf, yT + prof + tf], 'tampa', [mTf, yT + prof, L - mTf, yT + prof]);

  // laterais duplas
  for (const [lado, s] of [['e', -1], ['d', 1]] as const) {
    const X = (d: number) => (s < 0 ? -d : L + d);          // distância à base → x
    const R = (d0: number, y0: number, d1: number, y1: number): Ret => {
      const a = X(d0), b = X(d1);
      return [Math.min(a, b), y0, Math.max(a, b), y1];
    };
    add(`lat_${lado}`, R(0, 0, aS, P), 'base', [X(0), 0, X(0), P]);
    add(`lombo_${lado}`, R(aS, yIn0, aS + lombo, yIn1), `lat_${lado}`, [X(aS), yIn0, X(aS), yIn1]);
    const d0 = aS + lombo, d1 = d0 + lSI;
    const pats = patY.map((yc) => R(d1, yc - wPat / 2, d1 + t, yc + wPat / 2));
    add(`si_${lado}`, R(d0, yIn0, d1, yIn1), `lombo_${lado}`, [X(d0), yIn0, X(d0), yIn1], 90, pats);
  }
  return out;
}

/** Tamanho da planificação (para avisar se não cabe na mesa). */
export function tamanhoPlano(pain: Painel[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const q of pain) for (const r of [q.r, ...q.extra]) {
    x0 = Math.min(x0, r[0]); y0 = Math.min(y0, r[1]); x1 = Math.max(x1, r[2]); y1 = Math.max(y1, r[3]);
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

// ── dobragem (matrizes 4×4 em coluna, como o three.js) ──
type M4 = number[];
const mult = (a: M4, b: M4): M4 => {
  const o = new Array(16).fill(0);
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) for (let k = 0; k < 4; k++) o[j * 4 + i] += a[k * 4 + i] * b[j * 4 + k];
  return o;
};
const I4 = (): M4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
// rotação de `ang` (rad) em torno da reta horizontal (z = 0) que passa por (px,py) com direção (dx,dy)
function rotRecta(px: number, py: number, dx: number, dy: number, ang: number): M4 {
  const c = Math.cos(ang), s = Math.sin(ang), C = 1 - c;
  const x = dx, y = dy, z = 0;
  const R: M4 = [
    c + x * x * C, y * x * C + z * s, z * x * C - y * s, 0,
    x * y * C - z * s, c + y * y * C, z * y * C + x * s, 0,
    x * z * C + y * s, y * z * C - x * s, c + z * z * C, 0,
    0, 0, 0, 1,
  ];
  const T = (a: number, b: number): M4 => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, a, b, 0, 1];
  return mult(T(px, py), mult(R, T(-px, -py)));
}
export const aplicar = (m: M4, [x, y, z]: number[]) => [
  m[0] * x + m[4] * y + m[8] * z + m[12], m[1] * x + m[5] * y + m[9] * z + m[13], m[2] * x + m[6] * y + m[10] * z + m[14]];

/**
 * Matriz de cada painel com a caixa dobrada a `f` (0 = plana, 1 = fechada). O sentido de cada
 * dobra é sempre o que levanta o filho para cima (+z) na planificação (dobra em vale).
 */
export function dobrar(pain: Painel[], f: number): Record<string, M4> {
  const M: Record<string, M4> = {};
  const porId = Object.fromEntries(pain.map((q) => [q.id, q]));
  const calc = (id: string): M4 => {
    if (M[id]) return M[id];
    const q = porId[id];
    if (!q.pai || !q.dobra) return (M[id] = I4());
    const [x0, y0, x1, y1] = q.dobra;
    let dx = x1 - x0, dy = y1 - y0;
    const n = Math.hypot(dx, dy); dx /= n; dy /= n;
    // lado do filho em relação à reta: centro do painel
    const cx = (q.r[0] + q.r[2]) / 2 - x0, cy = (q.r[1] + q.r[3]) / 2 - y0;
    const lado = dx * cy - dy * cx;                 // (d × u).z
    // rotação de +β em torno de d leva u para u·cosβ + (d×u)·sinβ: com (d×u).z > 0 sobe
    const ang = (Math.sign(lado) || 1) * (q.angulo * Math.PI / 180) * f;
    return (M[id] = mult(calc(q.pai), rotRecta(x0, y0, dx, dy, ang)));
  };
  for (const q of pain) calc(q.id);
  return M;
}
