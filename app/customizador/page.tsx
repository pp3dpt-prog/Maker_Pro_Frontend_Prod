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

  const [produtoAtual, setProdutoAtual] = useState<any>(null);
  const [modelos, setModelos] = useState<any[]>([]);
  const [valores, setValores] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!id && !familiaURL) return;
      
      const { data: lista } = await supabase
        .from('prod_designs')
        .select('*, ui_schema') 
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

  if (loading) return <div style={{ padding: '50px', textAlign: 'center', color: 'white' }}>A carregar...</div>;
  if (!produtoAtual) return null;

  return (
    <div style={{ 
      display: 'flex', 
      minHeight: '80vh', 
      backgroundColor: '#0f172a', 
      color: 'white' 
    }}>
      
      <aside style={{ 
        width: '350px', 
        backgroundColor: '#1e293b', 
        padding: '25px', 
        borderRight: '1px solid #334155',
        overflowY: 'auto'
      }}>
        <Link href="/produtos" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '12px', fontWeight: 'bold' }}>
          ← VOLTAR
        </Link>
        
        <h1 style={{ fontSize: '20px', fontWeight: '900', margin: '15px 0', textTransform: 'uppercase' }}>
          {produtoAtual.nome}
        </h1>

        <div style={{ marginBottom: '25px' }}>
          <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
            SELECIONE A FORMA BASE:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {modelos.map((item) => (
              <Link
                key={item.id}
                href={`/customizador?familia=${familiaURL}&id=${item.id}`}
                style={{
                  textDecoration: 'none',
                  backgroundColor: item.id === produtoAtual.id ? '#2563eb' : '#0f172a',
                  padding: '10px', 
                  borderRadius: '8px', 
                  textAlign: 'center', 
                  fontSize: '10px', 
                  color: 'white', 
                  border: '1px solid #334155',
                  transition: '0.2s'
                }}
              >
                {item.nome.replace('Pet Tag - ', '')}
              </Link>
            ))}
          </div>
        </div>

        <EditorControls produto={produtoAtual} onUpdate={setValores} />
      </aside>

      <main style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: '#020617',
        position: 'relative'
      }}>
        {/* CORREÇÃO: Passamos a coluna correta stl_file_path para o componente */}
        {produtoAtual?.stl_file_path ? (
          <STLViewer url={produtoAtual.stl_file_path} valores={valores} />
        ) : (
          <div style={{ color: '#475569' }}>Ficheiro 3D não configurado (stl_file_path vazio)</div>
        )}

        {!(valores.nome_pet || valores.largura) && (
          <div style={{ 
            position: 'absolute', 
            bottom: '20px', 
            color: '#475569', 
            fontSize: '11px', 
            fontWeight: 'bold',
            letterSpacing: '1px'
          }}>
            A VISUALIZAR FORMA ORIGINAL: {produtoAtual.id.toUpperCase()}
          </div>
        )}
      </main>
    </div>
  );
}

export default function CustomizadorPage() {
  return (
    <Suspense fallback={<div style={{ color: 'white', textAlign: 'center', padding: '50px' }}>A carregar...</div>}>
      <CustomizadorConteudo />
    </Suspense>
  );
}