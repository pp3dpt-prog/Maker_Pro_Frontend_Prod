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
      // Procura os planos criados na tua tabela prod_planos
      const { data, error } = await supabase
        .from('prod_planos')
        .select('*')
        .order('preco', { ascending: true });

      if (data) setPlanos(data);
      setLoading(false);
    }
    carregarPlanos();
  }, []);

  if (loading) return (
    <div style={{ background: '#0f172a', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white' }}>
      A carregar planos da base de dados...
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', padding: '80px 20px', fontFamily: 'sans-serif' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{ fontSize: '40px', fontWeight: '900', marginBottom: '15px' }}>PLANOS MAKER PRO</h1>
        <p style={{ color: '#94a3b8', fontSize: '18px' }}>Subscrições adaptadas à tua escala de produção.</p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '25px', 
        maxWidth: '1200px', 
        margin: '0 auto' 
      }}>
        {planos.map((plano) => (
          <div key={plano.id} style={{ 
            background: '#1e293b', 
            borderRadius: '20px', 
            padding: '35px', 
            border: '1px solid #334155',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <h2 style={{ fontSize: '18px', color: '#3b82f6', fontWeight: '900', marginBottom: '5px', textTransform: 'uppercase' }}>
              {plano.nome}
            </h2>
            <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '20px' }}>{plano.tipo || 'Subscrição Maker'}</p>
            
            <div style={{ marginBottom: '25px' }}>
              <span style={{ fontSize: '36px', fontWeight: '900' }}>{plano.preco}€</span>
              <span style={{ color: '#64748b', fontSize: '14px' }}> /mês</span>
            </div>

            {/* Créditos baseados na tua coluna limite_downloads */}
            <div style={{ background: '#0f172a', padding: '15px', borderRadius: '12px', marginBottom: '25px', textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#4ade80' }}>
                {plano.limite_downloads || '∞'}
              </div>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>DOWNLOADS STL / MÊS</div>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 30px 0', flex: 1 }}>
              <li style={{ marginBottom: '12px', fontSize: '14px', display: 'flex', gap: '10px' }}>
                <span style={{ color: '#3b82f6' }}>✓</span> 
                {plano.permite_venda_comercial ? 'Licença Comercial Ativa' : 'Uso Pessoal'}
              </li>
              <li style={{ marginBottom: '12px', fontSize: '14px', display: 'flex', gap: '10px' }}>
                <span style={{ color: '#3b82f6' }}>✓</span> 
                Válido por {plano.validade_dias} dias
              </li>
              <li style={{ marginBottom: '12px', fontSize: '14px', display: 'flex', gap: '10px' }}>
                <span style={{ color: '#3b82f6' }}>✓</span> 
                Atualizações 3D Ilimitadas
              </li>
            </ul>

            <button 
              onClick={() => router.push(`/checkout?plan=${plano.id}`)}
              style={{ 
                width: '100%', 
                padding: '16px', 
                borderRadius: '10px', 
                border: 'none', 
                backgroundColor: '#3b82f6', 
                color: 'white', 
                fontWeight: 'bold', 
                cursor: 'pointer'
              }}>
              Escolher Plano
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}