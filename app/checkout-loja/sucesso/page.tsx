'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/components/loja/CartContext';
import { supabase } from '@/lib/supabaseClient';

function Conteudo() {
  const params = useSearchParams();
  const { clear } = useCart();
  const orcamento = params.get('tipo') === 'orcamento';
  const numero = params.get('numero');
  const [logado, setLogado] = useState<boolean | null>(null);

  // Limpar carrinho ao chegar ao sucesso (cobre o regresso do Stripe).
  useEffect(() => { clear(); }, [clear]);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setLogado(!!user));
  }, []);

  return (
    <main style={{ background: '#080c10', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 480, textAlign: 'center', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 18, padding: 40 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>{orcamento ? '📝' : '✅'}</div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#f1f5f9', margin: '0 0 12px' }}>
          {orcamento ? 'Pedido de orçamento enviado' : 'Pagamento concluído!'}
        </h1>
        <p style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.7, margin: '0 0 24px' }}>
          {orcamento
            ? <>Recebemos o teu pedido{numero ? <> (nº {numero})</> : ''}. Vamos confirmar o valor final e enviar-te os detalhes para pagamento.</>
            : <>Obrigado pela tua compra! Vais receber a confirmação por email{logado ? '. Podes acompanhar a encomenda no teu dashboard.' : '.'}</>}
        </p>
        {logado === false && (
          <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 10, padding: 14, marginBottom: 24, fontSize: 13, color: '#93c5fd', lineHeight: 1.6 }}>
            Guarda a tua encomenda — cria conta em 10 segundos para acompanhares o estado e as próximas compras.{' '}
            <Link href="/register" style={{ color: '#fff', fontWeight: 700 }}>Criar conta grátis →</Link>
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link href="/loja" style={{ padding: '12px 22px', background: '#2563eb', color: '#fff', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Voltar à loja</Link>
          {logado && <Link href="/dashboard" style={{ padding: '12px 22px', background: 'transparent', color: '#94a3b8', border: '1px solid #1e293b', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Dashboard</Link>}
        </div>
      </div>
    </main>
  );
}

export default function SucessoPage() {
  return (
    <Suspense fallback={<main style={{ background: '#080c10', minHeight: '100vh' }} />}>
      <Conteudo />
    </Suspense>
  );
}
