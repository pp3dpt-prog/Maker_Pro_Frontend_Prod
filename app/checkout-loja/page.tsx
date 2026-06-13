'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { useCart } from '@/components/loja/CartContext';
import { eur } from '@/lib/loja';

export default function CheckoutLojaPage() {
  const router = useRouter();
  const { items, ready, totalFixoCents, temOrcamento, clear } = useCart();

  const [authChecked, setAuthChecked] = useState(false);
  const [logado, setLogado] = useState(false);
  const [nome, setNome] = useState('');
  const [morada, setMorada] = useState('');
  const [codigoPostal, setCodigoPostal] = useState('');
  const [cidade, setCidade] = useState('');
  const [telefone, setTelefone] = useState('');
  const [nif, setNif] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [erro, setErro] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace('/login?redirect=/checkout-loja');
        return;
      }
      setLogado(true);
      setAuthChecked(true);
    })();
  }, [router]);

  if (!ready || !authChecked) {
    return <main style={wrap}><p style={{ color: '#64748b' }}>A carregar…</p></main>;
  }
  if (!logado) return null;

  if (items.length === 0) {
    return (
      <main style={wrap}>
        <h1 style={h1}>Finalizar</h1>
        <div style={{ ...card, textAlign: 'center', color: '#64748b' }}>
          Carrinho vazio. <Link href="/loja" style={{ color: '#60a5fa' }}>Ver a loja →</Link>
        </div>
      </main>
    );
  }

  async function finalizar() {
    if (!nome.trim() || !morada.trim() || !codigoPostal.trim() || !cidade.trim()) {
      setErro('Preenche o nome e a morada completa.');
      return;
    }
    setSubmitting(true); setErro('');
    try {
      const res = await fetch('/api/loja/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itens: items.map(i => ({ produto_id: i.produto_id, variante_id: i.variante_id, quantidade: i.quantidade, personalizacao: i.personalizacao })),
          morada: { nome, morada, codigo_postal: codigoPostal, cidade, telefone },
          nome_completo: nome,
          nif,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Erro ao finalizar.');

      if (data.tipo === 'pagamento' && data.url) {
        window.location.href = data.url;            // Stripe (carrinho limpa-se no sucesso)
      } else if (data.tipo === 'orcamento') {
        clear();
        router.push(`/checkout-loja/sucesso?tipo=orcamento&numero=${data.numero ?? ''}`);
      }
    } catch (e: any) {
      setErro(e.message ?? 'Erro ao finalizar.');
      setSubmitting(false);
    }
  }

  return (
    <main style={wrap}>
      <h1 style={h1}>Finalizar {temOrcamento ? 'pedido' : 'compra'}</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 320px', gap: 24, alignItems: 'start' }}>
        {/* Morada */}
        <div style={card}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 16px' }}>Dados de envio</h2>
          <Field label="Nome completo *" value={nome} onChange={setNome} />
          <Field label="Morada *" value={morada} onChange={setMorada} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Código postal *" value={codigoPostal} onChange={setCodigoPostal} />
            <Field label="Cidade *" value={cidade} onChange={setCidade} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Telefone" value={telefone} onChange={setTelefone} />
            <Field label="NIF (fatura)" value={nif} onChange={setNif} />
          </div>
        </div>

        {/* Resumo */}
        <div style={{ ...card, position: 'sticky', top: 24 }}>
          <h2 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 16px' }}>Resumo</h2>
          {items.map(it => (
            <div key={it.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#cbd5e1', marginBottom: 6 }}>
              <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.quantidade}× {it.nome}</span>
              <span>{it.preco_cents == null ? '—' : eur(it.preco_cents * it.quantidade)}</span>
            </div>
          ))}
          <div style={{ borderTop: '1px solid #1e293b', margin: '12px 0', paddingTop: 12, display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 800 }}>
            <span>{temOrcamento ? 'Estimativa' : 'Subtotal'}</span>
            <span>{eur(totalFixoCents)}</span>
          </div>

          {temOrcamento && (
            <p style={{ fontSize: 12, color: '#fbbf24', lineHeight: 1.5, marginBottom: 14 }}>
              Tens peças a orçamentar — não há pagamento agora. Confirmamos o valor final e depois pagas.
            </p>
          )}
          {!temOrcamento && <p style={{ fontSize: 12, color: '#64748b', marginBottom: 14 }}>Portes calculados no passo de pagamento.</p>}

          {erro && <p style={{ fontSize: 13, color: '#f87171', marginBottom: 12 }}>{erro}</p>}

          <button onClick={finalizar} disabled={submitting}
            style={{ width: '100%', padding: 14, background: submitting ? '#1e3a5f' : '#2563eb', color: '#fff', border: 'none', borderRadius: 12, fontSize: 15, fontWeight: 700, cursor: submitting ? 'wait' : 'pointer' }}>
            {submitting ? 'A processar…' : temOrcamento ? 'Enviar pedido de orçamento' : 'Pagar com cartão'}
          </button>
          <Link href="/carrinho" style={{ display: 'block', textAlign: 'center', marginTop: 14, fontSize: 13, color: '#64748b', textDecoration: 'none' }}>← Voltar ao carrinho</Link>
        </div>
      </div>
    </main>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', marginBottom: 6 }}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} style={{ width: '100%', background: '#0a1120', border: '1px solid #1e293b', borderRadius: 8, padding: '10px 14px', color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
    </div>
  );
}

const wrap: React.CSSProperties = { background: '#080c10', minHeight: '100vh', maxWidth: 1000, margin: '0 auto', padding: '40px 32px 80px' };
const h1: React.CSSProperties = { fontSize: 26, fontWeight: 900, color: '#f1f5f9', margin: '0 0 24px' };
const card: React.CSSProperties = { background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 22 };
