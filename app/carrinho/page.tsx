'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart } from '@/components/loja/CartContext';
import { eur } from '@/lib/loja';

export default function CarrinhoPage() {
  const router = useRouter();
  const { items, ready, count, totalFixoCents, temOrcamento, entrega, setEntrega, setQty, removeItem } = useCart();

  if (!ready) {
    return <main style={wrap}><p style={{ color: '#64748b' }}>A carregar…</p></main>;
  }

  if (items.length === 0) {
    return (
      <main style={wrap}>
        <h1 style={h1}>O teu carrinho</h1>
        <div style={{ ...card, textAlign: 'center', color: '#64748b' }}>
          O carrinho está vazio. <Link href="/loja" style={{ color: '#60a5fa' }}>Ver a loja →</Link>
        </div>
      </main>
    );
  }

  return (
    <main style={wrap}>
      <h1 style={h1}>O teu carrinho <span style={{ color: '#64748b', fontWeight: 600, fontSize: 18 }}>({count})</span></h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 24, alignItems: 'start' }}>
        {/* Linhas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map(it => (
            <div key={it.key} style={{ ...card, display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: 10, overflow: 'hidden', background: '#0a1120', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {it.foto ? <img src={it.foto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ opacity: 0.3 }}>📦</span>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link href={`/produto/${it.slug}`} style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', textDecoration: 'none' }}>{it.nome}</Link>
                {it.variante_label && <div style={{ fontSize: 12, color: '#64748b' }}>{it.variante_label}</div>}
                {it.personalizacao_label && <div style={{ fontSize: 12, color: '#a78bfa' }}>✨ {it.personalizacao_label}</div>}
                <div style={{ marginTop: 6, fontSize: 14, fontWeight: 700, color: it.preco_cents == null ? '#fbbf24' : '#cbd5e1' }}>
                  {it.preco_cents == null ? 'A orçamentar' : eur(it.preco_cents)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button style={qtyBtn} onClick={() => setQty(it.key, it.quantidade - 1)}>−</button>
                <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 700 }}>{it.quantidade}</span>
                <button style={qtyBtn} onClick={() => setQty(it.key, it.quantidade + 1)}>+</button>
              </div>
              <button style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: 18, padding: 6 }} onClick={() => removeItem(it.key)} title="Remover">✕</button>
            </div>
          ))}
        </div>

        {/* Resumo */}
        <div style={{ ...card, position: 'sticky', top: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 16px' }}>Resumo</h2>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#cbd5e1', marginBottom: 8 }}>
            <span>Subtotal (itens com preço)</span>
            <strong>{eur(totalFixoCents)}</strong>
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>
            {entrega === 'maos' ? 'Entrega em mãos — sem portes.' : 'Portes calculados no checkout.'}
          </div>

          {/* Método de entrega */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 8 }}>Entrega</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <OpcaoEntrega ativo={entrega === 'envio'} onClick={() => setEntrega('envio')} titulo="Envio para casa" sub="Portes calculados no checkout" />
              <OpcaoEntrega ativo={entrega === 'maos'} onClick={() => setEntrega('maos')} titulo="Entrega em mãos" sub="Sem portes — combinamos a entrega" />
            </div>
          </div>

          {temOrcamento && (
            <div style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 10, padding: 14, marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: '#fbbf24', fontWeight: 700, margin: '0 0 4px' }}>Encomenda com orçamento</p>
              <p style={{ fontSize: 12, color: '#94a3b8', margin: 0, lineHeight: 1.5 }}>
                Tens peças a orçamentar. Ao finalizar, a encomenda segue como pedido de orçamento — pagas depois de confirmarmos o valor final.
              </p>
            </div>
          )}

          <button
            onClick={() => router.push('/checkout-loja')}
            style={{ width: '100%', padding: '14px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: 'pointer' }}>
            {temOrcamento ? 'Pedir orçamento' : 'Finalizar compra'}
          </button>

          <Link href="/loja" style={{ display: 'block', textAlign: 'center', marginTop: 14, fontSize: 13, color: '#64748b', textDecoration: 'none' }}>← Continuar a comprar</Link>
        </div>
      </div>
    </main>
  );
}

function OpcaoEntrega({ ativo, onClick, titulo, sub }: { ativo: boolean; onClick: () => void; titulo: string; sub: string }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left', cursor: 'pointer',
      padding: '10px 12px', borderRadius: 10, fontFamily: 'inherit',
      background: ativo ? 'rgba(37,99,235,0.1)' : '#0a1120',
      border: `1px solid ${ativo ? '#2563eb' : '#1e293b'}`,
    }}>
      <span style={{ width: 16, height: 16, borderRadius: '50%', flexShrink: 0, border: `2px solid ${ativo ? '#2563eb' : '#334155'}`, background: ativo ? '#2563eb' : 'transparent' }} />
      <span>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#f1f5f9' }}>{titulo}</span>
        <span style={{ display: 'block', fontSize: 11, color: '#64748b' }}>{sub}</span>
      </span>
    </button>
  );
}

const wrap: React.CSSProperties = { background: '#080c10', minHeight: '100vh', maxWidth: 1000, margin: '0 auto', padding: '40px 32px 80px' };
const h1: React.CSSProperties = { fontSize: 26, fontWeight: 900, color: '#f1f5f9', margin: '0 0 24px' };
const card: React.CSSProperties = { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 18 };
const qtyBtn: React.CSSProperties = { width: 28, height: 28, borderRadius: 8, border: '1px solid #1e293b', background: '#0a1120', color: '#f1f5f9', fontSize: 16, cursor: 'pointer', fontWeight: 700 };
