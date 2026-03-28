'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import EditorControls from '@/components/EditorControls';
import { useSearchParams } from 'next/navigation';
import STLViewer from '@/components/STLViewer'; 

function CustomizadorConteudo() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const familiaURL = searchParams.get('familia');
  const [mostrarPreview, setMostrarPreview] = useState(false);

  const [produtoAtual, setProdutoAtual] = useState<any>(null);
  const [modelos, setModelos] = useState<any[]>([]);
  const [valores, setValores] = useState<any>({ fonte: 'OpenSans' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!id && !familiaURL) return;
      
            const { data: lista, error } = await supabase
              .from('prod_designs')
              .select('*') 
              .eq('familia', familiaURL || '');

            if (lista && lista.length > 0) {
              setModelos(lista);
              const selecionado = id ? lista.find(m => String(m.id) === String(id)) : lista[0];
              setProdutoAtual(selecionado || lista[0]);
            }
            setLoading(false);
          }
          fetchData();
        }, [id, familiaURL]);

        if (loading) return <div style={{ padding: '50px', textAlign: 'center', color: 'white' }}>Carregando dados...</div>;

        return (
          <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a', color: 'white' }}>
            
            <aside style={{ width: '350px', backgroundColor: '#1e293b', padding: '25px', borderRight: '1px solid #334155', overflowY: 'auto' }}>
        <Link href="/produtos" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '12px', fontWeight: 'bold' }}>
          ← VOLTAR AOS PRODUTOS
        </Link>
        
        <h1 style={{ fontSize: '20px', fontWeight: '900', margin: '15px 0', textTransform: 'uppercase' }}>
          {produtoAtual?.nome || 'CARREGANDO...'}
        </h1>

        {/* SELECÇÃO DE FORMAS */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
            1. ESCOLHA A FORMA:
          </label>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {modelos.length > 0 ? (
              modelos.map((item) => (
                <Link
                  key={item.id}
                  href={`/customizador?familia=${familiaURL}&id=${item.id}`}
                  style={{
                    textDecoration: 'none',
                    backgroundColor: item.id === produtoAtual?.id ? '#2563eb' : '#0f172a',
                    padding: '12px 5px',
                    borderRadius: '8px',
                    textAlign: 'center',
                    fontSize: '10px',
                    color: 'white',
                    border: '1px solid #334155',
                    fontWeight: 'bold',
                    transition: '0.2s'
                  }}
                >
                  {item.nome.replace('Pet Tag - ', '').toUpperCase()}
                </Link>
              ))
            ) : (
              <div style={{ color: '#ef4444', fontSize: '10px', gridColumn: '1 / -1' }}>
                Nenhuma forma encontrada para a família: {familiaURL}
              </div>
            )}
          </div>
        </div>

        {/* CONTROLOS DE TEXTO E FONTE */}
        <div style={{ borderTop: '1px solid #334155', paddingTop: '20px' }}>
          <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
            2. PERSONALIZAÇÃO:
          </label>
          <EditorControls produto={produtoAtual} onUpdate={setValores} />
        </div>

        <button 
          onClick={() => setMostrarPreview(!mostrarPreview)}
          style={{
            width: '100%', 
            marginTop: '25px', 
            padding: '15px',
            backgroundColor: mostrarPreview ? '#ef4444' : '#22c55e',
            color: 'white', 
            borderRadius: '8px', 
            fontWeight: '900', 
            cursor: 'pointer', 
            border: 'none',
            boxShadow: '0 4px 14px 0 rgba(0,0,0,0.39)'
          }}
        >
          {mostrarPreview ? 'REMOVER GRAVAÇÃO' : 'VISUALIZAR NA PEÇA'}
        </button>
      </aside>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#020617' }}>
        <STLViewer 
          produto={produtoAtual} 
          valores={mostrarPreview ? valores : {}} 
        />
      </main>
    </div>
  );
}

export default function CustomizadorPage() {
  return (
    <Suspense fallback={<div style={{ color: 'white', textAlign: 'center' }}>Carregando...</div>}>
      <CustomizadorConteudo />
    </Suspense>
  );
}