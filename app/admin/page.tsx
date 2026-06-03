'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import CreateCouponForm from '@/components/admin/CreateCouponForm';
import type { CSSProperties, ReactNode } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Cupom { id: number; codigo: string; desconto_percent: number; usos_atuais: number; max_usos: number; ativo: boolean; }
interface TicketSuporte { id: string; assunto: string; mensagem?: string; user_email: string; status: 'aberto' | 'fechado'; prioridade: 'baixa' | 'media' | 'alta'; created_at: string; resposta?: string; respondido_em?: string; }
interface Campanha { id: string; titulo: string; tipo: string; cliques: number; vistas: number; ativa: boolean; created_at: string; }

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = {
  page: { display: 'flex', minHeight: '100vh', background: '#080c10', color: '#f1f5f9', fontFamily: 'Inter, Arial, sans-serif' } as CSSProperties,
  sidebar: { width: 220, flexShrink: 0, borderRight: '1px solid #1e293b', padding: '28px 16px', display: 'flex', flexDirection: 'column', gap: 4 } as CSSProperties,
  sidebarTitle: { fontSize: 10, fontWeight: 800, letterSpacing: '0.15em', color: '#475569', textTransform: 'uppercase', padding: '0 12px', marginBottom: 12 } as CSSProperties,
  main: { flex: 1, padding: '40px 32px', overflowY: 'auto' } as CSSProperties,
  card: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 24 } as CSSProperties,
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 } as CSSProperties,
  statCard: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: '28px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 } as CSSProperties,
  statLabel: { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b' } as CSSProperties,
  statValue: { fontSize: 36, fontWeight: 800, color: '#f1f5f9', lineHeight: 1 } as CSSProperties,
  tableWrap: { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, overflow: 'hidden' } as CSSProperties,
  thead: { background: '#0a1120', borderBottom: '1px solid #1e293b' } as CSSProperties,
  th: { padding: '12px 20px', textAlign: 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' } as CSSProperties,
  td: { padding: '14px 20px', fontSize: 14, color: '#cbd5e1', borderBottom: '1px solid #0f172a' } as CSSProperties,
  input: { width: '100%', background: '#0a1120', border: '1px solid #1e293b', borderRadius: 8, padding: '10px 14px', color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box' } as CSSProperties,
  label: { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', marginBottom: 6 } as CSSProperties,
  btn: { padding: '10px 20px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' } as CSSProperties,
  badge: (bg: string, color: string) => ({ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: bg, color, textTransform: 'uppercase', letterSpacing: '0.05em' } as CSSProperties),
};

// ─── Sidebar button ───────────────────────────────────────────────────────────

function SideBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
        borderRadius: 10, border: 'none', width: '100%', textAlign: 'left',
        cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
        background: active ? '#1e293b' : 'transparent',
        color: active ? '#93c5fd' : '#94a3b8',
        transition: 'background 0.15s, color 0.15s',
      }}
    >
      {children}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'stats' | 'cupons' | 'tickets' | 'campanhas' | 'faturas'>('stats');
  const [showModal, setShowModal] = useState(false);
  const [cupons, setCupons] = useState<Cupom[]>([]);
  const [tickets, setTickets] = useState<TicketSuporte[]>([]);
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [stats, setStats] = useState({ users: 0, tickets: 0, pedidosPendentes: 0, faturasPendentes: 0 });
  const [faturas, setFaturas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [campTitulo, setCampTitulo] = useState('');
  const [campCanal, setCampCanal] = useState('Feed da App');
  const [campConteudo, setCampConteudo] = useState('');
  const [campStatus, setCampStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [campErro, setCampErro] = useState('');

  const [enviandoId, setEnviandoId] = useState<string | null>(null);
  const [newsletterMsg, setNewsletterMsg] = useState<{ id: string; texto: string; tipo: 'ok' | 'erro' } | null>(null);
  const [respostasTicket, setRespostasTicket] = useState<Record<string, string>>({});
  const [enviandoResposta, setEnviandoResposta] = useState<string | null>(null);
  const [respostaMsg, setRespostaMsg] = useState<{ id: string; texto: string; tipo: 'ok'|'erro' } | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [{ data: cData }, { data: tData }, { data: cpData }, { count: uCount }, { count: tOpenCount }, { count: pedidosCount }, { data: faturasData, count: faturasCount }] = await Promise.all([
        supabase.from('cupons').select('*').order('created_at', { ascending: false }),
        supabase.from('prod_tickets_suporte').select('*').order('created_at', { ascending: false }),
        supabase.from('prod_campanhas').select('*').order('created_at', { ascending: false }),
        supabase.from('prod_perfis').select('*', { count: 'exact', head: true }),
        supabase.from('prod_tickets_suporte').select('*', { count: 'exact', head: true }).eq('status', 'aberto'),
        supabase.from('prod_pedidos_orcamento').select('*', { count: 'exact', head: true }).eq('estado', 'pendente_orcamento'),
        supabase.from('prod_pagamentos').select('*', { count: 'exact' }).eq('fatura_emitida', false).order('created_at', { ascending: false }),
      ]);
      setCupons(cData || []);
      setTickets(tData || []);
      setCampanhas(cpData || []);
      setFaturas(faturasData || []);
      setStats({ users: uCount || 0, tickets: tOpenCount || 0, pedidosPendentes: pedidosCount || 0, faturasPendentes: faturasCount || 0 });
    } catch (err) {
      console.error('Erro ao carregar dados admin:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCriarCampanha = async () => {
    if (!campTitulo || !campConteudo) { setCampErro('Preenche o título e o conteúdo.'); return; }
    setCampStatus('loading'); setCampErro('');
    const { error } = await supabase.from('prod_campanhas').insert([{ titulo: campTitulo, tipo: campCanal, conteudo: campConteudo, ativa: true, segmento: 'todos' }]);
    if (error) { setCampErro('Erro: ' + error.message); setCampStatus('error'); }
    else { setCampStatus('success'); setCampTitulo(''); setCampConteudo(''); fetchData(); setTimeout(() => setCampStatus('idle'), 3000); }
  };

  const enviarNewsletter = async (camp: Campanha) => {
    if (!confirm(`Enviar "${camp.titulo}" por email a todos os utilizadores?`)) return;
    setEnviandoId(camp.id); setNewsletterMsg(null);
    try {
      const res = await fetch('/api/enviar-campanha', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ campanha_id: camp.id }) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro desconhecido');
      setNewsletterMsg({ id: camp.id, texto: `✓ Enviado a ${json.enviados} utilizadores`, tipo: 'ok' });
    } catch (err: unknown) {
      setNewsletterMsg({ id: camp.id, texto: err instanceof Error ? err.message : 'Erro ao enviar', tipo: 'erro' });
    } finally { setEnviandoId(null); }
  };

  const deleteCoupon = async (id: number) => {
    if (!confirm('Eliminar este cupão?')) return;
    const { error } = await supabase.from('cupons').delete().eq('id', id);
    if (!error) fetchData();
  };

  const toggleTicketStatus = async (id: string, current: string) => {
    const { error } = await supabase.from('prod_tickets_suporte').update({ status: current === 'aberto' ? 'fechado' : 'aberto' }).eq('id', id);
    if (!error) fetchData();
  };

  const enviarRespostaTicket = async (t: TicketSuporte) => {
    const resposta = respostasTicket[t.id]?.trim();
    if (!resposta) return;
    setEnviandoResposta(t.id); setRespostaMsg(null);
    try {
      const res = await fetch('/api/admin/suporte/responder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: t.id, resposta }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro');
      setRespostaMsg({ id: t.id, texto: '✓ Resposta enviada e email notificado', tipo: 'ok' });
      setRespostasTicket(prev => { const n = {...prev}; delete n[t.id]; return n; });
      fetchData();
    } catch (err: any) {
      setRespostaMsg({ id: t.id, texto: err.message, tipo: 'erro' });
    } finally { setEnviandoResposta(null); }
  };

  return (
    <div style={s.page}>
      {/* SIDEBAR */}
      <aside style={s.sidebar}>
        <p style={s.sidebarTitle}>Admin</p>

        <SideBtn active={activeTab === 'stats'} onClick={() => setActiveTab('stats')}>📊 Geral</SideBtn>
        <SideBtn active={activeTab === 'cupons'} onClick={() => setActiveTab('cupons')}>🏷️ Cupões</SideBtn>
        <SideBtn active={activeTab === 'tickets'} onClick={() => setActiveTab('tickets')}>🎫 Tickets</SideBtn>
        <SideBtn active={activeTab === 'campanhas'} onClick={() => setActiveTab('campanhas')}>📣 Campanhas</SideBtn>
        <SideBtn active={activeTab === 'faturas'} onClick={() => setActiveTab('faturas')}>
          🧾 Faturas
          {stats.faturasPendentes > 0 && (
            <span style={{ marginLeft: 'auto', background: '#f59e0b', color: '#000', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 20 }}>
              {stats.faturasPendentes}
            </span>
          )}
        </SideBtn>

        <div style={{ borderTop: '1px solid #1e293b', margin: '8px 0' }} />

        <Link
          href="/admin/pedidos"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600,
            color: '#94a3b8', textDecoration: 'none', transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = '#1e293b')}
          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
        >
          <span>📋 Orçamentos</span>
          {stats.pedidosPendentes > 0 && (
            <span style={{ background: '#f59e0b', color: '#000', fontSize: 10, fontWeight: 800, padding: '2px 7px', borderRadius: 20 }}>
              {stats.pedidosPendentes}
            </span>
          )}
        </Link>
      </aside>

      {/* MAIN */}
      <main style={s.main}>

        {/* Modal cupão */}
        {showModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ position: 'relative', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 20, padding: 8, width: '100%', maxWidth: 480 }}>
              <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20 }}>✕</button>
              <CreateCouponForm onSuccess={() => { fetchData(); setShowModal(false); }} onClose={() => setShowModal(false)} />
            </div>
          </div>
        )}

        {/* ── TAB: GERAL ── */}
        {activeTab === 'stats' && (
          <>
            <h1 style={{ margin: '0 0 24px', fontSize: 24, fontWeight: 800 }}>Painel Geral</h1>
            <div style={s.statGrid}>
              <div style={s.statCard}>
                <span style={{ fontSize: 28 }}>👥</span>
                <p style={s.statLabel}>Utilizadores</p>
                <p style={s.statValue}>{loading ? '…' : stats.users}</p>
              </div>
              <div style={s.statCard}>
                <span style={{ fontSize: 28 }}>🎫</span>
                <p style={s.statLabel}>Tickets Abertos</p>
                <p style={s.statValue}>{loading ? '…' : stats.tickets}</p>
              </div>
              <div style={s.statCard}>
                <span style={{ fontSize: 28 }}>📣</span>
                <p style={s.statLabel}>Campanhas Ativas</p>
                <p style={s.statValue}>{loading ? '…' : campanhas.filter(c => c.ativa).length}</p>
              </div>
              <Link href="/admin/pedidos" style={{ textDecoration: 'none' }}>
                <div style={{ ...s.statCard, borderColor: stats.pedidosPendentes > 0 ? '#f59e0b40' : '#1e293b', cursor: 'pointer' }}>
                  <span style={{ fontSize: 28 }}>📋</span>
                  <p style={s.statLabel}>Orçamentos Pendentes</p>
                  <p style={{ ...s.statValue, color: stats.pedidosPendentes > 0 ? '#f59e0b' : '#f1f5f9' }}>{loading ? '…' : stats.pedidosPendentes}</p>
                </div>
              </Link>
            </div>
          </>
        )}

        {/* ── TAB: FATURAS ── */}
        {activeTab === 'faturas' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>🧾 Faturas pendentes</h1>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
                  Emite cada fatura no FIZ e clica em "Marcar emitida". O cliente foi informado que recebe em até 24h.
                </p>
              </div>
            </div>
            {faturas.length === 0 ? (
              <div style={{ ...s.card, textAlign: 'center', color: '#475569', fontStyle: 'italic', padding: '48px 24px' }}>
                ✅ Sem faturas pendentes.
              </div>
            ) : (
              <div style={s.tableWrap}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={s.thead}>
                    <tr>
                      {['Data', 'Email', 'Descrição', 'Valor', 'Ação'].map(h => (
                        <th key={h} style={s.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {faturas.map((f: any) => (
                      <tr key={f.id}>
                        <td style={{ ...s.td, fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                          {new Date(f.created_at).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td style={s.td}>{f.user_email}</td>
                        <td style={s.td}>{f.descricao}</td>
                        <td style={{ ...s.td, fontWeight: 700, color: '#86efac' }}>{Number(f.valor).toFixed(2)}€</td>
                        <td style={{ ...s.td, display: 'flex', gap: 8, alignItems: 'center' }}>
                          <a
                            href="https://app.fiz.co"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ ...s.btn, fontSize: 11, padding: '6px 12px', textDecoration: 'none', display: 'inline-block' }}
                          >
                            Abrir FIZ →
                          </a>
                          <button
                            onClick={async () => {
                              await supabase.from('prod_pagamentos').update({ fatura_emitida: true, fatura_emitida_em: new Date().toISOString() }).eq('id', f.id);
                              fetchData();
                            }}
                            style={{ ...s.btn, fontSize: 11, padding: '6px 12px', background: '#14532d', color: '#86efac' }}
                          >
                            ✓ Marcar emitida
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ── TAB: CUPÕES ── */}
        {activeTab === 'cupons' && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>Cupões de Desconto</h1>
              <button onClick={() => setShowModal(true)} style={{ ...s.btn, display: 'flex', alignItems: 'center', gap: 8 }}>
                + Novo Cupão
              </button>
            </div>
            <div style={s.tableWrap}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={s.thead}>
                  <tr>
                    {['Código', 'Desconto', 'Usos', 'Estado', ''].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cupons.length === 0 ? (
                    <tr><td colSpan={5} style={{ ...s.td, textAlign: 'center', color: '#475569', fontStyle: 'italic', padding: '40px 20px' }}>Sem cupões criados.</td></tr>
                  ) : cupons.map(c => (
                    <tr key={c.id}>
                      <td style={{ ...s.td, fontFamily: 'monospace', color: '#93c5fd', fontWeight: 700 }}>{c.codigo}</td>
                      <td style={s.td}>{c.desconto_percent}%</td>
                      <td style={{ ...s.td, color: '#64748b' }}>{c.usos_atuais} / {c.max_usos}</td>
                      <td style={s.td}>
                        <span style={s.badge(c.ativo ? '#14532d' : '#1e293b', c.ativo ? '#86efac' : '#64748b')}>
                          {c.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td style={{ ...s.td, textAlign: 'right' }}>
                        <button onClick={() => deleteCoupon(c.id)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Eliminar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* ── TAB: TICKETS ── */}
        {activeTab === 'tickets' && (
          <>
            <h1 style={{ margin: '0 0 24px', fontSize: 24, fontWeight: 800 }}>Tickets de Suporte</h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tickets.length === 0 ? (
                <div style={{ ...s.card, textAlign: 'center', color: '#475569', fontStyle: 'italic', padding: '48px 24px' }}>Sem tickets pendentes.</div>
              ) : tickets.map(t => (
                <div key={t.id} style={{ ...s.card, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Cabeçalho */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                        <span style={s.badge(t.prioridade === 'alta' ? '#7f1d1d' : t.prioridade === 'media' ? '#1e3a5f' : '#1e293b', t.prioridade === 'alta' ? '#fca5a5' : t.prioridade === 'media' ? '#93c5fd' : '#64748b')}>
                          {t.prioridade}
                        </span>
                        <span style={s.badge(t.status === 'aberto' ? '#14532d' : '#1e293b', t.status === 'aberto' ? '#86efac' : '#64748b')}>
                          {t.status}
                        </span>
                        <span style={{ fontSize: 12, color: '#475569' }}>{new Date(t.created_at).toLocaleString('pt-PT')}</span>
                      </div>
                      <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 16, color: '#f1f5f9' }}>{t.assunto}</p>
                      <p style={{ margin: 0, fontSize: 13, color: '#64748b' }}>{t.user_email}</p>
                    </div>
                    <button onClick={() => toggleTicketStatus(t.id, t.status)}
                      style={{ ...s.btn, background: t.status === 'aberto' ? '#f59e0b' : '#1e293b', color: t.status === 'aberto' ? '#000' : '#94a3b8', flexShrink: 0, fontSize: 12, padding: '6px 14px' }}>
                      {t.status === 'aberto' ? 'Fechar' : 'Reabrir'}
                    </button>
                  </div>

                  {/* Mensagem do utilizador */}
                  {t.mensagem && (
                    <div style={{ background: '#080c10', borderRadius: 8, padding: '12px 14px' }}>
                      <p style={{ margin: '0 0 4px', fontSize: 11, color: '#475569', textTransform: 'uppercase' }}>Mensagem</p>
                      <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', whiteSpace: 'pre-wrap' }}>{t.mensagem}</p>
                    </div>
                  )}

                  {/* Resposta existente */}
                  {t.resposta && (
                    <div style={{ background: '#0f2a1a', border: '1px solid #166534', borderRadius: 8, padding: '12px 14px' }}>
                      <p style={{ margin: '0 0 4px', fontSize: 11, color: '#86efac', textTransform: 'uppercase' }}>Resposta enviada</p>
                      <p style={{ margin: 0, fontSize: 13, color: '#d1fae5', whiteSpace: 'pre-wrap' }}>{t.resposta}</p>
                    </div>
                  )}

                  {/* Campo de resposta */}
                  {t.status === 'aberto' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <textarea
                        value={respostasTicket[t.id] ?? ''}
                        onChange={e => setRespostasTicket(prev => ({ ...prev, [t.id]: e.target.value }))}
                        placeholder="Escreve a resposta ao utilizador…"
                        rows={3}
                        style={{ ...s.input, resize: 'vertical' }}
                      />
                      {respostaMsg?.id === t.id && (
                        <p style={{ margin: 0, fontSize: 12, color: respostaMsg.tipo === 'ok' ? '#86efac' : '#f87171' }}>{respostaMsg.texto}</p>
                      )}
                      <button
                        onClick={() => enviarRespostaTicket(t)}
                        disabled={enviandoResposta === t.id || !respostasTicket[t.id]?.trim()}
                        style={{ ...s.btn, alignSelf: 'flex-end', opacity: !respostasTicket[t.id]?.trim() ? 0.5 : 1 }}
                      >
                        {enviandoResposta === t.id ? 'A enviar…' : '✉ Responder e notificar'}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── TAB: CAMPANHAS ── */}
        {activeTab === 'campanhas' && (
          <>
            <h1 style={{ margin: '0 0 24px', fontSize: 24, fontWeight: 800 }}>Campanhas</h1>

            {/* Criar campanha */}
            <div style={{ ...s.card, marginBottom: 24 }}>
              <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>Nova Campanha</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div>
                  <label style={s.label}>Título</label>
                  <input style={s.input} value={campTitulo} onChange={e => setCampTitulo(e.target.value)} placeholder="Ex: Promoção Flash" />
                </div>
                <div>
                  <label style={s.label}>Canal</label>
                  <select style={s.input} value={campCanal} onChange={e => setCampCanal(e.target.value)}>
                    <option>Feed da App</option>
                    <option>Banner Principal</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={s.label}>Conteúdo</label>
                <textarea style={{ ...s.input, height: 100, resize: 'vertical' }} value={campConteudo} onChange={e => setCampConteudo(e.target.value)} placeholder="Escreve aqui..." />
              </div>
              {campErro && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{campErro}</p>}
              <button
                onClick={handleCriarCampanha}
                disabled={campStatus === 'loading'}
                style={{ ...s.btn, width: '100%', padding: '14px', background: campStatus === 'success' ? '#16a34a' : '#1d4ed8' }}
              >
                {campStatus === 'loading' ? 'A publicar…' : campStatus === 'success' ? '✓ Publicada com sucesso!' : 'Publicar Campanha'}
              </button>
            </div>

            {/* Lista campanhas */}
            <div style={s.tableWrap}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={s.thead}>
                  <tr>
                    {['Campanha', 'Canal', 'Cliques', 'Newsletter', 'Estado'].map(h => (
                      <th key={h} style={s.th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {campanhas.length === 0 ? (
                    <tr><td colSpan={5} style={{ ...s.td, textAlign: 'center', color: '#475569', fontStyle: 'italic', padding: '40px 20px' }}>Sem campanhas criadas.</td></tr>
                  ) : campanhas.map(camp => (
                    <tr key={camp.id}>
                      <td style={s.td}>
                        <p style={{ margin: '0 0 2px', fontWeight: 600, color: '#f1f5f9' }}>{camp.titulo}</p>
                        {newsletterMsg?.id === camp.id && (
                          <p style={{ margin: 0, fontSize: 11, color: newsletterMsg.tipo === 'ok' ? '#86efac' : '#f87171' }}>{newsletterMsg.texto}</p>
                        )}
                      </td>
                      <td style={{ ...s.td, color: '#64748b', fontSize: 12 }}>{camp.tipo}</td>
                      <td style={{ ...s.td, fontFamily: 'monospace', color: '#93c5fd' }}>{camp.cliques}</td>
                      <td style={s.td}>
                        <button
                          onClick={() => enviarNewsletter(camp)}
                          disabled={enviandoId === camp.id}
                          style={{ ...s.btn, padding: '6px 14px', fontSize: 12, background: '#1e293b', color: '#93c5fd', opacity: enviandoId === camp.id ? 0.5 : 1 }}
                        >
                          {enviandoId === camp.id ? 'A enviar…' : '✉ Email'}
                        </button>
                      </td>
                      <td style={s.td}>
                        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: camp.ativa ? '#22c55e' : '#ef4444' }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

      </main>
    </div>
  );
}
