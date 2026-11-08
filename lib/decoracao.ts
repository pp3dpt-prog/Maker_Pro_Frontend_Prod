// Pré-visualização em tempo real dos modelos da família "Decoração" — as mesmas fórmulas de
// Maker_Pro_Docker_Prod/templates/decoracao/partes/*.scad. Se mudares um .scad, muda também aqui.
//
// Os modelos trazem no schema um parâmetro escondido `deco` com o nome do modelo
// (vaso_torcido, vaso_texturizado, taca_ondulada, porta_velas, estrela).
// Todos menos a estrela são uma "superfície polar": a distância ao centro em função do ângulo
// e da altura (parede de fora, rebordo, parede de dentro, chão interior e fundo).

export type ModeloDeco = 'vaso_torcido' | 'vaso_texturizado' | 'taca_ondulada' | 'porta_velas' | 'estrela';
const MODELOS: ModeloDeco[] = ['vaso_torcido', 'vaso_texturizado', 'taca_ondulada', 'porta_velas', 'estrela'];

export function modeloDecoracao(p: Record<string, any> | null | undefined): ModeloDeco | null {
  const m = p?.deco;
  return typeof m === 'string' && (MODELOS as string[]).includes(m) ? (m as ModeloDeco) : null;
}
export function isDecoracao(p: Record<string, any> | null | undefined): boolean {
  return modeloDecoracao(p) !== null;
}

/** Cor da pré-visualização por modelo (só visual). */
export const COR_DECORACAO: Record<ModeloDeco, string> = {
  vaso_torcido: '#38BDF8',
  vaso_texturizado: '#F472B6',
  taca_ondulada: '#A3E635',
  porta_velas: '#FBBF24',
  estrela: '#FDE047',
};

const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) && v !== '' && v !== null && v !== undefined ? Number(v) : d);
const verdade = (v: unknown, d: boolean) => (v === undefined || v === null || v === '' ? d : v === true || v === 1 || v === '1' || v === 'true');
const RAD = Math.PI / 180;
const cosd = (a: number) => Math.cos(a * RAD);
const sind = (a: number) => Math.sin(a * RAD);
const frac = (x: number) => x - Math.floor(x);
const tri = (x: number) => 1 - 2 * Math.abs(frac(x) - 0.5);
const mod = (a: number, m: number) => ((a % m) + m) % m;

// ── formas (iguais a _formas.scad) ──
const rPoligono = (a: number, n: number) => { const seg = 360 / n, p = mod(a, seg) - seg / 2; return cosd(180 / n) / cosd(p); };
function rQuadrado(a: number, h: number, q: number) {
  const c = Math.abs(cosd(a)), s = Math.abs(sind(a)), C = h - q;
  if ((s * h) / Math.max(c, 1e-9) <= C) return h / Math.max(c, 1e-9);
  if ((c * h) / Math.max(s, 1e-9) <= C) return h / Math.max(s, 1e-9);
  const b = c * C + s * C;
  return b + Math.sqrt(b * b - (2 * C * C - q * q));
}
const rHex = (a: number, h: number) => h / cosd(mod(a + 30, 60) - 30);

// ── texturas (iguais a _texturas.scad) ──
function texturas(tex: string, lam: number, A: number, rCiclos: number, zTopo: (a: number) => number) {
  const ncic = Math.max(3, Math.round((2 * Math.PI * rCiclos) / lam));
  const padrao = (a: number, z: number) => {
    const x = (ncic * a) / 360, y = z / lam;
    switch (tex) {
      case 'Riscas': return 0.5 + 0.5 * cosd(360 * x);
      case 'Espiral': return 0.5 + 0.5 * cosd(360 * (x + y * 0.5));
      case 'Losangos': return Math.min(tri(x + y / 2), tri(x - y / 2));
      case 'Ondas': return 0.5 + 0.5 * cosd(360 * y + 90 * sind(360 * x));
      case 'Bolhas': {
        const fy = Math.floor(y * 1.15), xx = frac(x + (fy % 2) * 0.5) - 0.5, yy = frac(y * 1.15) - 0.5;
        return Math.sqrt(Math.max(0, 1 - (xx * xx + yy * yy) / (0.42 * 0.42)));
      }
      case 'Tijolo': {
        const yb = z / (lam * 0.55), fy = Math.floor(yb), xb = x + (fy % 2) * 0.5;
        return frac(yb) < 0.16 || frac(xb) < 0.08 ? 0 : 1;
      }
      default: return 0;
    }
  };
  const rampa = (v: number, a: number, b: number) => { if (v <= a) return 0; if (v >= b) return 1; const u = (v - a) / (b - a); return u * u * (3 - 2 * u); };
  return (a: number, z: number) => (tex === 'Liso' ? 0 : A * padrao(a, z) * rampa(z, 1.2, 3) * rampa(zTopo(a) - z, 1.2, 3));
}

type Superficie = {
  rExt: (a: number, z: number) => number;
  rInt: (a: number, z: number) => number;
  zTopo: (a: number) => number;
  fi: number;      // altura do chão interior
  H: number;       // altura máxima
  solido: boolean;
  passo: number;    // mm por linha de fora  } os valores do modo "preview" do .scad
  passoInt: number; // mm por linha de dentro } (a parede de dentro é lisa)
  NA: number;       // colunas
};

/** Triângulos (mm, z para cima) de uma superfície polar — a mesma malha de _superficie.scad. */
function malhaPolar(s: Superficie): number[] {
  const NA = s.NA;
  const K = Math.max(24, Math.ceil(s.H / s.passo)), R = K + 1;
  const Ki = Math.max(4, Math.ceil(s.H / s.passoInt)), Ri = Ki + 1;
  const pts: number[][] = [];
  const ang = (i: number) => (i * 360) / NA;
  for (let i = 0; i < NA; i++) {
    const a = ang(i), zt = s.zTopo(a);
    for (let k = 0; k <= K; k++) { const z = (zt * k) / K, r = s.rExt(a, z); pts.push([r * cosd(a), r * sind(a), z]); }
  }
  const out: number[] = [];
  const t = (a: number, b: number, c: number) => { out.push(...pts[a], ...pts[b], ...pts[c]); };
  const quad = (a: number, b: number, c: number, d: number) => { t(a, b, c); t(a, c, d); };
  if (s.solido) {
    const B = pts.length; pts.push([0, 0, 0]);
    const T = pts.length; pts.push([0, 0, s.zTopo(0)]);
    for (let i = 0; i < NA; i++) {
      const j = (i + 1) % NA;
      for (let k = 0; k < K; k++) quad(i * R + k, j * R + k, j * R + k + 1, i * R + k + 1);
      t(T, i * R + K, j * R + K);
      t(B, j * R, i * R);
    }
    return out;
  }
  const O = pts.length;
  for (let i = 0; i < NA; i++) {
    const a = ang(i), zt = s.zTopo(a);
    for (let k = 0; k <= Ki; k++) { const z = s.fi + ((zt - s.fi) * k) / Ki, r = s.rInt(a, z); pts.push([r * cosd(a), r * sind(a), z]); }
  }
  const B = pts.length; pts.push([0, 0, 0]);
  const F = pts.length; pts.push([0, 0, s.fi]);
  for (let i = 0; i < NA; i++) {
    const j = (i + 1) % NA;
    for (let k = 0; k < K; k++) quad(i * R + k, j * R + k, j * R + k + 1, i * R + k + 1);                // fora
    for (let k = 0; k < Ki; k++) quad(O + i * Ri + k, O + i * Ri + k + 1, O + j * Ri + k + 1, O + j * Ri + k); // dentro
    quad(i * R + K, j * R + K, O + j * Ri + Ki, O + i * Ri + Ki);                                    // rebordo
    t(F, O + i * Ri, O + j * Ri);                                                                    // chão interior
    t(B, j * R, i * R);                                                             // fundo
  }
  return out;
}

// ── modelos (iguais aos .scad de cada um) ──

function vasoTorcido(p: Record<string, any>): Superficie {
  const n = Math.max(3, Math.round(num(p.lados, 6))), rb = num(p.raio_base, 40), rt = num(p.raio_topo, 55);
  const H = num(p.altura, 150), tw = num(p.torcao, 90), bojo = num(p.bojo, 10), s = Math.min(1, Math.max(0, num(p.arredondar, 0.2)));
  const t = num(p.parede, 2), fd = num(p.fundo, 2);
  const perfil = (z: number) => { const u = z / H; return rb + (rt - rb) * u + bojo * sind(180 * u); };
  const dperfil = (z: number) => { const u = z / H; return ((rt - rb) + bojo * Math.PI * cosd(180 * u)) / H; };
  const forma = (a: number) => (1 - s) * rPoligono(a, n) + s;
  const rBase = (a: number, z: number) => perfil(z) * forma(a - (tw * z) / H);
  const twIncl = (z: number) => (perfil(z) * tw * RAD) / H;
  const tEf = (z: number) => t * Math.sqrt(1 + dperfil(z) ** 2 + twIncl(z) ** 2);
  const apot = (1 - s) * cosd(180 / n) + s;
  return {
    rExt: rBase,
    rInt: (a, z) => (perfil(z) - tEf(z) / apot) * forma(a - (tw * z) / H),
    zTopo: () => H, fi: fd, H, solido: verdade(p.modo_vaso, false), passo: 4, passoInt: 4, NA: 180,
  };
}

function vasoTexturizado(p: Record<string, any>): Superficie {
  const forma = String(p.forma ?? 'Redonda'), L = num(p.largura, 70), H = num(p.altura, 100), af = num(p.afunilar, 100);
  const t = num(p.parede, 2), fd = num(p.fundo, 2);
  const escala = (z: number) => 1 + ((af / 100 - 1) * z) / H;
  const formaE = (a: number, e: number, d: number) =>
    forma === 'Quadrada' ? rQuadrado(a, (e * L) / 2 - d, Math.max(0.5, (e * 0.15 * L) / 2 - d))
      : forma === 'Hexagonal' ? rHex(a, (e * L) / 2 - d)
        : (e * L) / 2 - d;
  const incl = ((af / 100 - 1) * L) / 2 / H;
  const zTopo = () => H;
  const desloc = texturas(String(p.textura ?? 'Losangos'), Math.max(1, num(p.tamanho_textura, 8)), num(p.profundidade, 1), L / 2, zTopo);
  return {
    rExt: (a, z) => formaE(a, escala(z), 0) + desloc(a, z),
    rInt: (a, z) => formaE(a, escala(z), t * Math.sqrt(1 + incl * incl)),
    zTopo, fi: fd, H, solido: false, passo: 1.6, passoInt: 10, NA: 360,
  };
}

function tacaOndulada(p: Record<string, any>): Superficie {
  const rt = num(p.diametro_topo, 190) / 2, rb = num(p.diametro_base, 90) / 2, H = num(p.altura, 70);
  const np = Math.max(2, Math.round(num(p.petalas, 8))), or = num(p.onda_rebordo, 8), ol = num(p.onda_lateral, 6);
  const t = num(p.parede, 2.2), fd = num(p.fundo, 2.4);
  const c = num(p.curvatura, 1.6), d = Math.abs(rt - rb);
  const cv = Math.max(1, Math.min(c, d < 0.01 ? c : (1.3 * H) / d));
  const perfil = (z: number) => { const u = Math.min(1, z / H); return rb + (rt - rb) * (1 - Math.pow(1 - u, cv)); };
  const dperfil = (z: number) => { const u = Math.min(0.999, z / H); return ((rt - rb) * cv * Math.pow(1 - u, cv - 1)) / H; };
  const rBase = (a: number, z: number) => perfil(z) + ol * Math.pow(Math.min(1, z / H), 1.5) * cosd(np * a);
  return {
    rExt: rBase,
    rInt: (a, z) => rBase(a, z) - t * Math.sqrt(1 + dperfil(z) ** 2),
    zTopo: (a) => H - or * (0.5 - 0.5 * cosd(np * a)),
    fi: fd, H, solido: false, passo: 3, passoInt: 3, NA: 180,
  };
}

function portaVelas(p: Record<string, any>): Superficie {
  const forma = String(p.forma ?? 'Redonda'), dv = num(p.diametro_vela, 39.5), pv = num(p.profundidade_vela, 17);
  const fmin = forma === 'Flor' ? 0.82 : 1;
  const L = Math.max(num(p.largura, 70), (dv + 6) / fmin), H = Math.max(num(p.altura, 30), pv + 3);
  const forma0 = (a: number) => forma === 'Hexagonal' ? rHex(a, L / 2) : forma === 'Flor' ? (L / 2) * (0.91 + 0.09 * cosd(8 * a)) : L / 2;
  const zTopo = () => H;
  const desloc = texturas(String(p.textura ?? 'Riscas'), Math.max(1, num(p.tamanho_textura, 6)), num(p.profundidade, 0.8), L / 2, zTopo);
  return {
    rExt: (a, z) => forma0(a) + desloc(a, z),
    rInt: () => dv / 2,
    zTopo, fi: H - pv, H, solido: false, passo: 1.2, passoInt: 10, NA: 360,
  };
}

/** Estrela facetada + argola (igual a estrela.scad). */
function estrela(p: Record<string, any>): number[] {
  const np = Math.max(3, Math.round(num(p.pontas, 5))), R = num(p.raio, 40), ri = (R * num(p.interior, 45)) / 100;
  const hr = num(p.altura_relevo, 8), b = num(p.base, 2), M = 2 * np;
  const pt = (i: number, z: number) => { const a = 90 + (i * 180) / np, r = i % 2 === 0 ? R : ri; return [r * cosd(a), r * sind(a), z]; };
  const P = Array.from({ length: M }, (_, i) => pt(i, 0)), Q = Array.from({ length: M }, (_, i) => pt(i, b));
  const C = [0, 0, 0], A = [0, 0, b + hr];
  const out: number[] = [];
  const t = (a: number[], bb: number[], c: number[]) => out.push(...a, ...bb, ...c);
  for (let i = 0; i < M; i++) {
    const j = (i + 1) % M;
    t(C, P[j], P[i]);                       // costas
    t(P[i], P[j], Q[j]); t(P[i], Q[j], Q[i]); // lados
    t(A, Q[i], Q[j]);                       // facetas
  }
  if (verdade(p.argola, true)) {
    const rIn = num(p.diametro_argola, 5) / 2, rOut = rIn + 2.4, h = Math.max(b, 2), cy = R + rIn + 0.3, N = 48;
    const v = (r: number, k: number, z: number) => [r * cosd((k * 360) / N), cy + r * sind((k * 360) / N), z];
    for (let k = 0; k < N; k++) {
      const k2 = k + 1;
      t(v(rOut, k, 0), v(rOut, k2, 0), v(rOut, k2, h)); t(v(rOut, k, 0), v(rOut, k2, h), v(rOut, k, h));   // fora
      t(v(rIn, k, 0), v(rIn, k, h), v(rIn, k2, h)); t(v(rIn, k, 0), v(rIn, k2, h), v(rIn, k2, 0));        // dentro
      t(v(rOut, k, h), v(rOut, k2, h), v(rIn, k2, h)); t(v(rOut, k, h), v(rIn, k2, h), v(rIn, k, h));     // cima
      t(v(rOut, k, 0), v(rIn, k2, 0), v(rOut, k2, 0)); t(v(rOut, k, 0), v(rIn, k, 0), v(rIn, k2, 0));     // baixo
    }
  }
  return out;
}

/** Triângulos (mm, z para cima, z = 0 no fundo) do modelo de decoração indicado em p.deco. */
export function construirDecoracao(p: Record<string, any>): number[] {
  switch (modeloDecoracao(p)) {
    case 'vaso_torcido': return malhaPolar(vasoTorcido(p));
    case 'vaso_texturizado': return malhaPolar(vasoTexturizado(p));
    case 'taca_ondulada': return malhaPolar(tacaOndulada(p));
    case 'porta_velas': return malhaPolar(portaVelas(p));
    case 'estrela': return estrela(p);
    default: return [];
  }
}
