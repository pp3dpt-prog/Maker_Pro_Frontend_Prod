'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { s } from '../../_ui';

interface Candidatura {
  id: string;
  tipo_interesse: 'vender' | 'publicidade' | 'ambos';
  empresa: string;
  nome_contacto: string;
  email: string;
  telefone: string | null;
  cidade: string | null;
  mensagem: string | null;
  produto_nome: string | null;
  estado: 'novo' | 'contactado' | 'recusado';
  created_at: string;
}

const TIPO_LABEL: Record<Candidatura['tipo_interesse'], string> = {
  vender: 'Vender produtos',
  publicidade: 'Publicidade',
  ambos: 'Vender + Publicidade',
};

const ESTADO_BADGE: Record<Candidatura['estado'], { bg: string; color: string; label: string }> = {
  novo: { bg: 'rgba(251,191,36,0.18)', color: '#fbbf24', label: 'Novo' },
  contactado: { bg: 'rgba(52,211,153,0.18)', color: '#34d399', label: 'Contactado' },
  recusado: { bg: 'rgba(248,113,113,0.18)', color: '#f87171', label: 'Recusado' },
};

export default function CandidaturasPage() {
  const [candidaturas, setCandidaturas] = useState<Candidatura[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('prod_parceiros_candidaturas')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) setErro(error.message);
    else setCandidaturas((data ?? []) as Candidatura[]);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function mudarEstado(c: Candidatura, estado: Candidatura['estado']) {
    const { error } = await supabase.from('prod_parceiros_candidaturas').update({ estado }).eq('id', c.id);
    if (!error) setCandidaturas(prev => prev.map(x => x.id === c.id ? { ...x, estado } : x));
  }

  async function apagar(c: Candidatura) {
    if (!confirm(`Apagar a candidatura de "${c.empresa}"?`)) return;
    const { error } = await supabase.from('prod_parceiros_candidaturas').delete().eq('id', c.id);
    if (error) { alert('Erro: ' + error.message); return; }
    setCandidaturas(prev => prev.filter(x => x.id !== c.id));
  }

  return (
    <div style={s.page}>
      <div style={{ ...s.wrap, maxWidth: 1100 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <h1 style={s.h1}>Candidaturas a parceiro</h1>
          <Link href="/admin/loja/parceiros" style={s.btnGhost}>← Parceiros</Link>
        </div>
        <p style={{ ...s.sub, margin: '-20px 0 24px' }}>
          Pedidos enviados por empresas através do formulário "Quero ser parceiro" nas páginas de produto.
        </p>

        {erro && <p style={{ color: '#f87171', marginBottom: 16 }}>Erro: {erro}</p>}

        {loading ? (
          <p style={{ color: '#8a96aa' }}>A carregar…</p>
        ) : candidaturas.length === 0 ? (
          <p style={{ color: '#8a96aa' }}>Sem candidaturas ainda.</p>
        ) : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead style={s.thead}>
                <tr>
                  <th style={s.th}>Empresa</th>
                  <th style={s.th}>Contacto</th>
                  <th style={s.th}>Interesse</th>
                  <th style={s.th}>Produto</th>
                  <th style={s.th}>Data</th>
                  <th style={s.th}>Estado</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {candidaturas.map(c => (
                  <tr key={c.id}>
                    <td style={{ ...s.td, fontWeight: 600, color: '#f1f5f9' }}>
                      {c.empresa}
                      {c.cidade && <div style={{ fontSize: 12, color: '#8a96aa' }}>{c.cidade}</div>}
                    </td>
                    <td style={s.td}>
                      {c.nome_contacto}
                      <div style={{ fontSize: 12, color: '#8a96aa' }}>
                        <a href={`mailto:${c.email}`} style={{ color: '#60a5fa' }}>{c.email}</a>
                        {c.telefone && ` · ${c.telefone}`}
                      </div>
                      {c.mensagem && <div style={{ fontSize: 12, color: '#8a96aa', marginTop: 4, maxWidth: 260, whiteSpace: 'pre-wrap' }}>{c.mensagem}</div>}
                    </td>
                    <td style={{ ...s.td, color: '#8a96aa' }}>{TIPO_LABEL[c.tipo_interesse]}</td>
                    <td style={{ ...s.td, color: '#8a96aa' }}>{c.produto_nome ?? '—'}</td>
                    <td style={{ ...s.td, color: '#8a96aa', whiteSpace: 'nowrap' }}>
                      {new Date(c.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </td>
                    <td style={s.td}>
                      <span style={s.badge(ESTADO_BADGE[c.estado].bg, ESTADO_BADGE[c.estado].color)}>{ESTADO_BADGE[c.estado].label}</span>
                    </td>
                    <td style={{ ...s.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {c.estado !== 'contactado' && (
                        <button style={{ ...s.btnGhost, marginRight: 8 }} onClick={() => mudarEstado(c, 'contactado')}>Contactado</button>
                      )}
                      {c.estado !== 'recusado' && (
                        <button style={{ ...s.btnGhost, marginRight: 8 }} onClick={() => mudarEstado(c, 'recusado')}>Recusar</button>
                      )}
                      <button style={s.btnDanger} onClick={() => apagar(c)}>Apagar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
