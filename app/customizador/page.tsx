'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

import STLViewer from '@/components/STLViewer';
import EditorControls, { ValoresProduto } from '@/components/EditorControls';

type ProdutoAtual = {
  id: string | number;
  nome?: string;
  familia?: string;
  ui_schema?: any[];
};

function CustomizadorClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const familiaURL = searchParams.get('familia');

  const [loading, setLoading] = useState(true);
  const [produtoAtual, setProdutoAtual] = useState<ProdutoAtual | null>(null);
  const [modelos, setModelos] = useState<any[]>([]);
  const [valores, setValores] = useState<ValoresProduto>({});
  const [mostrarTexto, setMostrarTexto] = useState(false);

  useEffect(() => {
    async function fetchData() {
      if (!familiaURL) return;

      const { data } = await supabase
        .from('prod_designs')
        .select('*')
        .eq('familia', familiaURL);

      if (data && data.length > 0) {
        setModelos(data);
        const selecionado = id
          ? data.find((d) => String(d.id) === String(id))
          : data[0];
        setProdutoAtual(selecionado ?? data[0]);
      }

      setLoading(false);
    }

    fetchData();
  }, [id, familiaURL]);

  if (loading) return <div>Iniciando…</div>;
  if (!produtoAtual) return <div>Produto não encontrado.</div>;

  const blankMap: Record<string, string> = {
    'tag-redonda': '/models/blank_redondo.stl',
    'tag-osso': '/models/blank_osso.stl',
    'tag-coracao': '/models/blank_coracao.stl',
    'tag-hexagono': '/models/blank_hexagono.stl',
  };

  const blankUrl =
    blankMap[String(produtoAtual.id)] ?? '/models/blank_redondo.stl';

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
      <Link href="/dashboard">← VOLTAR</Link>

      <h2>{produtoAtual.nome?.toUpperCase()}</h2>

      <button
        onClick={() => setMostrarTexto((v) => !v)}
        style={{
          margin: '20px 0',
          padding: 12,
          background: mostrarTexto ? '#ef4444' : '#22c55e',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          cursor: 'pointer',
        }}
      >
        {mostrarTexto ? 'VER PEÇA LIMPA' : 'VISUALIZAR PERSONALIZAÇÃO'}
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: 24 }}>
        <EditorControls
          produto={produtoAtual}
          valores={valores}
          onUpdate={setValores}
        />

        <STLViewer
          baseStlUrl={blankUrl}
          nome={mostrarTexto ? String(valores.nome_pet ?? '') : ''}
          telefone={mostrarTexto ? String(valores.telefone ?? '') : ''}
          font={String(valores.fonte ?? 'Open Sans')}
          fontSize={Number(valores.fontSize ?? 7)}
          xPos={Number(valores.xPos ?? 0)}
          yPos={Number(valores.yPos ?? 0)}
          relevo={true}
        />
      </div>
    </div>
  );
}

export default function CustomizadorPage() {
  return (
    <Suspense fallback={<div>A carregar configurador…</div>}>
      <CustomizadorClient />
    </Suspense>
  );
}