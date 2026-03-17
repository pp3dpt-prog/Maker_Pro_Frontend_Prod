'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import StatusBar from '@/components/ui/StatusBar';

export default function ExploreView() {
  const [programas, setProgramas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data, error } = await supabase.from('prod_programas').select('*');
      if (error) {
        console.error('Erro ao buscar programas:', error);
      } else {
        setProgramas(data || []);
      }
      setLoading(false);
    }
    fetchData();
  }, []);

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', padding: '40px 20px' }}>
      <StatusBar />
      
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h1 style={{ color: '#f8fafc', fontSize: '32px', marginBottom: '40px' }}>
          Explore aplicativos
        </h1>

        {loading ? (
          <p className="text-white">Carregando...</p>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', 
            gap: '30px' 
          }}>
            {programas.map((prog) => (
              <Link 
                key={prog.id} 
                href={`/pet-tag`}  // Ajuste a rota conforme seu projeto
                className="group block bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden hover:border-blue-500 transition-all"
              >
                <div className="p-6">
                  <h2 className="text-xl font-bold mb-2 text-white group-hover:text-blue-400">
                    {prog.nome}
                  </h2>
                  <p className="text-slate-400 text-sm leading-relaxed mb-4 line-clamp-2">
                    {prog.descricao}
                  </p>
                  
                  <div className="flex items-center text-xs font-semibold text-blue-500 uppercase tracking-widest">
                    Abrir Programa →
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}