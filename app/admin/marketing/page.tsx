'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { resizeImageToBase64 } from '@/lib/imageResize';
import ReelsIA from '@/components/admin/campanhas/ReelsIA';
import Concorrencia from '@/components/admin/marketing/Concorrencia';
import {
  Megaphone, Send, Clock, TrendingUp, Rocket, Pause, Play, Package, ImagePlus, Sparkles,
  RefreshCw, ExternalLink, Trophy, Download, Film, Loader2,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface ProdutoRef {
  id: string; nome: string; descricao: string | null;
  prod_loja_imagens?: { url: string; ordem: number }[];
}

interface PostMarketing {
  id: string;
  produto_id: string | null;
  legenda: string;
  imagens: string[];
  video_url?: string | null;
  abordagem?: string | null;
  canal: 'instagram' | 'facebook' | 'ambos';
  estado: 'rascunho' | 'agendado' | 'publicado' | 'falhou';
  agendado_para: string | null;
  publicado_em: string | null;
  erro: string | null;
  created_at: string;
}

interface AdPago {
  id: string; post_id: string; nome: string;
  orcamento_diario_cents: number;
  estado: 'rascunho' | 'pausada' | 'ativa' | 'terminada';
  previsao_alcance_min: number | null;
  previsao_alcance_max: number | null;
  gasto_real_cents: number;
}

const ESTADO_COR: Record<string, string> = {
  rascunho: '#64748b', agendado: '#f59e0b', publicado: '#22c55e', falhou: '#ef4444',
  pausada: '#64748b', ativa: '#22c55e', terminada: '#64748b',
};

const s = {
  page: { minHeight: '100vh', background: '#080c10', color: '#f1f5f9', fontFamily: 'Inter, Arial, sans-serif', padding: '40px 32px' },
  card: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 24, marginBottom: 24 } as React.CSSProperties,
  label: { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#8a96aa', marginBottom: 6 },
  input: { width: '100%', background: '#0a1120', border: '1px solid #1e293b', borderRadius: 8, padding: '10px 14px', color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const },
  btn: { padding: '10px 18px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 },
  btnGhost: { padding: '10px 18px', background: 'transparent', color: '#cbd5e1', border: '1px solid #1e293b', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 },
  badge: (cor: string) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${cor}22`, color: cor, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }),
};

async function chamar(url: string, body: unknown) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? 'Erro desconhecido.');
  return json;
}

// ── Página ───────────────────────────────────────────────────────────────────

export default function MarketingPage() {
  const [tab, setTab] = useState<'criar' | 'fila' | 'analytics' | 'concorrencia'>('criar');

  return (
    <div style={s.page}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Rocket className="text-indigo-400" /> Marketing
          </h1>
          <p style={{ fontSize: 13, color: '#8a96aa', marginTop: 4 }}>
            Publicações orgânicas no Instagram/Facebook, campanhas pagas, análise de resultados e concorrência.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {([['criar', 'Criar publicação'], ['fila', 'Fila / Calendário'], ['analytics', 'Analytics'], ['concorrencia', 'Concorrência']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} style={tab === k ? s.btn : s.btnGhost}>{label}</button>
          ))}
        </div>

        {tab === 'criar' && <><CriarPublicacao /><ReelsIA /><SerieIA /></>}
        {tab === 'fila' && <Fila />}
        {tab === 'analytics' && <Analytics />}
        {tab === 'concorrencia' && <Concorrencia />}
      </div>
    </div>
  );
}

// ── Vídeo (Reel) carregado do computador/telemóvel ──────────────────────────

const REEL_MIN_S = 3;
const REEL_MAX_FB_S = 90;   // Reels do Facebook via API: 3–90 s
const REEL_MAX_IG_S = 900;  // Reels do Instagram via API: até 15 min

interface InfoVideo { duracao: number; largura: number; altura: number }

function lerVideo(file: File): Promise<{ info: InfoVideo; capa: Blob | null }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement('video');
    v.preload = 'auto'; v.muted = true; v.playsInline = true; v.src = url;
    const fim = (r: { info: InfoVideo; capa: Blob | null } | Error) => {
      URL.revokeObjectURL(url);
      r instanceof Error ? reject(r) : resolve(r);
    };
    v.onerror = () => fim(new Error('O browser não conseguiu ler este vídeo. Se for HEVC (iPhone), exporta em H.264/MP4.'));
    v.onloadedmetadata = () => { v.currentTime = Math.min(1, (v.duration || 2) / 2); };
    v.onseeked = () => {
      const info = { duracao: v.duration, largura: v.videoWidth, altura: v.videoHeight };
      // Capa: um frame perto do 1.º segundo (serve de miniatura no admin e na fila).
      try {
        const c = document.createElement('canvas');
        c.width = v.videoWidth; c.height = v.videoHeight;
        c.getContext('2d')!.drawImage(v, 0, 0);
        c.toBlob(b => fim({ info, capa: b }), 'image/jpeg', 0.85);
      } catch { fim({ info, capa: null }); }
    };
  });
}

// ── Tab: Criar publicação ───────────────────────────────────────────────────

function CriarPublicacao() {
  const [produtos, setProdutos] = useState<ProdutoRef[]>([]);
  const [produtoId, setProdutoId] = useState('');
  const [legenda, setLegenda] = useState('');
  const [imagemUrl, setImagemUrl] = useState('');
  const [formato, setFormato] = useState<'imagem' | 'reel'>('imagem');
  const [videoUrl, setVideoUrl] = useState('');
  const [infoVideo, setInfoVideo] = useState<InfoVideo | null>(null);
  const [aEnviarVideo, setAEnviarVideo] = useState(false);
  const [videoMsg, setVideoMsg] = useState<{ erro: boolean; t: string } | null>(null);
  const [canal, setCanal] = useState<'instagram' | 'facebook' | 'ambos'>('ambos');
  const [agendarPara, setAgendarPara] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');
  const [angulo, setAngulo] = useState('');
  const [nomeLivre, setNomeLivre] = useState('');
  const [publico, setPublico] = useState<'clientes' | 'makers'>('clientes');
  const [aCarregar, setACarregar] = useState(false);
  const [ia, setIa] = useState<null | { instagram: string; facebook: string; tiktok_guiao: string; hashtags: string[]; prompt_imagem: string }>(null);
  const [promptImg, setPromptImg] = useState('');
  const [iaEstado, setIaEstado] = useState<'idle' | 'texto' | 'imagem'>('idle');
  const [iaMsg, setIaMsg] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('prod_loja_produtos')
        .select('id, nome, descricao, prod_loja_imagens(url, ordem)')
        .in('estado', ['ativo', 'rascunho'])
        .order('nome');
      setProdutos((data ?? []) as unknown as ProdutoRef[]);
    })();
  }, []);

  function aplicarProduto(id: string) {
    setProdutoId(id);
    const p = produtos.find(x => x.id === id);
    if (!p) { setLegenda(''); setImagemUrl(''); return; }
    setLegenda(p.descricao ?? p.nome);
    const fotos = (p.prod_loja_imagens ?? []).slice().sort((a, b) => a.ordem - b.ordem);
    setImagemUrl(fotos[0]?.url ?? '');
  }

  async function gerarTextos() {
    const p = produtos.find(x => x.id === produtoId);
    const nome = p?.nome ?? nomeLivre.trim();
    if (!nome) { setIaMsg('Escolhe um produto ou escreve o nome do produto.'); return; }
    setIaEstado('texto'); setIaMsg('');
    try {
      const { conteudo } = await chamar('/api/admin/marketing/gerar-conteudo', { nome, descricao: p?.descricao ?? '', angulo, publico });
      setIa(conteudo); setPromptImg(conteudo.prompt_imagem ?? '');
      setLegenda(`${conteudo.instagram}\n\n${(conteudo.hashtags ?? []).join(' ')}`);
    } catch (e: any) { setIaMsg(e.message); }
    setIaEstado('idle');
  }

  async function carregarFoto(file: File | undefined) {
    if (!file) return;
    setACarregar(true); setIaMsg('');
    try {
      const image_base64 = await resizeImageToBase64(file);
      const { url } = await chamar('/api/admin/loja/upload', { image_base64, pasta: 'marketing' });
      setImagemUrl(url);
    } catch (e: any) { setIaMsg(e.message); }
    setACarregar(false);
  }

  async function carregarVideo(file: File | undefined) {
    if (!file) return;
    setVideoMsg(null);
    if (!['video/mp4', 'video/quicktime'].includes(file.type)) {
      setVideoMsg({ erro: true, t: 'Formato não suportado. Usa um vídeo MP4 ou MOV.' }); return;
    }
    setAEnviarVideo(true);
    try {
      const { info, capa } = await lerVideo(file);
      if (info.duracao < REEL_MIN_S) throw new Error(`O vídeo tem ${info.duracao.toFixed(1)} s; um Reel precisa de pelo menos ${REEL_MIN_S} s.`);
      if (info.duracao > REEL_MAX_IG_S) throw new Error('O vídeo tem mais de 15 minutos, o máximo para Reels do Instagram.');

      // 1. URL assinado + envio direto do browser para o Storage (sem passar pela Vercel)
      const prep = await chamar('/api/admin/marketing/upload-video', { tipo: file.type, tamanho: file.size });
      const { error } = await supabase.storage.from(prep.bucket).uploadToSignedUrl(prep.path, prep.token, file, { contentType: file.type });
      if (error) throw new Error(/mime|type/i.test(error.message) ? 'O Storage não aceita este formato — converte o vídeo para MP4.' : `Falhou o envio: ${error.message}`);

      // 2. Capa (miniatura) a partir de um frame do vídeo
      if (capa) {
        const image_base64 = await resizeImageToBase64(new File([capa], 'capa.jpg', { type: 'image/jpeg' }), 1080);
        const { url } = await chamar('/api/admin/loja/upload', { image_base64, pasta: 'marketing' });
        setImagemUrl(url);
      }

      setVideoUrl(prep.url);
      setInfoVideo(info);
      const avisos: string[] = [];
      if (info.largura >= info.altura) avisos.push('o vídeo não é vertical (9:16) — nos Reels vai aparecer com barras ou cortado');
      if (info.duracao > REEL_MAX_FB_S) avisos.push(`tem ${Math.round(info.duracao)} s: o Facebook só aceita Reels até ${REEL_MAX_FB_S} s, por isso só dá para publicar no Instagram`);
      setVideoMsg({ erro: false, t: `Vídeo carregado (${Math.round(info.duracao)} s, ${info.largura}×${info.altura}).${avisos.length ? ` Atenção: ${avisos.join('; ')}.` : ''}` });
      if (info.duracao > REEL_MAX_FB_S) setCanal('instagram');
    } catch (e: any) {
      setVideoMsg({ erro: true, t: e.message });
    }
    setAEnviarVideo(false);
  }

  function limparVideo() { setVideoUrl(''); setInfoVideo(null); setVideoMsg(null); setImagemUrl(''); }

  async function gerarImagem() {
    if (!promptImg.trim()) { setIaMsg('Escreve ou gera primeiro o prompt da imagem.'); return; }
    setIaEstado('imagem'); setIaMsg('');
    try {
      const { url } = await chamar('/api/admin/marketing/gerar-imagem', { prompt: promptImg });
      setImagemUrl(url);
    } catch (e: any) { setIaMsg(e.message); }
    setIaEstado('idle');
  }

  async function guardar(publicarJa: boolean) {
    const reel = formato === 'reel';
    if (reel && !videoUrl) { setStatus('error'); setMsg('Carrega primeiro o vídeo do Reel.'); return; }
    if (!legenda || !imagemUrl) { setStatus('error'); setMsg(reel ? 'A legenda é obrigatória (e a capa do vídeo ainda não está pronta).' : 'Legenda e imagem são obrigatórias.'); return; }
    if (reel && infoVideo && infoVideo.duracao > REEL_MAX_FB_S && canal !== 'instagram') {
      setStatus('error'); setMsg(`Reels com mais de ${REEL_MAX_FB_S} s só podem ir para o Instagram. Escolhe "Só Instagram".`); return;
    }
    setStatus('loading'); setMsg('');
    try {
      const { post } = await chamar('/api/admin/marketing/criar-post', {
        produto_id: produtoId || null,
        legenda,
        imagens: [imagemUrl],
        canal,
        agendado_para: !publicarJa && agendarPara ? new Date(agendarPara).toISOString() : null,
        ...(reel ? { video_url: videoUrl } : {}),
      });
      let textoOk = publicarJa ? 'Publicado!' : agendarPara ? 'Agendado!' : 'Guardado como rascunho.';
      if (publicarJa) {
        const r = await chamar('/api/admin/marketing/publicar-agora', { post_id: post.id });
        // Reel do Instagram ainda a processar na Meta: o cron termina a publicação.
        if (r?.pendente) textoOk = r.mensagem ?? 'O Instagram ainda está a processar o vídeo — o Reel é publicado automaticamente daqui a pouco.';
      }
      setStatus('success');
      setMsg(textoOk);
      setLegenda(''); setImagemUrl(''); setProdutoId(''); setAgendarPara('');
      setVideoUrl(''); setInfoVideo(null); setVideoMsg(null);
      setTimeout(() => setStatus('idle'), 3000);
    } catch (e: any) {
      setStatus('error'); setMsg(e.message);
    }
  }

  return (
    <div style={s.card}>
      <div style={{ marginBottom: 18 }}>
        <label style={s.label}><Package size={12} style={{ display: 'inline', marginRight: 4 }} /> Basear num produto (opcional)</label>
        <select value={produtoId} onChange={e => aplicarProduto(e.target.value)} style={s.input}>
          <option value="">— Escrever do zero —</option>
          {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
        </select>
      </div>

      {(
        <div style={{ marginBottom: 18, padding: 14, border: '1px dashed #334155', borderRadius: 10 }}>
          <label style={s.label}><Sparkles size={12} style={{ display: 'inline', marginRight: 4 }} /> Gerar com IA</label>
          <select value={publico} onChange={e => setPublico(e.target.value as 'clientes' | 'makers')} style={{ ...s.input, marginBottom: 10 }}>
            <option value="clientes">Para clientes (produto impresso)</option>
            <option value="makers">Para makers (gerador de STL, imprimem em casa)</option>
          </select>
          {!produtoId && <input value={nomeLivre} onChange={e => setNomeLivre(e.target.value)} style={{ ...s.input, marginBottom: 10 }} placeholder="Nome do produto (ex.: Etiqueta de mochila personalizada)" />}
          <input value={angulo} onChange={e => setAngulo(e.target.value)} style={{ ...s.input, marginBottom: 10 }} placeholder="Ângulo (opcional): ex. regresso às aulas, presente de Natal…" />
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button style={s.btnGhost} disabled={iaEstado !== 'idle'} onClick={gerarTextos}>{iaEstado === 'texto' ? 'A gerar…' : 'Gerar textos'}</button>
            <button style={s.btnGhost} disabled={iaEstado !== 'idle' || !promptImg} onClick={gerarImagem}>{iaEstado === 'imagem' ? 'A gerar imagem…' : 'Gerar imagem'}</button>
          </div>
          {ia && (
            <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
              <div><label style={s.label}>Prompt da imagem (editável)</label>
                <textarea value={promptImg} onChange={e => setPromptImg(e.target.value)} rows={3} style={{ ...s.input, resize: 'vertical' }} /></div>
              <div><label style={s.label}>Texto Facebook</label>
                <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', color: '#cbd5e1' }}>{ia.facebook}</div>
                <button style={{ ...s.btnGhost, marginTop: 6 }} onClick={() => setLegenda(`${ia.facebook}\n\n${(ia.hashtags ?? []).slice(0, 5).join(' ')}`)}>Usar na legenda</button></div>
              <div><label style={s.label}>Guião TikTok / Reels</label>
                <div style={{ fontSize: 13, whiteSpace: 'pre-wrap', color: '#cbd5e1' }}>{ia.tiktok_guiao}</div></div>
            </div>
          )}
          {iaMsg && <p style={{ fontSize: 13, color: '#f87171', marginTop: 8 }}>{iaMsg}</p>}
        </div>
      )}

      <div style={{ marginBottom: 18 }}>
        <label style={s.label}>Legenda</label>
        <textarea value={legenda} onChange={e => setLegenda(e.target.value)} rows={4} style={{ ...s.input, resize: 'vertical' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
        <div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
            <button type="button" onClick={() => setFormato('imagem')} style={{ ...(formato === 'imagem' ? s.btn : s.btnGhost), padding: '6px 12px', fontSize: 12 }}><ImagePlus size={12} /> Imagem</button>
            <button type="button" onClick={() => setFormato('reel')} style={{ ...(formato === 'reel' ? s.btn : s.btnGhost), padding: '6px 12px', fontSize: 12 }}><Film size={12} /> Reel (vídeo)</button>
          </div>
          {formato === 'imagem' ? (
            <>
              <input type="file" accept="image/*" disabled={aCarregar} onChange={e => { carregarFoto(e.target.files?.[0]); e.target.value = ''; }} style={{ ...s.input, marginBottom: 8 }} />
              {aCarregar && <p style={{ fontSize: 12, color: '#8a96aa', marginBottom: 6 }}>A carregar…</p>}
              <input value={imagemUrl} onChange={e => setImagemUrl(e.target.value)} style={s.input} placeholder="ou cola um URL https://..." />
            </>
          ) : (
            <>
              {!videoUrl && (
                <input type="file" accept="video/mp4,video/quicktime" disabled={aEnviarVideo}
                  onChange={e => { carregarVideo(e.target.files?.[0]); e.target.value = ''; }} style={{ ...s.input, marginBottom: 8 }} />
              )}
              {aEnviarVideo && <p style={{ fontSize: 12, color: '#8a96aa', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}><Loader2 size={12} className="animate-spin" /> A enviar o vídeo… (pode demorar se for grande)</p>}
              {videoUrl && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#4ade80' }}>Vídeo pronto</span>
                  <button type="button" style={{ ...s.btnGhost, padding: '4px 10px', fontSize: 11 }} onClick={limparVideo}>Trocar vídeo</button>
                </div>
              )}
              {videoMsg && <p style={{ fontSize: 12, color: videoMsg.erro ? '#f87171' : '#cbd5e1', marginBottom: 6 }}>{videoMsg.t}</p>}
              <p style={{ fontSize: 11, color: '#64748b' }}>MP4 ou MOV, vertical 9:16, até 50 MB. Facebook: 3–90 s · Instagram: até 15 min.</p>
            </>
          )}
        </div>
        <div>
          <label style={s.label}>Canal</label>
          <select value={canal} onChange={e => setCanal(e.target.value as any)} style={s.input}>
            <option value="ambos">Instagram + Facebook</option>
            <option value="instagram">Só Instagram</option>
            <option value="facebook">Só Facebook</option>
          </select>
        </div>
      </div>

      {(imagemUrl || legenda || videoUrl) && (
        <div style={{ marginBottom: 18 }}>
          <label style={s.label}>Pré-visualização {canal === 'ambos' ? '(Instagram e Facebook)' : `(${canal === 'instagram' ? 'Instagram' : 'Facebook'})`}</label>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {(canal === 'ambos' || canal === 'instagram') && <PreviewPost rede="Instagram" imagem={imagemUrl} legenda={legenda} video={formato === 'reel' ? videoUrl : undefined} />}
            {(canal === 'ambos' || canal === 'facebook') && <PreviewPost rede="Facebook" imagem={imagemUrl} legenda={legenda} video={formato === 'reel' ? videoUrl : undefined} />}
          </div>
        </div>
      )}

      <div style={{ marginBottom: 18 }}>
        <label style={s.label}><Clock size={12} style={{ display: 'inline', marginRight: 4 }} /> Agendar para (opcional — deixa vazio para publicar agora ou guardar rascunho)</label>
        <input type="datetime-local" value={agendarPara} onChange={e => setAgendarPara(e.target.value)} style={s.input} />
      </div>

      {msg && <p style={{ fontSize: 13, color: status === 'error' ? '#f87171' : '#4ade80', marginBottom: 14 }}>{msg}</p>}

      <div style={{ display: 'flex', gap: 10 }}>
        <button style={s.btnGhost} disabled={status === 'loading'} onClick={() => guardar(false)}>
          {agendarPara ? <Clock size={14} /> : null} {agendarPara ? 'Aprovar agendamento' : 'Guardar rascunho'}
        </button>
        <button style={agendarPara ? s.btnGhost : s.btn} disabled={status === 'loading'} onClick={() => guardar(true)}>
          <Send size={14} /> Aprovar e publicar agora
        </button>
      </div>
    </div>
  );
}

function PreviewPost({ rede, imagem, legenda, video }: { rede: string; imagem: string; legenda: string; video?: string }) {
  return (
    <div style={{ width: 300, background: '#fff', color: '#111', borderRadius: 12, overflow: 'hidden', border: '1px solid #1e293b' }}>
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 700 }}>
        <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#1d4ed8', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>pp3d</div>
        pp3d.pt <span style={{ marginLeft: 'auto', fontSize: 11, color: '#64748b', fontWeight: 400 }}>{rede}</span>
      </div>
      {video
        ? <video src={video} poster={imagem || undefined} controls muted playsInline style={{ width: '100%', aspectRatio: '9 / 16', objectFit: 'cover', display: 'block', background: '#000' }} />
        : imagem
        ? <img src={imagem} alt="" style={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }} />
        : <div style={{ width: '100%', aspectRatio: '1 / 1', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 12 }}>Sem imagem</div>}
      <div style={{ padding: '10px 12px', fontSize: 13, whiteSpace: 'pre-wrap', maxHeight: 160, overflow: 'auto' }}>{legenda || '—'}</div>
    </div>
  );
}


// ── Série de publicações com IA ─────────────────────────────────────────────

interface ItemSerie { angulo: string; legenda: string; prompt: string; imagem: string; quando: string; incluir: boolean; estado: 'a-gerar' | 'ok' | 'erro'; erro?: string }

function SerieIA() {
  const [produtos, setProdutos] = useState<ProdutoRef[]>([]);
  const [produtoId, setProdutoId] = useState('');
  const [nomeLivre, setNomeLivre] = useState('');
  const [tema, setTema] = useState('');
  const [publicoS, setPublicoS] = useState<'clientes' | 'makers'>('clientes');
  const [n, setN] = useState(4);
  const [canal, setCanal] = useState<'instagram' | 'facebook' | 'ambos'>('ambos');
  const [itens, setItens] = useState<ItemSerie[]>([]);
  const [fase, setFase] = useState<'idle' | 'textos' | 'imagens' | 'guardar'>('idle');
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('prod_loja_produtos').select('id, nome, descricao').in('estado', ['ativo', 'rascunho']).order('nome');
      setProdutos((data ?? []) as unknown as ProdutoRef[]);
    })();
  }, []);

  function atualizar(i: number, patch: Partial<ItemSerie>) {
    setItens(prev => prev.map((it, k) => (k === i ? { ...it, ...patch } : it)));
  }

  // Datas sugeridas: um dia sim, dia não, às 18:00, a começar amanhã (hora local).
  function dataSugerida(i: number) {
    const d = new Date();
    d.setDate(d.getDate() + 1 + i * 2);
    d.setHours(18, 0, 0, 0);
    const p = (x: number) => String(x).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  async function gerarSerie() {
    const prod = produtos.find(x => x.id === produtoId);
    const nome = prod?.nome ?? nomeLivre.trim();
    if (!nome) { setMsg('Escolhe um produto ou escreve o nome.'); setOk(false); return; }
    setFase('textos'); setMsg(''); setItens([]);
    try {
      const { posts } = await chamar('/api/admin/marketing/gerar-serie', { nome, descricao: prod?.descricao ?? '', angulo: tema, n, publico: publicoS });
      const base: ItemSerie[] = (posts as { angulo?: string; legenda: string; prompt_imagem: string }[]).map((p, i) => ({
        angulo: p.angulo ?? `Publicação ${i + 1}`, legenda: p.legenda, prompt: p.prompt_imagem,
        imagem: '', quando: dataSugerida(i), incluir: true, estado: 'a-gerar',
      }));
      setItens(base);
      setFase('imagens');
      // Imagens uma a uma (cada chamada é um pedido separado ao servidor).
      for (let i = 0; i < base.length; i++) {
        try {
          const { url } = await chamar('/api/admin/marketing/gerar-imagem', { prompt: base[i].prompt });
          setItens(prev => prev.map((it, k) => (k === i ? { ...it, imagem: url, estado: 'ok' } : it)));
        } catch (e: any) {
          setItens(prev => prev.map((it, k) => (k === i ? { ...it, estado: 'erro', erro: e.message } : it)));
        }
      }
    } catch (e: any) { setMsg(e.message); setOk(false); }
    setFase('idle');
  }

  async function regenerarImagem(i: number) {
    atualizar(i, { estado: 'a-gerar', erro: undefined });
    try {
      const { url } = await chamar('/api/admin/marketing/gerar-imagem', { prompt: itens[i].prompt });
      atualizar(i, { imagem: url, estado: 'ok' });
    } catch (e: any) { atualizar(i, { estado: 'erro', erro: e.message }); }
  }

  async function aprovarSerie() {
    const sel = itens.filter(it => it.incluir && it.imagem && it.legenda.trim() && it.quando);
    if (sel.length === 0) { setMsg('Nenhuma publicação completa selecionada (precisa de imagem, legenda e data).'); setOk(false); return; }
    setFase('guardar'); setMsg('');
    let feitos = 0;
    try {
      for (const it of sel) {
        await chamar('/api/admin/marketing/criar-post', {
          produto_id: produtoId || null, legenda: it.legenda, imagens: [it.imagem], canal,
          agendado_para: new Date(it.quando).toISOString(),
        });
        feitos++;
      }
      setOk(true); setMsg(`${feitos} publicações agendadas. Vê-as em "Fila / Calendário".`);
      setItens([]);
    } catch (e: any) { setOk(false); setMsg(`Agendadas ${feitos} de ${sel.length}. Erro: ${e.message}`); }
    setFase('idle');
  }

  return (
    <div style={s.card}>
      <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}><Sparkles size={16} /> Série de publicações com IA</h2>
      <p style={{ fontSize: 12, color: '#8a96aa', marginBottom: 16 }}>Gera várias publicações do mesmo produto, com ângulos e imagens diferentes, para agendar em dias distintos.</p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={s.label}>Produto</label>
          <select value={produtoId} onChange={e => setProdutoId(e.target.value)} style={s.input}>
            <option value="">— Escrever o nome —</option>
            {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
        <div>
          <label style={s.label}>Canal</label>
          <select value={canal} onChange={e => setCanal(e.target.value as any)} style={s.input}>
            <option value="ambos">Instagram + Facebook</option>
            <option value="instagram">Só Instagram</option>
            <option value="facebook">Só Facebook</option>
          </select>
        </div>
      </div>
      <select value={publicoS} onChange={e => setPublicoS(e.target.value as 'clientes' | 'makers')} style={{ ...s.input, marginBottom: 12 }}>
        <option value="clientes">Para clientes (produto impresso)</option>
        <option value="makers">Para makers (gerador de STL, imprimem em casa)</option>
      </select>
      {!produtoId && <input value={nomeLivre} onChange={e => setNomeLivre(e.target.value)} style={{ ...s.input, marginBottom: 12 }} placeholder="Nome do produto" />}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 12, marginBottom: 14 }}>
        <input value={tema} onChange={e => setTema(e.target.value)} style={s.input} placeholder="Tema (opcional): ex. regresso às aulas, Natal…" />
        <select value={n} onChange={e => setN(Number(e.target.value))} style={s.input}>
          {[2, 3, 4, 5, 6].map(x => <option key={x} value={x}>{x} posts</option>)}
        </select>
      </div>
      <button style={s.btn} disabled={fase !== 'idle'} onClick={gerarSerie}>
        <Sparkles size={14} /> {fase === 'textos' ? 'A escrever…' : fase === 'imagens' ? 'A gerar imagens…' : 'Gerar série'}
      </button>

      {itens.length > 0 && (
        <div style={{ marginTop: 20, display: 'grid', gap: 16 }}>
          {itens.map((it, i) => (
            <div key={i} style={{ border: '1px solid #1e293b', borderRadius: 12, padding: 14, opacity: it.incluir ? 1 : 0.5 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <input type="checkbox" checked={it.incluir} onChange={e => atualizar(i, { incluir: e.target.checked })} />
                <strong style={{ fontSize: 13 }}>{i + 1}. {it.angulo}</strong>
                <input type="datetime-local" value={it.quando} onChange={e => atualizar(i, { quando: e.target.value })} style={{ ...s.input, width: 210, marginLeft: 'auto' }} />
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <PreviewPost rede={canal === 'facebook' ? 'Facebook' : 'Instagram'} imagem={it.imagem} legenda={it.legenda} />
                <div style={{ flex: 1, minWidth: 240 }}>
                  <label style={s.label}>Legenda</label>
                  <textarea value={it.legenda} onChange={e => atualizar(i, { legenda: e.target.value })} rows={6} style={{ ...s.input, resize: 'vertical', marginBottom: 8 }} />
                  <label style={s.label}>Prompt da imagem</label>
                  <textarea value={it.prompt} onChange={e => atualizar(i, { prompt: e.target.value })} rows={3} style={{ ...s.input, resize: 'vertical', marginBottom: 8 }} />
                  <button style={s.btnGhost} disabled={it.estado === 'a-gerar'} onClick={() => regenerarImagem(i)}>{it.estado === 'a-gerar' ? 'A gerar…' : 'Gerar outra imagem'}</button>
                  {it.estado === 'erro' && <p style={{ fontSize: 12, color: '#f87171', marginTop: 6 }}>{it.erro}</p>}
                </div>
              </div>
            </div>
          ))}
          <div>
            <button style={s.btn} disabled={fase !== 'idle'} onClick={aprovarSerie}><Clock size={14} /> Aprovar agendamento da série</button>
          </div>
        </div>
      )}
      {msg && <p style={{ fontSize: 13, color: ok ? '#4ade80' : '#f87171', marginTop: 14 }}>{msg}</p>}
    </div>
  );
}

// ── Tab: Fila ────────────────────────────────────────────────────────────────

function Fila() {
  const [posts, setPosts] = useState<PostMarketing[]>([]);
  const [ads, setAds] = useState<AdPago[]>([]);
  const [aImpulsionar, setAImpulsionar] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [{ data: p }, { data: a }] = await Promise.all([
      supabase.from('prod_marketing_posts').select('*').order('created_at', { ascending: false }).limit(30),
      supabase.from('prod_marketing_ads').select('*').order('created_at', { ascending: false }),
    ]);
    setPosts((p ?? []) as PostMarketing[]);
    setAds((a ?? []) as AdPago[]);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function publicar(id: string) {
    await chamar('/api/admin/marketing/publicar-agora', { post_id: id })
      .then(r => { if (r?.pendente) alert(r.mensagem); })
      .catch(e => alert(e.message));
    carregar();
  }

  if (loading) return <p style={{ color: '#8a96aa' }}>A carregar...</p>;
  if (posts.length === 0) return <p style={{ color: '#8a96aa' }}>Ainda não há publicações. Cria a primeira no separador "Criar publicação".</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {posts.map(post => (
        <div key={post.id} style={s.card}>
          <div style={{ display: 'flex', gap: 14 }}>
            {post.video_url
              ? <video src={post.video_url} muted loop playsInline onMouseEnter={e => e.currentTarget.play()} onMouseLeave={e => e.currentTarget.pause()} style={{ width: 64, height: 114, objectFit: 'cover', borderRadius: 8, background: '#0a1120' }} />
              : post.imagens?.[0] && <img src={post.imagens[0]} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <span style={s.badge(ESTADO_COR[post.estado])}>{post.estado}</span>
                <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>{post.canal}</span>
                {post.video_url && <span style={s.badge('#a855f7')}>Reel{post.abordagem ? ` · ${post.abordagem}` : ''}</span>}
              </div>
              <p style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}>{post.legenda.slice(0, 140)}{post.legenda.length > 140 ? '…' : ''}</p>
              {post.erro && <p style={{ fontSize: 12, color: '#f87171' }}>Erro: {post.erro}</p>}
              {post.agendado_para && post.estado === 'agendado' && (
                <p style={{ fontSize: 11, color: '#f59e0b' }}>Agendado para {new Date(post.agendado_para).toLocaleString('pt-PT')}</p>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(post.estado === 'rascunho' || post.estado === 'agendado' || post.estado === 'falhou') && (
                <button style={s.btn} onClick={() => publicar(post.id)}><Send size={13} /> Publicar</button>
              )}
              {post.estado === 'publicado' && !post.video_url && (
                <button style={s.btnGhost} onClick={() => setAImpulsionar(aImpulsionar === post.id ? null : post.id)}>
                  <TrendingUp size={13} /> Impulsionar
                </button>
              )}
            </div>
          </div>

          {aImpulsionar === post.id && <ImpulsionarPainel post={post} onCriado={() => { setAImpulsionar(null); carregar(); }} />}

          {ads.filter(a => a.post_id === post.id).map(ad => (
            <CampanhaLinha key={ad.id} ad={ad} onMudou={carregar} />
          ))}
        </div>
      ))}
    </div>
  );
}

function ImpulsionarPainel({ post, onCriado }: { post: PostMarketing; onCriado: () => void }) {
  const [idadeMin, setIdadeMin] = useState(18);
  const [idadeMax, setIdadeMax] = useState(45);
  const [localizacoes, setLocalizacoes] = useState('PT');
  const [orcamento, setOrcamento] = useState(5);
  const [estimativa, setEstimativa] = useState<{ alcanceMin: number | null; alcanceMax: number | null } | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [erro, setErro] = useState('');

  function publico() {
    return { idade_min: idadeMin, idade_max: idadeMax, generos: ['homem', 'mulher'], localizacoes: localizacoes.split(',').map(s => s.trim()).filter(Boolean) };
  }

  async function verPrevisao() {
    setStatus('loading'); setErro('');
    try {
      const r = await chamar('/api/admin/marketing/estimar-alcance', { publico: publico(), orcamento_diario_cents: orcamento * 100 });
      setEstimativa(r);
      setStatus('idle');
    } catch (e: any) { setStatus('error'); setErro(e.message); }
  }

  async function criarCampanha() {
    setStatus('loading'); setErro('');
    try {
      await chamar('/api/admin/marketing/criar-campanha-paga', {
        post_id: post.id, nome: `Impulso — ${post.legenda.slice(0, 30)}`, publico: publico(), orcamento_diario_cents: orcamento * 100,
      });
      onCriado();
    } catch (e: any) { setStatus('error'); setErro(e.message); }
  }

  return (
    <div style={{ marginTop: 14, padding: 16, background: '#0a1120', borderRadius: 10, border: '1px solid #1e293b' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 12 }}>
        <div><label style={s.label}>Idade mín.</label><input type="number" value={idadeMin} onChange={e => setIdadeMin(+e.target.value)} style={s.input} /></div>
        <div><label style={s.label}>Idade máx.</label><input type="number" value={idadeMax} onChange={e => setIdadeMax(+e.target.value)} style={s.input} /></div>
        <div><label style={s.label}>Países (ISO, vírgulas)</label><input value={localizacoes} onChange={e => setLocalizacoes(e.target.value)} style={s.input} /></div>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={s.label}>Orçamento diário: €{orcamento}</label>
        <input type="range" min={1} max={50} value={orcamento} onChange={e => setOrcamento(+e.target.value)} style={{ width: '100%' }} />
      </div>
      {estimativa && (
        <p style={{ fontSize: 13, color: '#4ade80', marginBottom: 12 }}>
          Alcance estimado: {estimativa.alcanceMin ?? '?'} – {estimativa.alcanceMax ?? '?'} pessoas/dia
        </p>
      )}
      {erro && <p style={{ fontSize: 12, color: '#f87171', marginBottom: 12 }}>{erro}</p>}
      <div style={{ display: 'flex', gap: 10 }}>
        <button style={s.btnGhost} disabled={status === 'loading'} onClick={verPrevisao}>Ver previsão</button>
        <button style={s.btn} disabled={status === 'loading'} onClick={criarCampanha}>Criar campanha (fica pausada)</button>
      </div>
    </div>
  );
}

function CampanhaLinha({ ad, onMudou }: { ad: AdPago; onMudou: () => void }) {
  const [confirmar, setConfirmar] = useState(false);
  const [loading, setLoading] = useState(false);

  async function ativar() {
    setLoading(true);
    try {
      await chamar('/api/admin/marketing/ativar-campanha', { ad_id: ad.id, confirmar: true });
      onMudou();
    } catch (e: any) { alert(e.message); } finally { setLoading(false); setConfirmar(false); }
  }

  async function pausar() {
    setLoading(true);
    try {
      await chamar('/api/admin/marketing/pausar-campanha', { ad_id: ad.id });
      onMudou();
    } catch (e: any) { alert(e.message); } finally { setLoading(false); }
  }

  return (
    <div style={{ marginTop: 10, padding: 12, background: '#0a1120', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
      <span style={s.badge(ESTADO_COR[ad.estado])}>{ad.estado}</span>
      <span style={{ fontSize: 12, color: '#cbd5e1', flex: 1 }}>
        €{(ad.orcamento_diario_cents / 100).toFixed(2)}/dia
        {ad.previsao_alcance_min ? ` · alcance previsto ${ad.previsao_alcance_min}–${ad.previsao_alcance_max}` : ''}
        {ad.gasto_real_cents > 0 ? ` · gasto real €${(ad.gasto_real_cents / 100).toFixed(2)}` : ''}
      </span>
      {ad.estado === 'pausada' && !confirmar && (
        <button style={s.btnGhost} onClick={() => setConfirmar(true)}><Play size={13} /> Ativar</button>
      )}
      {ad.estado === 'pausada' && confirmar && (
        <>
          <span style={{ fontSize: 11, color: '#f59e0b' }}>Confirma que queres começar a gastar €{(ad.orcamento_diario_cents / 100).toFixed(2)}/dia?</span>
          <button style={s.btn} disabled={loading} onClick={ativar}>Sim, ativar</button>
          <button style={s.btnGhost} onClick={() => setConfirmar(false)}>Cancelar</button>
        </>
      )}
      {ad.estado === 'ativa' && (
        <button style={s.btnGhost} disabled={loading} onClick={pausar}><Pause size={13} /> Pausar</button>
      )}
    </div>
  );
}

// ── Tab: Analytics ───────────────────────────────────────────────────────────

function Analytics() {
  const [porProduto, setPorProduto] = useState<{ nome: string; receita: number }[]>([]);
  const [campanhas, setCampanhas] = useState<{ titulo: string; vistas: number; cliques: number }[]>([]);
  const [sugestoes, setSugestoes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [versaoHistorico, setVersaoHistorico] = useState(0);

  useEffect(() => {
    (async () => {
      const desde = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [{ data: itens }, { data: camp }] = await Promise.all([
        supabase
          .from('prod_loja_encomenda_itens')
          .select('nome, quantidade, preco_cents, prod_loja_encomendas!inner(created_at, estado)')
          .gte('prod_loja_encomendas.created_at', desde)
          .eq('prod_loja_encomendas.estado', 'pago'),
        supabase.from('prod_campanhas').select('titulo, vistas, cliques').order('created_at', { ascending: false }).limit(8),
      ]);

      const mapa = new Map<string, number>();
      for (const item of (itens ?? []) as any[]) {
        if (!item.nome) continue;
        mapa.set(item.nome, (mapa.get(item.nome) ?? 0) + (item.preco_cents ?? 0) * (item.quantidade ?? 0) / 100);
      }
      const top = [...mapa.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([nome, receita]) => ({ nome, receita: Math.round(receita) }));
      setPorProduto(top);

      const campData = (camp ?? []).map((c: any) => ({ titulo: c.titulo, vistas: c.vistas ?? 0, cliques: c.cliques ?? 0 }));
      setCampanhas(campData);

      const novasSugestoes: string[] = [];
      for (const c of campData) {
        if (c.vistas > 20 && c.cliques / c.vistas < 0.02) {
          novasSugestoes.push(`A campanha "${c.titulo}" teve ${c.vistas} vistas mas quase nenhum clique (${c.cliques}) — considera rever o texto ou a imagem.`);
        }
      }
      if (top.length > 0) {
        novasSugestoes.push(`"${top[0].nome}" é o produto com mais receita nos últimos 30 dias — bom candidato a impulsionar.`);
      }
      setSugestoes(novasSugestoes);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p style={{ color: '#8a96aa' }}>A carregar...</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <EstadoPlataformas onAtualizado={() => setVersaoHistorico(v => v + 1)} />

      <div style={s.card}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Receita por produto (últimos 30 dias)</h3>
        {porProduto.length === 0 ? <p style={{ color: '#64748b', fontSize: 13 }}>Sem vendas confirmadas ainda.</p> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={porProduto}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="nome" tick={{ fill: '#8a96aa', fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={70} />
              <YAxis tick={{ fill: '#8a96aa', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }} formatter={((v: number) => [`€${v}`, 'Receita']) as any} />
              <Bar dataKey="receita" fill="#6366f1" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={s.card}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16 }}>Campanhas internas — vistas vs. cliques</h3>
        {campanhas.length === 0 ? <p style={{ color: '#64748b', fontSize: 13 }}>Sem campanhas ainda.</p> : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={campanhas}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="titulo" tick={{ fill: '#8a96aa', fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={70} />
              <YAxis tick={{ fill: '#8a96aa', fontSize: 11 }} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b' }} />
              <Bar dataKey="vistas" fill="#334155" radius={[6, 6, 0, 0]} />
              <Bar dataKey="cliques" fill="#22c55e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div style={s.card}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Megaphone size={16} className="text-indigo-400" /> Sugestões
        </h3>
        {sugestoes.length === 0
          ? <p style={{ color: '#64748b', fontSize: 13 }}>Sem sugestões — precisa de mais dados acumulados.</p>
          : <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {sugestoes.map((s2, i) => <li key={i} style={{ fontSize: 13, color: '#cbd5e1', paddingLeft: 14, borderLeft: '2px solid #6366f1' }}>{s2}</li>)}
            </ul>}
      </div>

      <HistoricoMetricas key={versaoHistorico} />
    </div>
  );
}

// ── Analytics: estado real em cada plataforma ───────────────────────────────

type EstadoNaRede = 'publicado' | 'a_processar' | 'removido' | 'erro' | 'nao_publicado';
interface EstadoRede { estado: EstadoNaRede; detalhe?: string; link?: string; publicadoEm?: string; metricas?: Record<string, number> }
interface PostEstado {
  id: string; legenda: string; thumb: string | null; video_url: string | null; abordagem: string | null;
  canal: string; estado: string; erro: string | null; agendado_para: string | null; publicado_em: string | null;
  instagram: EstadoRede | null; facebook: EstadoRede | null;
}
interface AdEstado {
  id: string; post_id: string; nome: string; estado: string; orcamento_diario_cents: number;
  meta: {
    campanhaStatus?: string; efetivo?: string; anuncioEfetivo?: string; problemas: string[];
    gastoCents: number; impressoes: number; alcance: number; cliques: number; erro?: string;
  };
}

const REDE_INFO: Record<EstadoNaRede, { cor: string; texto: string }> = {
  publicado: { cor: '#22c55e', texto: 'Publicado' },
  a_processar: { cor: '#f59e0b', texto: 'A processar' },
  removido: { cor: '#94a3b8', texto: 'Removido' },
  erro: { cor: '#ef4444', texto: 'Erro' },
  nao_publicado: { cor: '#64748b', texto: 'Não publicado' },
};

// effective_status da Marketing API → texto e cor
const AD_INFO: Record<string, { cor: string; texto: string }> = {
  ACTIVE: { cor: '#22c55e', texto: 'A correr' },
  PAUSED: { cor: '#64748b', texto: 'Pausada' },
  CAMPAIGN_PAUSED: { cor: '#64748b', texto: 'Campanha pausada' },
  ADSET_PAUSED: { cor: '#64748b', texto: 'Conjunto pausado' },
  IN_PROCESS: { cor: '#f59e0b', texto: 'A processar' },
  PENDING_REVIEW: { cor: '#f59e0b', texto: 'Em revisão' },
  PREAPPROVED: { cor: '#f59e0b', texto: 'Pré-aprovada' },
  PENDING_BILLING_INFO: { cor: '#ef4444', texto: 'Falta pagamento' },
  WITH_ISSUES: { cor: '#ef4444', texto: 'Com problemas' },
  DISAPPROVED: { cor: '#ef4444', texto: 'Rejeitada' },
  DELETED: { cor: '#94a3b8', texto: 'Apagada' },
  ARCHIVED: { cor: '#94a3b8', texto: 'Arquivada' },
};

const METRICA_NOME: Record<string, string> = {
  visualizacoes: 'vistas', alcance: 'alcance', gostos: 'gostos', comentarios: 'coment.', guardados: 'guard.', partilhas: 'partilhas',
};

function ChipRede({ nome, r }: { nome: string; r: EstadoRede }) {
  const info = REDE_INFO[r.estado];
  const metricas = Object.entries(r.metricas ?? {}).filter(([k]) => METRICA_NOME[k]);
  return (
    <div style={{ flex: 1, minWidth: 220, padding: 10, background: '#0a1120', borderRadius: 8, border: `1px solid ${info.cor}33` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <strong style={{ fontSize: 12 }}>{nome}</strong>
        <span style={s.badge(info.cor)}>{info.texto}</span>
        {r.link && (
          <a href={r.link} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', color: '#8a96aa', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
            abrir <ExternalLink size={11} />
          </a>
        )}
      </div>
      {metricas.length > 0 && (
        <p style={{ fontSize: 12, color: '#cbd5e1' }}>
          {metricas.map(([k, v]) => `${v.toLocaleString('pt-PT')} ${METRICA_NOME[k]}`).join(' · ')}
        </p>
      )}
      {r.detalhe && <p style={{ fontSize: 11, color: r.estado === 'erro' ? '#f87171' : '#8a96aa', marginTop: 2 }}>{r.detalhe}</p>}
    </div>
  );
}

function EstadoPlataformas({ onAtualizado }: { onAtualizado?: () => void }) {
  // Em ref para o carregar() não mudar a cada render do pai (evita ciclo de pedidos).
  const onAtualizadoRef = useRef(onAtualizado);
  onAtualizadoRef.current = onAtualizado;
  const [dados, setDados] = useState<{ atualizadoEm: string; posts: PostEstado[]; ads: AdEstado[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true); setErro('');
    try {
      const res = await fetch('/api/admin/marketing/estado-plataformas', { cache: 'no-store' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Erro ao consultar as plataformas.');
      setDados(json);
      onAtualizadoRef.current?.();
    } catch (e: any) { setErro(e.message); } finally { setLoading(false); }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const resumo = (() => {
    const c = { publicado: 0, a_processar: 0, erro: 0, removido: 0 };
    for (const p of dados?.posts ?? []) for (const r of [p.instagram, p.facebook]) {
      if (r && r.estado in c) c[r.estado as keyof typeof c]++;
    }
    return c;
  })();

  return (
    <div style={s.card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700 }}>Estado nas plataformas</h3>
        {dados && <span style={{ fontSize: 11, color: '#64748b' }}>verificado às {new Date(dados.atualizadoEm).toLocaleTimeString('pt-PT')}</span>}
        <button style={{ ...s.btnGhost, marginLeft: 'auto', padding: '6px 12px' }} disabled={loading} onClick={carregar}>
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> {loading ? 'A verificar…' : 'Atualizar'}
        </button>
      </div>

      {erro && <p style={{ fontSize: 13, color: '#f87171', marginBottom: 12 }}>{erro}</p>}
      {!dados && loading && <p style={{ color: '#8a96aa', fontSize: 13 }}>A perguntar à Meta o estado de cada publicação…</p>}

      {dados && (
        <>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
            <span style={s.badge('#22c55e')}>{resumo.publicado} publicadas</span>
            {resumo.a_processar > 0 && <span style={s.badge('#f59e0b')}>{resumo.a_processar} a processar</span>}
            {resumo.erro > 0 && <span style={s.badge('#ef4444')}>{resumo.erro} com erro</span>}
            {resumo.removido > 0 && <span style={s.badge('#94a3b8')}>{resumo.removido} removidas</span>}
          </div>

          <h4 style={{ ...s.label, marginBottom: 10 }}>Publicações (últimos 30 dias)</h4>
          {dados.posts.length === 0 ? <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>Sem publicações agendadas ou publicadas nos últimos 30 dias.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              {dados.posts.map(p => (
                <div key={p.id} style={{ display: 'flex', gap: 12, paddingBottom: 12, borderBottom: '1px solid #1e293b' }}>
                  {p.video_url
                    ? <video src={p.video_url} muted playsInline style={{ width: 40, height: 70, objectFit: 'cover', borderRadius: 6, background: '#0a1120' }} />
                    : p.thumb && <img src={p.thumb} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={s.badge(ESTADO_COR[p.estado] ?? '#64748b')}>{p.estado}</span>
                      {p.video_url && <span style={s.badge('#a855f7')}>Reel{p.abordagem ? ` · ${p.abordagem}` : ''}</span>}
                      <span style={{ fontSize: 11, color: '#64748b' }}>
                        {p.publicado_em ? new Date(p.publicado_em).toLocaleString('pt-PT')
                          : p.agendado_para ? `agendado ${new Date(p.agendado_para).toLocaleString('pt-PT')}` : ''}
                      </span>
                    </div>
                    <p style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.legenda}</p>
                    {p.erro && <p style={{ fontSize: 11, color: '#f87171', marginBottom: 6 }}>Último erro: {p.erro}</p>}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {p.instagram && <ChipRede nome="Instagram" r={p.instagram} />}
                      {p.facebook && <ChipRede nome="Facebook" r={p.facebook} />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h4 style={{ ...s.label, marginBottom: 10 }}>Anúncios pagos (Meta Ads)</h4>
          {dados.ads.length === 0 ? <p style={{ color: '#64748b', fontSize: 13 }}>Sem campanhas pagas criadas.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dados.ads.map(a => {
                const efetivo = a.meta.anuncioEfetivo && a.meta.anuncioEfetivo !== 'ACTIVE' && a.meta.efetivo === 'ACTIVE' ? a.meta.anuncioEfetivo : a.meta.efetivo;
                const info = efetivo ? (AD_INFO[efetivo] ?? { cor: '#64748b', texto: efetivo }) : { cor: '#ef4444', texto: 'Sem dados' };
                const desalinhado = (a.estado === 'ativa' && a.meta.campanhaStatus === 'PAUSED') || (a.estado === 'pausada' && a.meta.campanhaStatus === 'ACTIVE');
                return (
                  <div key={a.id} style={{ padding: 12, background: '#0a1120', borderRadius: 8, border: `1px solid ${info.cor}33` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                      <strong style={{ fontSize: 13 }}>{a.nome}</strong>
                      <span style={s.badge(info.cor)}>Meta: {info.texto}</span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>no pp3d: {a.estado} · €{(a.orcamento_diario_cents / 100).toFixed(2)}/dia</span>
                    </div>
                    {!a.meta.erro && (
                      <p style={{ fontSize: 12, color: '#cbd5e1' }}>
                        Gasto €{(a.meta.gastoCents / 100).toFixed(2)} · {a.meta.impressoes.toLocaleString('pt-PT')} impressões · {a.meta.alcance.toLocaleString('pt-PT')} alcance · {a.meta.cliques.toLocaleString('pt-PT')} cliques
                        {a.meta.cliques > 0 && a.meta.gastoCents > 0 ? ` · €${(a.meta.gastoCents / 100 / a.meta.cliques).toFixed(2)}/clique` : ''}
                      </p>
                    )}
                    {desalinhado && <p style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>O estado na Meta ({a.meta.campanhaStatus}) não coincide com o do pp3d — foi alterada no Gestor de Anúncios?</p>}
                    {a.meta.erro && <p style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>{a.meta.erro}</p>}
                    {a.meta.problemas.map((pr, i) => <p key={i} style={{ fontSize: 11, color: '#f87171', marginTop: 4 }}>{pr}</p>)}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Analytics: histórico de todos os tempos + melhores resultados ───────────

interface LinhaHistorico {
  post_id: string; plataforma: 'instagram' | 'facebook'; estado: string | null; link: string | null;
  visualizacoes: number; alcance: number; gostos: number; comentarios: number; guardados: number; partilhas: number;
  arquivado_em: string | null;
  legenda: string; thumb: string | null; video: boolean; abordagem: string | null; publicado_em: string | null;
  interacoes: number; taxa: number | null; // taxa de envolvimento = interações / alcance
}
interface AdHistorico {
  id: string; nome: string; estado: string; gasto_real_cents: number; impressoes: number; alcance: number; cliques: number; created_at: string;
}

type ColunaOrd = 'publicado_em' | 'visualizacoes' | 'alcance' | 'gostos' | 'comentarios' | 'guardados' | 'partilhas' | 'interacoes' | 'taxa';

const COLUNAS: { k: ColunaOrd; t: string }[] = [
  { k: 'visualizacoes', t: 'Vistas' }, { k: 'alcance', t: 'Alcance' }, { k: 'gostos', t: 'Gostos' },
  { k: 'comentarios', t: 'Coment.' }, { k: 'guardados', t: 'Guard.' }, { k: 'partilhas', t: 'Partilhas' },
  { k: 'interacoes', t: 'Interações' }, { k: 'taxa', t: 'Envolv.' },
];

const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const ALCANCE_MINIMO_RANKING = 20; // abaixo disto a taxa de envolvimento é ruído

const fmt = (n: number) => n.toLocaleString('pt-PT');
const pct = (x: number | null) => (x == null ? '—' : `${(x * 100).toFixed(1)}%`);
const th: React.CSSProperties = { textAlign: 'right', padding: '8px 6px', fontSize: 11, color: '#8a96aa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #1e293b', whiteSpace: 'nowrap' };
const td: React.CSSProperties = { textAlign: 'right', padding: '7px 6px', fontSize: 12, color: '#cbd5e1', borderBottom: '1px solid #131c2e', whiteSpace: 'nowrap' };

function periodoDoDia(d: Date) {
  const h = d.getHours();
  return h < 12 ? 'Manhã (até 12h)' : h < 18 ? 'Tarde (12h–18h)' : 'Noite (depois das 18h)';
}

/** Médias por grupo, para comparar (rede, formato, abordagem, dia, hora). */
function agrupar(linhas: LinhaHistorico[], chave: (l: LinhaHistorico) => string | null) {
  const g = new Map<string, LinhaHistorico[]>();
  for (const l of linhas) {
    const k = chave(l);
    if (!k) continue;
    g.set(k, [...(g.get(k) ?? []), l]);
  }
  const out = [...g.entries()].map(([nome, ls]) => {
    const alc = ls.reduce((a, l) => a + l.alcance, 0);
    return {
      nome, n: ls.length,
      vistas: ls.reduce((a, l) => a + l.visualizacoes, 0) / ls.length,
      alcance: alc / ls.length,
      interacoes: ls.reduce((a, l) => a + l.interacoes, 0) / ls.length,
      taxa: alc > 0 ? ls.reduce((a, l) => a + l.interacoes, 0) / alc : null,
    };
  });
  return out.sort((a, b) => (b.taxa ?? -1) - (a.taxa ?? -1));
}

function TabelaComparacao({ titulo, grupos }: { titulo: string; grupos: ReturnType<typeof agrupar> }) {
  if (grupos.length < 2) return null; // só faz sentido comparar com pelo menos 2 grupos
  const melhorVistas = Math.max(...grupos.map(g => g.vistas));
  return (
    <div style={{ flex: 1, minWidth: 280 }}>
      <h4 style={{ ...s.label, marginBottom: 6 }}>{titulo}</h4>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr>
          <th style={{ ...th, textAlign: 'left' }}></th><th style={th}>Posts</th><th style={th}>Vistas méd.</th><th style={th}>Alcance méd.</th><th style={th}>Envolv.</th>
        </tr></thead>
        <tbody>
          {grupos.map((g, i) => (
            <tr key={g.nome}>
              <td style={{ ...td, textAlign: 'left', color: i === 0 ? '#facc15' : '#cbd5e1', fontWeight: i === 0 ? 700 : 400 }}>{i === 0 ? '★ ' : ''}{g.nome}</td>
              <td style={td}>{g.n}</td>
              <td style={{ ...td, color: g.vistas === melhorVistas ? '#4ade80' : td.color }}>{fmt(Math.round(g.vistas))}</td>
              <td style={td}>{fmt(Math.round(g.alcance))}</td>
              <td style={{ ...td, color: i === 0 ? '#facc15' : td.color }}>{pct(g.taxa)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function exportarCsv(linhas: LinhaHistorico[], ads: AdHistorico[]) {
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const cab = ['data', 'rede', 'formato', 'abordagem', 'legenda', 'vistas', 'alcance', 'gostos', 'comentarios', 'guardados', 'partilhas', 'interacoes', 'envolvimento', 'estado', 'link'];
  const rows = linhas.map(l => [
    l.publicado_em ?? '', l.plataforma, l.video ? 'reel' : 'imagem', l.abordagem ?? '', l.legenda,
    l.visualizacoes, l.alcance, l.gostos, l.comentarios, l.guardados, l.partilhas, l.interacoes,
    l.taxa == null ? '' : l.taxa.toFixed(4), l.estado ?? '', l.link ?? '',
  ]);
  const adsCab = ['anuncio', 'estado', 'criado', 'gasto_eur', 'impressoes', 'alcance', 'cliques', 'ctr', 'cpc_eur'];
  const adsRows = ads.map(a => [
    a.nome, a.estado, a.created_at, (a.gasto_real_cents / 100).toFixed(2), a.impressoes, a.alcance, a.cliques,
    a.impressoes ? (a.cliques / a.impressoes).toFixed(4) : '', a.cliques ? (a.gasto_real_cents / 100 / a.cliques).toFixed(2) : '',
  ]);
  const csv = [cab, ...rows, [], adsCab, ...adsRows].map(r => r.map(esc).join(';')).join('\n');
  const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = `pp3d-metricas-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function HistoricoMetricas() {
  const [linhas, setLinhas] = useState<LinhaHistorico[]>([]);
  const [ads, setAds] = useState<AdHistorico[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [rede, setRede] = useState<'todas' | 'instagram' | 'facebook'>('todas');
  const [ord, setOrd] = useState<{ k: ColunaOrd; desc: boolean }>({ k: 'publicado_em', desc: true });

  useEffect(() => {
    (async () => {
      const [{ data: m, error: e1 }, { data: a }] = await Promise.all([
        supabase.from('prod_marketing_metricas')
          .select('post_id, plataforma, estado, link, visualizacoes, alcance, gostos, comentarios, guardados, partilhas, arquivado_em, prod_marketing_posts!inner(legenda, imagens, video_url, abordagem, publicado_em)'),
        supabase.from('prod_marketing_ads')
          .select('id, nome, estado, gasto_real_cents, impressoes, alcance, cliques, created_at')
          .neq('estado', 'rascunho')
          .order('created_at', { ascending: false }),
      ]);
      if (e1) setErro(e1.message.includes('prod_marketing_metricas') ? 'Falta correr scripts/sql/marketing_historico.sql no Supabase.' : e1.message);
      setLinhas(((m ?? []) as any[]).map(r => {
        const p = r.prod_marketing_posts;
        const interacoes = (r.gostos ?? 0) + (r.comentarios ?? 0) + (r.guardados ?? 0) + (r.partilhas ?? 0);
        return {
          ...r,
          legenda: p?.legenda ?? '', thumb: p?.imagens?.[0] ?? null, video: !!p?.video_url, abordagem: p?.abordagem ?? null, publicado_em: p?.publicado_em ?? null,
          interacoes, taxa: r.alcance > 0 ? interacoes / r.alcance : null,
        } as LinhaHistorico;
      }));
      setAds((a ?? []) as AdHistorico[]);
      setLoading(false);
    })();
  }, []);

  const visiveis = linhas
    .filter(l => rede === 'todas' || l.plataforma === rede)
    .sort((a, b) => {
      const va = ord.k === 'publicado_em' ? (a.publicado_em ?? '') : (a[ord.k] ?? -1);
      const vb = ord.k === 'publicado_em' ? (b.publicado_em ?? '') : (b[ord.k] ?? -1);
      return (va < vb ? -1 : va > vb ? 1 : 0) * (ord.desc ? -1 : 1);
    });

  const total = (k: keyof LinhaHistorico) => visiveis.reduce((a, l) => a + (Number(l[k]) || 0), 0);
  const totalAlcance = total('alcance');
  const totalInter = total('interacoes');

  // ── Melhores resultados ──
  const comAlcance = linhas.filter(l => l.alcance >= ALCANCE_MINIMO_RANKING && l.taxa != null);
  const topEnvolvimento = [...comAlcance].sort((a, b) => (b.taxa ?? 0) - (a.taxa ?? 0)).slice(0, 5);
  const topVistas = [...linhas].sort((a, b) => b.visualizacoes - a.visualizacoes).slice(0, 5);
  const datado = linhas.filter(l => l.publicado_em);
  const porRede = agrupar(linhas, l => (l.plataforma === 'instagram' ? 'Instagram' : 'Facebook'));
  const porFormato = agrupar(linhas, l => (l.video ? 'Reel (vídeo)' : 'Imagem'));
  const porAbordagem = agrupar(linhas, l => l.abordagem);
  const porDia = agrupar(datado, l => DIAS_SEMANA[new Date(l.publicado_em!).getDay()]);
  const porPeriodo = agrupar(datado, l => periodoDoDia(new Date(l.publicado_em!)));

  const adsComCliques = ads.filter(a => a.cliques > 0 && a.gasto_real_cents > 0);
  const melhorAd = [...adsComCliques].sort((a, b) => a.gasto_real_cents / a.cliques - b.gasto_real_cents / b.cliques)[0];

  function cabecalho(k: ColunaOrd, t: string) {
    const ativo = ord.k === k;
    return (
      <th key={k} style={{ ...th, cursor: 'pointer', color: ativo ? '#f1f5f9' : th.color }}
        onClick={() => setOrd(o => ({ k, desc: o.k === k ? !o.desc : true }))}>
        {t}{ativo ? (ord.desc ? ' ↓' : ' ↑') : ''}
      </th>
    );
  }

  if (loading) return <div style={s.card}><p style={{ color: '#8a96aa', fontSize: 13 }}>A carregar histórico…</p></div>;

  return (
    <>
      <div style={s.card}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Trophy size={16} className="text-yellow-400" /> Melhores resultados (todos os tempos)
        </h3>
        {erro && <p style={{ fontSize: 13, color: '#f87171', marginBottom: 12 }}>{erro}</p>}
        {linhas.length === 0 ? (
          <p style={{ color: '#64748b', fontSize: 13 }}>Ainda não há métricas guardadas. São gravadas sempre que carregas em “Atualizar” acima e todos os dias pelo cron.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 280 }}>
                <h4 style={{ ...s.label, marginBottom: 6 }}>Maior envolvimento (alcance ≥ {ALCANCE_MINIMO_RANKING})</h4>
                {topEnvolvimento.length === 0 ? <p style={{ color: '#64748b', fontSize: 12 }}>Ainda nenhum post com alcance suficiente.</p> :
                  topEnvolvimento.map((l, i) => (
                    <p key={`${l.post_id}-${l.plataforma}`} style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <span style={{ color: i === 0 ? '#facc15' : '#8a96aa', fontWeight: 700 }}>{i + 1}.</span>{' '}
                      <strong style={{ color: '#facc15' }}>{pct(l.taxa)}</strong>{' '}
                      <span style={{ color: '#64748b' }}>{l.plataforma === 'instagram' ? 'IG' : 'FB'}{l.video ? ' · Reel' : ''}</span>{' '}
                      {l.link ? <a href={l.link} target="_blank" rel="noreferrer" style={{ color: '#cbd5e1' }}>{l.legenda.slice(0, 60)}</a> : l.legenda.slice(0, 60)}
                    </p>
                  ))}
              </div>
              <div style={{ flex: 1, minWidth: 280 }}>
                <h4 style={{ ...s.label, marginBottom: 6 }}>Mais vistas</h4>
                {topVistas.map((l, i) => (
                  <p key={`${l.post_id}-${l.plataforma}`} style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <span style={{ color: i === 0 ? '#4ade80' : '#8a96aa', fontWeight: 700 }}>{i + 1}.</span>{' '}
                    <strong style={{ color: '#4ade80' }}>{fmt(l.visualizacoes)}</strong>{' '}
                    <span style={{ color: '#64748b' }}>{l.plataforma === 'instagram' ? 'IG' : 'FB'}{l.video ? ' · Reel' : ''}</span>{' '}
                    {l.link ? <a href={l.link} target="_blank" rel="noreferrer" style={{ color: '#cbd5e1' }}>{l.legenda.slice(0, 60)}</a> : l.legenda.slice(0, 60)}
                  </p>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <TabelaComparacao titulo="Por rede" grupos={porRede} />
              <TabelaComparacao titulo="Por formato" grupos={porFormato} />
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <TabelaComparacao titulo="Por abordagem (Reels)" grupos={porAbordagem} />
              <TabelaComparacao titulo="Por hora de publicação" grupos={porPeriodo} />
            </div>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <TabelaComparacao titulo="Por dia da semana" grupos={porDia} />
              <div style={{ flex: 1, minWidth: 280 }} />
            </div>
            <p style={{ fontSize: 11, color: '#64748b' }}>★ = melhor taxa de envolvimento (gostos + comentários + guardados + partilhas ÷ alcance). Com poucos posts por grupo, as diferenças ainda podem ser acaso.</p>
          </div>
        )}
      </div>

      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700 }}>Todas as métricas — publicações</h3>
          <span style={{ fontSize: 11, color: '#64748b' }}>{visiveis.length} linhas</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {(['todas', 'instagram', 'facebook'] as const).map(r => (
              <button key={r} onClick={() => setRede(r)} style={{ ...(rede === r ? s.btn : s.btnGhost), padding: '5px 10px', fontSize: 12 }}>
                {r === 'todas' ? 'Todas' : r === 'instagram' ? 'Instagram' : 'Facebook'}
              </button>
            ))}
            <button style={{ ...s.btnGhost, padding: '5px 10px', fontSize: 12 }} disabled={linhas.length === 0} onClick={() => exportarCsv(linhas, ads)}>
              <Download size={12} /> CSV
            </button>
          </div>
        </div>
        {visiveis.length === 0 ? <p style={{ color: '#64748b', fontSize: 13 }}>Sem dados.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead><tr>
                <th style={{ ...th, textAlign: 'left' }}>Publicação</th>
                <th style={{ ...th, cursor: 'pointer', color: ord.k === 'publicado_em' ? '#f1f5f9' : th.color }} onClick={() => setOrd(o => ({ k: 'publicado_em', desc: o.k === 'publicado_em' ? !o.desc : true }))}>
                  Data{ord.k === 'publicado_em' ? (ord.desc ? ' ↓' : ' ↑') : ''}
                </th>
                <th style={th}>Rede</th>
                {COLUNAS.map(c => cabecalho(c.k, c.t))}
              </tr></thead>
              <tbody>
                {visiveis.map(l => (
                  <tr key={`${l.post_id}-${l.plataforma}`} style={{ opacity: l.estado === 'removido' ? 0.55 : 1 }}>
                    <td style={{ ...td, textAlign: 'left', maxWidth: 260 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {l.thumb && !l.video && <img src={l.thumb} alt="" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: 4 }} />}
                        {l.video && <span style={s.badge('#a855f7')}>Reel</span>}
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {l.link ? <a href={l.link} target="_blank" rel="noreferrer" style={{ color: '#cbd5e1' }}>{l.legenda.slice(0, 50)}</a> : l.legenda.slice(0, 50)}
                        </span>
                      </div>
                      {(l.abordagem || l.estado === 'removido' || l.arquivado_em) && (
                        <span style={{ fontSize: 10, color: '#64748b' }}>
                          {[l.abordagem, l.estado === 'removido' ? 'removido da rede' : null, l.arquivado_em ? 'arquivado' : null].filter(Boolean).join(' · ')}
                        </span>
                      )}
                    </td>
                    <td style={td}>{l.publicado_em ? new Date(l.publicado_em).toLocaleDateString('pt-PT') : '—'}</td>
                    <td style={td}>{l.plataforma === 'instagram' ? 'IG' : 'FB'}</td>
                    <td style={td}>{fmt(l.visualizacoes)}</td>
                    <td style={td}>{fmt(l.alcance)}</td>
                    <td style={td}>{fmt(l.gostos)}</td>
                    <td style={td}>{fmt(l.comentarios)}</td>
                    <td style={td}>{fmt(l.guardados)}</td>
                    <td style={td}>{fmt(l.partilhas)}</td>
                    <td style={td}>{fmt(l.interacoes)}</td>
                    <td style={td}>{pct(l.taxa)}</td>
                  </tr>
                ))}
                <tr>
                  <td style={{ ...td, textAlign: 'left', fontWeight: 700, color: '#f1f5f9' }} colSpan={3}>Total</td>
                  <td style={{ ...td, fontWeight: 700 }}>{fmt(total('visualizacoes'))}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{fmt(totalAlcance)}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{fmt(total('gostos'))}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{fmt(total('comentarios'))}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{fmt(total('guardados'))}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{fmt(total('partilhas'))}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{fmt(totalInter)}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{pct(totalAlcance > 0 ? totalInter / totalAlcance : null)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={s.card}>
        <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>Todas as métricas — anúncios pagos</h3>
        {ads.length === 0 ? <p style={{ color: '#64748b', fontSize: 13 }}>Sem campanhas pagas.</p> : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
              <thead><tr>
                <th style={{ ...th, textAlign: 'left' }}>Anúncio</th><th style={th}>Criado</th><th style={th}>Estado</th><th style={th}>Gasto</th>
                <th style={th}>Impressões</th><th style={th}>Alcance</th><th style={th}>Cliques</th><th style={th}>CTR</th><th style={th}>CPC</th><th style={th}>CPM</th>
              </tr></thead>
              <tbody>
                {ads.map(a => {
                  const gasto = a.gasto_real_cents / 100;
                  const melhor = melhorAd?.id === a.id && adsComCliques.length > 1;
                  return (
                    <tr key={a.id}>
                      <td style={{ ...td, textAlign: 'left', color: melhor ? '#facc15' : td.color, fontWeight: melhor ? 700 : 400 }}>{melhor ? '★ ' : ''}{a.nome}</td>
                      <td style={td}>{new Date(a.created_at).toLocaleDateString('pt-PT')}</td>
                      <td style={td}><span style={s.badge(ESTADO_COR[a.estado] ?? '#64748b')}>{a.estado}</span></td>
                      <td style={td}>€{gasto.toFixed(2)}</td>
                      <td style={td}>{fmt(a.impressoes)}</td>
                      <td style={td}>{fmt(a.alcance)}</td>
                      <td style={td}>{fmt(a.cliques)}</td>
                      <td style={td}>{a.impressoes ? pct(a.cliques / a.impressoes) : '—'}</td>
                      <td style={td}>{a.cliques ? `€${(gasto / a.cliques).toFixed(2)}` : '—'}</td>
                      <td style={td}>{a.impressoes ? `€${(gasto / a.impressoes * 1000).toFixed(2)}` : '—'}</td>
                    </tr>
                  );
                })}
                <tr>
                  <td style={{ ...td, textAlign: 'left', fontWeight: 700, color: '#f1f5f9' }} colSpan={3}>Total</td>
                  <td style={{ ...td, fontWeight: 700 }}>€{(ads.reduce((x, a) => x + a.gasto_real_cents, 0) / 100).toFixed(2)}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{fmt(ads.reduce((x, a) => x + a.impressoes, 0))}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{fmt(ads.reduce((x, a) => x + a.alcance, 0))}</td>
                  <td style={{ ...td, fontWeight: 700 }}>{fmt(ads.reduce((x, a) => x + a.cliques, 0))}</td>
                  <td style={td} colSpan={3}></td>
                </tr>
              </tbody>
            </table>
            {notaMelhorCpc(melhorAd, adsComCliques.length)}
          </div>
        )}
      </div>
    </>
  );
}

function notaMelhorCpc(melhorAd: AdHistorico | undefined, n: number) {
  if (!melhorAd || n < 2) return null;
  return <p style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>★ = anúncio com o clique mais barato (€{(melhorAd.gasto_real_cents / 100 / melhorAd.cliques).toFixed(2)}/clique).</p>;
}
