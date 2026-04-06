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
  const [perfil, setPerfil] = useState<any>(null);
  const [valores, setValores] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: p } = await supabase.from('prod_perfis').select('*').eq('id', session.user.id).maybeSingle();
        setPerfil(p);
      }
      if (!familiaURL) return;
      const { data: lista } = await supabase.from('prod_designs').select('*').eq('familia', familiaURL);
      if (lista) {
        setModelos(lista);
        const selecionado = id ? lista.find(m => String(m.id) === String(id)) : lista[0];
        setProdutoAtual(selecionado);
      }
      setLoading(false);
    }
    fetchData();
  }, [id, familiaURL]);

  const aoGerarStlComSucesso = (resultado: any) => {
    setProdutoAtual((prev: any) => ({ ...prev, stl_file_path: Array.isArray(resultado) ? resultado[0] : resultado }));
    setMostrarPreview(false); 
  };

  if (loading) return <div style={{ background: '#0f172a', height: '100vh' }} />;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a' }}>
      <aside style={{ width: '380px', backgroundColor: '#1e293b', padding: '25px', overflowY: 'auto', borderRight: '1px solid #334155' }}>
        <Link href="/produtos" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '12px', fontWeight: 'bold' }}>← VOLTAR</Link>
        <h1 style={{ fontSize: '20px', color: 'white', margin: '20px 0', fontWeight: '900' }}>{produtoAtual?.nome?.toUpperCase()}</h1>

        {/* Botão de Preview Condicional */}
        {produtoAtual?.ui_schema?.some((c: any) => c.name === 'show_preview_button' && c.value === true) && (
          <button onClick={() => setMostrarPreview(!mostrarPreview)}
            style={{ width: '100%', marginBottom: '20px', padding: '16px', backgroundColor: mostrarPreview ? '#ef4444' : '#22c55e', color: 'white', borderRadius: '10px', fontWeight: '900', border: 'none', cursor: 'pointer' }}>
            {mostrarPreview ? 'REMOVER PRÉ-VISUALIZAÇÃO' : 'VER TEXTO NA PEÇA'}
          </button>
        )}

        <EditorControls 
          produto={produtoAtual} 
          perfil={perfil}
          onUpdate={(v: any) => setValores(v)} 
          onGerarSucesso={aoGerarStlComSucesso} 
          stlUrl={produtoAtual?.stl_file_path}
        />
      </aside>

      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {valores && (
          <STLViewer 
            key={`${produtoAtual?.id}-${valores.fonte}-${mostrarPreview}`} 
            produto={produtoAtual} 
            valores={mostrarPreview ? valores : {}} 
          />
        )}
      </main>
    </div>
  );
}

export default function CustomizadorPage() {
  return <Suspense fallback={null}><CustomizadorConteudo /></Suspense>;
}