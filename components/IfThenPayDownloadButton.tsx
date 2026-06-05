'use client';

import { useState } from 'react';

type Props = {
  designId: string;
  designNome: string;
  params: Record<string, any>;
  isAdmin?: boolean;
};

export default function IfThenPayDownloadButton({ designId, designNome, params, isAdmin }: Props) {
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [simulado, setSimulado] = useState(false);

  const simular = async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch('/api/ifthenpay/simular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descricao: `Download: ${designNome}`, valor: 0.99, design_id: designId, params }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro na simulação.');
      setSimulado(true);
      setTimeout(() => window.location.reload(), 1200); // recarrega para mostrar +1 download
    } catch (err: any) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  };

  const comprar = async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch('/api/ifthenpay/gateway', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          descricao: `Download: ${designNome}`,
          valor: 0.99,
          tipo: 'download_avulso',
          design_id: designId,
          params,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao iniciar pagamento.');
      if (json.redirectUrl) {
        window.location.href = json.redirectUrl;
      } else {
        throw new Error('Não foi possível obter o link de pagamento.');
      }
    } catch (err: any) {
      setErro(err.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{
        padding: '12px 14px', borderRadius: 10,
        background: 'rgba(14,165,233,0.08)', border: '1px solid rgba(14,165,233,0.25)',
      }}>
        <p style={{ margin: '0 0 10px', fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>
          Sem downloads disponíveis? Compra <strong style={{ color: '#f1f5f9' }}>este ficheiro</strong> por
          {' '}<strong style={{ color: '#38bdf8' }}>0,99 €</strong> — pagamento por MB WAY ou Multibanco.
        </p>
        <button
          onClick={comprar}
          disabled={loading}
          style={{
            width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none',
            background: loading ? '#1e293b' : 'linear-gradient(135deg, #0ea5e9, #0284c7)',
            color: '#fff', fontWeight: 800, fontSize: 14,
            cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: loading ? 'none' : '0 6px 18px rgba(14,165,233,0.3)',
          }}
        >
          {loading ? 'A redirecionar…' : '🛒 Comprar este ficheiro — 0,99 €'}
        </button>
      </div>
      {erro && <p style={{ margin: 0, color: '#f87171', fontSize: 12, textAlign: 'center' }}>{erro}</p>}

      {/* Botão de simulação — só admin, para testar sem pagar */}
      {isAdmin && (
        <button
          onClick={simular}
          disabled={loading || simulado}
          style={{
            padding: '8px 14px', borderRadius: 8,
            background: simulado ? 'rgba(52,211,153,0.15)' : 'rgba(167,139,250,0.1)',
            border: `1px dashed ${simulado ? '#34d399' : '#a78bfa'}`,
            color: simulado ? '#34d399' : '#a78bfa', fontSize: 12, fontWeight: 700,
            cursor: loading ? 'wait' : 'pointer', fontFamily: 'inherit',
          }}
        >
          {simulado ? '✓ Simulado — a recarregar…' : '🧪 Simular pagamento (admin)'}
        </button>
      )}
    </div>
  );
}
