'use client';

// Gestão de códigos: desconto na loja, encomenda sem pagamento, downloads gratuitos, plano por N dias.
import { useEffect, useState, useCallback, Fragment } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { s, eur } from '../loja/_ui';

type Tipo = 'desconto' | 'sem_pagamento' | 'downloads' | 'plano';

interface Codigo {
  id: number; codigo: string; tipo: Tipo; desconto_percent: number | null; valor_cents: number | null;
  downloads: number | null; plano_id: string | null; plano_dias: number | null;
  max_usos: number | null; usos_atuais: number | null; validade: string | null; ativo: boolean;
  um_por_utilizador: boolean; notas: string | null; created_at: string;
}
interface Plano { id: string; nome: string; validade_dias: number | null; }
interface Resgate { id: string; email: string | null; detalhe: string | null; created_at: string; encomenda_id: string | null; }

const TIPOS: { v: Tipo; label: string; ajuda: string }[] = [
  { v: 'desconto', label: '💸 Desconto na loja', ajuda: 'Percentagem ou valor fixo, aplicado no checkout antes do pagamento.' },
  { v: 'sem_pagamento', label: '🎟️ Encomenda sem pagamento', ajuda: 'No checkout, a encomenda é enviada por email sem pagar (ex.: parceiros, ofertas).' },
  { v: 'downloads', label: '⬇️ Downloads gratuitos', ajuda: 'O utilizador resgata no dashboard e recebe créditos de download.' },
  { v: 'plano', label: '⭐ Plano gratuito', ajuda: 'O utilizador resgata no dashboard e fica com o plano durante N dias.' },
];

const vazio = {
  id: 0, codigo: '', tipo: 'desconto' as Tipo, desconto_percent: 10, valor_eur: '', downloads: 5, plano_id: '', plano_dias: 30,
  max_usos: '100', validade: '', ativo: true, um_por_utilizador: true, notas: '',
};
type Form = typeof vazio;

function gerarCodigo() {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'PP3D-' + Array.from({ length: 6 }, () => abc[Math.floor(Math.random() * abc.length)]).join('');
}

function efeito(c: Codigo, planos: Plano[]): string {
  switch (c.tipo) {
    case 'sem_pagamento': return 'Sem pagamento';
    case 'downloads': return `${c.downloads ?? 0} download(s)`;
    case 'plano': return `${planos.find(p => p.id === c.plano_id)?.nome ?? 'Plano'} · ${c.plano_dias ?? '?'} dias`;
    default: return c.valor_cents ? `−${eur(c.valor_cents)}` : `−${c.desconto_percent ?? 0}%`;
  }
}

export default function CodigosAdminPage() {
  const [codigos, setCodigos] = useState<Codigo[]>([]);
  const [planos, setPlanos] = useState<Plano[]>([]);
  const [filtro, setFiltro] = useState<'todos' | Tipo>('todos');
  const [form, setForm] = useState<Form | null>(null);
  const [erro, setErro] = useState('');
  const [aGuardar, setAGuardar] = useState(false);
  const [aberto, setAberto] = useState<number | null>(null);
  const [resgates, setResgates] = useState<Resgate[]>([]);

  const carregar = useCallback(async () => {
    const [{ data: cs, error }, { data: ps }] = await Promise.all([
      supabase.from('prod_cupons').select('*').order('created_at', { ascending: false }),
      supabase.from('prod_planos').select('id, nome, validade_dias').order('preco'),
    ]);
    if (error) setErro(error.message);
    setCodigos((cs ?? []) as Codigo[]);
    setPlanos((ps ?? []) as Plano[]);
  }, []);
  useEffect(() => { carregar(); }, [carregar]);

  function editar(c: Codigo) {
    setErro('');
    setForm({
      id: c.id, codigo: c.codigo, tipo: c.tipo, desconto_percent: c.desconto_percent ?? 0,
      valor_eur: c.valor_cents ? (c.valor_cents / 100).toFixed(2) : '', downloads: c.downloads ?? 5,
      plano_id: c.plano_id ?? '', plano_dias: c.plano_dias ?? 30, max_usos: c.max_usos == null ? '' : String(c.max_usos),
      validade: c.validade ? c.validade.slice(0, 10) : '', ativo: c.ativo, um_por_utilizador: c.um_por_utilizador, notas: c.notas ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function guardar() {
    if (!form) return;
    const codigo = form.codigo.trim().toUpperCase();
    if (!/^[A-Z0-9_-]{3,40}$/.test(codigo)) { setErro('O código só pode ter letras, números, - e _ (3 a 40).'); return; }
    if (form.tipo === 'plano' && !form.plano_id) { setErro('Escolhe o plano.'); return; }
    const valorCents = form.valor_eur ? Math.round(parseFloat(form.valor_eur.replace(',', '.')) * 100) : null;
    const linha = {
      codigo, tipo: form.tipo, ativo: form.ativo, um_por_utilizador: form.um_por_utilizador,
      notas: form.notas.trim() || null,
      max_usos: form.max_usos.trim() ? Math.max(1, parseInt(form.max_usos, 10)) : null,
      validade: form.validade ? new Date(form.validade + 'T23:59:59').toISOString() : null,
      desconto_percent: form.tipo === 'desconto' && !valorCents ? Math.min(100, Math.max(0, Number(form.desconto_percent) || 0)) : form.tipo === 'sem_pagamento' ? 100 : 0,
      valor_cents: form.tipo === 'desconto' ? valorCents : null,
      downloads: form.tipo === 'downloads' ? Math.max(1, Number(form.downloads) || 1) : null,
      plano_id: form.tipo === 'plano' ? form.plano_id : null,
      plano_dias: form.tipo === 'plano' ? Math.max(1, Number(form.plano_dias) || 30) : null,
    };
    setAGuardar(true); setErro('');
    const { error } = form.id
      ? await supabase.from('prod_cupons').update(linha).eq('id', form.id)
      : await supabase.from('prod_cupons').insert({ ...linha, usos_atuais: 0 });
    setAGuardar(false);
    if (error) { setErro(error.message.includes('duplicate') ? 'Já existe um código com esse nome.' : error.message); return; }
    setForm(null);
    carregar();
  }

  async function alternar(c: Codigo) {
    const { error } = await supabase.from('prod_cupons').update({ ativo: !c.ativo }).eq('id', c.id);
    if (!error) setCodigos(prev => prev.map(x => x.id === c.id ? { ...x, ativo: !x.ativo } : x));
  }

  async function apagar(c: Codigo) {
    if (!confirm(`Apagar o código ${c.codigo}? O histórico de utilizações também é apagado. Para o parar sem perder o histórico, desativa-o.`)) return;
    const { error } = await supabase.from('prod_cupons').delete().eq('id', c.id);
    if (error) { alert(error.message); return; }
    setCodigos(prev => prev.filter(x => x.id !== c.id));
  }

  async function verResgates(c: Codigo) {
    if (aberto === c.id) { setAberto(null); return; }
    setAberto(c.id); setResgates([]);
    const { data } = await supabase.from('prod_cupoes_resgates').select('id, email, detalhe, created_at, encomenda_id')
      .eq('cupao_id', c.id).order('created_at', { ascending: false }).limit(100);
    setResgates((data ?? []) as Resgate[]);
  }

  const lista = codigos.filter(c => filtro === 'todos' || c.tipo === filtro);
  const tipoAtual = form ? TIPOS.find(t => t.v === form.tipo) : null;
  const expirado = (c: Codigo) => !!c.validade && new Date(c.validade) < new Date();
  const esgotado = (c: Codigo) => c.max_usos != null && (c.usos_atuais ?? 0) >= c.max_usos;

  return (
    <main style={s.page}>
      <div style={s.wrap}>
        <Link href="/admin" style={{ ...s.btnGhost, marginBottom: 20 }}>← Admin</Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 style={s.h1}>Códigos</h1>
            <p style={s.sub}>Descontos e encomendas sem pagamento (usados no checkout) · downloads e planos (resgatados no dashboard).</p>
          </div>
          {!form && <button style={s.btn} onClick={() => { setErro(''); setForm({ ...vazio, codigo: gerarCodigo() }); }}>+ Novo código</button>}
        </div>

        {form && (
          <div style={{ ...s.card, marginBottom: 24 }}>
            <h2 style={{ margin: '0 0 18px', fontSize: 17 }}>{form.id ? `Editar ${form.codigo}` : 'Novo código'}</h2>

            <label style={s.label}>Tipo</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 8, marginBottom: 6 }}>
              {TIPOS.map(t => (
                <button key={t.v} type="button" onClick={() => setForm({ ...form, tipo: t.v })}
                  style={{ ...s.btnGhost, justifyContent: 'center', background: form.tipo === t.v ? 'rgba(37,99,235,0.18)' : 'transparent', color: form.tipo === t.v ? '#93c5fd' : '#94a3b8', borderColor: form.tipo === t.v ? '#2563eb' : '#1e293b' }}>
                  {t.label}
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, color: '#8a96aa', margin: '0 0 18px' }}>{tipoAtual?.ajuda}</p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
              <div>
                <label style={s.label}>Código</label>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input style={{ ...s.input, fontFamily: 'monospace' }} value={form.codigo} onChange={e => setForm({ ...form, codigo: e.target.value.toUpperCase() })} />
                  <button type="button" style={s.btnGhost} title="Gerar" onClick={() => setForm({ ...form, codigo: gerarCodigo() })}>🎲</button>
                </div>
              </div>

              {form.tipo === 'desconto' && (<>
                <div>
                  <label style={s.label}>Desconto (%)</label>
                  <input style={s.input} type="number" min={0} max={100} value={form.desconto_percent} disabled={!!form.valor_eur}
                    onChange={e => setForm({ ...form, desconto_percent: Number(e.target.value) })} />
                </div>
                <div>
                  <label style={s.label}>…ou valor fixo (€)</label>
                  <input style={s.input} inputMode="decimal" placeholder="ex.: 2,50" value={form.valor_eur}
                    onChange={e => setForm({ ...form, valor_eur: e.target.value })} />
                </div>
              </>)}

              {form.tipo === 'downloads' && (
                <div>
                  <label style={s.label}>Nº de downloads</label>
                  <input style={s.input} type="number" min={1} value={form.downloads} onChange={e => setForm({ ...form, downloads: Number(e.target.value) })} />
                </div>
              )}

              {form.tipo === 'plano' && (<>
                <div>
                  <label style={s.label}>Plano</label>
                  <select style={s.input} value={form.plano_id} onChange={e => {
                    const p = planos.find(x => x.id === e.target.value);
                    setForm({ ...form, plano_id: e.target.value, plano_dias: p?.validade_dias ?? form.plano_dias });
                  }}>
                    <option value="">— escolher —</option>
                    {planos.map(p => <option key={p.id} value={p.id}>{p.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label style={s.label}>Duração (dias)</label>
                  <input style={s.input} type="number" min={1} value={form.plano_dias} onChange={e => setForm({ ...form, plano_dias: Number(e.target.value) })} />
                </div>
              </>)}

              <div>
                <label style={s.label}>Máximo de utilizações</label>
                <input style={s.input} type="number" min={1} placeholder="sem limite" value={form.max_usos} onChange={e => setForm({ ...form, max_usos: e.target.value })} />
              </div>
              <div>
                <label style={s.label}>Válido até</label>
                <input style={s.input} type="date" value={form.validade} onChange={e => setForm({ ...form, validade: e.target.value })} />
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={s.label}>Notas (para quem é, campanha, parceiro…)</label>
                <input style={s.input} placeholder="ex.: Retiro Pet Spa — Quarteira" value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 20, marginTop: 16, flexWrap: 'wrap', fontSize: 14, color: '#cbd5e1' }}>
              <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="checkbox" checked={form.ativo} onChange={e => setForm({ ...form, ativo: e.target.checked })} /> Ativo
              </label>
              {(form.tipo === 'downloads' || form.tipo === 'plano') && (
                <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="checkbox" checked={form.um_por_utilizador} onChange={e => setForm({ ...form, um_por_utilizador: e.target.checked })} /> Uma vez por utilizador
                </label>
              )}
            </div>

            {erro && <p style={{ color: '#f87171', fontSize: 13, margin: '14px 0 0' }}>{erro}</p>}
            <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
              <button style={s.btn} onClick={guardar} disabled={aGuardar}>{aGuardar ? 'A guardar…' : 'Guardar'}</button>
              <button style={s.btnGhost} onClick={() => setForm(null)}>Cancelar</button>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {[{ v: 'todos', label: 'Todos' }, ...TIPOS].map(t => (
            <button key={t.v} onClick={() => setFiltro(t.v as any)}
              style={{ ...s.btnGhost, padding: '6px 12px', fontSize: 12, color: filtro === t.v ? '#93c5fd' : '#94a3b8', borderColor: filtro === t.v ? '#2563eb' : '#1e293b' }}>
              {t.label}
            </button>
          ))}
        </div>
        {!form && erro && <p style={{ color: '#f87171', fontSize: 13 }}>{erro}</p>}

        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead style={s.thead}>
              <tr>{['Código', 'Efeito', 'Usos', 'Validade', 'Estado', ''].map(h => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {lista.length === 0 && (
                <tr><td colSpan={6} style={{ ...s.td, textAlign: 'center', color: '#8a96aa', padding: 40 }}>Sem códigos.</td></tr>
              )}
              {lista.map(c => (
                <Fragment key={c.id}>
                  <tr>
                    <td style={s.td}>
                      <div style={{ fontFamily: 'monospace', color: '#93c5fd', fontWeight: 700 }}>{c.codigo}</div>
                      {c.notas && <div style={{ fontSize: 12, color: '#8a96aa' }}>{c.notas}</div>}
                    </td>
                    <td style={s.td}>{efeito(c, planos)}</td>
                    <td style={s.td}>
                      <button onClick={() => verResgates(c)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', padding: 0, fontSize: 14 }}>
                        {c.usos_atuais ?? 0}{c.max_usos != null ? ` / ${c.max_usos}` : ''} {aberto === c.id ? '▴' : '▾'}
                      </button>
                    </td>
                    <td style={{ ...s.td, color: expirado(c) ? '#f87171' : '#cbd5e1' }}>{c.validade ? new Date(c.validade).toLocaleDateString('pt-PT') : '—'}</td>
                    <td style={s.td}>
                      <button onClick={() => alternar(c)} style={{ border: 'none', cursor: 'pointer', ...(c.ativo && !expirado(c) && !esgotado(c) ? s.badge('rgba(52,211,153,0.18)', '#34d399') : s.badge('rgba(148,163,184,0.15)', '#94a3b8')) }}>
                        {!c.ativo ? 'Inativo' : expirado(c) ? 'Expirado' : esgotado(c) ? 'Esgotado' : 'Ativo'}
                      </button>
                    </td>
                    <td style={{ ...s.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button style={{ ...s.btnGhost, padding: '6px 12px', fontSize: 12, marginRight: 6 }} onClick={() => navigator.clipboard?.writeText(c.codigo)}>Copiar</button>
                      <button style={{ ...s.btnGhost, padding: '6px 12px', fontSize: 12, marginRight: 6 }} onClick={() => editar(c)}>Editar</button>
                      <button style={s.btnDanger} onClick={() => apagar(c)}>Apagar</button>
                    </td>
                  </tr>
                  {aberto === c.id && (
                    <tr>
                      <td colSpan={6} style={{ ...s.td, background: '#0a1120' }}>
                        {resgates.length === 0 ? <span style={{ color: '#8a96aa', fontSize: 13 }}>Ainda ninguém usou este código.</span> : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {resgates.map(r => (
                              <div key={r.id} style={{ fontSize: 13, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                                <span style={{ color: '#8a96aa' }}>{new Date(r.created_at).toLocaleString('pt-PT')}</span>
                                <span>{r.email ?? '—'}</span>
                                <span style={{ color: '#94a3b8' }}>{r.detalhe}</span>
                                {r.encomenda_id && <Link href="/admin/loja/encomendas" style={{ color: '#60a5fa' }}>encomenda →</Link>}
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
