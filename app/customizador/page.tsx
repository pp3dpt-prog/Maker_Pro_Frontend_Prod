'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import STLViewer from '@/components/STLViewer';
import EditorControls from '@/components/EditorControls';

type ProdutoAtual = {
  id: string | number;
  nome?: string;
  familia?: string;
  ui_schema?: any[];
  custo_creditos?: number;
  parametros_default?: Record<string, any>;
};

type ValoresProduto = Record<string, string | number | boolean>;

type Perfil = {
  id: string;
  creditos_disponiveis: number;
} | null;

function CustomizadorConteudo() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const familiaURL = searchParams.get('familia');

  const [loading, setLoading] = useState(true);
  const [produtoAtual, setProdutoAtual] = useState<ProdutoAtual | null>(null);
  const [modelos, setModelos] = useState<any[]>([]);
  const [valores, setValores] = useState<ValoresProduto>({ fonte: 'Open Sans' });
  const [perfil, setPerfil] = useState<Perfil>(null);

  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [textoAplicado, setTextoAplicado] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!familiaURL) {
        setLoading(false);
        return;
      }

      const { data: lista } = await supabase
        .from('prod_designs')
        .select('*')
        .eq('familia', familiaURL);

      if (lista && lista.length > 0) {
        setModelos(lista);
        const selecionado = id
          ? lista.find((m) => String(m.id) === String(id))
          : lista[0];
        setProdutoAtual(selecionado ?? lista[0]);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (session?.user?.id) {
        const { data: perfilData } = await supabase
          .from('prod_perfis')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();
        setPerfil((perfilData as any) ?? null);
      } else {
        setPerfil(null);
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

  const blankUrl = blankMap[String(produtoAtual.id)] ?? null;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
      <Link href="/dashboard">← VOLTAR</Link>

      <h2 style={{ marginTop: 20 }}>
        {produtoAtual.nome?.toUpperCase()}
      </h2>

      {/* ✅ SELEÇÃO DE FORMAS */}
      <h3 style={{ marginTop: 25 }}>FORMA:</h3>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {modelos.map((item) => (
          <Link
            key={item.id}
            href={`/customizador?id=${item.id}&familia=${familiaURL}`}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              background:
                String(item.id) === String(produtoAtual.id)
                  ? '#2563eb'
                  : '#e5e7eb',
              color:
                String(item.id) === String(produtoAtual.id)
                  ? 'white'
                  : 'black',
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

      {/* ✅ BOTÃO TEXTO */}
      <button
        onClick={() => {
          if (!textoAplicado) setPreviewPath(null);
          setTextoAplicado(v => !v);
        }}
        style={{
          width: '100%',
          marginTop: 20,
          marginBottom: 20,
          padding: 15,
          backgroundColor: textoAplicado ? '#ef4444' : '#22c55e',
          color: 'white',
          borderRadius: 10,
          fontWeight: 900,
          border: 'none',
          cursor: 'pointer',
        }}
      >
        {textoAplicado ? 'REMOVER TEXTO DA PEÇA' : 'MOSTRAR TEXTO NA PEÇA'}
      </button>

      <button
        className="toggle-controls-btn"
        onClick={() => setControlsOpen(v => !v)}
      >
        {controlsOpen ? 'ESCONDER CONTROLOS' : 'MOSTRAR CONTROLOS'}
      </button>

      <div className={`customizador-layout ${controlsOpen ? '' : 'controls-hidden'}`}>
        <aside className="customizador-controls">
          <EditorControls
            produto={produtoAtual as any}
            perfil={perfil as any}
            valores={valores}
            onUpdate={setValores}
            onGerarSucesso={setPreviewPath}
            stlUrl={previewPath}
            textoAplicado={textoAplicado}
          />
        </aside>

        <main className="customizador-viewer">
          <STLViewer
            blankUrl={blankUrl}
            storagePath={previewPath}
            overlayText={valores.nome as string}
            overlayX={(valores.xPos as number) ?? 0}
            overlayY={(valores.yPos as number) ?? 0}
            overlaySize={((valores.fontSize as number) ?? 7) * 3}
            filename={`${String(produtoAtual.id)}.stl`}
          />
        </main>
      </div>
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