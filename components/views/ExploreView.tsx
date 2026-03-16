'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link'; // <--- ESTA LINHA FALTAVA!
import StatusBar from '@/components/ui/StatusBar';

export default function ExploreView() {
  const [programas, setProgramas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data } = await supabase.from('prod_programas').select('*');
      setProgramas(data || []);
      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    /* Fundo alterado de #050508 para #0f172a (um azul-escuro mais suave) */
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', padding: '40px 20px' }}>
      <StatusBar />
      
      <Link href="/pet-tag" className="block w-full">

        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          
          <h1 style={{ color: '#f8fafc', fontSize: '32px', marginBottom: '40px' }}>Explore aplicativos</h1>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
            gap: '30px' 
          }}>
            {programas.map((prog) => (
              <div key={prog.id} style={{ 
                backgroundColor: '#1e293b', /* Card um pouco mais claro para contrastar com o fundo */
                border: '1px solid #334155', 
                borderRadius: '20px', 
                padding: '25px',
                color: 'white'
              }}>
                <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>{prog.nome}</h2>
                <p style={{ color: '#cbd5e1', fontSize: '14px', marginBottom: '20px' }}>{prog.descricao}</p>
                
                {/*<button style={{ 
                  width: '100%', 
                  padding: '12px', 
                  backgroundColor: '#3b82f6', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}>
                  ABRIR APP
                </button>*/}
              </div>
            ))}
          </div>
        </div>
      </Link>
    </div>
  );
}