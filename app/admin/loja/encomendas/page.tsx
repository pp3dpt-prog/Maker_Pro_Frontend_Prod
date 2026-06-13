'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { s, eur } from '../_ui';

const ESTADOS = ['orcamento', 'aguarda_pagamento', 'pendente', 'pago', 'enviado', 'entregue', 'cancelado'];

const estadoCor: Record<string, [string, string]> = {
  orcamento: ['rgba(251,191,36,0.18)', '#fbbf24'],
  aguarda_pagamento: ['rgba(96,165,250,0.18)', '#60a5fa'],
  pendente: ['rgba(148,163,184,0.18)', '#94a3b8'],
  pago: ['rgba(52,211,153,0.18)', '#34d399'],
  enviado: ['rgba(167,139,250,0.18)', '#a78bfa'],
  entregue: ['rgba(52,211,153,0.28)', '#6ee7b7'],
  cancelado: ['rgba(248,113,113,0.18)', '#f87171'],
};

interface Encomenda {
  id: string; numero: number; created_at: string; estado: string;
  total_cents: number; portes_cents: number | null; metodo_pagamento: string | null;
  morada_envio: any; nif: string | null; user_id: string | null; payment_ref: string | null;
}
interface Item { id: string; nome: string; cor: string | null; tamanho: string | null; preco_cents: number | null; quantidade: number; personalizacao: any; }

export default function EncomendasAdminPage() {
  const [encomendas, setEncomendas] = useState<Encomenda[]>([]);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [filtro, setFiltro] = useState('todos');
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [itens, setItens] = useState<Record<string, Item[]>>({});
  const [totalEdit, setTotalEdit] = useState('');
  const [portesEdit, setPortesEdit] = useState('');
  const [linkPagamento, setLinkPagamento] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchEncomendas = useCallback(async () => {
    setLoading(true);
    let q = supabase.from('prod_loja_encomendas').select('*').order('created_at', { ascending: false });
    if (filtro !== 'todos') q = q.eq('estado', filtro);
    const { data } = await q;
    const encs = (data ?? []) as Encomenda[];
    setEncomendas(encs);

    const ids = [...new Set(encs.map(e => e.user_id).filter(Boolean))] as string[];
    if (ids.length) {
      const { data: perfis } = await supabase.from('prod_perfis').select('id, email').in('id', ids);
      const map: Record<string, string> = {};
      (perfis ?? []).forEach((p: any) => { map[p.id] = p.email; });
      setEmails(map);
    }
    setLoading(false);
  }, [filtro]);

  useEffect(() => { fetchEncomendas(); }, [fetchEncomendas]);

  async function abrir(enc: Encomenda) {
    if (expandido === enc.id) { setExpandido(null); return; }
    setExpandido(enc.id);
    setLinkPagamento('');
    setTotalEdit(((enc.total_cents ?? 0) / 100).toString());
    setPortesEdit(((enc.portes_cents ?? 0) / 100).toString());
    if (!itens[enc.id]) {
      const { data } = await supabase.from('prod_loja_encomenda_itens').select('*').eq('encomenda_id', enc.id);
      setItens(prev => ({ ...prev, [enc.id]: (data ?? []) as Item[] }));
    }
  }

  async function mudarEstado(enc: Encomenda, estado: string) {
    const { error } = await supabase.from('prod_loja_encomendas').update({ estado }).eq('id', enc.id);
    if (!error) setEncomendas(prev => prev.map(e => e.id === enc.id ? { ...e, estado } : e));
  }

  async function guardarValor(enc: Encomenda) {
    const toCents = (v: string) => Math.round((parseFloat(v.replace(',', '.')) || 0) * 100);
    const total = toCents(totalEdit), portes = toCents(portesEdit);
    const { error } = await supabase.from('prod_loja_encomendas').update({ total_cents: total, portes_cents: portes }).eq('id', enc.id);
    if (!error) setEncomendas(prev => prev.map(e => e.id === enc.id ? { ...e, total_cents: total, portes_cents: portes } : e));
  }

  async function gerarLink(enc: Encomenda) {
    setBusy(true); setLinkPagamento('');
    try {
      const res = await fetch('/api/admin/loja/gerar-pagamento', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encomenda_id: enc.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro');
      setLinkPagamento(data.url);
      setEncomendas(prev => prev.map(e => e.id === enc.id ? { ...e, estado: 'aguarda_pagamento' } : e));
    } catch (e: any) {
      setLinkPagamento('ERRO: ' + (e.message ?? ''));
    } finally { setBusy(false); }
  }

  function badge(estado: string) {
    const [bg, c] = estadoCor[estado] ?? estadoCor.pendente;
    return s.badge(bg, c);
  }

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <h1 style={s.h1}>Encomendas</h1>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select value={filtro} onChange={e => setFiltro(e.target.value)} style={{ ...s.input, width: 'auto', padding: '8px 12px' }}>
              <option value="todos">Todos os estados</option>
              {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
            <Link href="/admin/loja" style={s.btnGhost}>← Produtos</Link>
          </div>
        </div>

        {loading ? <p style={{ color: '#64748b' }}>A carregar…</p> : encomendas.length === 0 ? (
          <div style={{ ...s.card, color: '#64748b', textAlign: 'center' }}>Sem encomendas.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {encomendas.map(enc => {
              const aberto = expandido === enc.id;
              const lista = itens[enc.id] ?? [];
              const ehOrcamento = enc.estado === 'orcamento' || enc.estado === 'aguarda_pagamento';
              return (
                <div key={enc.id} style={s.card}>
                  <div onClick={() => abrir(enc)} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 140px 110px 130px 24px', gap: 12, alignItems: 'center', cursor: 'pointer' }}>
                    <span style={{ fontWeight: 800, color: '#f1f5f9' }}>#{enc.numero}</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{emails[enc.user_id ?? ''] ?? enc.morada_envio?.nome ?? '—'}</div>
                      <div style={{ fontSize: 11, color: '#475569' }}>{new Date(enc.created_at).toLocaleString('pt-PT')}</div>
                    </div>
                    <span style={badge(enc.estado)}>{enc.estado}</span>
                    <span style={{ fontWeight: 700, color: '#f1f5f9' }}>{eur(enc.total_cents)}</span>
                    <span style={{ fontSize: 12, color: ehOrcamento ? '#fbbf24' : '#64748b' }}>{ehOrcamento ? 'orçamento' : (enc.metodo_pagamento ?? '—')}</span>
                    <span style={{ color: '#64748b', textAlign: 'center' }}>{aberto ? '▴' : '▾'}</span>
                  </div>

                  {aberto && (
                    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #1e293b' }}>
                      {/* Itens */}
                      <div style={{ marginBottom: 16 }}>
                        {lista.map(it => (
                          <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#cbd5e1', padding: '4px 0' }}>
                            <span>{it.quantidade}× {it.nome}{it.cor || it.tamanho ? ` (${[it.cor, it.tamanho].filter(Boolean).join(' / ')})` : ''}{it.personalizacao ? ' ✨ personalizado' : ''}</span>
                            <span>{it.preco_cents == null ? 'a orçamentar' : eur(it.preco_cents * it.quantidade)}</span>
                          </div>
                        ))}
                      </div>

                      {/* Morada */}
                      {enc.morada_envio && (
                        <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 16, lineHeight: 1.6 }}>
                          <strong style={{ color: '#cbd5e1' }}>Envio:</strong> {enc.morada_envio.nome}, {enc.morada_envio.morada}, {enc.morada_envio.codigo_postal} {enc.morada_envio.cidade}
                          {enc.morada_envio.telefone ? ` · ${enc.morada_envio.telefone}` : ''}{enc.nif ? ` · NIF ${enc.nif}` : ''}
                        </div>
                      )}

                      {/* Ações */}
                      <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div>
                          <label style={s.label}>Estado</label>
                          <select value={enc.estado} onChange={e => mudarEstado(enc, e.target.value)} style={{ ...s.input, width: 180 }}>
                            {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
                          </select>
                        </div>

                        {ehOrcamento && (
                          <>
                            <div>
                              <label style={s.label}>Valor final (€)</label>
                              <input style={{ ...s.input, width: 110 }} value={totalEdit} onChange={e => setTotalEdit(e.target.value)} inputMode="decimal" />
                            </div>
                            <div>
                              <label style={s.label}>Portes (€)</label>
                              <input style={{ ...s.input, width: 90 }} value={portesEdit} onChange={e => setPortesEdit(e.target.value)} inputMode="decimal" />
                            </div>
                            <button style={s.btnGhost} onClick={() => guardarValor(enc)}>Guardar valor</button>
                            <button style={s.btn} onClick={() => gerarLink(enc)} disabled={busy}>{busy ? '…' : 'Gerar link de pagamento'}</button>
                          </>
                        )}
                      </div>

                      {linkPagamento && (
                        <div style={{ marginTop: 14 }}>
                          {linkPagamento.startsWith('ERRO') ? (
                            <p style={{ color: '#f87171', fontSize: 13 }}>{linkPagamento}</p>
                          ) : (
                            <div>
                              <p style={{ fontSize: 12, color: '#34d399', marginBottom: 6 }}>Link gerado — envia ao cliente:</p>
                              <input readOnly value={linkPagamento} onFocus={e => e.currentTarget.select()} style={{ ...s.input, fontSize: 12 }} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
