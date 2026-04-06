'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function PricingPage() {
  const router = useRouter();
  const [planos, setPlanos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarPlanos() {
      // Puxa os dados da tabela prod_planos
      const { data } = await supabase
        .from('prod_planos')
        .select('*')
        .order('preco', { ascending: true });

      if (data) setPlanos(data);
      setLoading(false);
    }
    carregarPlanos();
  }, []);

  if (loading) return <div style={{ background: '#0f172a', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white' }}>Carregando ofertas...</div>;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', padding: '80px 20px', fontFamily: 'sans-serif' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: '900', marginBottom: '15px' }}>PLANOS MAKER PRO</h1>
        <p style={{ color: '#94a3b8', fontSize: '18px' }}>Escolhe o teu limite de downloads mensal.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', maxWidth: '1200px', margin: '0 auto' }}>
        {planos.map((plano) => (
          <div key={plano.id} style={{ background: '#1e293b', borderRadius: '24px', padding: '40px', border: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
            
            <h2 style={{ fontSize: '20px', color: '#3b82f6', fontWeight: '900', marginBottom: '10px', textTransform: 'uppercase' }}>{plano.nome}</h2>
            
            <div style={{ marginBottom: '25px' }}>
              <span style={{ fontSize: '48px', fontWeight: '900' }}>{plano.preco}€</span>
              <span style={{ color: '#64748b' }}> / {plano.validade_dias} dias</span>
            </div>

            <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', marginBottom: '30px', textAlign: 'center', border: '1px solid #334155' }}>
              <div style={{ fontSize: '32px', fontWeight: '900', color: '#4ade80' }}>{plano.limite_downloads}</div>
              <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>CRÉDITOS DE DOWNLOAD</div>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 40px 0', flex: 1 }}>
              {/* Lógica: Se houver campo 'vantagens', usa. Se não, usa os campos padrão */}
              {plano.vantagens ? (
                plano.vantagens.map((v: string, i: number) => (
                  <li key={i} style={{ marginBottom: '12px', fontSize: '14px', display: 'flex', gap: '10px' }}>
                    <span style={{ color: '#3b82f6' }}>✓</span> {v}
                  </li>
                ))
              ) : (
                <>
                  <li style={{ marginBottom: '12px', fontSize: '14px', display: 'flex', gap: '10px' }}>
                    <span style={{ color: '#3b82f6' }}>✓</span> {plano.permite_venda_comercial ? 'Licença Comercial incluída' : 'Uso Pessoal'}
                  </li>
                  <li style={{ marginBottom: '12px', fontSize: '14px', display: 'flex', gap: '10px' }}>
                    <span style={{ color: '#3b82f6' }}>✓</span> Suporte via comunidade
                  </li>
                  <li style={{ marginBottom: '12px', fontSize: '14px', display: 'flex', gap: '10px' }}>
                    <span style={{ color: '#3b82f6' }}>✓</span> Visualização 3D Ilimitada
                  </li>
                </>
              )}
            </ul>

            <button 
              onClick={() => router.push(`/checkout?plan=${plano.id}`)}
              style={{ width: '100%', padding: '18px', borderRadius: '12px', border: 'none', backgroundColor: '#3b82f6', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>
              Selecionar Plano
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}