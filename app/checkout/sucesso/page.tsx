'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function SucessoInner() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id'); // Stripe (mensal)
  const order     = searchParams.get('order');       // IfThenPay (anual)
  const [estado, setEstado] = useState<'verificando' | 'ok' | 'erro'>('verificando');
  const [detalhe, setDetalhe] = useState('');
  const [plano, setPlano] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId && !order) { setEstado('ok'); return; }

    let tries = 0;
    const verificar = async () => {
      try {
        // Stripe (session_id) ou IfThenPay (order)
        const endpoint = sessionId ? '/api/stripe/verificar' : '/api/ifthenpay/verificar';
        const body = sessionId ? { session_id: sessionId } : { order };
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const json = await res.json();

        if (res.ok && (json.ok || json.jaProcessado || json.pago)) {
          setPlano(json.plano ?? null);
          setEstado('ok');
          return;
        }

        // Pagamento ainda a processar (MB WAY/Multibanco pode demorar) — tentar de novo
        if (json.pago === false && tries < 10) {
          tries++;
          setTimeout(verificar, 3000);
          return;
        }

        setEstado('erro');
        setDetalhe(json.error || 'Não foi possível confirmar o pagamento.');
      } catch (err: any) {
        setEstado('erro');
        setDetalhe(err.message);
      }
    };

    verificar();
  }, [sessionId, order]);

  return (
    <div style={{ minHeight: '100vh', background: '#080c10', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', color: 'white' }}>
      <div style={{ textAlign: 'center', maxWidth: 480, padding: 32 }}>

        {estado === 'verificando' && (
          <>
            <div style={{ fontSize: 48, marginBottom: 24, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12 }}>A confirmar o pagamento…</h1>
            <p style={{ color: '#8a96aa', fontSize: 15 }}>Um momento, estamos a activar o teu plano.</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </>
        )}

        {estado === 'ok' && (
          <>
            <div style={{ fontSize: 64, marginBottom: 24 }}>🎉</div>
            <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>
              {plano ? `Plano ${plano} activado!` : 'Subscrição activada!'}
            </h1>
            <p style={{ color: '#8a96aa', fontSize: 16, marginBottom: 16, lineHeight: 1.6 }}>
              O teu plano foi activado com sucesso. Os downloads estão disponíveis no teu dashboard.
            </p>
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '14px 20px', marginBottom: 32, fontSize: 14, color: '#94a3b8' }}>
              🧾 A fatura será enviada para o teu email de registo <strong style={{ color: '#f1f5f9' }}>em até 24 horas</strong>.
            </div>
            <Link href="/dashboard" style={{ display: 'inline-block', padding: '14px 32px', background: '#1d4ed8', color: '#fff', borderRadius: 12, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>
              Ir para o Dashboard →
            </Link>
          </>
        )}

        {estado === 'erro' && (
          <>
            <div style={{ fontSize: 64, marginBottom: 24 }}>⚠️</div>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Pagamento recebido</h1>
            <p style={{ color: '#8a96aa', fontSize: 15, marginBottom: 8, lineHeight: 1.6 }}>
              O pagamento foi processado, mas houve um problema a activar o plano automaticamente.
            </p>
            <p style={{ color: '#828fa3', fontSize: 13, marginBottom: 24 }}>{detalhe}</p>
            <p style={{ color: '#94a3b8', fontSize: 14, marginBottom: 24 }}>
              Contacta-nos em <a href="mailto:pp3d.pt@gmail.com" style={{ color: '#60a5fa' }}>pp3d.pt@gmail.com</a> e activamos manualmente.
            </p>
            <Link href="/dashboard" style={{ display: 'inline-block', padding: '14px 32px', background: '#1d4ed8', color: '#fff', borderRadius: 12, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>
              Ir para o Dashboard →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function CheckoutSucesso() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#080c10' }} />}>
      <SucessoInner />
    </Suspense>
  );
}
