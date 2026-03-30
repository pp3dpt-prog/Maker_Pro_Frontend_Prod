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

  // --- ESTA É A ÚNICA ADIÇÃO: FUNÇÃO PARA ATUALIZAR O RENDER ---
  const aoGerarStlComSucesso = (urlGerada: string) => {
    setProdutoAtual((prev: any) => ({
      ...prev,
      stl_file_path: `${urlGerada}?t=${Date.now()}` // O timestamp força o refresh do 3D
    }));
    setMostrarPreview(true); 
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        backgroundColor: '#0f172a', 
        color: 'white' 
      }}>
        Carregando customizador...
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* SIDEBAR DE CONTROLOS */}
      <aside style={{ 
        width: '350px', 
        backgroundColor: '#1e293b', 
        padding: '25px', 
        display: 'flex', 
        flexDirection: 'column',
        borderRight: '1px solid #334155',
        height: '100vh',
        overflowY: 'auto'
      }}>
        <Link href="/produtos" style={{ color: '#3b82f6', fontSize: '12px', fontWeight: 'bold', textDecoration: 'none', marginBottom: '10px', display: 'block' }}>
          ← VOLTAR PARA PRODUTOS
        </Link>

        <h1 style={{ fontSize: '20px', marginBottom: '20px', fontWeight: '900', color: '#f8fafc' }}>
          {produtoAtual?.nome?.toUpperCase()}
        </h1>

        {/* SELETOR DE FORMAS (GRELHA ORIGINAL) */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
            1. SELECIONE A FORMA:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            {modelos.map((item) => (
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
                  fontWeight: 'bold',
                  color: 'white',
                  border: '1px solid',
                  borderColor: item.id === produtoAtual?.id ? '#3b82f6' : '#334155',
                  transition: 'all 0.2s'
                }}
              >
                {item.nome.replace('Pet Tag - ', '').toUpperCase()}
              </Link>
            ))}
          </div>
        </div>

        {/* EDITOR CONTROLS (ENVIANDO A FUNÇÃO DE SUCESSO) */}
        <div style={{ borderTop: '1px solid #334155', paddingTop: '20px' }}>
          <label style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '10px', fontWeight: 'bold' }}>
            2. PERSONALIZAÇÃO:
          </label>
          <EditorControls 
            produto={produtoAtual} 
            onUpdate={setValores} 
            onGerarSucesso={aoGerarStlComSucesso} 
          />
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
            boxShadow: '0 4px 14px 0 rgba(0,0,0,0.39)',
            transition: 'all 0.2s'
          }}
        >
          {mostrarPreview ? 'REMOVER GRAVAÇÃO' : 'VISUALIZAR NA PEÇA'}
        </button>
      </aside>

      {/* ÁREA DO VISUALIZADOR 3D */}
      <main style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: '#020617',
        position: 'relative'
      }}>
        <STLViewer 
          produto={produtoAtual} 
          valores={valores} 
          mostrarPreview={mostrarPreview} 
        />
        
        {/* Marcador visual de que o render é real quando stl_file_path contém "supabase" */}
        {produtoAtual?.stl_file_path?.includes('supabase') && (
          <div style={{ position: 'absolute', top: '20px', right: '20px', background: '#22c55e', color: 'black', padding: '5px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold' }}>
            RENDER 3D FINAL ATIVO
          </div>
        )}
      </main>
    </div>
  );
}

export default function CustomizadorPage() {
  return (
    <Suspense fallback={null}>
      <CustomizadorConteudo />
    </Suspense>
  );
}