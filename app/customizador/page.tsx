'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import STLViewer from '@/components/STLViewer';
import EditorControls from '@/components/EditorControls';

/* Tipos mínimos (sem inventar demasiado) */
type ProdutoAtual = {
  id: string | number;
  nome?: string;
  familia?: string;
  ui_schema?: any[];
  custo_creditos?: number;
  parametros_default?: Record<string, any>;
};

type ValoresProduto = Record<string, string | number | boolean>;
const EMPTY_VALORES: ValoresProduto = {};

type Perfil = {
  id: string;
  creditos_disponiveis: number;
} | null;

function CustomizadorConteudo() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const familiaURL = searchParams.get('familia');

  const [loading, setLoading] = useState(true);
  const [mostrarPreview, setMostrarPreview] = useState(false);

  const [produtoAtual, setProdutoAtual] = useState<ProdutoAtual | null>(null);
  const [modelos, setModelos] = useState<any[]>([]);
  const [valores, setValores] = useState<ValoresProduto>({ fonte: 'Open Sans' });

  const [perfil, setPerfil] = useState<Perfil>(null);

  // ✅ STL “preview/gerado” (no teu EditorControls chama-se stlUrl, mas pode ser storagePath)
  const [stlUrl, setStlUrl] = useState<string | null>(null);

  const textoForma = familiaURL?.toLowerCase().includes('caixa')
    ? 'FORMA DA CAIXA'
    : 'FORMA DA MEDALHA';

  const mostrarBotaoPreview =
    produtoAtual?.ui_schema?.some(
      (c: any) => c.name === 'show_preview_button' && c.value === true
    ) ?? false;

  useEffect(() => {
    async function fetchData() {
      if (!familiaURL) {
        setLoading(false);
        return;
      }

      // 1) Designs
      const { data: lista, error } = await supabase
        .from('prod_designs')
        .select('*')
        .eq('familia', familiaURL);

      if (error) {
        console.error('Erro prod_designs:', error);
        setLoading(false);
        return;
      }

      if (lista && lista.length > 0) {
        setModelos(lista);

        const selecionado = id
          ? lista.find((m) => String(m.id) === String(id))
          : lista[0];

        setProdutoAtual(selecionado ?? lista[0]);
      }

      // 2) Perfil (se autenticado)
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (session?.user?.id) {
        const { data: perfilData, error: perfilErr } = await supabase
          .from('prod_perfis')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (perfilErr) console.error('Erro prod_perfis:', perfilErr);
        setPerfil((perfilData as any) ?? null);
      } else {
        setPerfil(null);
      }

      setLoading(false);
    }

    fetchData();
  }, [id, familiaURL]);

  if (loading) return <div>Iniciando…</div>;

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <Link href="/dashboard">← VOLTAR</Link>

      <h2 style={{ marginTop: '20px' }}>
        {produtoAtual?.nome?.toUpperCase()}
      </h2>

      <h3 style={{ marginTop: '25px' }}>
        1. {textoForma.toUpperCase()}:
      </h3>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        {modelos.map((item) => (
          <Link
            key={item.id}
            href={`/customizador?id=${item.id}&familia=${familiaURL}`}
            style={{
              padding: '10px 12px',
              borderRadius: '10px',
              background:
                String(item.id) === String(produtoAtual?.id) ? '#2563eb' : '#e5e7eb',
              color:
                String(item.id) === String(produtoAtual?.id) ? 'white' : 'black',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            {String(item.nome ?? '')
              .replace(/(Pet Tag - |Caixa Paramétrica - )/gi, '')
              .toUpperCase()}
          </Link>
        ))}
      </div>

      {mostrarBotaoPreview && (
        <button
          onClick={() => setMostrarPreview(!mostrarPreview)}
          style={{
            width: '100%',
            marginTop: '25px',
            marginBottom: '25px',
            padding: '15px',
            backgroundColor: mostrarPreview ? '#ef4444' : '#22c55e',
            color: 'white',
            borderRadius: '8px',
            fontWeight: 900,
            cursor: 'pointer',
            border: 'none',
          }}
        >
          {mostrarPreview ? 'REMOVER TEXTO' : 'VER TEXTO NA PEÇA'}
        </button>
      )}

      <p style={{ fontSize: '12px', color: '#94a3b8', lineHeight: '1.6' }}>
        ⚠️ NOTA DE PRECISÃO:
        <br />
        O visualizador 3D é uma aproximação. O ficheiro final será processado com máxima qualidade.
      </p>

      {/* ✅ EditorControls: props alinhadas com o ficheiro que enviaste (não existe setValores) */}
      {produtoAtual && (
        <EditorControls
          produto={produtoAtual as any}
          perfil={perfil as any}
          valores={valores}
          onUpdate={setValores}               // ✅ substitui setValores
          onGerarSucesso={(pathOrUrl: string) => {
            setStlUrl(pathOrUrl);             // guarda o caminho/URL devolvido
          }}
          stlUrl={stlUrl}
        />
      )}

      {/* STLViewer: mantém o teu modo actual */}
      {produtoAtual && (
        <STLViewer
          mode="produto"
          produto={{ id: String(produtoAtual.id), nome: produtoAtual.nome }}
          valores={mostrarPreview ? valores : EMPTY_VALORES}
        />
      )}
    </div>
  );
}

export default function CustomizadorPage() {
  return (
    <Suspense fallback={<div>Carregando…</div>}>
      <CustomizadorConteudo />
    </Suspense>
  );
}