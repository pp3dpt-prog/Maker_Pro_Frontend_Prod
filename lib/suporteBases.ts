// Pré-visualização em tempo real do "Suporte para bases de copos" — as mesmas fórmulas de
// Maker_Pro_Docker_Prod/templates/suporte_bases_copos.scad (forma polar, entalhe até ao degrau,
// texturas na parede de fora), numa malha só. Se mudares o .scad, muda também aqui.

export function isSuporteBases(p: Record<string, any> | null | undefined): boolean {
  return !!p && typeof p.textura === 'string' && p.altura_base !== undefined && p.tamanho_textura !== undefined;
}

const num = (v: unknown, d: number) => (Number.isFinite(Number(v)) && v !== '' && v !== null ? Number(v) : d);
const RAD = Math.PI / 180;
const frac = (x: number) => x - Math.floor(x);
const tri = (x: number) => 1 - 2 * Math.abs(frac(x) - 0.5);

/** Triângulos (mm) do suporte, z = 0 no fundo. */
export function construirSuporte(p: Record<string, any>): number[] {
  const forma = String(p.forma ?? 'Redonda'), L = num(p.largura, 95);
  const nb = num(p.num_bases, 6), hb = num(p.altura_base, 4.3), c = num(p.folga, 1), t = num(p.parede, 2.4), f = num(p.fundo, 2);
  const tex = String(p.textura ?? 'Losangos'), lam = Math.max(1, num(p.tamanho_textura, 8));
  const A = tex === 'Liso' ? 0 : num(p.profundidade, 0.9);
  const ent = !(p.entalhe === false || p.entalhe === 0 || p.entalhe === '0');
  const degrau = num(p.degrau, 3);
  const Hint = nb * hb + 1, H = f + Hint;

  const rQuad = (a: number, h: number, q: number) => {
    const cs = Math.abs(Math.cos(a * RAD)), sn = Math.abs(Math.sin(a * RAD)), C = h - q;
    if ((sn * h) / Math.max(cs, 1e-9) <= C) return h / Math.max(cs, 1e-9);
    if ((cs * h) / Math.max(sn, 1e-9) <= C) return h / Math.max(sn, 1e-9);
    const b = cs * C + sn * C;
    return b + Math.sqrt(b * b - (2 * C * C - q * q));
  };
  const rHex = (a: number, h: number) => { const ph = ((((a + 30) % 60) + 60) % 60) - 30; return h / Math.cos(ph * RAD); };
  const rIn = (a: number) => forma === 'Quadrada' ? rQuad(a, L / 2 + c, 8 + c) : forma === 'Hexagonal' ? rHex(a, L / 2 + c) : L / 2 + c;

  const angDist = (a: number, b: number) => Math.abs(((((a - b) % 360) + 540) % 360) - 180);
  const entalheF = (a: number) => {
    if (!ent) return 0;
    const d = angDist(a, 270), al = 22, be = 14;
    return d < al ? 1 : d < al + be ? 0.5 + 0.5 * Math.cos((Math.PI * (d - al)) / be) : 0;
  };
  const zTopo = (a: number) => H - entalheF(a) * (Hint - degrau);

  const ncic = Math.max(3, Math.round((2 * Math.PI * (L / 2 + c + t)) / lam));
  const padrao = (a: number, z: number) => {
    const x = (ncic * a) / 360, y = z / lam;
    switch (tex) {
      case 'Riscas': return 0.5 + 0.5 * Math.cos(2 * Math.PI * x);
      case 'Espiral': return 0.5 + 0.5 * Math.cos(2 * Math.PI * (x + y * 0.5));
      case 'Losangos': return Math.min(tri(x + y / 2), tri(x - y / 2));
      case 'Ondas': return 0.5 + 0.5 * Math.cos(2 * Math.PI * y + (Math.PI / 2) * Math.sin(2 * Math.PI * x));
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
  const desloc = (a: number, z: number) => A * padrao(a, z) * rampa(z, 1.2, 3) * rampa(zTopo(a) - z, 1.2, 3);

  const NA = 360, K = Math.max(12, Math.ceil(H / 0.5)), R = K + 1;
  const pts: [number, number, number][] = [];
  for (let i = 0; i < NA; i++) {                     // parede de fora
    const a = (i * 360) / NA, zt = zTopo(a);
    for (let k = 0; k <= K; k++) { const z = (zt * k) / K, r = rIn(a) + t + desloc(a, z); pts.push([r * Math.cos(a * RAD), r * Math.sin(a * RAD), z]); }
  }
  for (let i = 0; i < NA; i++) {                     // parede de dentro
    const a = (i * 360) / NA, zt = zTopo(a), r = rIn(a);
    for (let k = 0; k <= K; k++) { const z = f + ((zt - f) * k) / K; pts.push([r * Math.cos(a * RAD), r * Math.sin(a * RAD), z]); }
  }
  const O = NA * R, B = 2 * NA * R, F = B + 1;
  pts.push([0, 0, 0], [0, 0, f]);

  const out: number[] = [];
  // (no .scad a ordem é a inversa: o OpenSCAD quer as faces no sentido dos ponteiros do relógio)
  const triang = (a: number, b: number, c2: number) => { out.push(...pts[a], ...pts[b], ...pts[c2]); };
  const quad = (a: number, b: number, c2: number, d: number) => { triang(a, b, c2); triang(a, c2, d); };
  for (let i = 0; i < NA; i++) {
    const j = (i + 1) % NA;
    for (let k = 0; k < K; k++) {
      quad(i * R + k, j * R + k, j * R + k + 1, i * R + k + 1);                       // fora (normais para fora)
      quad(O + i * R + k, O + i * R + k + 1, O + j * R + k + 1, O + j * R + k);       // dentro
    }
    quad(i * R + K, j * R + K, O + j * R + K, O + i * R + K);                         // rebordo de cima
    triang(F, O + i * R, O + j * R);                                                  // chão interior
    triang(B, j * R, i * R);                                                          // fundo
  }
  return out;
}
