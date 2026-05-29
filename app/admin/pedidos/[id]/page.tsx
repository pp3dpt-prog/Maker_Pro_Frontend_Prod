'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Pedido {
  id: string;
  created_at: string;
  design_id: string;
  design_nome: string;
  familia: string | null;
  params: Record<string, unknown>;
  contacto_nome: string;
  contacto_email: string;
  contacto_telefone: string;
  morada_faturacao: string;
  morada_envio: string;
  mesma_morada: boolean;
  notas: string | null;
  estado: string;
  preco_estimado: number | null;
  prazo_entrega_dias: number | null;
  notas_orcamento: string | null;
  stl_url: string | null;
  token_expira_em: string | null;
  user_id: string;
}

// ─── Badge helper ─────────────────────────────────────────────────────────────

function estadoBadge(estado: string): { label: string; bg: string; color: string } {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    pendente_orcamento: { label: 'Pendente',  bg: '#713f12', color: '#fde68a' },
    orcamento_enviado:  { label: 'Enviado',   bg: '#1e3a5f', color: '#93c5fd' },
    aceite:             { label: 'Aceite',    bg: '#14532d', color: '#86efac' },
    recusado:           { label: 'Recusado',  bg: '#7f1d1d', color: '#fca5a5' },
    em_producao:        { label: 'Produção',  bg: '#3b1f5e', color: '#d8b4fe' },
    enviado:            { label: 'Enviado',   bg: '#164e63', color: '#67e8f9' },
    concluido:          { label: 'Concluído', bg: '#14532d', color: '#86efac' },
    cancelado:          { label: 'Cancelado', bg: '#1e293b', color: '#94a3b8' },
  };
  return map[estado] ?? { label: estado, bg: '#1e293b', color: '#94a3b8' };
}

// ─── Quote Form ───────────────────────────────────────────────────────────────

function QuoteForm({ pedido, onSent }: { pedido: Pedido; onSent: () => void }) {
  const [preco, setPreco] = useState(pedido.preco_estimado?.toString() ?? '');
  const [prazo, setPrazo] = useState(pedido.prazo_entrega_dias?.toString() ?? '');
  const [notas, setNotas] = useState(pedido.notas_orcamento ?? '');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const alreadySent = pedido.estado === 'orcamento_enviado';
  const clientResponded = ['aceite', 'recusado'].includes(pedido.estado);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!preco || !prazo) { setErrorMsg('Preenche o preço e o prazo.'); return; }
    setStatus('loading');
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/enviar-orcamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pedido_id: pedido.id,
          preco_estimado: parseFloat(preco),
          prazo_entrega_dias: parseInt(prazo),
          notas_orcamento: notas,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro desconhecido');
      setStatus('success');
      onSent();
    } catch (err: unknown) {
      setStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Erro ao enviar orçamento');
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    background: '#080c10',
    border: '1px solid #1e293b',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#f1f5f9',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 11,
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#64748b',
    marginBottom: 6,
  };

  if (clientResponded) {
    const badge = estadoBadge(pedido.estado);
    return (
      <div style={{ background: badge.bg, border: `1px solid ${badge.color}30`, borderRadius: 12, padding: '20px 24px' }}>
        <p style={{ margin: 0, color: badge.color, fontWeight: 700, fontSize: 16 }}>
          Cliente {pedido.estado === 'aceite' ? 'aceitou' : 'recusou'} o orçamento.
        </p>
        {pedido.preco_estimado && (
          <p style={{ margin: '8px 0 0', color: '#94a3b8', fontSize: 13 }}>
            Preço: <strong style={{ color: '#f1f5f9' }}>€{pedido.preco_estimado.toFixed(2)}</strong>
            {' • '}Prazo: <strong style={{ color: '#f1f5f9' }}>{pedido.prazo_entrega_dias} dias</strong>
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      {alreadySent && (
        <div style={{ background: '#1e3a5f', border: '1px solid #1d4ed820', borderRadius: 10, padding: '12px 16px', marginBottom: 20, color: '#93c5fd', fontSize: 13 }}>
          Orçamento já enviado ao cliente. Podes reenviar com valores atualizados.
          {pedido.token_expira_em && (
            <span style={{ display: 'block', marginTop: 4, color: '#64748b' }}>
              Expira em: {new Date(pedido.token_expira_em).toLocaleString('pt-PT')}
            </span>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div>
          <label style={labelStyle}>Preço estimado (€)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={preco}
            onChange={e => setPreco(e.target.value)}
            style={inputStyle}
            placeholder="Ex: 45.00"
          />
        </div>
        <div>
          <label style={labelStyle}>Prazo de entrega (dias)</label>
          <input
            type="number"
            min="1"
            value={prazo}
            onChange={e => setPrazo(e.target.value)}
            style={inputStyle}
            placeholder="Ex: 7"
          />
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>Notas do orçamento</label>
        <textarea
          value={notas}
          onChange={e => setNotas(e.target.value)}
          rows={4}
          style={{ ...inputStyle, resize: 'vertical' }}
          placeholder="Informações adicionais para o cliente..."
        />
      </div>

      {errorMsg && (
        <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{errorMsg}</p>
      )}

      {status === 'success' && (
        <p style={{ color: '#86efac', fontSize: 13, marginBottom: 12 }}>Orçamento enviado com sucesso!</p>
      )}

      <button
        type="submit"
        disabled={status === 'loading'}
        style={{
          width: '100%',
          padding: '14px 24px',
          background: status === 'loading' ? '#1e293b' : '#1d4ed8',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          fontSize: 15,
          fontWeight: 700,
          cursor: status === 'loading' ? 'not-allowed' : 'pointer',
          transition: 'background 0.15s',
        }}
      >
        {status === 'loading' ? 'A enviar...' : 'Enviar orçamento ao cliente'}
      </button>
    </form>
  );
}

// ─── Section helper ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: '24px', marginBottom: 20 }}>
      <h3 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <span style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 2 }}>{label}</span>
      <span style={{ fontSize: 14, color: value ? '#f1f5f9' : '#475569', fontStyle: value ? 'normal' : 'italic' }}>
        {value ?? 'Não indicado'}
      </span>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminPedidoDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [pedido, setPedido] = useState<Pedido | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchPedido() {
    try {
      const res = await fetch(`/api/admin/pedido/${params.id}`);
      if (!res.ok) throw new Error((await res.json()).error || 'Não encontrado');
      const json = await res.json();
      setPedido(json.pedido);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchPedido(); }, [params.id]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#080c10', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontFamily: 'Inter, Arial, sans-serif' }}>
        A carregar...
      </div>
    );
  }

  if (error || !pedido) {
    return (
      <div style={{ minHeight: '100vh', background: '#080c10', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, fontFamily: 'Inter, Arial, sans-serif' }}>
        <p style={{ color: '#f87171', fontSize: 16 }}>{error || 'Pedido não encontrado'}</p>
        <Link href="/admin/pedidos" style={{ color: '#93c5fd', fontSize: 14 }}>← Voltar à lista</Link>
      </div>
    );
  }

  const badge = estadoBadge(pedido.estado);

  return (
    <div style={{ minHeight: '100vh', background: '#080c10', color: '#f1f5f9', fontFamily: 'Inter, Arial, sans-serif', padding: '40px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <Link href="/admin/pedidos" style={{ color: '#64748b', fontSize: 13, textDecoration: 'none' }}>← Todos os pedidos</Link>
            <h1 style={{ margin: '8px 0 4px', fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>{pedido.design_nome}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>{pedido.id.slice(0, 8).toUpperCase()}</span>
              <span style={{
                padding: '3px 10px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                background: badge.bg,
                color: badge.color,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}>
                {badge.label}
              </span>
              <span style={{ fontSize: 12, color: '#64748b' }}>
                {new Date(pedido.created_at).toLocaleString('pt-PT')}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>

          {/* Left column — details */}
          <div>
            <Section title="Peça">
              <Field label="Nome do design" value={pedido.design_nome} />
              <Field label="Família" value={pedido.familia} />
              {pedido.params && Object.keys(pedido.params).length > 0 && (
                <div>
                  <span style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 6 }}>Parâmetros</span>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <tbody>
                      {Object.entries(pedido.params).map(([k, v]) => (
                        <tr key={k} style={{ borderBottom: '1px solid #1e293b' }}>
                          <td style={{ padding: '6px 0', color: '#64748b' }}>{k}</td>
                          <td style={{ padding: '6px 0', color: '#f1f5f9', fontWeight: 600 }}>{String(v)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {pedido.stl_url ? (
                <div style={{ marginTop: 12 }}>
                  <a href={pedido.stl_url} target="_blank" rel="noreferrer" style={{ color: '#86efac', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
                    📎 Ver ficheiro STL
                  </a>
                </div>
              ) : (
                <p style={{ margin: '12px 0 0', color: '#b45309', fontSize: 13 }}>⚠️ Nenhum STL gerado antes da submissão</p>
              )}
            </Section>

            <Section title="Contacto">
              <Field label="Nome" value={pedido.contacto_nome} />
              <Field label="Email" value={pedido.contacto_email} />
              <Field label="Telefone" value={pedido.contacto_telefone} />
            </Section>

            <Section title="Moradas">
              <Field label="Faturação" value={pedido.morada_faturacao} />
              {pedido.mesma_morada
                ? <Field label="Envio" value="Igual à de faturação" />
                : <Field label="Envio" value={pedido.morada_envio} />
              }
            </Section>

            <Section title="Notas do cliente">
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: 14, color: pedido.notas ? '#f1f5f9' : '#475569', fontStyle: pedido.notas ? 'normal' : 'italic' }}>
                {pedido.notas || 'Sem notas'}
              </p>
            </Section>
          </div>

          {/* Right column — quote form */}
          <div>
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: '24px', position: 'sticky', top: 24 }}>
              <h3 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700 }}>Enviar orçamento</h3>
              <QuoteForm pedido={pedido} onSent={fetchPedido} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
