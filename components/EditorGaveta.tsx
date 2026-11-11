'use client';

// Editor da disposição do organizador de gaveta (widget "gaveta_layout" do generation_schema).
// O cliente escolhe módulos de uma lista, arrasta-os na gaveta (vista de cima, frente em baixo),
// muda o tamanho pela pega do canto e afina medidas/divisórias no painel do módulo.
// Guarda a lista em values.modulos — ver lib/organizadorGaveta.ts.

import { useMemo, useRef, useState } from 'react';
import {
  type Modulo, PRESETS, SNAP, MIN_MOD, MAX_MODULOS, lerModulos, medidasGaveta, moduloValido, cabe,
  lugarLivre, preencherLivre, ocupacao, iman, COR_MODULO,
} from '@/lib/organizadorGaveta';

type Props = {
  values: Record<string, any>;
  onChange: (v: Record<string, any>) => void;
  param: string;               // nome do parâmetro (normalmente "modulos")
};

const btn: React.CSSProperties = {
  padding: '6px 10px', borderRadius: 8, border: '1px solid #1f2937', background: '#0f172a', color: '#e2e8f0',
  fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
};
const inp: React.CSSProperties = {
  width: '100%', padding: '6px 8px', background: '#020617', border: '1px solid #1f2937', borderRadius: 6,
  color: 'white', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box',
};

export default function EditorGaveta({ values, onChange, param }: Props) {
  const { GW, GD } = medidasGaveta(values);
  const mods = useMemo(() => lerModulos(values[param]), [values, param]);
  const [sel, setSel] = useState<number>(-1);
  const [aviso, setAviso] = useState('');
  const svgRef = useRef<SVGSVGElement | null>(null);
  const drag = useRef<{ i: number; modo: 'mover' | 'tamanho'; px: number; py: number; m0: Modulo } | null>(null);

  const guardar = (novos: Modulo[], novoSel = sel) => {
    onChange({ ...values, [param]: novos.map((m) => m.map((v) => Math.round(v * 10) / 10)) });
    setSel(novoSel);
  };

  const foraDaGaveta = mods.filter((m) => !moduloValido(m, GW, GD)).length;
  const ocup = ocupacao(mods.filter((m) => moduloValido(m, GW, GD)), GW, GD);
  const s = mods[sel];

  // mm → coordenadas do SVG: frente da gaveta em baixo
  const pad = 6;
  const vbW = GW + 2 * pad, vbH = GD + 2 * pad;
  const sx = (x: number) => x + pad;
  const sy = (y: number, d = 0) => GD - y - d + pad;

  const pontoMm = (e: React.PointerEvent) => {
    const svg = svgRef.current!;
    const r = svg.getBoundingClientRect();
    const k = vbW / r.width;
    return { x: (e.clientX - r.left) * k - pad, y: GD - ((e.clientY - r.top) * k - pad) };
  };

  function adicionar(p: (typeof PRESETS)[number]) {
    if (mods.length >= MAX_MODULOS) { setAviso(`Máximo de ${MAX_MODULOS} módulos.`); return; }
    const w = Math.min(p.w, GW), d = Math.min(p.d, GD);
    const lugar = lugarLivre(mods, w, d, GW, GD);
    if (!lugar) { setAviso(`Não há espaço livre para um módulo ${p.nome.toLowerCase()} (${w}×${d} mm). Reduz ou move outros módulos.`); return; }
    setAviso('');
    guardar([...mods, [lugar[0], lugar[1], w, d, p.dx, p.dy, p.tipo]], mods.length);
  }

  function inicio(e: React.PointerEvent, i: number, modo: 'mover' | 'tamanho') {
    e.stopPropagation();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const p = pontoMm(e);
    drag.current = { i, modo, px: p.x, py: p.y, m0: [...mods[i]] as Modulo };
    setSel(i); setAviso('');
  }
  function mover(e: React.PointerEvent) {
    const d = drag.current; if (!d) return;
    const p = pontoMm(e);
    const dx = p.x - d.px, dy = p.y - d.py;
    const outros = mods.filter((_, k) => k !== d.i);
    const m: Modulo = [...d.m0] as Modulo;
    if (d.modo === 'mover') {
      const ax = [0, GW - m[2], ...outros.flatMap((o) => [o[0] + o[2], o[0] - m[2], o[0]])];
      const ay = [0, GD - m[3], ...outros.flatMap((o) => [o[1] + o[3], o[1] - m[3], o[1]])];
      m[0] = Math.min(Math.max(iman(d.m0[0] + dx, ax), 0), GW - m[2]);
      m[1] = Math.min(Math.max(iman(d.m0[1] + dy, ay), 0), GD - m[3]);
    } else {
      // pega no canto de trás-direita: muda largura e profundidade
      const ax = [GW, ...outros.flatMap((o) => [o[0], o[0] + o[2]])];
      const ay = [GD, ...outros.flatMap((o) => [o[1], o[1] + o[3]])];
      m[2] = Math.max(MIN_MOD, Math.min(iman(d.m0[0] + d.m0[2] + dx, ax), GW) - m[0]);
      m[3] = Math.max(MIN_MOD, Math.min(iman(d.m0[1] + d.m0[3] + dy, ay), GD) - m[1]);
    }
    if (cabe(mods, m, GW, GD, d.i)) {
      const novos = [...mods]; novos[d.i] = m;
      onChange({ ...values, [param]: novos });
    }
  }
  const fim = () => { drag.current = null; };

  function mudar(campo: 2 | 3 | 4 | 5 | 6, valor: number) {
    if (!s) return;
    const m: Modulo = [...s] as Modulo;
    if (campo === 2) m[2] = Math.max(MIN_MOD, Math.min(valor, GW - m[0]));
    else if (campo === 3) m[3] = Math.max(MIN_MOD, Math.min(valor, GD - m[1]));
    else if (campo === 4 || campo === 5) m[campo] = Math.max(1, Math.min(10, Math.round(valor)));
    else m[6] = valor ? 1 : 0;
    if (campo <= 3 && !cabe(mods, m, GW, GD, sel)) { setAviso('Esse tamanho sobrepõe outro módulo: move-o primeiro ou reduz o vizinho.'); return; }
    setAviso('');
    const novos = [...mods]; novos[sel] = m; guardar(novos);
  }

  function duplicar() {
    if (!s) return;
    const lugar = lugarLivre(mods, s[2], s[3], GW, GD);
    if (!lugar) { setAviso('Não há espaço livre para duplicar este módulo.'); return; }
    guardar([...mods, [lugar[0], lugar[1], s[2], s[3], s[4], s[5], s[6]]], mods.length);
  }
  const apagar = () => { if (s) guardar(mods.filter((_, k) => k !== sel), -1); };
  const preencher = () => {
    const validos = mods.filter((m) => moduloValido(m, GW, GD));
    const novos = preencherLivre(validos, GW, GD, 100);
    setAviso(novos.length === validos.length ? 'Não há espaço livre para preencher.' : '');
    guardar(novos, -1);
  };
  const ajustar = () => guardar(mods.filter((m) => moduloValido(m, GW, GD)), -1);

  return (
    <div className="space-y-2">
      <label className="block text-xs text-slate-300 font-medium">Escolhe os módulos (entram no primeiro lugar livre)</label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
        {PRESETS.map((p) => (
          <button key={p.id} type="button" onClick={() => adicionar(p)} style={{ ...btn, textAlign: 'left', padding: '7px 9px' }} title={p.nota}>
            <div style={{ fontSize: 12 }}>＋ {p.nome}</div>
            <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 500 }}>{p.w}×{p.d} mm · {p.nota}</div>
          </button>
        ))}
      </div>

      <div style={{ background: '#020617', border: '1px solid #1f2937', borderRadius: 8, padding: 4 }}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${vbW} ${vbH}`}
          style={{ width: '100%', height: 'auto', display: 'block', touchAction: 'none', userSelect: 'none' }}
          onPointerMove={mover} onPointerUp={fim} onPointerLeave={fim}
          onPointerDown={() => setSel(-1)}
        >
          <rect x={pad} y={pad} width={GW} height={GD} fill="#0b1220" stroke="#475569" strokeWidth={Math.max(GW, GD) / 300} />
          {/* grelha de 50 mm */}
          {Array.from({ length: Math.floor(GW / 50) }, (_, i) => (i + 1) * 50).filter((x) => x < GW).map((x) => (
            <line key={`gx${x}`} x1={sx(x)} x2={sx(x)} y1={pad} y2={pad + GD} stroke="#1e293b" strokeWidth={Math.max(GW, GD) / 500} />
          ))}
          {Array.from({ length: Math.floor(GD / 50) }, (_, i) => (i + 1) * 50).filter((y) => y < GD).map((y) => (
            <line key={`gy${y}`} y1={sy(y)} y2={sy(y)} x1={pad} x2={pad + GW} stroke="#1e293b" strokeWidth={Math.max(GW, GD) / 500} />
          ))}
          {mods.map((m, i) => {
            const ok = moduloValido(m, GW, GD);
            const fonte = Math.max(7, Math.min(m[2], m[3]) / 5);
            return (
              <g key={i}>
                <rect
                  x={sx(m[0]) + 0.6} y={sy(m[1], m[3]) + 0.6} width={Math.max(m[2] - 1.2, 1)} height={Math.max(m[3] - 1.2, 1)} rx={3}
                  fill={ok ? COR_MODULO(i) : '#7f1d1d'} fillOpacity={i === sel ? 0.95 : 0.7}
                  stroke={i === sel ? '#f59e0b' : '#0f172a'} strokeWidth={i === sel ? Math.max(GW, GD) / 140 : Math.max(GW, GD) / 400}
                  style={{ cursor: 'move' }}
                  onPointerDown={(e) => inicio(e, i, 'mover')}
                />
                {Array.from({ length: m[4] - 1 }, (_, k) => sx(m[0]) + ((k + 1) * m[2]) / m[4]).map((x) => (
                  <line key={`dx${x}`} x1={x} x2={x} y1={sy(m[1], m[3]) + 2} y2={sy(m[1]) - 2} stroke="#0f172a" strokeWidth={1} pointerEvents="none" />
                ))}
                {Array.from({ length: m[5] - 1 }, (_, k) => sy(m[1]) - ((k + 1) * m[3]) / m[5]).map((y) => (
                  <line key={`dy${y}`} y1={y} y2={y} x1={sx(m[0]) + 2} x2={sx(m[0]) + m[2] - 2} stroke="#0f172a" strokeWidth={1} pointerEvents="none" />
                ))}
                <text x={sx(m[0]) + m[2] / 2} y={sy(m[1], m[3]) + m[3] / 2} fontSize={fonte} fill="white" textAnchor="middle" dominantBaseline="middle" pointerEvents="none" style={{ fontWeight: 700 }}>
                  {Math.round(m[2])}×{Math.round(m[3])}{m[6] === 1 ? ' ◡' : ''}
                </text>
                {i === sel && (
                  <rect
                    x={sx(m[0]) + m[2] - Math.max(8, GW / 40)} y={sy(m[1], m[3])} width={Math.max(8, GW / 40)} height={Math.max(8, GW / 40)}
                    fill="#f59e0b" style={{ cursor: 'nwse-resize' }}
                    onPointerDown={(e) => inicio(e, i, 'tamanho')}
                  />
                )}
              </g>
            );
          })}
          <text x={pad + GW / 2} y={vbH - 1} fontSize={Math.max(8, GW / 40)} fill="#64748b" textAnchor="middle">frente da gaveta</text>
        </svg>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        <button type="button" style={btn} onClick={preencher}>▦ Preencher espaço livre</button>
        <button type="button" style={btn} onClick={() => guardar([], -1)}>Limpar</button>
        <span style={{ fontSize: 11, color: ocup > 0.97 ? '#4ade80' : '#94a3b8', marginLeft: 'auto' }}>
          {mods.length} módulos · {Math.round(ocup * 100)}% da gaveta
        </span>
      </div>
      {foraDaGaveta > 0 && (
        <div style={{ fontSize: 12, color: '#fca5a5' }}>
          {foraDaGaveta} módulo(s) já não cabem na gaveta (a vermelho) e não serão gerados.{' '}
          <button type="button" style={{ ...btn, padding: '2px 8px' }} onClick={ajustar}>Remover</button>
        </div>
      )}
      {aviso && <div style={{ fontSize: 12, color: '#fbbf24' }}>{aviso}</div>}

      {s ? (
        <div style={{ border: '1px solid #1f2937', borderRadius: 8, padding: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ gridColumn: '1 / -1', fontSize: 12, color: '#cbd5e1', fontWeight: 700 }}>Módulo selecionado</div>
          <label style={{ fontSize: 11, color: '#94a3b8' }}>Largura (mm)
            <input style={inp} type="number" min={MIN_MOD} step={SNAP} value={Math.round(s[2])} onChange={(e) => mudar(2, Number(e.target.value))} />
          </label>
          <label style={{ fontSize: 11, color: '#94a3b8' }}>Profundidade (mm)
            <input style={inp} type="number" min={MIN_MOD} step={SNAP} value={Math.round(s[3])} onChange={(e) => mudar(3, Number(e.target.value))} />
          </label>
          <label style={{ fontSize: 11, color: '#94a3b8' }}>Divisões na largura
            <input style={inp} type="number" min={1} max={10} value={s[4]} onChange={(e) => mudar(4, Number(e.target.value))} />
          </label>
          <label style={{ fontSize: 11, color: '#94a3b8' }}>Divisões na profundidade
            <input style={inp} type="number" min={1} max={10} value={s[5]} onChange={(e) => mudar(5, Number(e.target.value))} />
          </label>
          <label style={{ gridColumn: '1 / -1', fontSize: 12, color: '#cbd5e1', display: 'flex', gap: 8, alignItems: 'center' }}>
            <input type="checkbox" checked={s[6] === 1} onChange={(e) => mudar(6, e.target.checked ? 1 : 0)} />
            Fundo côncavo na frente (tirar peças pequenas com o dedo)
          </label>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 6 }}>
            <button type="button" style={btn} onClick={duplicar}>Duplicar</button>
            <button type="button" style={{ ...btn, color: '#fca5a5' }} onClick={apagar}>Apagar</button>
          </div>
        </div>
      ) : (
        <div style={{ fontSize: 11, color: '#64748b' }}>
          Arrasta os módulos para os mudar de sítio; seleciona um para mudar o tamanho (pega laranja), as divisórias ou o fundo. Os módulos encostam sozinhos às paredes e uns aos outros.
        </div>
      )}
    </div>
  );
}
