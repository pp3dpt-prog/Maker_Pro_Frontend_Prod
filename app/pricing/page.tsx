'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function PricingPage() {
  const router = useRouter();
  const [planos, setPlanos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    async function carregarPlanos() {
      try {
        setLoading(true);
        // Tenta ler os planos da tua tabela
        const { data, error } = await supabase
          .from('prod_planos')
          .select('*')
          .order('preco', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          setPlanos(data);
        } else {
          setErro("A tabela 'prod_planos' está vazia ou sem permissão de leitura.");
        }
      } catch (err: any) {
        console.error("Erro ao carregar base de dados:", err.message);
        setErro(err.message);
      } finally {
        setLoading(false);
      }
    }
    carregarPlanos();
  }, []);

  if (loading) return <div style={{ background: '#0f172a', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white' }}>A ligar à base de dados...</div>;

  if (erro) return (
    <div style={{ background: '#0f172a', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: '#f87171', padding: '20px', textAlign: 'center' }}>
      <h2 style={{ marginBottom: '10px' }}>⚠️ Erro de Ligação</h2>
      <p style={{ color: '#94a3b8', fontSize: '14px' }}>{erro}</p>
      <button onClick={() => window.location.reload()} style={{ marginTop: '20px', padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Tentar Novamente</button>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', padding: '80px 20px', fontFamily: 'sans-serif' }}>
      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: '900', marginBottom: '15px' }}>PLANOS DISPONÍVEIS</h1>
        <p style={{ color: '#94a3b8', fontSize: '18px' }}>Escolha o plano ideal para as suas impressões 3D.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', maxWidth: '1200px', margin: '0 auto' }}>
        {planos.map((plano) => (
          <div key={plano.id} style={{ background: '#1e293b', borderRadius: '24px', padding: '40px', border: '1px solid #334155', display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ fontSize: '18px', color: '#3b82f6', fontWeight: 'bold', marginBottom: '10px' }}>{plano.nome?.toUpperCase()}</h2>
            
            <div style={{ marginBottom: '20px' }}>
              <span style={{ fontSize: '42px', fontWeight: '900' }}>{plano.preco}€</span>
              <span style={{ color: '#64748b' }}> / {plano.validade_dias} dias</span>
            </div>

            <div style={{ background: '#0f172a', padding: '15px', borderRadius: '12px', marginBottom: '25px', textAlign: 'center' }}>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#4ade80' }}>{plano.limite_downloads}</div>
              <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold' }}>CRÉDITOS INCLUÍDOS</div>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 40px 0', flex: 1 }}>
              {/* Vantagens dinâmicas da nova coluna ou padrão */}
              {plano.vantagens && plano.vantagens.length > 0 ? (
                plano.vantagens.map((v: string, i: number) => (
                  <li key={i} style={{ marginBottom: '12px', fontSize: '14px', display: 'flex', gap: '10px' }}><span style={{ color: '#3b82f6' }}>✓</span> {v}</li>
                ))
              ) : (
                <>
                  <li style={{ marginBottom: '12px', fontSize: '14px', display: 'flex', gap: '10px' }}><span style={{ color: '#3b82f6' }}>✓</span> {plano.permite_venda_comercial ? 'Licença Comercial' : 'Uso Pessoal'}</li>
                  <li style={{ marginBottom: '12px', fontSize: '14px', display: 'flex', gap: '10px' }}><span style={{ color: '#3b82f6' }}>✓</span> Download STL em Alta Qualidade</li>
                </>
              )}
            </ul>

            <button onClick={() => router.push(`/checkout?plan=${plano.id}`)} style={{ width: '100%', padding: '16px', borderRadius: '12px', background: '#3b82f6', color: 'white', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
              Selecionar Plano
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}