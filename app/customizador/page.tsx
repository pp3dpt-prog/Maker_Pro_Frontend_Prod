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
  const [valores, setValores] = useState<any>({}); // Inicia vazio para ser preenchido pelo Editor
  const [loading, setLoading] = useState(true);

  // Lógica de UI baseada na família
  const textoForma = familiaURL?.toLowerCase().includes('caixa') ? 'FORMA DA CAIXA' : 'FORMA DA MEDALHA';
  const mostrarBotaoPreview = produtoAtual?.ui_schema?.some((c: any) => c.name === 'show_preview_button' && c.value === true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      
      // 1. Obter Sessão e Perfil para Créditos
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: p } = await supabase.from('prod_perfis').select('*').eq('id', session.user.id).maybeSingle();
        setPerfil(p);
      }

      // 2. Obter Modelos da Família
      if (!familiaURL) return;
      const { data: lista } = await supabase
        .from('prod_designs')
        .select('*')
        .eq('familia', familiaURL);

      if (lista && lista.length > 0) {
        setModelos(lista);
        // Prioriza o ID do URL, senão usa o primeiro da lista
        const selecionado = id ? lista.find(m => String(m.id) === String(id)) : lista[0];
        setProdutoAtual(selecionado || lista[0]);
      }
      setLoading(false);
    }
    fetchData();
  }, [id, familiaURL]);

  // Função chamada pelo Editor quando o motor termina de gerar o STL
  const aoGerarStlComSucesso = (resultado: any) => {
    setProdutoAtual((prev: any) => ({
      ...prev,
      stl_file_path: Array.isArray(resultado) ? resultado[0] : resultado,
      stls_adicionais: Array.isArray(resultado) ? resultado : null
    }));
    setMostrarPreview(false); 
  };

  if (loading) return (
    <div style={{ background: '#0f172a', height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', fontFamily: 'sans-serif' }}>
      A preparar o seu estúdio criativo...
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* BARRA LATERAL DE CONTROLOS */}
      <aside style={{ width: '380px', backgroundColor: '#1e293b', padding: '25px', borderRight: '1px solid #334155', overflowY: 'auto', height: '100vh' }}>
        <Link href="/produtos" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
          ← VOLTAR AO CATÁLOGO
        </Link>
        
        <h1 style={{ fontSize: '22px', fontWeight: '900', margin: '20px 0', color: 'white' }}>
          {produtoAtual?.nome?.toUpperCase()}
        </h1>

        {/* SELETOR DE FORMA (SUB-MODELOS) */}
        <div style={{ marginBottom: '30px' }}>
          <label style={{ fontSize: '11px', color: '#64748b', display: 'block', marginBottom: '12px', fontWeight: 'bold' }}>
            1. {textoForma}:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            {modelos.map((item) => (
              <Link 
                key={item.id} 
                href={`/customizador?familia=${familiaURL}&id=${item.id}`}
                style={{
                  textDecoration: 'none',
                  backgroundColor: String(item.id) === String(produtoAtual?.id) ? '#2563eb' : '#0f172a',
                  padding: '12px 5px', 
                  borderRadius: '8px', 
                  textAlign: 'center', 
                  fontSize: '10px', 
                  color: 'white', 
                  border: '1px solid #334155', 
                  fontWeight: 'bold',
                  transition: '0.2s'
                }}>
                {item.nome.replace(/(Pet Tag - |Caixa Paramétrica - )/gi, '').toUpperCase()}
              </Link>
            ))}
          </div>
        </div>

        {/* BOTÃO DE PREVIEW DE TEXTO (Se configurado no ui_schema) */}
        {mostrarBotaoPreview && (
          <div style={{ marginBottom: '25px' }}>
            <button 
              onClick={() => setMostrarPreview(!mostrarPreview)}
              style={{ 
                width: '100%', 
                padding: '15px', 
                backgroundColor: mostrarPreview ? '#ef4444' : '#22c55e', 
                color: 'white', 
                borderRadius: '10px', 
                fontWeight: '900', 
                cursor: 'pointer', 
                border: 'none',
                boxShadow: '0 4px 14px rgba(0,0,0,0.3)'
              }}
            >
              {mostrarPreview ? 'OCULTAR PRÉ-VISUALIZAÇÃO' : 'VER TEXTO NA PEÇA'}
            </button>
          </div>
        )}
        
        {/* CONTROLOS DINÂMICOS (Sliders, Inputs, Fontes, Créditos) */}
        <EditorControls 
          produto={produtoAtual} 
          perfil={perfil}
          onUpdate={(novosValores: any) => setValores(novosValores)} 
          onGerarSucesso={aoGerarStlComSucesso} 
          stlUrl={produtoAtual?.stl_file_path}
        />
      </aside>

      {/* ÁREA DE VISUALIZAÇÃO 3D */}
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#020617', position: 'relative' }}>
        {/* Passa os valores em tempo real para o Viewer */}
        <STLViewer 
          produto={produtoAtual} 
          valores={mostrarPreview ? valores : {}} 
        />
        
        {/* Badge de Info */}
        <div style={{ position: 'absolute', bottom: '20px', right: '20px', background: 'rgba(30, 41, 59, 0.7)', padding: '10px 20px', borderRadius: '20px', fontSize: '12px', color: '#94a3b8', border: '1px solid #334155' }}>
          Modo de Edição Ativo
        </div>
      </main>
    </div>
  );
}

export default function CustomizadorPage() {
  return (
    <Suspense fallback={<div style={{ background: '#0f172a', height: '100vh' }} />}>
      <CustomizadorConteudo />
    </Suspense>
  );
}