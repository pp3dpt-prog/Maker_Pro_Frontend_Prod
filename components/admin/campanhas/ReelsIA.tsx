'use client';

// Reels com IA: a partir da MESMA imagem e do MESMO texto, o Gemini propõe abordagens de vídeo
// diferentes (A, B…), o Wan 2.2 anima a imagem (~5 s cada, GPU grátis do Hugging Face) e cada
// Reel é agendado para um dia diferente. Publicação feita pelo cron, como os outros posts.
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { resizeImageToBase64 } from '@/lib/imageResize';
import { Clapperboard, Clock, Sparkles, RefreshCw, Loader2 } from 'lucide-react';

interface ProdutoRef {
  id: string; nome: string; descricao: string | null;
  prod_loja_imagens?: { url: string; ordem: number }[];
}

interface Abordagem {
  titulo: string;
  prompt: string;
  video: string;
  quando: string;
  incluir: boolean;
  estado: 'por-gerar' | 'a-gerar' | 'ok' | 'erro';
  erro?: string;
}

const s = {
  card: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 24, marginBottom: 24 } as React.CSSProperties,
  label: { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#8a96aa', marginBottom: 6 },
  input: { width: '100%', background: '#0a1120', border: '1px solid #1e293b', borderRadius: 8, padding: '10px 14px', color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const },
  btn: { padding: '10px 18px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 },
  btnGhost: { padding: '10px 18px', background: 'transparent', color: '#cbd5e1', border: '1px solid #1e293b', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 },
};

async function chamar(url: string, body: unknown) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Erro ${res.status}.`);
  return json;
}

// Reel A amanhã às 18:00, B depois de amanhã, etc. (hora local).
function dataSugerida(i: number) {
  const d = new Date();
  d.setDate(d.getDate() + 1 + i);
  d.setHours(18, 0, 0, 0);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function ReelsIA() {
  const [produtos, setProdutos] = useState<ProdutoRef[]>([]);
  const [produtoId, setProdutoId] = useState('');
  const [nomeLivre, setNomeLivre] = useState('');
  const [publico, setPublico] = useState<'clientes' | 'makers'>('clientes');
  const [imagem, setImagem] = useState('');
  const [legenda, setLegenda] = useState('');
  const [canal, setCanal] = useState<'instagram' | 'facebook' | 'ambos'>('ambos');
  const [abordagens, setAbordagens] = useState<Abordagem[]>([]);
  const [fase, setFase] = useState<'idle' | 'legenda' | 'abordagens' | 'videos' | 'guardar' | 'upload'>('idle');
  const [msg, setMsg] = useState('');
  const [ok, setOk] = useState(false);

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

  const produto = produtos.find(p => p.id === produtoId);
  const fotosProduto = (produto?.prod_loja_imagens ?? []).slice().sort((a, b) => a.ordem - b.ordem);
  const nome = produto?.nome ?? nomeLivre.trim();
  const ocupado = fase !== 'idle';

  function escolherProduto(id: string) {
    setProdutoId(id);
    const p = produtos.find(x => x.id === id);
    const fotos = (p?.prod_loja_imagens ?? []).slice().sort((a, b) => a.ordem - b.ordem);
    setImagem(fotos[0]?.url ?? '');
    setAbordagens([]);
  }

  function atualizar(i: number, patch: Partial<Abordagem>) {
    setAbordagens(prev => prev.map((a, k) => (k === i ? { ...a, ...patch } : a)));
  }

  async function carregarFoto(file: File | undefined) {
    if (!file) return;
    setFase('upload'); setMsg('');
    try {
      const image_base64 = await resizeImageToBase64(file);
      const { url } = await chamar('/api/admin/loja/upload', { image_base64, pasta: 'marketing' });
      setImagem(url);
    } catch (e: any) { setMsg(e.message); setOk(false); }
    setFase('idle');
  }

  async function gerarLegenda() {
    if (!nome) { setMsg('Escolhe um produto ou escreve o nome.'); setOk(false); return; }
    setFase('legenda'); setMsg('');
    try {
      const { conteudo } = await chamar('/api/admin/marketing/gerar-conteudo', {
        nome, descricao: produto?.descricao ?? '', angulo: 'Reel curto em vídeo', publico,
      });
      setLegenda(`${conteudo.instagram}\n\n${(conteudo.hashtags ?? []).join(' ')}`);
    } catch (e: any) { setMsg(e.message); setOk(false); }
    setFase('idle');
  }

  async function gerarAbordagens() {
    if (!nome) { setMsg('Escolhe um produto ou escreve o nome.'); setOk(false); return; }
    setFase('abordagens'); setMsg('');
    try {
      const { abordagens: lista } = await chamar('/api/admin/marketing/gerar-abordagens', {
        nome, descricao: produto?.descricao ?? '', legenda, publico, n: 2,
      });
      setAbordagens((lista as { titulo: string; prompt: string }[]).map((a, i) => ({
        titulo: a.titulo, prompt: a.prompt, video: '', quando: dataSugerida(i), incluir: true, estado: 'por-gerar',
      })));
    } catch (e: any) { setMsg(e.message); setOk(false); }
    setFase('idle');
  }

  async function gerarVideo(i: number, prompt: string) {
    atualizar(i, { estado: 'a-gerar', erro: undefined });
    try {
      const { url } = await chamar('/api/admin/marketing/gerar-video', { imagem_url: imagem, prompt });
      atualizar(i, { video: url, estado: 'ok' });
      return true;
    } catch (e: any) {
      atualizar(i, { estado: 'erro', erro: e.message });
      return false;
    }
  }

  // Um de cada vez: a GPU gratuita é partilhada e a quota diária é por conta.
  async function gerarTodos() {
    if (!imagem) { setMsg('Escolhe a imagem de partida.'); setOk(false); return; }
    setFase('videos'); setMsg('');
    for (let i = 0; i < abordagens.length; i++) {
      if (abordagens[i].incluir && abordagens[i].estado !== 'ok') await gerarVideo(i, abordagens[i].prompt);
    }
    setFase('idle');
  }

  async function aprovar() {
    const sel = abordagens.filter(a => a.incluir && a.video && a.quando);
    if (!legenda.trim()) { setMsg('Falta o texto da publicação.'); setOk(false); return; }
    if (sel.length === 0) { setMsg('Nenhum Reel pronto selecionado (precisa de vídeo e data).'); setOk(false); return; }
    setFase('guardar'); setMsg('');
    let feitos = 0;
    try {
      for (const a of sel) {
        await chamar('/api/admin/marketing/criar-post', {
          produto_id: produtoId || null,
          legenda,
          imagens: [imagem],
          video_url: a.video,
          abordagem: a.titulo,
          canal,
          agendado_para: new Date(a.quando).toISOString(),
        });
        feitos++;
      }
      setOk(true);
      setMsg(`${feitos} Reels agendados. Vê-os em "Fila / Calendário".`);
      setAbordagens([]);
    } catch (e: any) { setOk(false); setMsg(`Agendados ${feitos} de ${sel.length}. Erro: ${e.message}`); }
    setFase('idle');
  }

  return (
    <div style={s.card}>
      <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Clapperboard size={16} /> Reels com IA
      </h2>
      <p style={{ fontSize: 12, color: '#8a96aa', marginBottom: 16 }}>
        Mesma imagem e mesmo texto, abordagens de vídeo diferentes, para publicar em dias distintos. Cada vídeo
        tem ~5 s e é gerado pelo Wan 2.2 (GPU gratuita do Hugging Face, ~5 min por dia; cada vídeo gasta ~30-60 s).
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={s.label}>Produto</label>
          <select value={produtoId} onChange={e => escolherProduto(e.target.value)} style={s.input}>
            <option value="">— Escrever o nome —</option>
            {produtos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
        </div>
        <div>
          <label style={s.label}>Canal</label>
          <select value={canal} onChange={e => setCanal(e.target.value as typeof canal)} style={s.input}>
            <option value="ambos">Instagram + Facebook</option>
            <option value="instagram">Só Instagram</option>
            <option value="facebook">Só Facebook</option>
          </select>
        </div>
      </div>
      {!produtoId && <input value={nomeLivre} onChange={e => setNomeLivre(e.target.value)} style={{ ...s.input, marginBottom: 12 }} placeholder="Nome do produto" />}
      <select value={publico} onChange={e => setPublico(e.target.value as 'clientes' | 'makers')} style={{ ...s.input, marginBottom: 16 }}>
        <option value="clientes">Para clientes (produto impresso)</option>
        <option value="makers">Para makers (gerador de STL, imprimem em casa)</option>
      </select>

      <label style={s.label}>Imagem de partida (de preferência vertical, produto bem visível)</label>
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ width: 120, aspectRatio: '9 / 16', borderRadius: 10, overflow: 'hidden', background: '#0a1120', border: '1px solid #1e293b', flexShrink: 0 }}>
          {imagem
            ? <img src={imagem} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#64748b' }}>Sem imagem</div>}
        </div>
        <div style={{ flex: 1, minWidth: 220 }}>
          {fotosProduto.length > 1 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {fotosProduto.map(f => (
                <img key={f.url} src={f.url} alt="" onClick={() => setImagem(f.url)}
                  style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6, cursor: 'pointer', border: f.url === imagem ? '2px solid #6366f1' : '1px solid #1e293b' }} />
              ))}
            </div>
          )}
          <input type="file" accept="image/*" disabled={ocupado} onChange={e => { carregarFoto(e.target.files?.[0]); e.target.value = ''; }} style={{ ...s.input, marginBottom: 8 }} />
          <input value={imagem} onChange={e => setImagem(e.target.value)} style={s.input} placeholder="ou cola um URL https://..." />
        </div>
      </div>

      <label style={s.label}>Texto (igual em todos os Reels)</label>
      <textarea value={legenda} onChange={e => setLegenda(e.target.value)} rows={4} style={{ ...s.input, resize: 'vertical', marginBottom: 8 }} />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        <button style={s.btnGhost} disabled={ocupado} onClick={gerarLegenda}>
          <Sparkles size={14} /> {fase === 'legenda' ? 'A escrever…' : 'Gerar texto'}
        </button>
        <button style={s.btn} disabled={ocupado} onClick={gerarAbordagens}>
          <Sparkles size={14} /> {fase === 'abordagens' ? 'A pensar…' : abordagens.length ? 'Novas abordagens' : 'Gerar 2 abordagens'}
        </button>
      </div>

      {abordagens.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14, marginBottom: 14 }}>
            {abordagens.map((a, i) => (
              <div key={i} style={{ border: '1px solid #1e293b', borderRadius: 12, padding: 14, opacity: a.incluir ? 1 : 0.5 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <input type="checkbox" checked={a.incluir} onChange={e => atualizar(i, { incluir: e.target.checked })} />
                  <strong style={{ fontSize: 13 }}>{String.fromCharCode(65 + i)}. {a.titulo}</strong>
                </div>
                <div style={{ width: '100%', maxWidth: 220, aspectRatio: '9 / 16', margin: '0 auto 10px', borderRadius: 10, overflow: 'hidden', background: '#0a1120', border: '1px solid #1e293b' }}>
                  {a.video
                    ? <video src={a.video} controls loop muted playsInline autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 12, color: '#64748b', padding: 12, textAlign: 'center' }}>
                        {a.estado === 'a-gerar' ? <><Loader2 size={20} className="animate-spin" /> A gerar (~1 min)…</> : 'Vídeo por gerar'}
                      </div>}
                </div>
                <label style={s.label}>Movimento (prompt para a IA, em inglês)</label>
                <textarea value={a.prompt} onChange={e => atualizar(i, { prompt: e.target.value })} rows={3} style={{ ...s.input, resize: 'vertical', marginBottom: 8, fontSize: 12 }} />
                <button style={{ ...s.btnGhost, marginBottom: 10 }} disabled={ocupado || a.estado === 'a-gerar' || !imagem} onClick={() => gerarVideo(i, a.prompt)}>
                  <RefreshCw size={13} /> {a.video ? 'Gerar outro vídeo' : 'Gerar este vídeo'}
                </button>
                {a.estado === 'erro' && <p style={{ fontSize: 12, color: '#f87171', marginBottom: 8 }}>{a.erro}</p>}
                <label style={s.label}>Publicar em</label>
                <input type="datetime-local" value={a.quando} onChange={e => atualizar(i, { quando: e.target.value })} style={s.input} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button style={s.btnGhost} disabled={ocupado || !imagem} onClick={gerarTodos}>
              <Clapperboard size={14} /> {fase === 'videos' ? 'A gerar vídeos…' : 'Gerar os vídeos em falta'}
            </button>
            <button style={s.btn} disabled={ocupado} onClick={aprovar}>
              <Clock size={14} /> {fase === 'guardar' ? 'A agendar…' : 'Aprovar agendamento dos Reels'}
            </button>
          </div>
        </>
      )}

      {msg && <p style={{ fontSize: 13, color: ok ? '#4ade80' : '#f87171', marginTop: 14 }}>{msg}</p>}
    </div>
  );
}
