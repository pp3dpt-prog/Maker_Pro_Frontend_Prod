'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import DownloadStlButton from '@/components/DownloadStlButton';

function DownloadSucessoInner() {
  const searchParams = useSearchParams();
  const order = searchParams.get('order');
  const [pago, setPago] = useState<boolean | null>(null);
  const [designId, setDesignId] = useState<string | null>(null);
  const [params, setParams] = useState<Record<string, any> | null>(null);
  const [tentativas, setTentativas] = useState(0);

  useEffect(() => {
    if (!order) { setPago(true); return; }

    let cancelado = false;
    const verificar = async () => {
      try {
        // Consulta activa ao IfThenPay (não depende de callback)
        const res = await fetch('/api/ifthenpay/verificar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order }),
        });
        const json = await res.json();
        if (cancelado) return;
        if (json.design_id) setDesignId(json.design_id);
        if (json.params) setParams(json.params);
        if (json.pago) { setPago(true); return; }
        // Pagamento ainda não confirmado (MB WAY/Multibanco pode demorar)
        if (tentativas < 10) {
          setTimeout(() => setTentativas(t => t + 1), 3000);
        } else {
          setPago(false);
        }
      } catch { if (!cancelado) setPago(false); }
    };
    verificar();
    return () => { cancelado = true; };
  }, [order, tentativas]);

  const card: React.CSSProperties = { textAlign: 'center', maxWidth: 480, padding: 32 };
  const btn: React.CSSProperties = { display: 'inline-block', padding: '14px 32px', background: '#1d4ed8', color: '#fff', borderRadius: 12, textDecoration: 'none', fontWeight: 700, fontSize: 15 };

  return (
    <div style={{ minHeight: '100vh', background: '#080c10', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', color: 'white' }}>
      <div style={card}>
        {pago === null ? (
          <>
            <div style={{ fontSize: 48, marginBottom: 24, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12 }}>A confirmar o pagamento…</h1>
            <p style={{ color: '#8a96aa', fontSize: 15 }}>
              Se pagaste por MB WAY, confirma na app. Multibanco pode demorar alguns minutos.
            </p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </>
        ) : pago ? (
          <>
            <div style={{ fontSize: 64, marginBottom: 24 }}>✅</div>
            <h1 style={{ fontSize: 30, fontWeight: 800, marginBottom: 12 }}>Pagamento confirmado!</h1>
            <p style={{ color: '#8a96aa', fontSize: 16, marginBottom: 16, lineHeight: 1.6 }}>
              Foi creditado <strong style={{ color: '#34d399' }}>1 download</strong> à tua conta. Já podes descarregar o ficheiro.
            </p>
            <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '14px 20px', marginBottom: 24, fontSize: 14, color: '#94a3b8' }}>
              🧾 A fatura será enviada para o teu email em <strong style={{ color: '#f1f5f9' }}>até 24 horas</strong>.
            </div>

            {/* Download directo do ficheiro comprado */}
            {designId && params ? (
              <div style={{ maxWidth: 320, margin: '0 auto' }}>
                <DownloadStlButton designId={designId} params={params} />
                <Link href={`/customizador?id=${designId}`} style={{ display: 'block', marginTop: 14, color: '#8a96aa', fontSize: 13, textDecoration: 'none' }}>
                  ou voltar ao produto →
                </Link>
              </div>
            ) : (
              <Link href={designId ? `/customizador?id=${designId}` : '/produtos'} style={btn}>
                {designId ? 'Voltar ao produto e descarregar →' : 'Ver produtos'}
              </Link>
            )}
          </>
        ) : (
          <>
            <div style={{ fontSize: 64, marginBottom: 24 }}>⏳</div>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12 }}>Pagamento em processamento</h1>
            <p style={{ color: '#8a96aa', fontSize: 15, marginBottom: 28, lineHeight: 1.6 }}>
              Ainda não confirmámos o pagamento. Se pagaste por Multibanco pode demorar alguns minutos —
              o download fica disponível no teu dashboard assim que for confirmado.
            </p>
            <Link href="/dashboard" style={btn}>Ir para o Dashboard →</Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function DownloadSucesso() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#080c10' }} />}>
      <DownloadSucessoInner />
    </Suspense>
  );
}
