'use client';

// Divisão em blocos (peças maiores do que a mesa) — controlos e linhas de corte na pré-visualização.
// A geometria e a sugestão vêm de lib/divisaoBlocos.js (o MESMO código do backend): os cortes que
// o cliente vê e ajusta aqui são guardados em params.cortes_x / cortes_y (frações 0–1 da largura /
// altura da peça) e o servidor aplica-os tal e qual no download.
import * as THREE from 'three';
import { useMemo } from 'react';
// @ts-ignore — módulo JS partilhado com o backend (Maker_Pro_Docker_Prod/app/divisaoBlocos.js)
import { BLOCO_MIN } from '@/lib/divisaoBlocos';

export type Bloco = { id: string; col: number; lin: number; x0: number; x1: number; y0: number; y1: number; w: number; h: number; cabe: boolean };
export type Divisao = {
  ativo: boolean; cabeInteira: boolean;
  bb: { minX: number; minY: number; maxX: number; maxY: number; w: number; h: number };
  sugestao: { fx: number[]; fy: number[] };
  fx: number[]; fy: number[];
  blocos: Bloco[];
};

/** Parâmetros que, quando mudam, repõem a sugestão (os cortes antigos deixam de fazer sentido). */
export const PARAMS_REPOEM_CORTES = ['largura', 'contorno', 'forma_caixa', 'mesa_x_mm', 'mesa_y_mm', 'num_cores', 'remover_fundo', 'tolerancia', 'largura_canal_mm', 'parede_mm'];

const st = {
  bloco: { padding: 14, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 10 } as React.CSSProperties,
  titulo: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 } as React.CSSProperties,
  ajuda: { fontSize: 11, color: '#8a96aa', lineHeight: 1.5, margin: 0 } as React.CSSProperties,
  seg: (ativo: boolean) => ({
    flex: 1, padding: '7px 6px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    border: `1px solid ${ativo ? '#3b82f6' : '#334155'}`, background: ativo ? 'rgba(59,130,246,0.15)' : 'transparent',
    color: ativo ? '#93c5fd' : '#94a3b8',
  }) as React.CSSProperties,
  mini: { padding: '4px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: '1px solid #334155', background: 'transparent', color: '#cbd5e1' } as React.CSSProperties,
};

const fmt = (v: number) => v.toFixed(0);

/** Sliders de um eixo: posição de cada corte em mm a partir da esquerda (x) ou de baixo (y). */
function CortesEixo({ eixo, fr, comp, onChange }: { eixo: 'x' | 'y'; fr: number[]; comp: number; onChange: (f: number[]) => void }) {
  const nome = eixo === 'x' ? 'Corte vertical' : 'Corte horizontal';
  const origem = eixo === 'x' ? 'da esquerda' : 'de baixo';
  const mm = fr.map(f => f * comp);
  const mover = (i: number, v: number) => {
    const lo = (i === 0 ? 0 : mm[i - 1]) + BLOCO_MIN, hi = (i === mm.length - 1 ? comp : mm[i + 1]) - BLOCO_MIN;
    const n = [...mm]; n[i] = Math.max(lo, Math.min(hi, v));
    onChange(n.map(x => x / comp));
  };
  const remover = (i: number) => onChange(fr.filter((_, k) => k !== i));
  const adicionar = () => {
    // no meio do maior pedaço
    const xs = [0, ...mm, comp];
    let k = 0; for (let i = 1; i + 1 < xs.length; i++) if (xs[i + 1] - xs[i] > xs[k + 1] - xs[k]) k = i;
    if (xs[k + 1] - xs[k] < 2 * BLOCO_MIN) return;
    onChange([...mm, (xs[k] + xs[k + 1]) / 2].sort((a, b) => a - b).map(x => x / comp));
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {mm.map((v, i) => (
        <div key={i}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#cbd5e1', marginBottom: 2 }}>
            <span>{nome} {i + 1} <span style={{ color: '#8a96aa' }}>({origem})</span></span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ color: '#f87171', fontWeight: 700 }}>{fmt(v)} mm</span>
              <button type="button" style={st.mini} onClick={() => remover(i)} title="Remover este corte">✕</button>
            </span>
          </div>
          <input type="range" min={0} max={comp} step={0.5} value={v} onChange={e => mover(i, Number(e.target.value))} style={{ width: '100%', accentColor: '#ef4444' }} />
        </div>
      ))}
      {comp >= 2 * BLOCO_MIN && <button type="button" style={st.mini} onClick={adicionar}>+ {nome.toLowerCase()}</button>}
    </div>
  );
}

export function PainelDivisao({ divisao, p, set }: { divisao: Divisao | null | undefined; p: Record<string, any>; set: (k: string, v: any) => void }) {
  if (!divisao?.bb) return null;
  const modo = p.dividir === 'sim' || p.dividir === 'nao' ? p.dividir : 'auto';
  const manual = Array.isArray(p.cortes_x) || Array.isArray(p.cortes_y);
  const mostrar = divisao.ativo || !divisao.cabeInteira || modo === 'sim';
  const setCortes = (fx: number[], fy: number[]) => { set('cortes_x', fx); set('cortes_y', fy); };
  return (
    <div style={st.bloco}>
      <p style={st.titulo}>Divisão em blocos</p>
      <div style={{ display: 'flex', gap: 6 }}>
        {([['auto', 'Se não couber'], ['sim', 'Dividir sempre'], ['nao', 'Não dividir']] as const).map(([k, t]) => (
          <button key={k} type="button" style={st.seg(modo === k)} onClick={() => set('dividir', k)}>{t}</button>
        ))}
      </div>
      {!mostrar ? (
        <p style={st.ajuda}>A peça cabe inteira na mesa ({fmt(divisao.bb.w)} × {fmt(divisao.bb.h)} mm).</p>
      ) : modo === 'nao' ? (
        <p style={{ ...st.ajuda, color: '#fbbf24' }}>A peça ({fmt(divisao.bb.w)} × {fmt(divisao.bb.h)} mm) não cabe na mesa e não vai ser dividida.</p>
      ) : (
        <>
          <p style={st.ajuda}>
            {manual ? 'Cortes ajustados por ti.' : 'Cortes sugeridos: o mínimo de blocos que cabe na mesa, onde a peça é mais estreita e sem partir as cores.'}
            {' '}As linhas vermelhas na pré-visualização mostram onde fica cada corte; todas as peças (corpo, tampa, frente e cores) são cortadas pelas mesmas linhas.
          </p>
          <CortesEixo eixo="x" fr={divisao.fx} comp={divisao.bb.w} onChange={fx => setCortes(fx, divisao.fy)} />
          <CortesEixo eixo="y" fr={divisao.fy} comp={divisao.bb.h} onChange={fy => setCortes(divisao.fx, fy)} />
          {manual && <button type="button" style={st.mini} onClick={() => { set('cortes_x', undefined); set('cortes_y', undefined); }}>↺ Repor a sugestão</button>}
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#cbd5e1' }}>
            <input type="checkbox" checked={!(p.encaixes_blocos === 0 || p.encaixes_blocos === false)} onChange={e => set('encaixes_blocos', e.target.checked ? 1 : 0)} style={{ marginTop: 2 }} />
            <span>Encaixes nas juntas <span style={{ color: '#8a96aa' }}>— rabos de andorinha na frente e na tampa, dentes a 45° nas paredes (alinham e seguram os blocos, sem peças por trás a fazer sombra). Vê-os em "Separar blocos".</span></span>
          </label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {divisao.blocos.map(b => (
              <span key={b.id} style={{ fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 6, border: `1px solid ${b.cabe ? '#14532d' : '#7f1d1d'}`, color: b.cabe ? '#86efac' : '#fca5a5', background: b.cabe ? 'rgba(22,163,74,0.1)' : 'rgba(220,38,38,0.12)' }}>
                {b.id} · {fmt(b.w)}×{fmt(b.h)} {b.cabe ? '✓' : '✗'}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Planos vermelhos translúcidos nos cortes (coordenadas da peça, z para cima de 0 a `altura`). */
export function PlanosCorte({ divisao, altura }: { divisao: Divisao | null | undefined; altura: number }) {
  const planos = useMemo(() => {
    if (!divisao?.ativo) return [];
    const { bb } = divisao, m = 6, out: { pos: [number, number, number]; tam: [number, number, number] }[] = [];
    for (const f of divisao.fx) out.push({ pos: [bb.minX + f * bb.w, (bb.minY + bb.maxY) / 2, altura / 2], tam: [0.4, bb.h + 2 * m, altura + 2 * m] });
    for (const f of divisao.fy) out.push({ pos: [(bb.minX + bb.maxX) / 2, bb.minY + f * bb.h, altura / 2], tam: [bb.w + 2 * m, 0.4, altura + 2 * m] });
    return out;
  }, [divisao, altura]);
  return (
    <>
      {planos.map((pl, i) => (
        <mesh key={i} position={pl.pos}>
          <boxGeometry args={pl.tam} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.35} depthWrite={false} side={THREE.DoubleSide} toneMapped={false} />
        </mesh>
      ))}
    </>
  );
}

/** Deslocamento de um bloco na vista "separar blocos" (afasta-os do centro). */
export function deslocamentoBloco(b: Bloco, divisao: Divisao, gap = 14): [number, number, number] {
  const nCols = Math.max(...divisao.blocos.map(x => x.col)) + 1, nLins = Math.max(...divisao.blocos.map(x => x.lin)) + 1;
  return [(b.col - (nCols - 1) / 2) * gap, -(b.lin - (nLins - 1) / 2) * gap, 0];
}
