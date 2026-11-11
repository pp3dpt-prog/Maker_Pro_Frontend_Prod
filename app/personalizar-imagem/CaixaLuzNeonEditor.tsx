'use client';

// Editor da Caixa de Luz — Canal de Neon
// (generation_schema.engine = "caixa-luz-neon").
//
// Ao contrário da Caixa de Luz — Logótipo (que preenche uma silhueta),
// este segue uma LINHA (um nome/traço contínuo, ou qualquer SVG desenhado
// a linhas) e gera um canal simples em U para encaixar uma fita de neon
// LED flexível. Uma peça só, sem separação de cores — por isso não há
// vetorização por imagem (potrace) nem passo no servidor: o SVG é lido e
// processado aqui mesmo no browser com lib/vetorLinhas.js + lib/caixaLuzNeon.js
// — o MESMO código que gera o ficheiro no backend.
import { useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import DownloadStlButton from '@/components/DownloadStlButton';
// @ts-ignore — módulo JS partilhado com o backend (Maker_Pro_Docker_Prod/app/vetorLinhas.js)
import { vetorizarLinhasSvg } from '@/lib/vetorLinhas';
// @ts-ignore — módulo JS partilhado com o backend (Maker_Pro_Docker_Prod/app/caixaLuzNeon.js)
import { construirCaixaLuzNeon } from '@/lib/caixaLuzNeon';
import { PainelDivisao, PlanosCorte, deslocamentoBloco, PARAMS_REPOEM_CORTES, type Divisao, type Bloco } from './DivisaoBlocos';

type VetorLinhas = {
  w: number; h: number;
  linhas: { pontos: number[]; fechado: boolean }[];
  bbox: [number, number, number, number];
  avisos: string[];
};

type Resultado = {
  tris: number[];
  geo: { largura: number; largura_canal_mm: number; profundidade_canal_mm: number; parede_mm: number; espessura_fundo_mm: number; mesa_x_mm: number; mesa_y_mm: number };
  largura: number; altura: number; alturaTotal: number; avisos: string[];
  // divisão em blocos (lib/divisaoBlocos.js)
  divisao?: (Omit<Divisao, 'blocos'> & { blocos: (Bloco & { tris: number[] })[] }) | null;
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
  largura: 200, largura_canal_mm: 5, profundidade_canal_mm: 9, parede_mm: 2, espessura_fundo_mm: 2,
  mesa_x_mm: 256, mesa_y_mm: 256,
};

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

function Malha({ tris }: { tris: number[] }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(tris, 3));
    g.computeVertexNormals();
    return g;
  }, [tris]);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color="#5a8fd6" roughness={0.5} metalness={0.05} />
    </mesh>
  );
}

function Modelo({ res, separar }: { res: Resultado; separar: boolean }) {
  const d = res.divisao;
  // Z para cima, igual à cama da impressora
  if (separar && d?.ativo) {
    return <>{d.blocos.map(b => <group key={b.id} position={deslocamentoBloco(b, d)}><Malha tris={b.tris} /></group>)}</>;
  }
  return <><Malha tris={res.tris} /><PlanosCorte divisao={d} altura={res.alturaTotal} /></>;
}

export default function CaixaLuzNeonEditor({ designId, nome, userId, canDownload, bloqueioMsg, downloadsInfo, onUpload, onDownloadSuccess }: Props) {
  const [p, setP] = useState<Record<string, any>>(PADRAO);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [nomeFicheiro, setNomeFicheiro] = useState('');
  const [vetor, setVetor] = useState<VetorLinhas | null>(null);
  const [estado, setEstado] = useState<'idle' | 'upload' | 'erro'>('idle');
  const [erro, setErro] = useState('');
  const [separar, setSeparar] = useState(false);
  // mudar o tamanho/mesa/canal repõe a sugestão de cortes
  const set = (k: string, v: any) => setP(prev => ({ ...prev, [k]: v, ...(PARAMS_REPOEM_CORTES.includes(k) ? { cortes_x: undefined, cortes_y: undefined } : {}) }));

  async function escolherFicheiro(file: File | undefined) {
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { setErro('Ficheiro demasiado grande (máx. 4 MB).'); setEstado('erro'); return; }
    const ehSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
    if (!ehSvg) { setErro('Só SVG — este modelo precisa das linhas do desenho, não de pixels.'); setEstado('erro'); return; }
    setEstado('upload'); setErro(''); setVetor(null); setNomeFicheiro(file.name);
    setP(prev => ({ ...prev, cortes_x: undefined, cortes_y: undefined }));
    try {
      const texto = await file.text();
      const v = vetorizarLinhasSvg(texto) as VetorLinhas;
      setVetor(v);
      const path = await onUpload(file.type ? file : new File([file], file.name, { type: 'image/svg+xml' }));
      setImagePath(path);
      setEstado('idle');
    } catch (e: any) {
      setErro(e.message); setEstado('erro');
    }
  }

  // ── Geometria no browser (instantânea) ──
  const resultado = useMemo<{ res: Resultado | null; erro: string }>(() => {
    if (!vetor) return { res: null, erro: '' };
    try { return { res: construirCaixaLuzNeon(vetor, p) as Resultado, erro: '' }; }
    catch (e: any) { return { res: null, erro: e.message }; }
  }, [vetor, p]);
  const res = resultado.res;
  const paramsDownload = useMemo(() => ({ ...p, image_path: imagePath }), [p, imagePath]);

  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start', padding: '20px 24px 40px' }}>
      <aside style={{ flex: '1 1 320px', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#f1f5f9' }}>{nome}</h3>

        <div style={c.bloco}>
          <p style={c.titulo}>1 · Nome ou desenho (SVG de linhas)</p>
          <label style={{ ...c.seg(false), textAlign: 'center', padding: '14px 10px', borderStyle: 'dashed' }}>
            <input type="file" accept=".svg,image/svg+xml" style={{ display: 'none' }}
              onChange={e => { escolherFicheiro(e.target.files?.[0]); e.target.value = ''; }} disabled={!userId || estado === 'upload'} />
            {!userId ? '🔒 Inicia sessão para carregar' : estado === 'upload' ? 'A carregar…' : nomeFicheiro ? `📄 ${nomeFicheiro} — trocar` : '📁 Escolher SVG'}
          </label>
          <p style={c.ajuda}>
            Carrega um SVG com o nome ou desenho feito a LINHAS (um traço contínuo, como uma assinatura, ou qualquer desenho com &lt;path&gt;/&lt;polyline&gt; — não regiões preenchidas). O canal segue exatamente essas linhas.
          </p>
          <p style={c.ajuda}>Nota: SVGs com "transform" em grupos podem sair no sítio errado — achata os transforms no editor antes de carregar, se isso acontecer.</p>
        </div>

        <div style={c.bloco}>
          <p style={c.titulo}>2 · Tamanho</p>
          <Slider label="Largura/altura (maior lado)" valor={p.largura} min={30} max={900} passo={5} onChange={v => set('largura', v)} />
          <div style={{ display: 'flex', gap: 8 }}>
            <Slider label="Mesa X" valor={p.mesa_x_mm} min={100} max={500} passo={5} onChange={v => set('mesa_x_mm', v)} />
            <Slider label="Mesa Y" valor={p.mesa_y_mm} min={100} max={500} passo={5} onChange={v => set('mesa_y_mm', v)} />
          </div>
          <p style={c.ajuda}>Se a peça não couber, é dividida em blocos — sugerimos os cortes e podes ajustá-los.</p>
        </div>

        <PainelDivisao divisao={res?.divisao} p={p} set={set} />

        <div style={c.bloco}>
          <p style={c.titulo}>3 · Canal (para a fita de neon)</p>
          <Slider label="Largura do canal" valor={p.largura_canal_mm} min={3} max={8} passo={0.5} onChange={v => set('largura_canal_mm', v)} />
          <Slider label="Profundidade do canal" valor={p.profundidade_canal_mm} min={8} max={10} passo={0.5} onChange={v => set('profundidade_canal_mm', v)} />
          <Slider label="Espessura da parede" valor={p.parede_mm} min={1.2} max={4} passo={0.2} onChange={v => set('parede_mm', Math.round(v * 10) / 10)} />
          <Slider label="Espessura do fundo" valor={p.espessura_fundo_mm} min={1.2} max={4} passo={0.2} onChange={v => set('espessura_fundo_mm', Math.round(v * 10) / 10)} />
          <p style={c.ajuda}>Canal simples em U, aberto por cima — confirma estas medidas contra a tua fita de neon real (ex. 4x10mm) antes de produzir em série.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {downloadsInfo && (
            <div style={{ ...c.bloco, flexDirection: 'row', justifyContent: 'space-between', padding: '10px 14px' }}>
              <span style={{ fontSize: 12, color: '#8a96aa', fontWeight: 600 }}>Downloads este mês</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: downloadsInfo.usados >= downloadsInfo.limite ? '#f87171' : '#34d399' }}>{downloadsInfo.usados} / {downloadsInfo.limite}</span>
            </div>
          )}
          {bloqueioMsg && <a href="/pricing" style={{ textAlign: 'center', padding: '10px 14px', borderRadius: 10, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>🔒 {bloqueioMsg}</a>}
          {canDownload && res && imagePath && (
            <DownloadStlButton key={JSON.stringify(paramsDownload)} designId={designId} params={paramsDownload} onSuccess={onDownloadSuccess} label="Download STL" />
          )}
        </div>
      </aside>

      <section style={{ flex: '2 1 420px', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
        <div style={{ position: 'relative', height: 520, borderRadius: 14, overflow: 'hidden', background: 'radial-gradient(circle at 50% 40%, #1e293b, #0b1220)', border: '1px solid #1e293b' }}>
          {res ? (
            <Canvas camera={{ position: [0, -res.largura * 1.3 - 100, res.altura * 0.9 + 60], up: [0, 0, 1], fov: 40, near: 0.1, far: 3000 }} dpr={[1, 2]}>
              <ambientLight intensity={0.6} />
              <directionalLight position={[40, -40, 120]} intensity={0.9} />
              <Modelo res={res} separar={separar && !!res.divisao?.ativo} />
              <OrbitControls makeDefault enableDamping target={[0, 0, res.alturaTotal / 2]} />
            </Canvas>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a96aa', fontSize: 14, textAlign: 'center', padding: 24 }}>
              {estado === 'upload' ? 'A processar o SVG…' : estado === 'erro' ? <span style={{ color: '#f87171' }}>{erro}</span> : resultado.erro ? <span style={{ color: '#f87171' }}>{resultado.erro}</span> : 'Carrega um SVG com um nome ou desenho a linhas para ver o canal em 3D.'}
            </div>
          )}
          {res?.divisao?.ativo && (
            <div style={{ position: 'absolute', top: 10, left: 10 }}>
              <button type="button" onClick={() => setSeparar(v => !v)} style={{
                padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                border: `1px solid ${separar ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
                background: separar ? 'rgba(239,68,68,0.18)' : 'rgba(15,23,42,0.7)', color: separar ? '#fca5a5' : '#94a3b8',
              }}>✂ {separar ? 'Juntar blocos' : 'Separar blocos'}</button>
            </div>
          )}
          {res && (
            <div style={{ position: 'absolute', top: 10, right: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', background: 'rgba(15,23,42,0.8)', padding: '6px 10px', borderRadius: 8 }}>
                {res.largura.toFixed(0)} × {res.altura.toFixed(0)} × {res.alturaTotal.toFixed(0)} mm
              </span>
            </div>
          )}
        </div>

        {res && (
          <div style={c.bloco}>
            <p style={c.titulo}>O que vais receber</p>
            <p style={{ ...c.ajuda, color: '#cbd5e1' }}>{res.divisao?.ativo
              ? `${res.divisao.blocos.length} blocos (${res.divisao.blocos.map(b => `canal_${b.id}.stl`).join(', ')}) — colam-se topo a topo.`
              : 'canal.stl — uma peça só, com o fundo fechado e o canal aberto por cima, a toda a volta do traço.'}</p>
            {res.avisos.map((a, i) => <p key={i} style={{ ...c.ajuda, color: '#fbbf24' }}>⚠️ {a}</p>)}
          </div>
        )}
      </section>
    </div>
  );
}
