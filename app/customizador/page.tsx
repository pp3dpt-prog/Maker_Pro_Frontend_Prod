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
      const { data: lista } = await supabase.from('prod_designs').select('*').eq('familia', familiaURL || '');
      if (lista && lista.length > 0) {
        setModelos(lista);
        const selecionado = id ? lista.find(m => String(m.id) === String(id)) : lista[0];
        setProdutoAtual(selecionado || lista[0]);
      }
      setLoading(false);
    }
    fetchData();
  }, [id, familiaURL]);

  const aoGerarStlComSucesso = (urlGerada: string) => {
    setProdutoAtual((prev: any) => ({
      ...prev,
      stl_file_path: `${urlGerada}?t=${Date.now()}`
    }));
    setMostrarPreview(false); 
  };

  if (loading) return <div style={{ background: '#0f172a', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white' }}>Iniciando Customizador...</div>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a', color: 'white' }}>
      <aside style={{ width: '380px', backgroundColor: '#1e293b', padding: '25px', borderRight: '1px solid #334155', overflowY: 'auto', height: '100vh' }}>
        <Link href="/produtos" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '12px', fontWeight: 'bold' }}>← VOLTAR</Link>
        <h1 style={{ fontSize: '22px', fontWeight: '900', margin: '20px 0' }}>{produtoAtual?.nome?.toUpperCase()}</h1>

        <div style={{ marginBottom: '30px' }}>
          <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '12px', fontWeight: 'bold' }}>1. FORMA DA MEDALHA:</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {modelos.map((item) => (
              <Link key={item.id} href={`/customizador?familia=${familiaURL}&id=${item.id}`}
                style={{
                  textDecoration: 'none',
                  backgroundColor: item.id === produtoAtual?.id ? '#2563eb' : '#0f172a',
                  padding: '12px 5px', borderRadius: '8px', textAlign: 'center', fontSize: '10px', color: 'white', border: '1px solid #334155', fontWeight: 'bold'
                }}>
                {item.nome.replace('Pet Tag - ', '').toUpperCase()}
              </Link>
            ))}
          </div>
        </div>

        {/* Procura no ui_schema se existe a permissão para mostrar o botão */}
        {produtoAtual?.ui_schema?.some((c: any) => c.name === 'show_preview_button' && c.value === true) && (
          <div>
            <button 
              onClick={() => setMostrarPreview(!mostrarPreview)}
              style={{ 
                width: '100%', marginTop: '10px', marginBottom: '25px', padding: '15px', 
                backgroundColor: mostrarPreview ? '#ef4444' : '#22c55e', color: 'white', 
                borderRadius: '8px', fontWeight: '900', border: 'none', cursor: 'pointer' 
              }}
            >
              {mostrarPreview ? 'REMOVER PRÉ-VISUALIZAÇÃO' : 'VER TEXTO NA PEÇA'}
            </button>
          </div>
        )}
        
        <EditorControls 
          produto={produtoAtual} 
          onUpdate={setValores} 
          onGerarSucesso={aoGerarStlComSucesso} 
        />

        
      </aside>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#020617' }}>
        <STLViewer produto={produtoAtual} valores={mostrarPreview ? valores : {}} />
      </main>
    </div>
  );
}

export default function CustomizadorPage() {
  return <Suspense fallback={null}><CustomizadorConteudo /></Suspense>;
}