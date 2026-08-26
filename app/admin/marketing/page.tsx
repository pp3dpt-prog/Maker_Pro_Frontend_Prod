'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  Megaphone, Send, Clock, TrendingUp, Rocket, Pause, Play, Package, ImagePlus,
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
  const [tab, setTab] = useState<'criar' | 'fila' | 'analytics'>('criar');

  return (
    <div style={s.page}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Rocket className="text-indigo-400" /> Marketing
          </h1>
          <p style={{ fontSize: 13, color: '#8a96aa', marginTop: 4 }}>
            Publicações orgânicas no Instagram/Facebook, campanhas pagas e análise de resultados.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          {([['criar', 'Criar publicação'], ['fila', 'Fila / Calendário'], ['analytics', 'Analytics']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} style={tab === k ? s.btn : s.btnGhost}>{label}</button>
          ))}
        </div>

        {tab === 'criar' && <CriarPublicacao />}
        {tab === 'fila' && <Fila />}
        {tab === 'analytics' && <Analytics />}
      </div>
    </div>
  );
}

// ── Tab: Criar publicação ───────────────────────────────────────────────────

function CriarPublicacao() {
  const [produtos, setProdutos] = useState<ProdutoRef[]>([]);
  const [produtoId, setProdutoId] = useState('');
  const [legenda, setLegenda] = useState('');
  const [imagemUrl, setImagemUrl] = useState('');
  const [canal, setCanal] = useState<'instagram' | 'facebook' | 'ambos'>('ambos');
  const [agendarPara, setAgendarPara] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [msg, setMsg] = useState('');

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

  async function guardar(publicarJa: boolean) {
    if (!legenda || !imagemUrl) { setStatus('error'); setMsg('Legenda e imagem são obrigatórias.'); return; }
    setStatus('loading'); setMsg('');
    try {
      const { post } = await chamar('/api/admin/marketing/criar-post', {
        produto_id: produtoId || null,
        legenda,
        imagens: [imagemUrl],
        canal,
        agendado_para: !publicarJa && agendarPara ? new Date(agendarPara).toISOString() : null,
      });
      if (publicarJa) {
        await chamar('/api/admin/marketing/publicar-agora', { post_id: post.id });
      }
      setStatus('success');
      setMsg(publicarJa ? 'Publicado!' : agendarPara ? 'Agendado!' : 'Guardado como rascunho.');
      setLegenda(''); setImagemUrl(''); setProdutoId(''); setAgendarPara('');
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

      <div style={{ marginBottom: 18 }}>
        <label style={s.label}>Legenda</label>
        <textarea value={legenda} onChange={e => setLegenda(e.target.value)} rows={4} style={{ ...s.input, resize: 'vertical' }} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 18 }}>
        <div>
          <label style={s.label}><ImagePlus size={12} style={{ display: 'inline', marginRight: 4 }} /> URL da imagem</label>
          <input value={imagemUrl} onChange={e => setImagemUrl(e.target.value)} style={s.input} placeholder="https://..." />
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

      {imagemUrl && <img src={imagemUrl} alt="" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 10, marginBottom: 18, border: '1px solid #1e293b' }} />}

      <div style={{ marginBottom: 18 }}>
        <label style={s.label}><Clock size={12} style={{ display: 'inline', marginRight: 4 }} /> Agendar para (opcional — deixa vazio para publicar agora ou guardar rascunho)</label>
        <input type="datetime-local" value={agendarPara} onChange={e => setAgendarPara(e.target.value)} style={s.input} />
      </div>

      {msg && <p style={{ fontSize: 13, color: status === 'error' ? '#f87171' : '#4ade80', marginBottom: 14 }}>{msg}</p>}

      <div style={{ display: 'flex', gap: 10 }}>
        <button style={s.btnGhost} disabled={status === 'loading'} onClick={() => guardar(false)}>
          {agendarPara ? <Clock size={14} /> : null} {agendarPara ? 'Agendar' : 'Guardar rascunho'}
        </button>
        <button style={s.btn} disabled={status === 'loading'} onClick={() => guardar(true)}>
          <Send size={14} /> Publicar agora
        </button>
      </div>
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
    await chamar('/api/admin/marketing/publicar-agora', { post_id: id }).catch(e => alert(e.message));
    carregar();
  }

  if (loading) return <p style={{ color: '#8a96aa' }}>A carregar...</p>;
  if (posts.length === 0) return <p style={{ color: '#8a96aa' }}>Ainda não há publicações. Cria a primeira no separador "Criar publicação".</p>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {posts.map(post => (
        <div key={post.id} style={s.card}>
          <div style={{ display: 'flex', gap: 14 }}>
            {post.imagens?.[0] && <img src={post.imagens[0]} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />}
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <span style={s.badge(ESTADO_COR[post.estado])}>{post.estado}</span>
                <span style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase' }}>{post.canal}</span>
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
              {post.estado === 'publicado' && (
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
    </div>
  );
}
