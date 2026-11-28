'use client';

// Editor da Termoformagem (generation_schema.engine = "termoformagem"):
//  • modelo "kit"     (gerador termoformagem-molde)   — molde macho + fêmea + moldura em 2 peças
//  • modelo "enfeite" (gerador termoformagem-enfeite) — enfeite em 2 metades com folha em rede,
//    lingueta com rosca e parafuso com argola
//
// A forma vem de uma FORMA PRONTA (lib/formasTermo.js) ou de uma imagem/SVG carregada (o backend
// vetoriza em /api/vetorizar; com várias cores, as cores podem sair em relevo). Toda a geometria é
// calculada aqui no browser com lib/termoformagem.js — o MESMO código que gera os STL no backend —
// por isso a pré-visualização é exatamente o que sai.
import { Suspense, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import DownloadStlButton from '@/components/DownloadStlButton';
// @ts-ignore — módulo JS partilhado com o backend (Maker_Pro_Docker_Prod/app/termoformagem.js)
import { gerarTermoformagem } from '@/lib/termoformagem';
// @ts-ignore — módulo JS partilhado com o backend (Maker_Pro_Docker_Prod/app/formasTermo.js)
import { LISTA_FORMAS } from '@/lib/formasTermo';

type Vetor = {
  w: number; h: number;
  cores: { hex: string; fracao: number; aneis: number[][] }[];
  silhueta: number[][];
  ancoras: Record<string, [number, number]> | null;
};
type Peca = { id: string; ficheiro: string; nome: string; cor: string; tris: number[] };
type Resultado = {
  g: Record<string, any>;
  pecas: Peca[];
  formada: number[];
  avisos: string[];
  origem: 'imagem' | 'pronta';
  info: { hx: number; hy: number; Hf: number; nVent: number; simetrica?: boolean; larguraForma: number; alturaForma: number; temRelevo?: boolean; parafusoMm?: number };
};

type Props = {
  designId: string;
  nome: string;
  modelo: 'kit' | 'enfeite';
  userId: string | null;
  canDownload: boolean;
  bloqueioMsg: string | null;
  downloadsInfo: { usados: number; limite: number } | null;
  onUpload: (file: File) => Promise<string>;
  onDownloadSuccess: () => void;
};

const PADRAO_KIT = {
  fonte: 'pronta', forma: 'coracao', num_cores: 1, remover_fundo: 1, tolerancia: 40,
  largura_mm: 60, altura_mm: 20, perfil: 'saida', draft_graus: 5, raio_topo_mm: 1.5, relevo_mm: 0,
  espessura_chapa_mm: 0.5, contorno_mm: 10, espessura_base_mm: 4, pinos: 1,
  furo_ventilacao_mm: 1.2, espaco_ventilacao_mm: 8, moldura_largura_mm: 18, espessura_moldura_mm: 4,
};
const PADRAO_ENFEITE = {
  fonte: 'pronta', forma: 'bola_natal', num_cores: 1, remover_fundo: 1, tolerancia: 40,
  largura_mm: 80, altura_mm: 18, espessura_folha_mm: 0.8, aba_mm: 6, celula_mm: 6, haste_mm: 1.2,
  altura_rosca_mm: 5, contorno_mm: 14, espessura_base_mm: 4, pinos: 1, furo_ventilacao_mm: 1.2, espaco_ventilacao_mm: 8,
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
  chip: (ativo: boolean) => ({
    padding: '6px 4px', borderRadius: 8, fontSize: 11, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
    border: `1px solid ${ativo ? '#3b82f6' : '#334155'}`, background: ativo ? 'rgba(59,130,246,0.15)' : 'transparent', color: ativo ? '#93c5fd' : '#94a3b8',
  }) as React.CSSProperties,
  vista: (ativo: boolean) => ({
    padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
    border: `1px solid ${ativo ? '#3b82f6' : 'rgba(255,255,255,0.15)'}`,
    background: ativo ? 'rgba(59,130,246,0.18)' : 'rgba(15,23,42,0.7)', color: ativo ? '#93c5fd' : '#94a3b8',
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

const arred = (v: number, casas = 1) => Math.round(v * 10 ** casas) / 10 ** casas;

export default function TermoformagemEditor({ designId, nome, modelo, userId, canDownload, bloqueioMsg, downloadsInfo, onUpload, onDownloadSuccess }: Props) {
  const enfeite = modelo === 'enfeite';
  const [p, setP] = useState<Record<string, any>>(enfeite ? PADRAO_ENFEITE : PADRAO_KIT);
  const set = (k: string, v: any) => setP(prev => ({ ...prev, [k]: v }));
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [nomeFicheiro, setNomeFicheiro] = useState('');
  const [vetor, setVetor] = useState<Vetor | null>(null);
  const [estado, setEstado] = useState<'idle' | 'upload' | 'vetor' | 'erro'>('idle');
  const [erro, setErro] = useState('');
  const [vista, setVista] = useState<'molde' | 'final' | 'pecas'>('molde');
  const [aberto, setAberto] = useState(true);

  // vetorização (só com imagem): relevo precisa de várias cores
  const pedido = useState(() => ({ current: 0 }))[0];
  const numCores = !enfeite && Number(p.relevo_mm) > 0 ? Math.max(2, Number(p.num_cores)) : 1;
  useEffect(() => {
    if (!imagePath || p.fonte !== 'imagem') return;
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
          body: JSON.stringify({ image_path: imagePath, num_cores: numCores, remover_fundo: p.remover_fundo, tolerancia: p.tolerancia }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(json.error ?? 'Erro ao processar a imagem.');
        if (id !== pedido.current) return;
        setVetor(json.vetor); setEstado('idle');
      } catch (e: any) {
        if (id !== pedido.current) return;
        setErro(e.message); setEstado('erro');
      }
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagePath, p.fonte, numCores, p.remover_fundo, p.tolerancia]);

  async function escolherFicheiro(file: File | undefined) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setErro('Ficheiro demasiado grande (máx. 8 MB).'); setEstado('erro'); return; }
    const ehSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
    setEstado('upload'); setErro(''); setVetor(null); setNomeFicheiro(file.name);
    try {
      const path = await onUpload(ehSvg && !file.type ? new File([file], file.name, { type: 'image/svg+xml' }) : file);
      setImagePath(path);
      set('fonte', 'imagem');
    } catch (e: any) {
      setErro(/mime|type|svg/i.test(e.message) ? 'O servidor recusou este tipo de ficheiro. Experimenta exportar como PNG.' : e.message);
      setEstado('erro');
    }
  }

  // ── Geometria no browser ──
  const pd = useDeferredValue(p);
  const resultado = useMemo<{ res: Resultado | null; erro: string }>(() => {
    if (pd.fonte === 'imagem' && !vetor) return { res: null, erro: '' };
    try { return { res: (gerarTermoformagem as any)(pd.fonte === 'imagem' ? vetor : null, pd, { final: false, modelo }) as Resultado, erro: '' }; }
    catch (e: any) { return { res: null, erro: e.message }; }
  }, [vetor, pd, modelo]);
  const res = resultado.res;

  const paramsDownload = useMemo(() => ({ ...p, modelo, ...(p.fonte === 'imagem' ? { image_path: imagePath, num_cores: numCores } : {}) }), [p, imagePath, modelo, numCores]);
  const podeDescarregar = canDownload && !!res && (p.fonte === 'pronta' || !!imagePath);

  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start', padding: '20px 24px 40px' }}>
      <aside style={{ flex: '1 1 320px', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#f1f5f9' }}>{nome}</h3>

        <div style={c.bloco}>
          <p style={c.titulo}>1 · Forma</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={c.seg(p.fonte === 'pronta')} onClick={() => set('fonte', 'pronta')}>✨ Forma pronta</button>
            <button type="button" style={c.seg(p.fonte === 'imagem')} onClick={() => set('fonte', 'imagem')}>🖼️ A minha imagem</button>
          </div>
          {p.fonte === 'pronta' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {(LISTA_FORMAS as { id: string; nome: string; emoji: string }[]).map(f => (
                <button key={f.id} type="button" title={f.nome} style={c.chip(p.forma === f.id)} onClick={() => set('forma', f.id)}>
                  <span style={{ fontSize: 20 }}>{f.emoji}</span>
                  <span style={{ fontSize: 9, lineHeight: 1.1, textAlign: 'center' }}>{f.nome}</span>
                </button>
              ))}
            </div>
          ) : (
            <>
              <label style={{ ...c.seg(false), textAlign: 'center', padding: '14px 10px', borderStyle: 'dashed' }}>
                <input type="file" accept=".svg,image/svg+xml,image/png,image/jpeg,image/webp" style={{ display: 'none' }}
                  onChange={e => { escolherFicheiro(e.target.files?.[0]); e.target.value = ''; }} disabled={!userId || estado === 'upload'} />
                {!userId ? '🔒 Inicia sessão para carregar' : estado === 'upload' ? 'A carregar…' : nomeFicheiro ? `📄 ${nomeFicheiro} — trocar` : '📁 Escolher SVG ou PNG'}
              </label>
              <p style={c.ajuda}>Usa-se o contorno da imagem. Funciona melhor com formas simples e cheias (silhuetas, logótipos).</p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1' }}>
                <input type="checkbox" checked={!!p.remover_fundo} onChange={e => set('remover_fundo', e.target.checked ? 1 : 0)} /> Remover o fundo da imagem
              </label>
            </>
          )}
        </div>

        <div style={c.bloco}>
          <p style={c.titulo}>2 · Tamanho e perfil</p>
          <Slider label="Largura da forma" valor={p.largura_mm} min={20} max={200} passo={5} onChange={v => set('largura_mm', v)} />
          <Slider label={enfeite ? 'Altura da cúpula (cada metade)' : 'Profundidade'} valor={p.altura_mm} min={5} max={50} passo={1} onChange={v => set('altura_mm', v)} />
          {!enfeite && (
            <>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" style={c.seg(p.perfil !== 'cupula')} onClick={() => set('perfil', 'saida')}>📐 Paredes inclinadas</button>
                <button type="button" style={c.seg(p.perfil === 'cupula')} onClick={() => set('perfil', 'cupula')}>🫧 Cúpula</button>
              </div>
              {p.perfil !== 'cupula' ? (
                <>
                  <Slider label="Ângulo de saída" valor={p.draft_graus} min={0} max={15} passo={1} unidade="°" onChange={v => set('draft_graus', v)} />
                  <Slider label="Arredondamento do topo" valor={p.raio_topo_mm} min={0} max={4} passo={0.5} onChange={v => set('raio_topo_mm', v)} />
                </>
              ) : <p style={c.ajuda}>A forma sobe em cúpula (almofadada) desde o contorno até ao centro.</p>}
            </>
          )}
          <Slider label="Margem lisa à volta" valor={p.contorno_mm} min={5} max={30} passo={1} onChange={v => set('contorno_mm', v)} />
        </div>

        {!enfeite && p.fonte === 'imagem' && p.perfil !== 'cupula' && (
          <div style={c.bloco}>
            <p style={c.titulo}>3 · Relevo das cores</p>
            <Slider label="Altura do relevo (0 = sem relevo)" valor={p.relevo_mm} min={0} max={8} passo={0.5} onChange={v => set('relevo_mm', v)} />
            {Number(p.relevo_mm) > 0 && (
              <>
                <Slider label="Número de cores da imagem" valor={Math.max(2, p.num_cores)} min={2} max={5} passo={1} unidade="" onChange={v => set('num_cores', v)} />
                {vetor && (
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {vetor.cores.map((cor, i) => <span key={i} title={`${Math.round(cor.fracao * 100)}%`} style={{ width: 28, height: 28, borderRadius: 6, background: cor.hex, border: '1px solid #334155' }} />)}
                  </div>
                )}
                <p style={c.ajuda}>A cor com mais área é o fundo da forma; as outras sobem em relevo por cima, para a folha ganhar os detalhes do desenho.</p>
              </>
            )}
          </div>
        )}

        <div style={c.bloco}>
          <p style={c.titulo}>{enfeite ? '3 · Folha em rede e união' : '4 · Folha e molde'}</p>
          {enfeite ? (
            <>
              <Slider label="Espessura da folha" valor={p.espessura_folha_mm} min={0.4} max={2} passo={0.1} onChange={v => set('espessura_folha_mm', arred(v))} />
              <Slider label="Tamanho das células da rede" valor={p.celula_mm} min={3} max={15} passo={0.5} onChange={v => set('celula_mm', v)} />
              <Slider label="Espessura das hastes" valor={p.haste_mm} min={0.8} max={3} passo={0.1} onChange={v => set('haste_mm', arred(v))} />
              <Slider label="Contorno liso (união das metades)" valor={p.aba_mm} min={3} max={15} passo={0.5} onChange={v => set('aba_mm', v)} />
              <Slider label="Altura do reforço da rosca" valor={p.altura_rosca_mm} min={3} max={10} passo={0.5} onChange={v => set('altura_rosca_mm', v)} />
              <p style={c.ajuda}>As duas metades são iguais: a A tem rosca na lingueta de cima, a B um furo. O parafuso com argola une-as e serve para pendurar.</p>
            </>
          ) : (
            <>
              <Slider label="Espessura da folha de plástico" valor={p.espessura_chapa_mm} min={0.2} max={2} passo={0.1} onChange={v => set('espessura_chapa_mm', arred(v))} />
              <Slider label="Largura do aro da moldura" valor={p.moldura_largura_mm} min={10} max={35} passo={1} onChange={v => set('moldura_largura_mm', v)} />
              <Slider label="Espessura da moldura" valor={p.espessura_moldura_mm} min={2} max={8} passo={0.5} onChange={v => set('espessura_moldura_mm', v)} />
            </>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1' }}>
            <input type="checkbox" checked={!!p.pinos} onChange={e => set('pinos', e.target.checked ? 1 : 0)} /> Pinos de alinhamento macho ↔ fêmea
          </label>
          <details>
            <summary style={{ ...c.ajuda, cursor: 'pointer', color: '#cbd5e1' }}>Ventilação e base</summary>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
              <Slider label="Diâmetro dos furos de ventilação" valor={p.furo_ventilacao_mm} min={0.8} max={2} passo={0.1} onChange={v => set('furo_ventilacao_mm', arred(v))} />
              <Slider label="Espaço entre furos" valor={p.espaco_ventilacao_mm} min={4} max={15} passo={1} onChange={v => set('espaco_ventilacao_mm', v)} />
              <Slider label="Espessura da base dos moldes" valor={p.espessura_base_mm} min={2} max={10} passo={0.5} onChange={v => set('espessura_base_mm', v)} />
            </div>
          </details>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {downloadsInfo && (
            <div style={{ ...c.bloco, flexDirection: 'row', justifyContent: 'space-between', padding: '10px 14px' }}>
              <span style={{ fontSize: 12, color: '#8a96aa', fontWeight: 600 }}>Downloads este mês</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: downloadsInfo.usados >= downloadsInfo.limite ? '#f87171' : '#34d399' }}>{downloadsInfo.usados} / {downloadsInfo.limite}</span>
            </div>
          )}
          {bloqueioMsg && <a href="/pricing" style={{ textAlign: 'center', padding: '10px 14px', borderRadius: 10, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>🔒 {bloqueioMsg}</a>}
          {podeDescarregar && (
            <DownloadStlButton key={JSON.stringify(paramsDownload)} designId={designId} params={paramsDownload} onSuccess={onDownloadSuccess} label="Download ZIP" />
          )}
        </div>
      </aside>

      <section style={{ flex: '2 1 420px', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
        <div style={{ position: 'relative', height: 520, borderRadius: 14, overflow: 'hidden', background: 'radial-gradient(circle at 50% 40%, #1e293b, #0b1220)', border: '1px solid #1e293b' }}>
          {res ? (
            <Canvas camera={{ position: [res.info.hx * 1.4, -res.info.hy * 2.4 - 60, res.info.Hf * 4 + 90], up: [0, 0, 1], fov: 40, near: 0.1, far: 4000 }} dpr={[1, 2]}>
              <ambientLight intensity={0.55} />
              <directionalLight position={[60, -80, 140]} intensity={1.0} />
              <directionalLight position={[-80, 60, 40]} intensity={0.35} color="#aac4ff" />
              <Suspense fallback={null}><Environment preset="warehouse" /></Suspense>
              <Cena res={res} vista={vista} aberto={aberto} />
              <OrbitControls makeDefault enableDamping target={[0, 0, res.info.Hf / 2]} />
            </Canvas>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a96aa', fontSize: 14, textAlign: 'center', padding: 24 }}>
              {estado === 'upload' ? 'A carregar a imagem…' : estado === 'vetor' ? 'A ler a forma…' : estado === 'erro' ? <span style={{ color: '#f87171' }}>{erro}</span> : resultado.erro ? <span style={{ color: '#f87171' }}>{resultado.erro}</span> : 'Carrega um SVG ou imagem — ou escolhe uma forma pronta.'}
            </div>
          )}
          {res && (
            <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {([['molde', '🧩 Molde'], ['final', enfeite ? '🎄 Enfeite' : '✨ Peça formada'], ['pecas', '🖨️ Peças']] as const).map(([k, t]) => (
                <button key={k} type="button" style={c.vista(vista === k)} onClick={() => setVista(k)}>{t}</button>
              ))}
              {vista === 'molde' && <button type="button" style={c.vista(!aberto)} onClick={() => setAberto(v => !v)}>{aberto ? '⬇ Prensar' : '⬆ Abrir'}</button>}
            </div>
          )}
          {res && (
            <div style={{ position: 'absolute', top: 10, right: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', background: 'rgba(15,23,42,0.8)', padding: '6px 10px', borderRadius: 8 }}>
                {res.info.larguraForma.toFixed(0)} × {res.info.alturaForma.toFixed(0)} × {res.info.Hf.toFixed(0)} mm
              </span>
            </div>
          )}
        </div>

        {res && (
          <div style={c.bloco}>
            <p style={c.titulo}>O que vais receber (ZIP)</p>
            {res.pecas.map(pc => (
              <p key={pc.id} style={{ ...c.ajuda, color: '#cbd5e1', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: pc.cor, display: 'inline-block' }} />{pc.ficheiro} — {pc.nome}
              </p>
            ))}
            <p style={{ ...c.ajuda, color: '#cbd5e1' }}>{enfeite ? 'guia_enfeite.txt' : 'guia_termoformagem.txt'} — passo a passo para imprimir, formar e montar</p>
            <p style={c.ajuda}>{res.info.nVent} furos de ventilação na fêmea{p.pinos ? ' · 4 pinos de alinhamento' : ''}{enfeite && res.info.simetrica === false ? ' · forma assimétrica: moldes próprios para a metade B' : ''}</p>
            {res.avisos.map((a, i) => <p key={i} style={{ ...c.ajuda, color: '#fbbf24' }}>⚠ {a}</p>)}
          </div>
        )}
      </section>
    </div>
  );
}

// ── 3D ───────────────────────────────────────────────────────────────────────

function malhaDe(tris: number[] | null | undefined) {
  if (!tris || !tris.length) return null;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(tris, 3));
  g.computeVertexNormals();
  g.computeBoundingBox();
  return g;
}

function Malha({ tris, cor, opacidade = 1, position, rotation }: {
  tris: number[]; cor: string; opacidade?: number; position?: [number, number, number]; rotation?: [number, number, number];
}) {
  const geo = useMemo(() => malhaDe(tris), [tris]);
  useEffect(() => () => geo?.dispose(), [geo]);
  if (!geo) return null;
  return (
    <mesh geometry={geo} position={position} rotation={rotation}>
      <meshStandardMaterial color={cor} roughness={0.5} metalness={0.05} transparent={opacidade < 1} opacity={opacidade} depthWrite={opacidade >= 1} side={THREE.DoubleSide} />
    </mesh>
  );
}

/** Vistas: molde montado (fêmea virada por cima do macho), peça final, peças lado a lado. */
function Cena({ res, vista, aberto }: { res: Resultado; vista: 'molde' | 'final' | 'pecas'; aberto: boolean }) {
  const { g, info } = res;
  const por = Object.fromEntries(res.pecas.map(pc => [pc.id, pc]));
  const enfeite = g.modelo === 'enfeite';
  const zTopoBase = g.espBaseMm;

  if (vista === 'final') {
    // a folha formada (casca); no enfeite, as duas metades costas com costas
    return (
      <group position={[0, 0, enfeite ? info.Hf / 2 : 0]}>
        <Malha tris={res.formada} cor={enfeite ? '#f472b6' : '#bfe3ff'} opacidade={enfeite ? 1 : 0.85} />
        {enfeite && <Malha tris={res.formada} cor="#c084fc" rotation={[0, Math.PI, 0]} position={[0, 0, -g.espChapaMm * 2]} />}
      </group>
    );
  }

  if (vista === 'pecas') {
    // lado a lado, pela ordem, com 12 mm entre elas
    const caixas = res.pecas.map(pc => { const geo = malhaDe(pc.tris); const bb = geo?.boundingBox; geo?.dispose(); return bb ? { w: bb.max.x - bb.min.x, cx: (bb.max.x + bb.min.x) / 2, cy: (bb.max.y + bb.min.y) / 2 } : { w: 0, cx: 0, cy: 0 }; });
    const total = caixas.reduce((s, b) => s + b.w, 0) + 12 * (caixas.length - 1);
    let x = -total / 2;
    return (
      <group>
        {res.pecas.map((pc, i) => {
          const b = caixas[i];
          const pos: [number, number, number] = [x + b.w / 2 - b.cx, -b.cy, 0];
          x += b.w + 12;
          return <Malha key={pc.id} tris={pc.tris} cor={pc.cor} position={pos} />;
        })}
      </group>
    );
  }

  // molde montado: macho na mesa, folha formada por cima, fêmea virada (180° em y) por cima
  const abertura = aberto ? Math.max(25, info.Hf * 1.2) : 0;
  const zFemea = zTopoBase + g.espChapaMm + info.Hf + g.espBaseMm + abertura;
  return (
    <group>
      <Malha tris={por.macho.tris} cor={por.macho.cor} />
      <Malha tris={res.formada} cor={enfeite ? '#f472b6' : '#bfe3ff'} opacidade={0.55} position={[0, 0, zTopoBase + (aberto ? abertura * 0.45 : 0)]} />
      <Malha tris={por.femea.tris} cor={por.femea.cor} opacidade={aberto ? 1 : 0.45} rotation={[0, Math.PI, 0]} position={[0, 0, zFemea]} />
    </group>
  );
}
