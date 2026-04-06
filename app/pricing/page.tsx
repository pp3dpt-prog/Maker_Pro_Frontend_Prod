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
      // Procura todos os planos ativos na base de dados
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
      A carregar melhores ofertas...
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', padding: '80px 20px', fontFamily: 'sans-serif' }}>
      
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{ fontSize: '40px', fontWeight: '900', marginBottom: '15px' }}>PLANOS MAKER PRO</h1>
        <p style={{ color: '#94a3b8', fontSize: '18px' }}>Escolha o plano que melhor se adapta à sua produção.</p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '30px', 
        maxWidth: '1100px', 
        margin: '0 auto' 
      }}>
        {planos.map((plano) => (
          <div key={plano.id} style={{ 
            background: '#1e293b', 
            borderRadius: '24px', 
            padding: '40px', 
            border: plano.is_destaque ? '2px solid #3b82f6' : '1px solid #334155',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            transition: 'transform 0.3s ease'
          }}>
            {plano.is_destaque && (
              <div style={{ position: 'absolute', top: '-15px', left: '50%', transform: 'translateX(-50%)', background: '#3b82f6', padding: '5px 15px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold' }}>
                MAIS POPULAR
              </div>
            )}

            <h2 style={{ fontSize: '12px', color: '#3b82f6', fontWeight: 'bold', letterSpacing: '2px', marginBottom: '10px', textTransform: 'uppercase' }}>
              {plano.nome}
            </h2>
            
            <div style={{ marginBottom: '25px' }}>
              <span style={{ fontSize: '42px', fontWeight: '900' }}>{plano.preco}€</span>
              <span style={{ color: '#64748b', fontSize: '14px' }}> /mês</span>
            </div>

            {/* Contador de Créditos Dinâmico */}
            <div style={{ background: '#0f172a', padding: '20px', borderRadius: '16px', marginBottom: '30px', textAlign: 'center', border: '1px solid #334155' }}>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#4ade80' }}>{plano.creditos_incluidos}</div>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>CRÉDITOS STL POR MÊS</div>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 40px 0', flex: 1 }}>
              {/* Assume que as características estão guardadas como array ou string separada por vírgulas */}
              {(Array.isArray(plano.caracteristicas) ? plano.caracteristicas : plano.caracteristicas?.split(',') || []).map((feat: string, i: number) => (
                <li key={i} style={{ marginBottom: '15px', fontSize: '14px', display: 'flex', alignItems: 'flex-start', gap: '12px', color: '#cbd5e1' }}>
                  <span style={{ color: '#3b82f6' }}>✓</span> {feat.trim()}
                </li>
              ))}
            </ul>

            <button 
              onClick={() => router.push(`/checkout?plan=${plano.id}`)}
              style={{ 
                width: '100%', 
                padding: '18px', 
                borderRadius: '12px', 
                border: 'none', 
                backgroundColor: plano.is_destaque ? '#3b82f6' : '#334155', 
                color: 'white', 
                fontWeight: 'bold', 
                cursor: 'pointer',
                fontSize: '15px'
              }}>
              Seleccionar Plano
            </button>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '60px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
        <p>Todos os planos incluem atualizações de visualização 3D ilimitadas.</p>
        <p>Os créditos expiram no final de cada ciclo de faturação.</p>
      </div>
    </div>
  );
}