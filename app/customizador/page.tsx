'use client';
export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import STLViewer from '@/components/STLViewer';
import EditorControls, { ValoresProduto } from '@/components/EditorControls';

/* ======================================================
   TIPOS
====================================================== */

type ProdutoAtual = {
  id: string | number;
  nome?: string;
  familia?: string;
  ui_schema?: any[];
  parametros_default?: Record<string, any>;
  custo_creditos?: number;
  viewer_schema?: any;
};

/* ======================================================
   COMPONENTE CLIENT
====================================================== */

function CustomizadorClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const familiaURL = searchParams.get('familia');

  const [loading, setLoading] = useState(true);
  const [produtoAtual, setProdutoAtual] = useState<ProdutoAtual | null>(null);
  const [modelos, setModelos] = useState<any[]>([]);
  const [valores, setValores] = useState<ValoresProduto>({});

  /* 🔴 ESTADOS FUNDAMENTAIS PARA O VIEWER */
  const [viewerState, setViewerState] =
    useState<'idle' | 'generating' | 'ready'>('idle');
  const [stlUrl, setStlUrl] = useState<string | null>(null);

  /* ======================================================
     FETCH PRODUTOS
  ======================================================= */

  useEffect(() => {
    let alive = true;

    async function fetchData() {
      if (!familiaURL) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('prod_designs')
        .select('*')
        .eq('familia', familiaURL);

      if (!alive) return;

      if (error || !data || data.length === 0) {
        setLoading(false);
        return;
      }

      setModelos(data);
      const selecionado = id
        ? data.find(d => String(d.id) === String(id))
        : data[0];

      setProdutoAtual(selecionado ?? data[0]);
      setLoading(false);
    }

    fetchData();
    return () => {
      alive = false;
    };
  }, [id, familiaURL]);

  /* ======================================================
     LIMPAR VIEWER AO TROCAR DE PRODUTO
     (isto resolve o problema de não conseguires trocar formas)
  ======================================================= */

  useEffect(() => {
    setViewerState('idle');
    setStlUrl(null);
  }, [produtoAtual?.id]);

  /* ======================================================
     GUARDS
  ======================================================= */

  if (loading) return <div>Iniciando…</div>;
  if (!produtoAtual) return <div>Produto não encontrado.</div>;

  const viewerSchema = produtoAtual.viewer_schema ?? {};

  const BACKEND_BASE =
    (process.env.NEXT_PUBLIC_BACKEND_URL ??
      'https://maker-pro-docker-prod.onrender.com'
    ).replace(/\/$/, '');

  /* ======================================================
     GERAR STL FINAL (🔥 ESTA É A CORREÇÃO REAL 🔥)
  ======================================================= */

  async function gerarSTLFinal() {
  if (!produtoAtual) return;   // ✅ GUARDA LOCAL (OBRIGATÓRIA)

  try {
    // 1️⃣ ATIVA LOADING NO VIEWER
    setViewerState('generating');
    setStlUrl(null);

    const { data: session } = await supabase.auth.getSession();
    const token = session?.session?.access_token;
    if (!token) throw new Error('Sem sessão');

    const res = await fetch(`${BACKEND_BASE}/gerar-stl-pro`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: produtoAtual.id,   // ✅ TS agora aceita
        mode: 'final',
        params: valores,
      }),
    });

    if (!res.ok) {
      throw new Error('Erro ao gerar STL');
    }

    const json = await res.json();
    if (!json?.storagePath) {
      throw new Error('Resposta inválida do backend');
    }

    const { data: signed } = await supabase.storage
      .from('makers_pro_stl_prod')
      .createSignedUrl(json.storagePath, 60 * 10);

    if (!signed?.signedUrl) {
      throw new Error('Erro ao criar signed URL');
    }

    setStlUrl(signed.signedUrl);
    setViewerState('ready');
  } catch (err) {
    console.error(err);
    setViewerState('idle');
    alert('Erro ao gerar STL');
  }
}


  /* ======================================================
     UI
  ======================================================= */

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
      <h2>{produtoAtual.nome}</h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '380px 1fr',
          gap: 24,
        }}
      >
        <aside>
          <EditorControls
            produto={produtoAtual}
            valores={valores}
            onUpdate={setValores}
          />

          <button
            onClick={gerarSTLFinal}
            disabled={viewerState === 'generating'}
            style={{ marginTop: 20 }}
          >
            {viewerState === 'generating'
              ? 'A GERAR STL…'
              : 'GERAR STL FINAL'}
          </button>
        </aside>

        <main>
          <STLViewer
            viewerSchema={viewerSchema}
            valores={valores}
            stlUrl={stlUrl}
            state={viewerState}
          />
        </main>
      </div>
    </div>
  );
}

/* ======================================================
   EXPORT
====================================================== */

export default function CustomizadorPage() {
  return (
    <Suspense fallback={<div>A carregar configurador…</div>}>
      <CustomizadorClient />
    </Suspense>
  );
}