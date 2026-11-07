'use client';

// Editor da Caixa de Luz — logótipo/texto com forma livre
// (generation_schema.engine = "caixa-luz-logo").
//
// Mesmo motor do porta-chaves de imagem (PortachavesVetorEditor.tsx):
// 1. O cliente carrega um SVG ou PNG/JPG → o backend separa as cores e devolve
//    os contornos (/api/vetorizar).
// 2. Tudo o resto é calculado aqui no browser com lib/caixaLuzLogo.js (que por
//    sua vez usa lib/vetorGeom.js) — o MESMO código que gera os ficheiros no
//    backend — por isso a pré-visualização é exatamente o que sai.
//
// A silhueta da imagem/logótipo/texto desenha a PRÓPRIA caixa (como um
// letreiro luminoso real) — não é um retângulo com a imagem lá dentro.
import { Suspense, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import * as THREE from 'three';
import DownloadStlButton from '@/components/DownloadStlButton';
// @ts-ignore — módulo JS partilhado com o backend (Maker_Pro_Docker_Prod/app/caixaLuzLogo.js)
import { construirCaixaLuzLogo } from '@/lib/caixaLuzLogo';
// @ts-ignore — módulo JS partilhado com o backend (Maker_Pro_Docker_Prod/app/vetorGeom.js)
import { fatiasParaTriangulos } from '@/lib/vetorGeom';

type Vetor = {
  w: number; h: number; ehSvg: boolean; fundoOpaco?: boolean;
  cores: { hex: string; fracao: number; aneis: number[][] }[];
  silhueta: number[][];
  ancoras: Record<string, [number, number]> | null;
};

type Pecas = {
  pecas: { nome: string; cor: string; solta?: boolean; fatias: { z0: number; z1: number; regiao: any[]; cor?: string }[] }[];
  largura: number; altura: number; alturaTotal: number; guia: string[]; avisos: string[];
  parametros: Record<string, any>;
  base2d: any[];
};

type Resultado = {
  r: Pecas;
  geo: { paredeMm: number; profundidadeMm: number; mesaXMm: number; mesaYMm: number; temTampa: boolean; espessuraTampaMm: number; montagem: 'pe' | 'parede' };
  corpoTris: number[];
  tampaTris: number[] | null;
  formaTipo: 'imagem' | 'redonda' | 'quadrada' | 'hexagonal';
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
  modo: 'sem_ams', num_cores: 3, remover_fundo: 1, tolerancia: 40, buracos_fundo: 1,
  largura: 200, contorno: 12, espessura_base: 1.6, relevo: 1.2, acabamento: 'relevo',
  metodo: 'pecas', cor_base: 0, ordem: 'escuras_cima', furo_pos: 'nenhum', detalhe_min: 0.4, preencher_buracos: 1,
  encaixe: 0.6, folga: 0.2,
  parede_caixa_mm: 2.4, profundidade_mm: 25, mesa_x_mm: 256, mesa_y_mm: 256,
  forma_caixa: 'imagem', tem_tampa: 0, espessura_tampa_mm: 2, montagem: 'pe',
};

const FORMAS: [string, string][] = [
  ['imagem', '🖼️ À volta da imagem'], ['redonda', '⚪ Redonda'], ['quadrada', '⬛ Quadrada'], ['hexagonal', '⬡ Hexagonal'],
];

const MONTAGENS: [string, string][] = [
  ['pe', '🪑 De pé'], ['parede', '🧱 Na parede'],
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

export default function CaixaLuzLogoEditor({ designId, nome, userId, canDownload, bloqueioMsg, downloadsInfo, onUpload, onDownloadSuccess }: Props) {
  const [p, setP] = useState<Record<string, any>>(PADRAO);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [nomeFicheiro, setNomeFicheiro] = useState('');
  const [vetor, setVetor] = useState<Vetor | null>(null);
  const [estado, setEstado] = useState<'idle' | 'upload' | 'vetor' | 'erro'>('idle');
  const [erro, setErro] = useState('');
  const [luzAcesa, setLuzAcesa] = useState(true);
  const set = (k: string, v: any) => setP(prev => ({ ...prev, [k]: v }));

  const pedido = useState(() => ({ current: 0 }))[0];
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
          body: JSON.stringify({ image_path: imagePath, num_cores: p.num_cores, remover_fundo: p.remover_fundo, tolerancia: p.tolerancia, buracos_fundo: p.buracos_fundo }),
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
  }, [imagePath, p.num_cores, p.remover_fundo, p.tolerancia, p.buracos_fundo]);

  async function escolherFicheiro(file: File | undefined) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setErro('Ficheiro demasiado grande (máx. 8 MB).'); setEstado('erro'); return; }
    const ehSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
    setEstado('upload'); setErro(''); setVetor(null); setNomeFicheiro(file.name);
    try {
      const path = await onUpload(ehSvg && !file.type ? new File([file], file.name, { type: 'image/svg+xml' }) : file);
      setImagePath(path);
    } catch (e: any) {
      setErro(/mime|type|svg/i.test(e.message) ? 'O servidor recusou este tipo de ficheiro. Experimenta exportar como PNG.' : e.message);
      setEstado('erro');
    }
  }

  // ── Geometria no browser (instantânea) ──
  const pd = useDeferredValue(p);
  const resultado = useMemo<{ res: Resultado | null; erro: string }>(() => {
    if (!vetor) return { res: null, erro: '' };
    try { return { res: construirCaixaLuzLogo(vetor, pd) as Resultado, erro: '' }; }
    catch (e: any) { return { res: null, erro: e.message }; }
  }, [vetor, pd]);
  const res = resultado.res;
  const r = res?.r ?? null;

  const descricaoModo = p.modo === 'ams'
    ? 'Ficheiro 3MF com a frente e cada cor numa parte separada. No slicer atribuis um filamento do AMS a cada parte.'
    : p.metodo === 'pecas'
      ? 'Frente com encaixes + uma peça por cor. Imprimes cada cor à parte, encaixas na frente e colas.'
      : 'Frente única: a cor de base e cada outra cor um nível acima, com uma pausa por nível.';
  const formato = p.modo === 'ams' ? '3MF' : 'ZIP';
  const paramsDownload = useMemo(() => ({ ...p, image_path: imagePath }), [p, imagePath]);

  return (
    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', alignItems: 'flex-start', padding: '20px 24px 40px' }}>
      <aside style={{ flex: '1 1 320px', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 16, color: '#f1f5f9' }}>{nome}</h3>

        <div style={c.bloco}>
          <p style={c.titulo}>1 · Logótipo, texto ou imagem</p>
          <label style={{ ...c.seg(false), textAlign: 'center', padding: '14px 10px', borderStyle: 'dashed' }}>
            <input type="file" accept=".svg,image/svg+xml,image/png,image/jpeg,image/webp" style={{ display: 'none' }}
              onChange={e => { escolherFicheiro(e.target.files?.[0]); e.target.value = ''; }} disabled={!userId || estado === 'upload'} />
            {!userId ? '🔒 Inicia sessão para carregar' : estado === 'upload' ? 'A carregar…' : nomeFicheiro ? `📄 ${nomeFicheiro} — trocar` : '📁 Escolher SVG ou PNG'}
          </label>
          <p style={c.ajuda}>A silhueta desenha a própria caixa — como um letreiro luminoso real. Funciona melhor com logótipos, texto e desenhos de cores lisas.</p>
        </div>

        <div style={c.bloco}>
          <p style={c.titulo}>2 · A tua impressora</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" style={c.seg(p.modo === 'sem_ams')} onClick={() => set('modo', 'sem_ams')}>Sem AMS</button>
            <button type="button" style={c.seg(p.modo === 'ams')} onClick={() => set('modo', 'ams')}>Com AMS / multicor</button>
          </div>
          <p style={c.ajuda}>{vetor ? descricaoModo : 'Escolhe se a tua impressora troca de cor sozinha (AMS, MMU…) ou não.'}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <Slider label="Mesa X" valor={p.mesa_x_mm} min={100} max={500} passo={5} onChange={v => set('mesa_x_mm', v)} />
            <Slider label="Mesa Y" valor={p.mesa_y_mm} min={100} max={500} passo={5} onChange={v => set('mesa_y_mm', v)} />
          </div>
          <p style={c.ajuda}>Tamanho da mesa de impressão. Se a peça não couber, avisamos-te — a divisão automática em blocos ainda não está disponível.</p>
        </div>

        <div style={c.bloco}>
          <p style={c.titulo}>3 · Cores</p>
          <Slider label="Número de cores" valor={p.num_cores} min={1} max={6} passo={1} unidade="" onChange={v => set('num_cores', v)} />
          {vetor && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {vetor.cores.map((cor, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 34, height: 34, borderRadius: 8, background: cor.hex, border: '1px solid #334155', boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }} />
                  <span style={{ fontSize: 10, color: '#8a96aa' }}>{Math.round(cor.fracao * 100)}%</span>
                </div>
              ))}
            </div>
          )}
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1' }}>
            <input type="checkbox" checked={!!p.remover_fundo} onChange={e => set('remover_fundo', e.target.checked ? 1 : 0)} /> Remover o fundo da imagem
          </label>
          {!!p.remover_fundo && <Slider label="Sensibilidade do fundo" valor={p.tolerancia} min={10} max={120} passo={5} unidade="" onChange={v => set('tolerancia', v)} />}
        </div>

        <div style={c.bloco}>
          <p style={c.titulo}>4 · Tamanho</p>
          <Slider label="Largura da caixa" valor={r ? Math.round(r.largura) : p.largura} min={40} max={650} passo={5}
            onChange={v => {
              // A proporção vem da imagem — mexer na largura ajusta a altura
              // na mesma percentagem, para não distorcer o desenho.
              if (r && r.largura > 0) set('largura', Math.round((p.largura * v) / r.largura));
              else set('largura', v);
            }} />
          <Slider label="Altura da caixa" valor={r ? Math.round(r.altura) : Math.round(p.largura * 0.8)} min={40} max={650} passo={5}
            onChange={v => {
              if (r && r.altura > 0) set('largura', Math.round((p.largura * v) / r.altura));
            }} />
          <p style={c.ajuda}>A largura e a altura mudam juntas, na mesma proporção da imagem — para esticar só um lado, usa um SVG/imagem já com essa proporção.</p>
          <Slider label="Moldura/contorno" valor={p.contorno} min={8} max={30} passo={1} onChange={v => set('contorno', v)} />
          <Slider label="Espessura da frente (passa luz)" valor={p.espessura_base} min={1} max={3} passo={0.1} onChange={v => set('espessura_base', Math.round(v * 10) / 10)} />
          <Slider label="Altura das cores em relevo" valor={p.relevo} min={0.4} max={3} passo={0.2} onChange={v => set('relevo', Math.round(v * 10) / 10)} />
        </div>

        <div style={c.bloco}>
          <p style={c.titulo}>5 · Caixa (luz atrás)</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
            {FORMAS.map(([k, t]) => <button key={k} type="button" style={c.seg(p.forma_caixa === k)} onClick={() => set('forma_caixa', k)}>{t}</button>)}
          </div>
          <p style={c.ajuda}>
            {p.forma_caixa === 'imagem'
              ? 'A caixa segue o contorno exato do logótipo/texto/desenho.'
              : 'A caixa fica com esta forma fixa, grande o suficiente para a arte caber lá dentro, com a moldura à volta.'}
          </p>
          <Slider label="Espessura da parede" valor={p.parede_caixa_mm} min={1.6} max={4} passo={0.2} onChange={v => set('parede_caixa_mm', Math.round(v * 10) / 10)} />
          <Slider label="Profundidade" valor={p.profundidade_mm} min={15} max={60} passo={1} onChange={v => set('profundidade_mm', v)} />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#cbd5e1' }}>
            <input type="checkbox" checked={!!p.tem_tampa} onChange={e => set('tem_tampa', e.target.checked ? 1 : 0)} /> Tampa a fechar o fundo
          </label>
          {!!p.tem_tampa && (
            <Slider label="Espessura da tampa" valor={p.espessura_tampa_mm} min={1.2} max={4} passo={0.2} onChange={v => set('espessura_tampa_mm', Math.round(v * 10) / 10)} />
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            {MONTAGENS.map(([k, t]) => <button key={k} type="button" style={c.seg(p.montagem === k)} onClick={() => set('montagem', k)}>{t}</button>)}
          </div>
          <p style={c.ajuda}>
            {p.montagem === 'parede'
              ? 'Fixa à parede: o cabo sai por um furo lateral no corpo (o fundo fica encostado à parede, por isso sai sem furo, mesmo com tampa).'
              : p.tem_tampa
                ? 'De pé: o cabo sai por um furo na tampa, perto da base (nunca no meio).'
                : 'De pé, sem tampa: a caixa fica aberta por trás — o cabo sai livremente por ali.'}
            {' '}A frente e a tampa encaixam num rebordo do corpo antes de colar.
          </p>
        </div>

        {p.modo === 'sem_ams' && (
          <details style={c.bloco}>
            <summary style={{ ...c.titulo, cursor: 'pointer' }}>6 · Peças de cor</summary>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" style={c.seg(p.metodo === 'pecas')} onClick={() => set('metodo', 'pecas')}>Peças para colar</button>
              <button type="button" style={c.seg(p.metodo === 'pausas')} onClick={() => set('metodo', 'pausas')}>Trocar filamento (pausas)</button>
            </div>
            {p.metodo === 'pecas' && (
              <>
                <Slider label="Profundidade dos encaixes" valor={p.encaixe} min={0.4} max={1.2} passo={0.1} onChange={v => set('encaixe', Math.round(v * 10) / 10)} />
                <Slider label="Folga das peças" valor={p.folga} min={0} max={0.6} passo={0.05} onChange={v => set('folga', Math.round(v * 100) / 100)} />
              </>
            )}
          </details>
        )}

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

      <section style={{ flex: '2 1 420px', display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
        <div style={{ position: 'relative', height: 520, borderRadius: 14, overflow: 'hidden', background: luzAcesa ? '#07070a' : 'radial-gradient(circle at 50% 40%, #1e293b, #0b1220)', border: '1px solid #1e293b' }}>
          {res ? (
            <Canvas camera={{ position: [0, -res.r.largura * 1.3 - 100, res.r.altura * 0.9 + 60], up: [0, 0, 1], fov: 40, near: 0.1, far: 3000 }} dpr={[1, 2]}>
              <ambientLight intensity={luzAcesa ? 0.2 : 0.5} />
              <directionalLight position={[40, -40, 80]} intensity={luzAcesa ? 0.3 : 1.1} />
              <Suspense fallback={null}><Environment preset="warehouse" /></Suspense>
              <Modelo res={res} luzAcesa={luzAcesa} />
              <OrbitControls makeDefault enableDamping target={[0, 0, res.geo.profundidadeMm / 2]} />
            </Canvas>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8a96aa', fontSize: 14, textAlign: 'center', padding: 24 }}>
              {estado === 'upload' ? 'A carregar a imagem…' : estado === 'vetor' ? 'A separar as cores…' : estado === 'erro' ? <span style={{ color: '#f87171' }}>{erro}</span> : resultado.erro ? <span style={{ color: '#f87171' }}>{resultado.erro}</span> : 'Carrega um SVG, logótipo ou texto para ver a caixa de luz em 3D.'}
            </div>
          )}
          {res && (
            <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6 }}>
              {[true, false].map(v => (
                <button key={String(v)} type="button" onClick={() => setLuzAcesa(v)} style={{
                  padding: '5px 10px', borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  border: `1px solid ${luzAcesa === v ? '#f59e0b' : 'rgba(255,255,255,0.15)'}`,
                  background: luzAcesa === v ? 'rgba(245,158,11,0.18)' : 'rgba(15,23,42,0.7)',
                  color: luzAcesa === v ? '#fbbf24' : '#94a3b8',
                }}>
                  {v ? '💡 Luz acesa' : '🌙 Luz apagada'}
                </button>
              ))}
            </div>
          )}
          {r && (
            <div style={{ position: 'absolute', top: 10, right: 10 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#cbd5e1', background: 'rgba(15,23,42,0.8)', padding: '6px 10px', borderRadius: 8 }}>
                {r.largura.toFixed(0)} × {r.altura.toFixed(0)} × {(res!.geo.profundidadeMm + r.alturaTotal).toFixed(0)} mm
              </span>
            </div>
          )}
        </div>

        {r && (
          <div style={c.bloco}>
            <p style={c.titulo}>O que vais receber ({formato})</p>
            <p style={{ ...c.ajuda, color: '#cbd5e1' }}>corpo.stl — paredes ocas da caixa{p.tem_tampa ? '' : ', abertas dos dois lados'}</p>
            {!!p.tem_tampa && <p style={{ ...c.ajuda, color: '#cbd5e1' }}>tampa.stl — fecha o fundo</p>}
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

function Modelo({ res, luzAcesa }: { res: Resultado; luzAcesa: boolean }) {
  const { r, geo, corpoTris, tampaTris } = res;

  const corpoGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(corpoTris, 3));
    g.computeVertexNormals();
    return g;
  }, [corpoTris]);
  useEffect(() => () => corpoGeo.dispose(), [corpoGeo]);

  const tampaGeo = useMemo(() => {
    if (!tampaTris) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(tampaTris, 3));
    g.computeVertexNormals();
    return g;
  }, [tampaTris]);
  useEffect(() => () => tampaGeo?.dispose(), [tampaGeo]);

  const malhas = useMemo(() => {
    const out: { geo: THREE.BufferGeometry; cor: string; frente: boolean }[] = [];
    for (const peca of r.pecas) {
      for (const f of peca.fatias) {
        const tri: number[] = fatiasParaTriangulos([f]);
        if (!tri.length) continue;
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(tri, 3));
        g.computeVertexNormals();
        out.push({ geo: g, cor: f.cor ?? peca.cor, frente: peca.nome === 'base' || peca.nome === 'porta-chaves' });
      }
    }
    return out;
  }, [r]);
  useEffect(() => () => malhas.forEach(m => m.geo.dispose()), [malhas]);

  return (
    // Z para cima, igual à cama da impressora
    <group>
      <mesh geometry={corpoGeo}>
        <meshStandardMaterial color="#2b2c31" roughness={0.6} />
      </mesh>
      {tampaGeo && (
        <mesh geometry={tampaGeo}>
          <meshStandardMaterial color="#2b2c31" roughness={0.6} />
        </mesh>
      )}
      <group position={[0, 0, geo.profundidadeMm]}>
        {malhas.map((m, i) => (
          <mesh key={i} geometry={m.geo}>
            {luzAcesa
              ? <meshBasicMaterial color={m.frente ? '#fff3d6' : m.cor} toneMapped={false} />
              : <meshStandardMaterial color={m.cor} roughness={0.55} metalness={0.05} />}
          </mesh>
        ))}
      </group>
      {luzAcesa && (
        <pointLight position={[0, 0, geo.profundidadeMm * 0.3]} color="#ffc27a" intensity={4000} distance={0} decay={2} />
      )}
    </group>
  );
}
