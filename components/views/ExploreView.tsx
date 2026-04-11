'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
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
                href="/pet-tag" 
                className="group" // Permite efeitos nos elementos filhos
                style={{ textDecoration: 'none', display: 'block', color: 'inherit' }}
              >
                <div style={{ 
                  backgroundColor: '#1e293b', 
                  border: '1px solid #334155', 
                  borderRadius: '20px', 
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  transition: 'border-color 0.3s'
                }} className="hover:border-blue-500/50 shadow-lg">
                  
                  {/* Contentor da Imagem (Tamanho Fixo) */}
                  <div style={{ 
                    height: '200px', 
                    width: '100%', 
                    backgroundColor: '#0f172a', 
                    overflow: 'hidden', 
                    position: 'relative',
                    borderBottom: '1px solid #334155'
                  }}>
                    {prog.imagem_url ? (
                      <img 
                        src={prog.imagem_url} 
                        alt={prog.nome}
                        className="transition-transform duration-500 group-hover:scale-110"
                        style={{ 
                          width: '100%', 
                          height: '100%', 
                          objectFit: 'cover', 
                          objectPosition: 'center', 
                          display: 'block'
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.opacity = '0';
                        }}
                      />
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#475569', fontSize: '12px' }}>
                        SEM PRÉ-VISUALIZAÇÃO
                      </div>
                    )}
                  </div>

                  {/* Conteúdo do Card */}
                  <div style={{ padding: '25px', flexGrow: 1 }}>
                    <h2 className="group-hover:text-blue-400 transition-colors" style={{ 
                      color: '#ffffff', 
                      fontSize: '20px', 
                      fontWeight: 'bold', 
                      margin: '0 0 10px 0' 
                    }}>
                      {prog.nome}
                    </h2>
                    <p style={{ 
                      color: '#cbd5e1', 
                      fontSize: '14px', 
                      margin: '0', 
                      lineHeight: '1.5',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {prog.descricao}
                    </p>
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