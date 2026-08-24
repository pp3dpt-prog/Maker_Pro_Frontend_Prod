'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { s } from '@/app/admin/loja/_ui';

interface Feedback {
  id: string;
  nome: string | null;
  avaliacao: number | null;
  mensagem: string;
  contacto_metodo: 'email' | 'whatsapp' | null;
  contacto_valor: string | null;
  aceita_contacto: boolean;
  estado: 'pendente' | 'lido' | 'respondido';
  nota_admin: string | null;
  created_at: string;
}

function Stars({ n }: { n: number }) {
  return <span style={{ color: '#f59e0b' }}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;
}

const estadoCor: Record<string, [string, string]> = {
  pendente: ['rgba(251,191,36,0.18)', '#fbbf24'],
  lido: ['rgba(96,165,250,0.18)', '#60a5fa'],
  respondido: ['rgba(52,211,153,0.18)', '#34d399'],
};

export default function AdminFeedbackPage() {
  const [itens, setItens] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [notas, setNotas] = useState<Record<string, string>>({});

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/feedback');
    const data = await res.json();
    setItens(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function atualizarEstado(id: string, estado: string) {
    await fetch('/api/admin/feedback', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, estado }),
    });
    carregar();
  }

  async function guardarNota(id: string) {
    await fetch('/api/admin/feedback', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, nota_admin: notas[id] ?? '', estado: 'respondido' }),
    });
    carregar();
  }

  async function apagar(id: string) {
    if (!confirm('Apagar este feedback?')) return;
    await fetch('/api/admin/feedback', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    carregar();
  }

  const pendentes = itens.filter(i => i.estado === 'pendente').length;

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={s.h1}>Feedback</h1>
            <p style={s.sub}>Mensagens recebidas pelo formulário público da homepage. {pendentes > 0 && `${pendentes} por rever.`}</p>
          </div>
          <Link href="/admin" style={s.btnGhost}>← Admin</Link>
        </div>

        {loading ? (
          <p style={{ color: '#8a96aa' }}>A carregar…</p>
        ) : itens.length === 0 ? (
          <p style={{ color: '#8a96aa' }}>Ainda sem feedback.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {itens.map(f => {
              const [bg, cor] = estadoCor[f.estado] ?? estadoCor.pendente;
              return (
                <div key={f.id} style={s.card}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <strong style={{ fontSize: 14 }}>{f.nome || 'Anónimo'}</strong>
                      {f.avaliacao != null && <Stars n={f.avaliacao} />}
                      <span style={s.badge(bg, cor)}>{f.estado}</span>
                    </div>
                    <span style={{ fontSize: 11, color: '#8a96aa' }}>{new Date(f.created_at).toLocaleString('pt-PT')}</span>
                  </div>

                  <p style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.6, margin: '0 0 10px' }}>{f.mensagem}</p>

                  {f.contacto_valor && (
                    <p style={{ fontSize: 12, color: '#8a96aa', margin: '0 0 12px' }}>
                      {f.aceita_contacto ? '✅' : '⚠️ (sem autorização explícita)'} Contactar por {f.contacto_metodo}:{' '}
                      <strong style={{ color: '#e2e8f0' }}>{f.contacto_valor}</strong>
                    </p>
                  )}

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {f.estado !== 'lido' && <button style={s.btnGhost} onClick={() => atualizarEstado(f.id, 'lido')} type="button">Marcar como lido</button>}
                    <button style={s.btnDanger} onClick={() => apagar(f.id)} type="button">Apagar</button>
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                    <input
                      style={{ ...s.input, flex: 1 }}
                      placeholder="Nota interna (ex.: respondi a agradecer / expliquei o atraso)"
                      value={notas[f.id] ?? f.nota_admin ?? ''}
                      onChange={e => setNotas(n => ({ ...n, [f.id]: e.target.value }))}
                    />
                    <button style={s.btn} onClick={() => guardarNota(f.id)} type="button">Guardar</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
