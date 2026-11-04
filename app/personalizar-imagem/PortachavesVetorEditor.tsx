'use client';

// Editor do porta-chaves de imagem a cores (generation_schema.engine = "vetor-cores").
//
// 1. O cliente carrega um SVG ou PNG/JPG → o backend separa as cores e devolve os
//    contornos de cada uma (/api/vetorizar).
// 2. Tudo o resto (tamanho, contorno, furo, alturas, modo AMS…) é calculado aqui no
//    browser com lib/vetorGeom.js — o MESMO código que gera o ficheiro final no
//    backend — por isso a pré-visualização em tempo real é exatamente o que sai.
//
//   Sem AMS, pausas ..... peça única: base numa cor + cada outra cor um nível acima,
//                         com uma pausa/troca de filamento no início de cada nível
//   Sem AMS, peças ...... base com encaixes + uma peça por cor, para imprimir à parte e colar
//   Com AMS ............. 3MF com cada cor numa parte (SVG ou PNG)
import { Suspense, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import DownloadStlButton from '@/components/DownloadStlButton';
// @ts-ignore — módulo JS partilhado com o backend (Maker_Pro_Docker_Prod/app/vetorGeom.js)
import { construirPecas, fatiasParaTriangulos } from '@/lib/vetorGeom';

type Vetor = {
  w: number; h: number; ehSvg: boolean;
  cores: { hex: string; fracao: number; aneis: number[][] }[];
  silhueta: number[][];
  ancoras: Record<string, [number, number]> | null;
};

type Pecas = {
  pecas: { nome: string; cor: string; solta?: boolean; fatias: { z0: number; z1: number; regiao: any[]; cor?: string }[] }[];
  largura: number; altura: number; alturaTotal: number; guia: string[]; avisos: string[];
  parametros: Record<string, any>;
};

type Props = {
  designId: string;
  nome: string;
  userId: string | null;
  canDownload: boolean;
  bloqueioMsg: string | null;
  downloadsInfo: { usados: number; limite: number } | null;
  onUpload: (file: File) => Promise<string>;
  onDownloadSuccess: () => void;
};

const PADRAO = {
  modo: 'sem_ams', num_cores: 2, remover_fundo: 1, tolerancia: 40,
  largura: 40, contorno: 2.5, espessura_base: 2, relevo: 1.2, acabamento: 'relevo',
  metodo: 'pausas', cor_base: 0, ordem: 'escuras_cima', furo_pos: 'cima', furo_d: 4.5, detalhe_min: 0.4, preencher_buracos: 1,
  encaixe: 0.6, folga: 0.2,
};

const FUROS: [string, string][] = [
  ['cima-esquerda', '↖'], ['cima', '↑'], ['cima-direita', '↗'], ['esquerda', '←'], ['direita', '→'], ['nenhum', 'Sem furo'],
];

const c = {
  bloco: { padding: 14, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 10 } as React.CSSProperties,
  titulo: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 } as React.CSSProperties,
  label: { display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#cbd5e1', marginBottom: 4 } as React.CSSProperties,
  ajuda: { fontSize: 11, color: '#8a96aa', lineHeight: 1.5, margin: 0 } as React.CSSProperties,
  seg: (ativo: boolean) => ({
    flex: 1, padding: '8px 6px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    border: `1px solid ${ativo ? '#3b82f6' : '#334155'}`, background: ativo ? 'rgba(59,130,246,0.15)' : 'transparent',
    color: ativo ? '#93c5fd' : '#94a3b8',
  }) as React.CSSProperties,
};

function Slider({ label, valor, min, max, passo, unidade = 'mm', onChange }: {
  label: string; valor: number; min: number; max: number; passo: number; unidade?: string; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div style={c.label}><span>{label}</span><span style={{ color: '#93c5fd', fontWeight: 700 }}>{String(valor).replace('.', ',')}{unidade ? ` ${unidade}` : ''}</span></div>
      <input type="range" min={min} max={max} step={passo} value={valor} onChange={e => onChange(Number(e.target.value))} style={{ width: '100%', accentColor: '#3b82f6' }} />
    </div>
  );
}

export default function PortachavesVetorEditor({ designId, nome, userId, canDownload, bloqueioMsg, downloadsInfo, onUpload, onDownloadSuccess }: Props) {
  const [p, setP] = useState<Record<string, any>>(PADRAO);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [nomeFicheiro, setNomeFicheiro] = useState('');
  const [vetor, setVetor] = useState<Vetor | null>(null);
  const [estado, setEstado] = useState<'idle' | 'upload' | 'vetor' | 'erro'>('idle');
  const [erro, setErro] = useState('');
  const [explodida, setExplodida] = useState(false);
  const set = (k: string, v: any) => setP(prev => ({ ...prev, [k]: v }));

  // ── Vetorização no backend (só quando muda a imagem ou a separação de cores) ──
  const pedido = useRef(0);
  useEffect(() => {
    if (!imagePath) return;
    const id = ++pedido.current;
    const t = setTimeout(async () => {
      setEstado('vetor'); setErro('');
      try {
        const r = await fetch('/api/auth/refresh', { method: 'POST' });
        const { access_token } = r.ok ? await r.json() : {};
        if (!access_token) throw new Error('Inicia sessão para processar a imagem.');
        const res = await fetch('/api/vetorizar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access_token}` },
          body: JSON.stringify({ image_path: imagePath, num_cores: p.num_cores, remover_fundo: p.remover_fundo, tolerancia: p.tolerancia }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? 'Erro ao processar a imagem.');
        if (id !== pedido.current) return;
        setVetor(json.vetor);
        setEstado('idle');
      } catch (e: any) {
        if (id !== pedido.current) return;
        setErro(e.message); setEstado('erro');
      }
    }, 350);
    return () => clearTimeout(t);
  }, [imagePath, p.num_cores, p.remover_fundo, p.tolerancia]);

  async function escolherFicheiro(file: File | undefined) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setErro('Ficheiro demasiado grande (máx. 8 MB).'); setEstado('erro'); return; }
    const ehSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
    setEstado('upload'); setErro(''); setVetor(null); setNomeFicheiro(file.name);
    try {
      const path = await onUpload(ehSvg && !file.type ? new File([file], file.name, { type: 'image/svg+xml' }) : file);
      setImagePath(path);
      // Valores de partida sensatos por tipo de ficheiro
      setP(prev => ({ ...prev, num_cores: ehSvg ? Math.max(prev.num_cores, 2) : prev.num_cores, cor_base: 0 }));
    } catch (e: any) {
      setErro(/mime|type|svg/i.test(e.message) ? 'O servidor recusou este tipo de ficheiro. Experimenta exportar como PNG.' : e.message);
      setEstado('erro');
    }
  }

  // ── Geometria no browser (instantânea) ──
  const pd = useDeferredValue(p);
  const resultado = useMemo<{ r: Pecas | null; erro: string }>(() => {
    if (!vetor) return { r: null, erro: '' };
    try { return { r: construirPecas(vetor, pd) as Pecas, erro: '' }; }
    catch (e: any) { return { r: null, erro: e.message }; }
  }, [vetor, pd]);
  const r = resultado.r;

  const nCores = vetor?.cores.length ?? p.num_cores;
  const pausas = p.modo === 'sem_ams' && p.metodo === 'pausas';
  const niveis = Math.max(1, nCores - 1);
  const descricaoModo = p.modo === 'ams'
    ? 'Ficheiro 3MF com a base e cada cor numa parte separada, já montadas. No slicer atribuis um filamento do AMS a cada parte.'
    : pausas
      ? nCores <= 2
        ? 'Peça única: a base numa cor e o desenho em relevo noutra. Uma pausa a meio da impressão para trocar o filamento (o guia diz a altura).'
        : `Peça única: a base numa cor e cada uma das outras ${niveis} cores um nível acima, com uma pausa por nível. Vista de cima fica com as cores certas; de lado vês degraus e riscas.`
      : 'Base com encaixes + uma peça por cor. Imprimes cada cor à parte, encaixas na base e colas.';
  const formato = p.modo === 'ams' ? '3MF' : 'ZIP';

  const paramsDownload = useMemo(() => ({ ...p, image_path: imagePath }), [p, imagePath]);

  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start', padding: '20px 24px 40px' }}>
      {/* ── Controlos ─────────────────────────────────────────────────────── */}
      <aside style={{ flex: '1 1 320px', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#f1f5f9' }}>{nome}</h3>

        <div style={c.bloco}>
          <p style={c.titulo}>1 · Imagem</p>
          <label style={{ ...c.seg(false), textAlign: 'center', padding: '14px 10px', borderStyle: 'dashed' }}>
            <input type="file" accept=".svg,image/svg+xml,image/png,image/jpeg,image/webp" style={{ display: 'none' }}
              onChange={e => { escolherFicheiro(e.target.files?.[0]); e.target.value = ''; }} disabled={!userId || estado === 'upload'} />
            {!userId ? '🔒 Inicia sessão para carregar' : estado === 'upload' ? 'A carregar…' : nomeFicheiro ? `📄 ${nomeFicheiro} — trocar` : '📁 Escolher SVG ou PNG'}
          </label>
          <p style={c.ajuda}>Funciona melhor com logótipos, silhuetas e desenhos de cores lisas. Fotografias não dão bom resultado.</p>
        </div>

        <div style={c.bloco}>
          <p style={c.titulo}>2 · A tua impressora</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={c.seg(p.modo === 'sem_ams')} onClick={() => set('modo', 'sem_ams')}>Sem AMS</button>
            <button type="button" style={c.seg(p.modo === 'ams')} onClick={() => set('modo', 'ams')}>Com AMS / multicor</button>
          </div>
          <p style={c.ajuda}>{vetor ? descricaoModo : 'Escolhe se a tua impressora troca de cor sozinha (AMS, MMU…) ou não.'}</p>
          {p.modo === 'sem_ams' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={c.seg(p.metodo === 'pausas')} onClick={() => set('metodo', 'pausas')}>Trocar filamento (pausas)</button>
              <button type="button" style={c.seg(p.metodo === 'pecas')} onClick={() => set('metodo', 'pecas')}>Peças para colar</button>
            </div>
          )}
          {p.modo === 'ams' && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={c.seg(p.acabamento === 'relevo')} onClick={() => set('acabamento', 'relevo')}>Cores em relevo</button>
              <button type="button" style={c.seg(p.acabamento === 'liso')} onClick={() => set('acabamento', 'liso')}>Superfície lisa</button>
            </div>
          )}
        </div>

        <div style={c.bloco}>
          <p style={c.titulo}>3 · Cores</p>
          <Slider label="Número de cores" valor={p.num_cores} min={1} max={6} passo={1} unidade="" onChange={v => set('num_cores', v)} />
          {vetor && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {vetor.cores.map((cor, i) => {
                const escolhivel = pausas && vetor.cores.length > 1;
                const baseAtual = p.cor_base >= 1 && p.cor_base <= vetor.cores.length ? p.cor_base : vetor.cores.length;
                const ativa = escolhivel && baseAtual === i + 1;
                return (
                  <button key={i} type="button" disabled={!escolhivel} onClick={() => set('cor_base', i + 1)}
                    title={escolhivel ? 'Usar esta cor na base' : cor.hex}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, background: 'transparent', border: 'none', cursor: escolhivel ? 'pointer' : 'default', padding: 0, fontFamily: 'inherit' }}>
                    <span style={{ width: 34, height: 34, borderRadius: 8, background: cor.hex, border: ativa ? '3px solid #3b82f6' : '1px solid #334155', boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }} />
                    <span style={{ fontSize: 10, color: '#8a96aa' }}>{Math.round(cor.fracao * 100)}%</span>
                  </button>
                );
              })}
            </div>
          )}
          {vetor && pausas && vetor.cores.length > 1 && <p style={c.ajuda}>Toca na cor da <strong>base</strong> (por omissão, a mais clara). As outras ficam em relevo.</p>}
          {vetor && pausas && vetor.cores.length > 2 && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={c.seg(p.ordem === 'escuras_cima')} onClick={() => set('ordem', 'escuras_cima')}>Escuras em cima</button>
              <button type="button" style={c.seg(p.ordem === 'claras_cima')} onClick={() => set('ordem', 'claras_cima')}>Claras em cima</button>
            </div>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1' }}>
            <input type="checkbox" checked={!!p.remover_fundo} onChange={e => set('remover_fundo', e.target.checked ? 1 : 0)} /> Remover o fundo da imagem
          </label>
          {!!p.remover_fundo && <Slider label="Sensibilidade do fundo" valor={p.tolerancia} min={10} max={120} passo={5} unidade="" onChange={v => set('tolerancia', v)} />}
        </div>

        <div style={c.bloco}>
          <p style={c.titulo}>4 · Tamanho e alturas</p>
          <Slider label="Largura do desenho" valor={p.largura} min={20} max={80} passo={1} onChange={v => set('largura', v)} />
          <Slider label="Contorno da base" valor={p.contorno} min={0} max={6} passo={0.5} onChange={v => set('contorno', v)} />
          <Slider label="Espessura da base" valor={p.espessura_base} min={1.2} max={5} passo={0.2} onChange={v => set('espessura_base', Math.round(v * 10) / 10)} />
          <Slider label={p.modo === 'ams' && p.acabamento === 'liso' ? 'Espessura das cores' : pausas && niveis > 1 ? 'Altura de cada nível' : 'Altura do relevo'} valor={p.relevo} min={0.4} max={3} passo={0.2} onChange={v => set('relevo', Math.round(v * 10) / 10)} />
        </div>

        <div style={c.bloco}>
          <p style={c.titulo}>5 · Furo para a argola</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {FUROS.map(([k, t]) => <button key={k} type="button" style={c.seg(p.furo_pos === k)} onClick={() => set('furo_pos', k)}>{t}</button>)}
          </div>
          {p.furo_pos !== 'nenhum' && <Slider label="Diâmetro do furo" valor={p.furo_d} min={3} max={8} passo={0.5} onChange={v => set('furo_d', v)} />}
        </div>

        <details style={c.bloco}>
          <summary style={{ ...c.titulo, cursor: 'pointer' }}>6 · Afinação</summary>
          <Slider label="Ignorar detalhes menores que" valor={p.detalhe_min} min={0} max={3} passo={0.1} unidade="mm²" onChange={v => set('detalhe_min', Math.round(v * 10) / 10)} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1' }}>
            <input type="checkbox" checked={!!p.preencher_buracos} onChange={e => set('preencher_buracos', e.target.checked ? 1 : 0)} /> Base sem buracos no meio
          </label>
          {p.modo === 'sem_ams' && p.metodo === 'pecas' && (
            <>
              <Slider label="Profundidade dos encaixes" valor={p.encaixe} min={0.4} max={1.2} passo={0.1} onChange={v => set('encaixe', Math.round(v * 10) / 10)} />
              <Slider label="Folga das peças" valor={p.folga} min={0} max={0.6} passo={0.05} onChange={v => set('folga', Math.round(v * 100) / 100)} />
            </>
          )}
        </details>

        {/* ── Download ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {downloadsInfo && (
            <div style={{ ...c.bloco, flexDirection: 'row', justifyContent: 'space-between', padding: '10px 14px' }}>
              <span style={{ fontSize: 12, color: '#8a96aa', fontWeight: 600 }}>Downloads este mês</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: downloadsInfo.usados >= downloadsInfo.limite ? '#f87171' : '#34d399' }}>{downloadsInfo.usados} / {downloadsInfo.limite}</span>
            </div>
          )}
          {bloqueioMsg && <a href="/pricing" style={{ textAlign: 'center', padding: '10px 14px', borderRadius: 10, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>🔒 {bloqueioMsg}</a>}
          {canDownload && r && imagePath && (
            <DownloadStlButton key={JSON.stringify(paramsDownload)} designId={designId} params={paramsDownload} onSuccess={onDownloadSuccess} label={`Download ${formato}`} />
          )}
        </div>
      </aside>

      {/* ── Pré-visualização ──────────────────────────────────────────────── */}
      <section style={{ flex: '2 1 420px', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
        <div style={{ position: 'relative', height: 520, borderRadius: 14, overflow: 'hidden', background: 'radial-gradient(circle at 50% 40%, #1e293b, #0b1220)', border: '1px solid #1e293b' }}>
          {r ? (
            <Canvas camera={{ position: [0, -75, 85], up: [0, 0, 1], fov: 40, near: 0.1, far: 2000 }} dpr={[1, 2]}>
              <ambientLight intensity={0.5} />
              <directionalLight position={[40, -40, 80]} intensity={1.1} />
              <Suspense fallback={null}><Environment preset="warehouse" /></Suspense>
              <Modelo r={r} explodida={explodida} />
              <OrbitControls makeDefault enableDamping target={[0, 0, 0]} />
            </Canvas>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a96aa', fontSize: 14, textAlign: 'center', padding: 24 }}>
              {estado === 'upload' ? 'A carregar a imagem…' : estado === 'vetor' ? 'A separar as cores…' : estado === 'erro' ? <span style={{ color: '#f87171' }}>{erro}</span> : resultado.erro ? <span style={{ color: '#f87171' }}>{resultado.erro}</span> : 'Carrega um SVG ou PNG para ver o porta-chaves em 3D.'}
            </div>
          )}
          {r && estado === 'vetor' && <div style={{ position: 'absolute', top: 12, left: 12, fontSize: 12, color: '#93c5fd', background: 'rgba(15,23,42,0.8)', padding: '6px 10px', borderRadius: 8 }}>A atualizar as cores…</div>}
          {r && (
            <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', background: 'rgba(15,23,42,0.8)', padding: '6px 10px', borderRadius: 8 }}>
                {r.largura.toFixed(1).replace('.', ',')} × {r.altura.toFixed(1).replace('.', ',')} × {r.alturaTotal.toFixed(1).replace('.', ',')} mm
              </span>
              {r.pecas.some(x => x.solta) && (
                <button type="button" onClick={() => setExplodida(v => !v)} style={{ ...c.seg(explodida), flex: 'none', background: 'rgba(15,23,42,0.85)' }}>
                  {explodida ? 'Montado' : 'Ver peças'}
                </button>
              )}
            </div>
          )}
        </div>

        {r && (
          <div style={c.bloco}>
            <p style={c.titulo}>O que vais receber ({formato})</p>
            {r.guia.map((g, i) => <p key={i} style={{ ...c.ajuda, color: '#cbd5e1' }}>{g}</p>)}
            {r.avisos.map((a, i) => <p key={`a${i}`} style={{ ...c.ajuda, color: '#fbbf24' }}>⚠ {a}</p>)}
          </div>
        )}
        {erro && r && <p style={{ color: '#f87171', fontSize: 13 }}>{erro}</p>}
      </section>
    </div>
  );
}

// ── Modelo 3D ────────────────────────────────────────────────────────────────

function Modelo({ r, explodida }: { r: Pecas; explodida: boolean }) {
  const p = r.parametros;
  // Peças soltas (sem AMS + PNG) aparecem montadas nos encaixes; "Ver peças" levanta-as.
  const zSolta = p.espessura_base - p.encaixe;
  const malhas = useMemo(() => {
    const out: { geo: THREE.BufferGeometry; cor: string; z: number }[] = [];
    let k = 0;
    for (const peca of r.pecas) {
      const z = peca.solta ? zSolta + (explodida ? 6 + 5 * k++ : 0) : 0;
      for (const f of peca.fatias) {
        const tri: number[] = fatiasParaTriangulos([f]);
        if (!tri.length) continue;
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(tri, 3));
        geo.computeVertexNormals();
        out.push({ geo, cor: f.cor ?? peca.cor, z });
      }
    }
    return out;
  }, [r, explodida, zSolta]);
  useEffect(() => () => malhas.forEach(m => m.geo.dispose()), [malhas]);

  return (
    // Z para cima, como na cama da impressora (a câmara usa up = +Z)
    <group>
      {malhas.map((m, i) => (
        <mesh key={i} geometry={m.geo} position={[0, 0, m.z]}>
          <meshStandardMaterial color={m.cor} roughness={0.55} metalness={0.05} />
        </mesh>
      ))}
    </group>
  );
}
