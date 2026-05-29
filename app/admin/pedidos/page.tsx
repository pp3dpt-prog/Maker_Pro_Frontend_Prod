import { createClient as createAdmin } from '@supabase/supabase-js';
import Link from 'next/link';

interface Pedido {
  id: string;
  design_nome: string;
  contacto_nome: string;
  contacto_email: string;
  created_at: string;
  estado: string;
}

function estadoBadge(estado: string): { label: string; bg: string; color: string } {
  const map: Record<string, { label: string; bg: string; color: string }> = {
    pendente_orcamento: { label: 'Pendente', bg: '#713f12', color: '#fde68a' },
    orcamento_enviado:  { label: 'Enviado',  bg: '#1e3a5f', color: '#93c5fd' },
    aceite:             { label: 'Aceite',   bg: '#14532d', color: '#86efac' },
    recusado:           { label: 'Recusado', bg: '#7f1d1d', color: '#fca5a5' },
    em_producao:        { label: 'Produção', bg: '#3b1f5e', color: '#d8b4fe' },
    enviado:            { label: 'Enviado',  bg: '#164e63', color: '#67e8f9' },
    concluido:          { label: 'Concluído', bg: '#14532d', color: '#86efac' },
    cancelado:          { label: 'Cancelado', bg: '#1e293b', color: '#94a3b8' },
  };
  return map[estado] ?? { label: estado, bg: '#1e293b', color: '#94a3b8' };
}

function shortId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

export default async function AdminPedidosPage() {
  const supabase = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data: pedidos, error } = await supabase
    .from('prod_pedidos_orcamento')
    .select('id, design_nome, contacto_nome, contacto_email, created_at, estado')
    .order('created_at', { ascending: false });

  return (
    <div style={{ minHeight: '100vh', background: '#080c10', color: '#f1f5f9', fontFamily: 'Inter, Arial, sans-serif', padding: '40px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px' }}>Pedidos de Orçamento</h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Todos os pedidos submetidos pelos clientes</p>
          </div>
          <Link href="/admin" style={{ color: '#64748b', fontSize: 13, textDecoration: 'none' }}>← Painel admin</Link>
        </div>

        {error && (
          <div style={{ background: '#7f1d1d', border: '1px solid #991b1b', borderRadius: 12, padding: '16px 20px', marginBottom: 24, color: '#fca5a5', fontSize: 14 }}>
            Erro ao carregar pedidos: {error.message}
          </div>
        )}

        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0a1120', borderBottom: '1px solid #1e293b' }}>
                {['ID', 'Design', 'Cliente', 'Email', 'Data', 'Estado', ''].map((h) => (
                  <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!pedidos || pedidos.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '48px 20px', textAlign: 'center', color: '#64748b', fontStyle: 'italic' }}>
                    Sem pedidos de orçamento ainda.
                  </td>
                </tr>
              ) : (
                pedidos.map((p: Pedido, i: number) => {
                  const badge = estadoBadge(p.estado);
                  const isLast = i === pedidos.length - 1;
                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderBottom: isLast ? 'none' : '1px solid #1e293b',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#131e30')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '14px 20px', fontFamily: 'monospace', fontSize: 12, color: '#64748b', fontWeight: 600 }}>
                        {shortId(p.id)}
                      </td>
                      <td style={{ padding: '14px 20px', fontWeight: 600, color: '#f1f5f9', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.design_nome}
                      </td>
                      <td style={{ padding: '14px 20px', color: '#cbd5e1', fontSize: 14 }}>
                        {p.contacto_nome}
                      </td>
                      <td style={{ padding: '14px 20px', color: '#64748b', fontSize: 13 }}>
                        {p.contacto_email}
                      </td>
                      <td style={{ padding: '14px 20px', color: '#64748b', fontSize: 13, whiteSpace: 'nowrap' }}>
                        {new Date(p.created_at).toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{
                          display: 'inline-block',
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
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                        <Link
                          href={`/admin/pedidos/${p.id}`}
                          style={{
                            display: 'inline-block',
                            padding: '6px 16px',
                            background: '#1e293b',
                            color: '#93c5fd',
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 600,
                            textDecoration: 'none',
                          }}
                        >
                          Ver detalhes →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
