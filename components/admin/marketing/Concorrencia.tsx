'use client';

// Aba Concorrência do /admin/marketing:
//  1. lista de concorrentes (Instagram Business/Creator) — manual ou descobertos pela IA;
//  2. recolha das publicações públicas deles (Meta Business Discovery);
//  3. ranking das publicações/categorias com mais interação + sugestões da IA para
//     os próximos produtos e trabalhos. A interação é o sinal de procura: não temos
//     acesso às vendas dos concorrentes.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Search, Sparkles, RefreshCw, Loader2, Plus, Trash2, ExternalLink, Lightbulb, TrendingUp, Users } from 'lucide-react';

interface Concorrente {
  id: string; username: string; nome: string | null; ramo: string | null; foto_url: string | null;
  seguidores: number | null; n_publicacoes: number | null; origem: string; motivo: string | null;
  ativo: boolean; ultima_recolha: string | null; erro: string | null;
}
interface PostConc {
  media_id: string; legenda: string | null; tipo: string | null; link: string | null; media_url: string | null;
  gostos: number; comentarios: number; envolvimento: number | null; publicado_em: string | null;
  prod_marketing_concorrentes: { username: string; ramo: string | null; seguidores: number | null };
}
interface Sugestao {
  username: string; nome?: string; ramo?: string; motivo?: string;
  valido?: boolean; seguidores?: number; n_publicacoes?: number; foto_url?: string; erro?: string;
}
interface Analise {
  id: string; created_at: string; resumo: string; n_posts_analisados: number | null;
  categorias: { nome: string; posts: number; interacao_media: number; exemplos?: string[] }[];
  tendencias: { tema: string; evidencia: string }[];
  sugestoes: { titulo: string; tipo: string; descricao: string; porque: string; publico?: string; prioridade?: number; ja_temos?: string }[];
  fontes: { titulo: string; url: string }[];
}

const s = {
  card: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 24, marginBottom: 24 } as React.CSSProperties,
  label: { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#8a96aa', marginBottom: 6 },
  input: { width: '100%', background: '#0a1120', border: '1px solid #1e293b', borderRadius: 8, padding: '10px 14px', color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box' as const },
  btn: { padding: '10px 18px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 },
  btnGhost: { padding: '10px 18px', background: 'transparent', color: '#cbd5e1', border: '1px solid #1e293b', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 },
  badge: (cor: string) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: `${cor}22`, color: cor, letterSpacing: '0.03em' }),
  h3: { fontSize: 15, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 } as React.CSSProperties,
};

const RAMOS = [
  'impressão 3D personalizada (Portugal)',
  'porta-chaves e etiquetas personalizadas',
  'chapas de identificação para animais (pet tags)',
  'decoração impressa em 3D (vasos, candeeiros, suportes)',
  'ficheiros STL / modelos 3D paramétricos para makers',
];

const COR_PRIORIDADE: Record<number, string> = { 1: '#22c55e', 2: '#f59e0b', 3: '#64748b' };
const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString('pt-PT');
const pct = (x: number | null | undefined) => (x == null ? '—' : `${(Number(x) * 100).toFixed(2)}%`);

async function chamar(body: unknown) {
  const res = await fetch('/api/admin/marketing/concorrencia', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Erro ${res.status}.`);
  return json;
}

export default function Concorrencia() {
  const [concorrentes, setConcorrentes] = useState<Concorrente[]>([]);
  const [posts, setPosts] = useState<PostConc[]>([]);
  const [analises, setAnalises] = useState<Analise[]>([]);
  const [analiseId, setAnaliseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [erroBd, setErroBd] = useState('');

  const carregar = useCallback(async () => {
    const desde = new Date(Date.now() - 90 * 86_400_000).toISOString();
    const [{ data: c, error: e1 }, { data: p }, { data: a }] = await Promise.all([
      supabase.from('prod_marketing_concorrentes').select('*').order('seguidores', { ascending: false, nullsFirst: false }),
      supabase.from('prod_marketing_concorrencia_posts')
        .select('media_id, legenda, tipo, link, media_url, gostos, comentarios, envolvimento, publicado_em, prod_marketing_concorrentes!inner(username, ramo, seguidores, ativo)')
        .eq('prod_marketing_concorrentes.ativo', true)
        .gte('publicado_em', desde)
        .order('envolvimento', { ascending: false, nullsFirst: false })
        .limit(300),
      supabase.from('prod_marketing_concorrencia_analises').select('*').order('created_at', { ascending: false }).limit(20),
    ]);
    if (e1) setErroBd(e1.message.includes('prod_marketing_concorrentes') ? 'Falta correr scripts/sql/marketing_concorrencia.sql no Supabase.' : e1.message);
    setConcorrentes((c ?? []) as Concorrente[]);
    setPosts((p ?? []) as unknown as PostConc[]);
    setAnalises((a ?? []) as Analise[]);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const analise = analises.find(a => a.id === analiseId) ?? analises[0] ?? null;

  if (loading) return <p style={{ color: '#8a96aa' }}>A carregar...</p>;

  return (
    <div>
      {erroBd && <div style={{ ...s.card, borderColor: '#7f1d1d' }}><p style={{ color: '#f87171', fontSize: 13 }}>{erroBd}</p></div>}
      <GerirConcorrentes concorrentes={concorrentes} onMudou={carregar} />
      <AcoesAnalise temConcorrentes={concorrentes.some(c => c.ativo)} temPosts={posts.length > 0} onMudou={id => { if (id) setAnaliseId(id); carregar(); }} />
      <TopPublicacoes posts={posts} />
      {analise && <ResultadoAnalise analise={analise} analises={analises} onEscolher={setAnaliseId} posts={posts} />}
      <ResumoPorConta concorrentes={concorrentes} posts={posts} />
    </div>
  );
}

// ── Concorrentes ─────────────────────────────────────────────────────────────

function GerirConcorrentes({ concorrentes, onMudou }: { concorrentes: Concorrente[]; onMudou: () => void }) {
  const [username, setUsername] = useState('');
  const [ramo, setRamo] = useState(RAMOS[0]);
  const [ramosIA, setRamosIA] = useState<string[]>(RAMOS);
  const [sugestoes, setSugestoes] = useState<(Sugestao & { escolher: boolean })[]>([]);
  const [estado, setEstado] = useState<'idle' | 'adicionar' | 'descobrir' | 'gravar'>('idle');
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  async function adicionarManual() {
    if (!username.trim()) return;
    setEstado('adicionar'); setMsg(null);
    try {
      const r = await chamar({ acao: 'adicionar', concorrentes: [{ username, ramo, origem: 'manual' }] });
      const res = r.resultados?.[0];
      setMsg(res?.ok ? { ok: true, t: `@${res.username} adicionado — ${res.posts} publicações recolhidas.` } : { ok: false, t: res?.erro ?? 'Não foi possível ler a conta.' });
      setUsername('');
      onMudou();
    } catch (e: any) { setMsg({ ok: false, t: e.message }); } finally { setEstado('idle'); }
  }

  async function descobrir() {
    setEstado('descobrir'); setMsg(null); setSugestoes([]);
    try {
      const r = await chamar({ acao: 'descobrir', ramos: ramosIA });
      const lista = (r.sugestoes ?? []) as Sugestao[];
      setSugestoes(lista.map(x => ({ ...x, escolher: !!x.valido })));
      if (!lista.length) setMsg({ ok: false, t: 'A IA não encontrou contas novas. Tenta outros ramos.' });
    } catch (e: any) { setMsg({ ok: false, t: e.message }); } finally { setEstado('idle'); }
  }

  async function gravarSugestoes() {
    const escolhidas = sugestoes.filter(x => x.escolher && x.valido);
    if (!escolhidas.length) return;
    setEstado('gravar'); setMsg(null);
    try {
      const r = await chamar({ acao: 'adicionar', concorrentes: escolhidas.map(x => ({ username: x.username, ramo: x.ramo, motivo: x.motivo, origem: 'ia' })) });
      const ok = (r.resultados ?? []).filter((x: any) => x.ok).length;
      setMsg({ ok: true, t: `${ok} concorrente(s) adicionados e publicações recolhidas.` });
      setSugestoes([]);
      onMudou();
    } catch (e: any) { setMsg({ ok: false, t: e.message }); } finally { setEstado('idle'); }
  }

  async function alternar(c: Concorrente) {
    await supabase.from('prod_marketing_concorrentes').update({ ativo: !c.ativo }).eq('id', c.id);
    onMudou();
  }
  async function remover(c: Concorrente) {
    if (!confirm(`Remover @${c.username} e as publicações recolhidas?`)) return;
    await supabase.from('prod_marketing_concorrentes').delete().eq('id', c.id);
    onMudou();
  }

  return (
    <div style={s.card}>
      <h3 style={s.h3}><Users size={16} className="text-indigo-400" /> Concorrentes ({concorrentes.length})</h3>
      <p style={{ fontSize: 12, color: '#8a96aa', marginBottom: 16 }}>
        Só contas de Instagram <strong>Business ou Creator</strong> podem ser analisadas (a Meta não mostra contas pessoais).
      </p>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <input value={username} onChange={e => setUsername(e.target.value)} onKeyDown={e => e.key === 'Enter' && adicionarManual()}
          placeholder="@conta_do_concorrente" style={{ ...s.input, flex: '1 1 200px', width: 'auto' }} />
        <select value={ramo} onChange={e => setRamo(e.target.value)} style={{ ...s.input, flex: '1 1 220px', width: 'auto' }}>
          {RAMOS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <button style={s.btn} disabled={estado !== 'idle'} onClick={adicionarManual}>
          {estado === 'adicionar' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Adicionar
        </button>
      </div>

      <div style={{ padding: 14, background: '#0a1120', borderRadius: 10, border: '1px solid #1e293b', marginBottom: 16 }}>
        <label style={s.label}>Descobrir concorrentes com IA (pesquisa Google) — ramos</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
          {RAMOS.map(r => {
            const on = ramosIA.includes(r);
            return (
              <button key={r} onClick={() => setRamosIA(on ? ramosIA.filter(x => x !== r) : [...ramosIA, r])}
                style={{ ...(on ? s.btn : s.btnGhost), padding: '5px 10px', fontSize: 12, background: on ? '#312e81' : 'transparent' }}>{r}</button>
            );
          })}
        </div>
        <button style={s.btnGhost} disabled={estado !== 'idle' || ramosIA.length === 0} onClick={descobrir}>
          {estado === 'descobrir' ? <><Loader2 size={14} className="animate-spin" /> A pesquisar (pode demorar ~1 min)…</> : <><Search size={14} /> Procurar concorrentes</>}
        </button>

        {sugestoes.length > 0 && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {sugestoes.map((x, i) => (
              <label key={x.username} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 12, opacity: x.valido ? 1 : 0.5, cursor: x.valido ? 'pointer' : 'default' }}>
                <input type="checkbox" disabled={!x.valido} checked={x.escolher}
                  onChange={e => setSugestoes(sugestoes.map((y, j) => (j === i ? { ...y, escolher: e.target.checked } : y)))} />
                <span style={{ flex: 1 }}>
                  <a href={`https://instagram.com/${x.username}`} target="_blank" rel="noreferrer" style={{ color: '#a5b4fc', fontWeight: 700 }}>@{x.username}</a>
                  {x.nome ? ` — ${x.nome}` : ''}
                  {x.valido ? <span style={{ color: '#4ade80' }}> · {fmt(x.seguidores)} seguidores</span> : <span style={{ color: '#f87171' }}> · {x.erro}</span>}
                  <br /><span style={{ color: '#8a96aa' }}>{x.ramo}{x.motivo ? ` — ${x.motivo}` : ''}</span>
                </span>
              </label>
            ))}
            <div>
              <button style={{ ...s.btn, marginTop: 8 }} disabled={estado !== 'idle' || !sugestoes.some(x => x.escolher)} onClick={gravarSugestoes}>
                {estado === 'gravar' ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />} Adicionar selecionados ({sugestoes.filter(x => x.escolher).length})
              </button>
            </div>
          </div>
        )}
      </div>

      {msg && <p style={{ fontSize: 13, color: msg.ok ? '#4ade80' : '#f87171', marginBottom: 12 }}>{msg.t}</p>}

      {concorrentes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {concorrentes.map(c => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: '#0a1120', borderRadius: 8, opacity: c.ativo ? 1 : 0.5 }}>
              {c.foto_url
                ? <img src={c.foto_url} alt="" onError={e => (e.currentTarget.style.display = 'none')} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                : <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1e293b' }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13 }}>
                  <a href={`https://instagram.com/${c.username}`} target="_blank" rel="noreferrer" style={{ color: '#f1f5f9', fontWeight: 700 }}>@{c.username}</a>
                  {c.nome && <span style={{ color: '#8a96aa' }}> · {c.nome}</span>}
                  {c.origem === 'ia' && <span style={{ ...s.badge('#a855f7'), marginLeft: 6 }}>IA</span>}
                </div>
                <div style={{ fontSize: 11, color: c.erro ? '#f87171' : '#64748b' }}>
                  {c.erro ?? `${c.ramo ?? 'sem ramo'} · ${fmt(c.seguidores)} seguidores · ${fmt(c.n_publicacoes)} publicações${c.ultima_recolha ? ` · recolhido ${new Date(c.ultima_recolha).toLocaleDateString('pt-PT')}` : ''}`}
                </div>
              </div>
              <button style={{ ...s.btnGhost, padding: '5px 10px', fontSize: 11 }} onClick={() => alternar(c)}>{c.ativo ? 'Pausar' : 'Ativar'}</button>
              <button style={{ ...s.btnGhost, padding: '5px 8px' }} onClick={() => remover(c)} title="Remover"><Trash2 size={13} /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Recolher + analisar ──────────────────────────────────────────────────────

function AcoesAnalise({ temConcorrentes, temPosts, onMudou }: { temConcorrentes: boolean; temPosts: boolean; onMudou: (analiseId?: string) => void }) {
  const [fase, setFase] = useState<'idle' | 'recolher' | 'analisar'>('idle');
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);

  async function correr(soRecolher: boolean) {
    setMsg(null);
    try {
      setFase('recolher');
      const r = await chamar({ acao: 'recolher' });
      let t = `${r.posts} publicações recolhidas de ${r.contas} conta(s)${r.falhas ? ` (${r.falhas} com erro)` : ''}.`;
      if (soRecolher) { setMsg({ ok: true, t }); onMudou(); return; }
      setFase('analisar');
      const a = await chamar({ acao: 'analisar' });
      t += ' Análise concluída.';
      setMsg({ ok: true, t });
      onMudou(a.analise?.id);
    } catch (e: any) { setMsg({ ok: false, t: e.message }); onMudou(); } finally { setFase('idle'); }
  }

  return (
    <div style={{ ...s.card, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
      <button style={s.btn} disabled={fase !== 'idle' || !temConcorrentes} onClick={() => correr(false)}>
        {fase !== 'idle' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
        {fase === 'recolher' ? 'A recolher publicações…' : fase === 'analisar' ? 'A IA está a analisar (~1 min)…' : 'Recolher e analisar com IA'}
      </button>
      <button style={s.btnGhost} disabled={fase !== 'idle' || !temConcorrentes} onClick={() => correr(true)}>
        <RefreshCw size={14} /> Só recolher dados
      </button>
      {!temConcorrentes && <span style={{ fontSize: 12, color: '#64748b' }}>Adiciona concorrentes primeiro.</span>}
      {temConcorrentes && !temPosts && fase === 'idle' && !msg && <span style={{ fontSize: 12, color: '#64748b' }}>Ainda sem publicações recolhidas.</span>}
      {msg && <span style={{ fontSize: 13, color: msg.ok ? '#4ade80' : '#f87171' }}>{msg.t}</span>}
    </div>
  );
}

// ── Publicações com mais interação ───────────────────────────────────────────

function TopPublicacoes({ posts }: { posts: PostConc[] }) {
  const [ordem, setOrdem] = useState<'envolvimento' | 'gostos' | 'comentarios'>('envolvimento');
  const [tipo, setTipo] = useState<'todos' | 'REELS' | 'IMAGE' | 'CAROUSEL_ALBUM'>('todos');
  const top = useMemo(() => posts
    .filter(p => tipo === 'todos' || p.tipo === tipo)
    .sort((a, b) => (Number(b[ordem]) || 0) - (Number(a[ordem]) || 0))
    .slice(0, 12), [posts, ordem, tipo]);

  if (posts.length === 0) return null;
  return (
    <div style={s.card}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <h3 style={{ ...s.h3, marginBottom: 0 }}><TrendingUp size={16} className="text-green-400" /> Publicações com mais interação (90 dias)</h3>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {([['envolvimento', 'Envolvimento'], ['gostos', 'Gostos'], ['comentarios', 'Comentários']] as const).map(([k, t]) => (
            <button key={k} onClick={() => setOrdem(k)} style={{ ...(ordem === k ? s.btn : s.btnGhost), padding: '5px 10px', fontSize: 12 }}>{t}</button>
          ))}
          <select value={tipo} onChange={e => setTipo(e.target.value as any)} style={{ ...s.input, width: 'auto', padding: '5px 10px', fontSize: 12 }}>
            <option value="todos">Todos os formatos</option><option value="REELS">Reels</option><option value="IMAGE">Imagem</option><option value="CAROUSEL_ALBUM">Carrossel</option>
          </select>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {top.map(p => (
          <a key={p.media_id} href={p.link ?? '#'} target="_blank" rel="noreferrer" style={{ background: '#0a1120', borderRadius: 10, overflow: 'hidden', border: '1px solid #1e293b', color: 'inherit', textDecoration: 'none' }}>
            <div style={{ aspectRatio: '1', background: '#111827', position: 'relative' }}>
              {p.media_url && <img src={p.media_url} alt="" loading="lazy" onError={e => (e.currentTarget.style.display = 'none')} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
              {p.tipo === 'REELS' && <span style={{ ...s.badge('#a855f7'), position: 'absolute', top: 6, left: 6, background: '#1e1b4bdd' }}>Reel</span>}
            </div>
            <div style={{ padding: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#a5b4fc', marginBottom: 2 }}>@{p.prod_marketing_concorrentes.username}</div>
              <div style={{ fontSize: 12, color: '#facc15', fontWeight: 700 }}>{pct(p.envolvimento)} <span style={{ color: '#8a96aa', fontWeight: 400 }}>· {fmt(p.gostos)} ♥ · {fmt(p.comentarios)} 💬</span></div>
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.legenda}</p>
              {p.publicado_em && <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>{new Date(p.publicado_em).toLocaleDateString('pt-PT')}</div>}
            </div>
          </a>
        ))}
      </div>
      <p style={{ fontSize: 11, color: '#64748b', marginTop: 10 }}>Envolvimento = (gostos + comentários) ÷ seguidores da conta — permite comparar contas grandes e pequenas. Contas que escondem os gostos aparecem com 0 ♥.</p>
    </div>
  );
}

// ── Resultado da análise IA ──────────────────────────────────────────────────

function ResultadoAnalise({ analise, analises, onEscolher, posts }: { analise: Analise; analises: Analise[]; onEscolher: (id: string) => void; posts: PostConc[] }) {
  const maxInter = Math.max(...analise.categorias.map(c => Number(c.interacao_media) || 0), 0.0001);
  const linkDe = new Map(posts.map(p => [p.media_id, p]));

  return (
    <>
      <div style={s.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
          <h3 style={{ ...s.h3, marginBottom: 0 }}><Sparkles size={16} className="text-indigo-400" /> O que está a sair mais</h3>
          <select value={analise.id} onChange={e => onEscolher(e.target.value)} style={{ ...s.input, width: 'auto', marginLeft: 'auto', padding: '5px 10px', fontSize: 12 }}>
            {analises.map(a => <option key={a.id} value={a.id}>Análise de {new Date(a.created_at).toLocaleString('pt-PT')}</option>)}
          </select>
        </div>
        <p style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 16, lineHeight: 1.5 }}>{analise.resumo}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {analise.categorias.map((c, i) => (
            <div key={c.nome}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                <span style={{ color: i === 0 ? '#facc15' : '#cbd5e1', fontWeight: i < 3 ? 700 : 400 }}>{i + 1}. {c.nome}</span>
                <span style={{ color: '#8a96aa' }}>{c.posts} posts · {pct(c.interacao_media)}</span>
              </div>
              <div style={{ height: 6, background: '#1e293b', borderRadius: 3 }}>
                <div style={{ width: `${Math.max(3, (Number(c.interacao_media) || 0) / maxInter * 100)}%`, height: '100%', background: i === 0 ? '#facc15' : '#6366f1', borderRadius: 3 }} />
              </div>
              {c.exemplos?.length ? (
                <div style={{ fontSize: 10, marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {c.exemplos.slice(0, 4).map(id => {
                    const p = linkDe.get(id);
                    return p?.link ? <a key={id} href={p.link} target="_blank" rel="noreferrer" style={{ color: '#64748b' }}>@{p.prod_marketing_concorrentes.username} ↗</a> : null;
                  })}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div style={s.card}>
        <h3 style={s.h3}><Lightbulb size={16} className="text-yellow-400" /> Sugestões para os próximos produtos e trabalhos</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
          {analise.sugestoes.map((sg, i) => (
            <div key={i} style={{ padding: 14, background: '#0a1120', borderRadius: 10, border: `1px solid ${(COR_PRIORIDADE[sg.prioridade ?? 3] ?? '#64748b')}44` }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
                <span style={s.badge(COR_PRIORIDADE[sg.prioridade ?? 3] ?? '#64748b')}>{sg.prioridade === 1 ? 'Fazer já' : sg.prioridade === 2 ? 'Em breve' : 'Mais tarde'}</span>
                <span style={s.badge('#6366f1')}>{sg.tipo}</span>
                {sg.publico && <span style={s.badge('#0ea5e9')}>{sg.publico}</span>}
              </div>
              <strong style={{ fontSize: 14, display: 'block', marginBottom: 6 }}>{sg.titulo}</strong>
              <p style={{ fontSize: 12, color: '#cbd5e1', marginBottom: 6 }}>{sg.descricao}</p>
              <p style={{ fontSize: 11, color: '#8a96aa' }}><strong>Porquê:</strong> {sg.porque}</p>
              {sg.ja_temos && <p style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>Já temos parecido: {sg.ja_temos}</p>}
            </div>
          ))}
        </div>
      </div>

      {(analise.tendencias.length > 0 || analise.fontes.length > 0) && (
        <div style={s.card}>
          <h3 style={s.h3}><TrendingUp size={16} className="text-indigo-400" /> Tendências</h3>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: analise.fontes.length ? 14 : 0 }}>
            {analise.tendencias.map((t, i) => (
              <li key={i} style={{ fontSize: 13, color: '#cbd5e1', paddingLeft: 12, borderLeft: '2px solid #6366f1' }}>
                <strong>{t.tema}</strong> — <span style={{ color: '#94a3b8' }}>{t.evidencia}</span>
              </li>
            ))}
          </ul>
          {analise.fontes.length > 0 && (
            <>
              <label style={s.label}>Fontes da pesquisa</label>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {analise.fontes.map(f => (
                  <a key={f.url} href={f.url} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                    {f.titulo} <ExternalLink size={10} />
                  </a>
                ))}
              </div>
            </>
          )}
          <p style={{ fontSize: 11, color: '#64748b', marginTop: 10 }}>{analise.n_posts_analisados ?? '?'} publicações analisadas. Interação é um indicador de procura, não de vendas.</p>
        </div>
      )}
    </>
  );
}

// ── Resumo por conta ─────────────────────────────────────────────────────────

function ResumoPorConta({ concorrentes, posts }: { concorrentes: Concorrente[]; posts: PostConc[] }) {
  const linhas = concorrentes.filter(c => c.ativo).map(c => {
    const ps = posts.filter(p => p.prod_marketing_concorrentes.username === c.username);
    const env = ps.filter(p => p.envolvimento != null);
    return {
      c, n: ps.length,
      envMedio: env.length ? env.reduce((a, p) => a + Number(p.envolvimento), 0) / env.length : null,
      gostosMedio: ps.length ? ps.reduce((a, p) => a + p.gostos, 0) / ps.length : 0,
      reels: ps.filter(p => p.tipo === 'REELS').length,
      porSemana: ps.length ? ps.length / 13 : 0,
    };
  }).sort((a, b) => (b.envMedio ?? -1) - (a.envMedio ?? -1));

  if (!linhas.some(l => l.n > 0)) return null;
  const th: React.CSSProperties = { textAlign: 'right', padding: '8px 6px', fontSize: 11, color: '#8a96aa', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #1e293b', whiteSpace: 'nowrap' };
  const td: React.CSSProperties = { textAlign: 'right', padding: '7px 6px', fontSize: 12, color: '#cbd5e1', borderBottom: '1px solid #131c2e', whiteSpace: 'nowrap' };

  return (
    <div style={s.card}>
      <h3 style={s.h3}><Users size={16} className="text-indigo-400" /> Comparação entre concorrentes (90 dias)</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
          <thead><tr>
            <th style={{ ...th, textAlign: 'left' }}>Conta</th><th style={th}>Seguidores</th><th style={th}>Posts</th><th style={th}>Posts/semana</th>
            <th style={th}>% Reels</th><th style={th}>Gostos méd.</th><th style={th}>Envolv. méd.</th>
          </tr></thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={l.c.id}>
                <td style={{ ...td, textAlign: 'left', color: i === 0 ? '#facc15' : td.color, fontWeight: i === 0 ? 700 : 400 }}>{i === 0 ? '★ ' : ''}@{l.c.username}</td>
                <td style={td}>{fmt(l.c.seguidores)}</td>
                <td style={td}>{l.n}</td>
                <td style={td}>{l.porSemana.toFixed(1)}</td>
                <td style={td}>{l.n ? `${Math.round(l.reels / l.n * 100)}%` : '—'}</td>
                <td style={td}>{fmt(Math.round(l.gostosMedio))}</td>
                <td style={td}>{pct(l.envMedio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>Posts/semana e % Reels contam só as últimas ~30 publicações recolhidas de cada conta.</p>
    </div>
  );
}
