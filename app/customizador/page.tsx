'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import STLViewer from '@/components/STLViewer';
import EditorControls from '@/components/EditorControls';

/* ──────────────────────────────────────────────
   TIPOS
────────────────────────────────────────────── */

type ProdutoAtual = {
  id: string | number;
  nome?: string;
  familia?: string;
  ui_schema?: any[];
  stl_file_path?: string;
};

type ValoresProduto = Record<string, string | number | boolean>;

/* objecto vazio TIPADO (crítico para o ternário) */
const EMPTY_VALORES: ValoresProduto = {};

/* ──────────────────────────────────────────────
   COMPONENTE INTERNO
────────────────────────────────────────────── */

function CustomizadorConteudo() {
  const searchParams = useSearchParams();

  const id = searchParams.get('id');
  const familiaURL = searchParams.get('familia');

  const [loading, setLoading] = useState(true);
  const [mostrarPreview, setMostrarPreview] = useState(false);

  const [produtoAtual, setProdutoAtual] = useState<ProdutoAtual | null>(null);
  const [modelos, setModelos] = useState<any[]>([]);
  const [valores, setValores] = useState<ValoresProduto>({
    fonte: 'Open Sans',
  });

  const textoForma = familiaURL?.toLowerCase().includes('caixa')
    ? 'FORMA DA CAIXA'
    : 'FORMA DA MEDALHA';

  const mostrarBotaoPreview =
    produtoAtual?.ui_schema?.some(
      (c: any) => c.name === 'show_preview_button' && c.value === true
    ) ?? false;

  /* ──────────────────────────────────────────────
     FETCH INICIAL
  ────────────────────────────────────────────── */

  useEffect(() => {
    async function fetchData() {
      if (!familiaURL) {
        setLoading(false);
        return;
      }

      const { data: lista, error } = await supabase
        .from('prod_designs')
        .select('*')
        .eq('familia', familiaURL);

      if (error) {
        console.error(error);
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

      setLoading(false);
    }

    fetchData();
  }, [id, familiaURL]);

  /* ──────────────────────────────────────────────
     RENDER
  ────────────────────────────────────────────── */

  if (loading) {
    return <div>Iniciando…</div>;
  }

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
              padding: '8px 14px',
              borderRadius: '6px',
              backgroundColor:
                String(item.id) === String(produtoAtual?.id)
                  ? '#2563eb'
                  : '#e5e7eb',
              color:
                String(item.id) === String(produtoAtual?.id)
                  ? 'white'
                  : 'black',
              fontWeight: 700,
              textDecoration: 'none',
            }}
          >
            {item.nome
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
        O visualizador é uma aproximação. O ficheiro final será processado com
        máxima qualidade.
      </p>

      {/* CONTROLOS */}
      {produtoAtual && (
        <EditorControls
          produto={produtoAtual}
          valores={valores}
          setValores={setValores}
        />
      )}

      {/* STL VIEWER */}
      {produtoAtual && (
        <STLViewer
          mode="produto"
          produto={{
            id: String(produtoAtual.id),
            nome: produtoAtual.nome,
          }}
          valores={mostrarPreview ? valores : EMPTY_VALORES}
        />
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   EXPORT
────────────────────────────────────────────── */

export default function CustomizadorPage() {
  return (
    <Suspense fallback={<div>Carregando…</div>}>
      <CustomizadorConteudo />
    </Suspense>
  );
}