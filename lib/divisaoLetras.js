/**
 * Divisão por letras — Caixa de Luz logótipo/texto (params.tipo_corte = "letras").
 *
 * Partilhado TAL E QUAL entre o backend (Maker_Pro_Docker_Prod/app/divisaoLetras.js) e o
 * frontend (Maker_Pro_Frontend_Prod/lib/divisaoLetras.js). Se mudares um, copia para o outro.
 *
 * Em vez de cortes a direito (app/divisaoBlocos.js), cada letra (cada ilha da silhueta do
 * desenho, sem o contorno) fica com a sua peça. A linha de corte passa a meio do espaço entre
 * letras vizinhas e acompanha a forma delas: a moldura/contorno à volta de cada letra é dividida
 * por "zonas de influência" — cada ponto da peça vai para a letra mais próxima (crescimento em
 * passos de PASSO mm a partir de todas as letras ao mesmo tempo).
 *
 * Pontos, acentos e afins (o ponto do "i", o til do "ã", a cedilha…) juntam-se à letra por baixo
 * / por cima (sobreposição na horizontal), e ilhas minúsculas juntam-se à mais próxima.
 *
 * Juntas a meia-madeira, sem peças por trás (fariam sombra na frente iluminada): em cada peça
 * (corpo, frente, tampa) a metade de baixo de cada letra avança LAP mm para dentro das letras
 * seguintes, e a metade de cima avança para dentro das anteriores. Monta-se pela ordem L1, L2, …
 * pousando cada letra por cima da anterior; dá área de cola e alinha as peças em altura.
 */
import ClipperLib from 'clipper-lib';

const ESC = 1000;
const C = ClipperLib;
const NZ = C.PolyFillType.pftNonZero;

export const LETRAS = {
  passo: 1,          // mm: resolução da linha de corte entre letras (depois alisada)
  passoLonge: 2,     // mm: passo quando já se está longe das letras (formas fixas grandes)
  lap: 4,            // mm que a meia-madeira avança para dentro da letra vizinha
  folga: 0.15,       // mm de folga total entre letras
  areaMin: 8,        // mm²: ilhas mais pequenas juntam-se à vizinha mais próxima
  sobreposicao: 0.5, // fração da largura da ilha menor sobreposta na horizontal → mesma letra
};
export const MARGEM_MESA_LETRAS = 6;
export const VOLUME_MIN_LETRAS = 30;

function clip(tipo, a, b) {
  if (!a.length) return tipo === C.ClipType.ctUnion ? b : [];
  if (!b.length) return tipo === C.ClipType.ctIntersection ? [] : a;
  const c = new C.Clipper();
  c.AddPaths(a, C.PolyType.ptSubject, true);
  c.AddPaths(b, C.PolyType.ptClip, true);
  const sol = new C.Paths();
  c.Execute(tipo, sol, NZ, NZ);
  return sol;
}
const uniao = (a, b = []) => {
  const c = new C.Clipper();
  c.AddPaths(a, C.PolyType.ptSubject, true);
  if (b.length) c.AddPaths(b, C.PolyType.ptClip, true);
  const sol = new C.Paths();
  c.Execute(C.ClipType.ctUnion, sol, NZ, NZ);
  return sol;
};
const dif = (a, b) => clip(C.ClipType.ctDifference, a, b);
const inter = (a, b) => clip(C.ClipType.ctIntersection, a, b);
function offset(paths, mm, redondo = true) {
  if (!paths.length) return paths;
  const co = new C.ClipperOffset(2, 0.25 * ESC);   // arcos com 0,25 mm de erro: chega e poupa vértices
  co.AddPaths(paths, redondo ? C.JoinType.jtRound : C.JoinType.jtMiter, C.EndType.etClosedPolygon);
  const out = new C.Paths();
  co.Execute(out, mm * ESC);
  return out;
}
const area = (paths) => paths.reduce((s, q) => s + C.Clipper.Area(q), 0) / (ESC * ESC);
const semMigalhas = (paths) => paths.filter(q => Math.abs(C.Clipper.Area(q)) >= 0.5 * ESC * ESC);
/** Tira fitas de espessura ~0 (buracos e lascas em forma de risco) que os recortes deixam. */
const limpa = (paths) => semMigalhas(offset(offset(paths, -0.03, false), 0.03, false));

function caixa(paths) {
  let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
  for (const q of paths) for (const pt of q) {
    if (pt.X < a) a = pt.X; if (pt.X > c) c = pt.X;
    if (pt.Y < b) b = pt.Y; if (pt.Y > d) d = pt.Y;
  }
  if (!Number.isFinite(a)) return null;
  return { minX: a / ESC, minY: b / ESC, maxX: c / ESC, maxY: d / ESC, w: (c - a) / ESC, h: (d - b) / ESC };
}

/** Ilhas (cada anel exterior com os seus buracos) de uma região do Clipper. */
function ilhas(paths) {
  const c = new C.Clipper();
  c.AddPaths(paths, C.PolyType.ptSubject, true);
  const tree = new C.PolyTree();
  c.Execute(C.ClipType.ctUnion, tree, NZ, NZ);
  const out = [];
  const visitar = (no) => {
    for (const filho of no.Childs()) {
      if (!filho.IsHole()) {
        out.push([filho.Contour(), ...filho.Childs().map(h => h.Contour())]);
        for (const h of filho.Childs()) visitar(h);   // ilhas dentro de buracos (ex.: logótipo num anel)
      }
    }
  };
  visitar(tree);
  return out;
}

/**
 * Agrupa as ilhas da silhueta em letras: ilhas que se sobrepõem na horizontal (pontos, acentos)
 * juntam-se; ilhas minúsculas juntam-se à mais próxima.
 */
export function agruparLetras(silhueta, opt = LETRAS) {
  let grupos = ilhas(silhueta).map(p => ({ paths: p, area: area(p), bb: caixa(p) })).filter(g => g.bb && g.area > 0.01);
  if (grupos.length <= 1) return grupos.map(g => g.paths);
  const juntar = (i, j) => {
    const a = grupos[i], b = grupos[j];
    const paths = [...a.paths, ...b.paths];
    grupos[i] = { paths, area: a.area + b.area, bb: caixa(paths) };
    grupos.splice(j, 1);
  };
  // 1) sobreposição na horizontal (o ponto do i, acentos, cedilhas)
  let mudou = true;
  while (mudou) {
    mudou = false;
    for (let i = 0; i < grupos.length && !mudou; i++) for (let j = 0; j < grupos.length && !mudou; j++) {
      if (i === j) continue;
      const A = grupos[i].bb, B = grupos[j].bb;
      const sob = Math.min(A.maxX, B.maxX) - Math.max(A.minX, B.minX);
      const menor = Math.min(A.w, B.w);
      // só "empilhados": a sobreposição vertical é pequena (senão é um desenho dentro de outro)
      const sobY = Math.min(A.maxY, B.maxY) - Math.max(A.minY, B.minY);
      if (menor > 0 && sob >= opt.sobreposicao * menor && sobY < 0.5 * Math.min(A.h, B.h)) {
        const [g, p] = grupos[i].area >= grupos[j].area ? [i, j] : [j, i];
        juntar(g, p); mudou = true;
      }
    }
  }
  // 2) ilhas minúsculas → à mais próxima (distância entre centros das caixas)
  mudou = true;
  while (mudou && grupos.length > 1) {
    mudou = false;
    const k = grupos.findIndex(g => g.area < opt.areaMin);
    if (k < 0) break;
    const cx = (g) => [(g.bb.minX + g.bb.maxX) / 2, (g.bb.minY + g.bb.maxY) / 2];
    const [x, y] = cx(grupos[k]);
    let best = -1, bd = Infinity;
    grupos.forEach((g, i) => { if (i === k) return; const [a, b] = cx(g); const d = (a - x) ** 2 + (b - y) ** 2; if (d < bd) { bd = d; best = i; } });
    const keep = Math.min(best, k), drop = Math.max(best, k);
    juntar(keep, drop); mudou = true;
  }
  return grupos.map(g => g.paths);
}

/**
 * Partição de `regiao` (a fronteira da peça) pelas letras: cada ponto vai para a letra mais
 * próxima. Crescimento simultâneo em passos (ordem alternada a cada passo, para não favorecer
 * nenhuma letra nos empates).
 */
export function zonasDasLetras(regiao, letras, opt = LETRAS, alcanceMm = 14) {
  const bb = caixa(regiao);
  const diag = bb ? Math.hypot(bb.w, bb.h) : 0;
  // 1) o que só está ao alcance de UMA letra é dela, sem mais contas (a maior parte da peça);
  //    só as zonas disputadas (entre letras vizinhas, e o que fica longe de todas) crescem passo
  //    a passo — muito mais rápido do que crescer sobre a peça inteira.
  const cands = letras.map(l => inter(offset(l, alcanceMm), regiao));
  const cbb = cands.map(c => caixa(c));
  const toca = (a, b) => a && b && a.minX <= b.maxX && b.minX <= a.maxX && a.minY <= b.maxY && b.minY <= a.maxY;
  const ganhos = letras.map(() => []);
  for (let i = 0; i < letras.length; i++) {
    const outras = uniao(cands.filter((_, j) => j !== i && toca(cbb[i], cbb[j])).flat());
    const so = outras.length ? dif(cands[i], outras) : cands[i];
    if (so.length) ganhos[i].push(...so);
  }
  let resto = dif(regiao, uniao(ganhos.flat()));
  // 2) crescimento simultâneo nas zonas disputadas (ordem alternada a cada passo)
  let d = 0, k = 0;
  const longe = alcanceMm + opt.passo * 4;
  while (resto.length && area(resto) > 0.05 && d <= diag + opt.passoLonge) {
    const br = caixa(resto);
    const ordem = letras.map((_, i) => i);
    if (k % 2) ordem.reverse();
    for (const i of ordem) {
      if (!toca(cbb[i] && { minX: cbb[i].minX - d, maxX: cbb[i].maxX + d, minY: cbb[i].minY - d, maxY: cbb[i].maxY + d }, br)) continue;
      const alcance = d === 0 ? letras[i] : offset(letras[i], d);
      const ganho = inter(alcance, resto);
      if (!ganho.length) continue;
      ganhos[i].push(...ganho);
      resto = dif(resto, ganho);
      if (!resto.length) break;
    }
    d += d < longe ? opt.passo : opt.passoLonge;
    k++;
  }
  const zonas = ganhos.map(g => (g.length ? uniao(g) : []));
  // alisa os degraus da linha de corte (fecho + abertura de meio passo), mantendo a partição
  const lisas = zonas.map(z => offset(offset(z, opt.passo * 1.5), -opt.passo * 1.5));
  let livre = regiao;
  const out = lisas.map(z => { const r = inter(z, livre); livre = dif(livre, r); return r; });
  return arrumarParticao(out, regiao, livre);
}

/**
 * Cada zona fica só com as suas ilhas "a sério"; lascas soltas (dos empates e do alisamento,
 * normalmente ao longo da borda) e o que ficou por atribuir vão para a zona vizinha que mais
 * as toca.
 */
function arrumarParticao(zonas, regiao, sobra = []) {
  const orfas = [];
  if (sobra.length) orfas.push(...ilhas(sobra));
  const limpas = zonas.map(z => {
    const ils = ilhas(z).map(p => ({ p, a: area(p) }));
    const maior = Math.max(0, ...ils.map(x => x.a));
    const fica = [];
    for (const x of ils) (x.a >= Math.max(0.05 * maior, 1) ? fica : orfas).push(x.p);
    return uniao(fica.flat());
  });
  const caixas = limpas.map(z => caixa(z));
  const junta = limpas.map(() => []);
  for (const o of orfas) {
    if (Math.abs(area(o)) < 0.05) continue;   // riscos de área ~0 (erros numéricos): não contam
    const bo = caixa(o);
    if (!bo) continue;
    let best = -1, bv = 0;
    const perto = offset(o, 0.6, false);
    limpas.forEach((z, i) => {
      const b = caixas[i];
      if (!b || b.minX > bo.maxX + 1 || b.maxX < bo.minX - 1 || b.minY > bo.maxY + 1 || b.maxY < bo.minY - 1) return;
      const v = area(inter(perto, z));
      if (v > bv) { bv = v; best = i; }
    });
    if (best >= 0) junta[best].push(...o);
  }
  junta.forEach((o, i) => { if (o.length) limpas[i] = uniao(limpas[i], o); });
  // a união pode deixar pontos de contacto em comum: recorta pela ordem para garantir a partição
  let livre = regiao;
  return limpas.map(z => { const r = limpa(inter(z, livre)); livre = dif(livre, r); return r; });
}

/**
 * Zonas das duas metades da meia-madeira. Faixas S(i→j) = (zona i alargada lap mm) ∩ zona j, só
 * entre letras vizinhas. Metade de baixo: cada letra fica com a sua zona + as faixas para dentro
 * das letras SEGUINTES (e perde as faixas das anteriores); metade de cima: o contrário. Quando
 * duas faixas disputam o mesmo sítio (junções de três letras), fica a da letra mais à frente na
 * ordem. Por fim a folga (metade para cada lado) e limpeza de riscos de área ~0.
 */
function zonasMeiaMadeira(zonas, opt) {
  const n = zonas.length;
  const bbs = zonas.map(z => caixa(z));
  const perto = (a, b) => a && b && a.minX <= b.maxX + opt.lap && b.minX <= a.maxX + opt.lap && a.minY <= b.maxY + opt.lap && b.minY <= a.maxY + opt.lap;
  const largas = zonas.map(z => offset(z, opt.lap, false));
  const S = zonas.map(() => new Map());   // S[i].get(j) = faixa de i dentro de j
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (i === j || !perto(bbs[i], bbs[j])) continue;
    const f = inter(largas[i], zonas[j]);
    if (f.length && area(f) > 0.05) S[i].set(j, f);
  }
  const banda = (avanca) => {   // avanca(i, j): i avança para dentro de j nesta metade?
    // em cada zona j, as faixas que entram nela: a 1.ª pela ordem fica, as outras recortam-se
    const entra = zonas.map(() => []);
    for (let j = 0; j < n; j++) {
      let ocupado = [];
      for (let i = 0; i < n; i++) {
        const f = S[i].get(j);
        if (!f || !avanca(i, j)) continue;
        const g = ocupado.length ? dif(f, ocupado) : f;
        if (g.length) { entra[j].push({ i, g }); ocupado = uniao(ocupado, g); }
      }
      entra[j].ocupado = ocupado;
    }
    const res = zonas.map(() => []);
    for (let j = 0; j < n; j++) {
      res[j].push(...(entra[j].ocupado.length ? dif(zonas[j], entra[j].ocupado) : zonas[j]));
      for (const { i, g } of entra[j]) res[i].push(...g);
    }
    // folga: tudo recua folga/2 (fecha antes os riscos de área ~0 para não virarem frestas)
    const h2 = opt.folga / 2;
    return res.map(r => semMigalhas(offset(offset(uniao(r), 0.03, false), -(0.03 + h2), false)));
  };
  return {
    baixo: banda((i, j) => i < j),   // metade de baixo: avança para as letras seguintes
    cima: banda((i, j) => i > j),    // metade de cima: avança para as anteriores
  };
}

/** Segmentos das linhas de corte (mm) — fronteiras entre zonas, dentro da peça. */
function linhasDeCorte(zonas, regiao) {
  const dentro = offset(regiao, -0.4, false);
  const segs = [];
  for (const z of zonas) for (const q of z) {
    let atual = [];
    for (let k = 0; k <= q.length; k++) {
      const pt = q[k % q.length];
      // par-ímpar: dentro de um nº ímpar de anéis = dentro da peça (conta com buracos)
      const ok = dentro.reduce((n, dq) => n + (C.Clipper.PointInPolygon(pt, dq) !== 0 ? 1 : 0), 0) % 2 === 1;
      if (ok) atual.push([pt.X / ESC, pt.Y / ESC]);
      else { if (atual.length > 1) segs.push(atual); atual = []; }
    }
    if (atual.length > 1) segs.push(atual);
  }
  return segs;
}

/**
 * Plano da divisão por letras. `fronteira`: contorno exterior da peça; `silhueta`: o desenho sem
 * contorno (as letras). Devolve o mesmo formato do planoDivisao (ativo, bb, cabeInteira, blocos…)
 * com modo: 'letras'. Os blocos chamam-se L1, L2, … da esquerda para a direita.
 */
export function planoLetras({ fronteira, silhueta, mesaX, mesaY, params, opt = LETRAS }) {
  const bb = caixa(fronteira);
  if (!bb) return null;
  const modo = params?.dividir === 'nao' || params?.dividir === 0 || params?.dividir === false ? 'nao'
    : params?.dividir === 'sim' ? 'sim' : 'auto';
  const cabeInteira = (bb.w <= mesaX && bb.h <= mesaY) || (bb.w <= mesaY && bb.h <= mesaX);
  const base = { modo: 'letras', bb, cabeInteira, sugestao: { fx: [], fy: [] }, fx: [], fy: [], blocos: [], linhas: [] };
  if (modo === 'nao' || (modo === 'auto' && cabeInteira)) return { ...base, ativo: false };

  let letras = agruparLetras(silhueta ?? [], opt)
    .map(p => inter(p, fronteira))
    .filter(p => p.length);
  if (letras.length < 2) return { ...base, ativo: false, semLetras: true };
  // da esquerda para a direita (e de cima para baixo, em empate)
  letras = letras.map(p => ({ p, b: caixa(p) }))
    .sort((a, b) => (Math.abs(a.b.minX - b.b.minX) > 1 ? a.b.minX - b.b.minX : b.b.maxY - a.b.maxY))
    .map(x => x.p);

  const contorno = Number(params?.contorno);
  const zonas = zonasDasLetras(fronteira, letras, opt, (Number.isFinite(contorno) ? Math.max(2, contorno) : 12) + 2);
  const { baixo: zonaBaixo, cima: zonaCima } = zonasMeiaMadeira(zonas, opt);
  const mX = mesaX - MARGEM_MESA_LETRAS, mY = mesaY - MARGEM_MESA_LETRAS;
  const blocos = zonas.map((z, i) => {
    const b = caixa(inter(uniao(zonaBaixo[i], zonaCima[i]), fronteira)) ?? caixa(z) ?? bb;
    return {
      id: `L${i + 1}`, col: i, lin: 0,
      x0: b.minX, x1: b.maxX, y0: b.minY, y1: b.maxY, w: b.w, h: b.h,
      cabe: (b.w <= mX && b.h <= mY) || (b.w <= mY && b.h <= mX),
      zona: z, zonaBaixo: zonaBaixo[i], zonaCima: zonaCima[i],
    };
  });
  return { ...base, ativo: true, blocos, linhas: linhasDeCorte(zonas, fronteira) };
}

/** Fatias recortadas por uma zona 2D. */
function naZona(f, zona) {
  const r = semMigalhas(inter(f.regiao, zona));
  return r.length ? { ...f, regiao: r } : null;
}

/**
 * Fatias de uma peça para a letra `bloco`, com meia-madeira: abaixo de zCorte usa a zona de
 * baixo, acima a de cima. Sem zCorte (peças de cor soltas), só a zona da letra.
 */
export function fatiasDaLetra(fatias, bloco, zCorte = null) {
  const out = [];
  for (const f of fatias) {
    if (!f.regiao?.length) continue;
    if (zCorte == null) { const r = naZona(f, bloco.zona); if (r) out.push(r); continue; }
    if (f.z1 <= zCorte + 1e-6) { const r = naZona(f, bloco.zonaBaixo); if (r) out.push(r); continue; }
    if (f.z0 >= zCorte - 1e-6) { const r = naZona(f, bloco.zonaCima); if (r) out.push(r); continue; }
    const a = naZona({ ...f, z1: zCorte }, bloco.zonaBaixo); if (a) out.push(a);
    const b = naZona({ ...f, z0: zCorte }, bloco.zonaCima); if (b) out.push(b);
  }
  return out;
}

export function volumeLetra(fatias) {
  let v = 0;
  for (const f of fatias) for (const q of f.regiao ?? []) v += (C.Clipper.Area(q) / (ESC * ESC)) * (f.z1 - f.z0);
  return Math.abs(v);
}
