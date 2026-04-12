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
  custo_creditos?: number;
  parametros_default?: Record<string, any>;
};

type ValoresProduto = Record<string, string | number | boolean>;

type Perfil = {
  id: string;
  creditos_disponiveis: number;
} | null;

/* ──────────────────────────────────────────────
 COMPONENTE PRINCIPAL
────────────────────────────────────────────── */
function CustomizadorConteudo() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const familiaURL = searchParams.get('familia');

  const [loading, setLoading] = useState(true);
  const [produtoAtual, setProdutoAtual] = useState<ProdutoAtual | null>(null);
  const [modelos, setModelos] = useState<any[]>([]);
  const [valores, setValores] = useState<ValoresProduto>({ fonte: 'Open Sans' });
  const [perfil, setPerfil] = useState<Perfil>(null);

  // ✅ STL preview exacto (storagePath devolvido pelo backend)
  const [previewPath, setPreviewPath] = useState<string | null>(null);

  // ✅ Toggle desktop (esconder/mostrar controlos)
  const [controlsOpen, setControlsOpen] = useState(true);

  /* ──────────────────────────────────────────────
   FETCH DADOS
  ────────────────────────────────────────────── */
  useEffect(() => {
    async function fetchData() {
      if (!familiaURL) {
        setLoading(false);
        return;
      }

      // 1) Produtos
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

  /* ──────────────────────────────────────────────
   BLANKS (PREVIEW RÁPIDO)
  ────────────────────────────────────────────── */
  const blankMap: Record<string, string> = {
    'tag-redonda': '/models/blank_redondo.stl',
    'tag-osso': '/models/blank_osso.stl',
    'tag-coracao': '/models/blank_coracao.stl',
    'tag-hexagono': '/models/blank_hexagono.stl',
  };

  const blankUrl = blankMap[String(produtoAtual.id)] ?? null;

  /* ──────────────────────────────────────────────
   RENDER
  ────────────────────────────────────────────── */
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
      <Link href="/dashboard">← VOLTAR</Link>

      <h2 style={{ marginTop: 20 }}>
        {produtoAtual.nome?.toUpperCase()}
      </h2>

      {/* ✅ Toggle desktop */}
      <button
        className="toggle-controls-btn"
        onClick={() => setControlsOpen(v => !v)}
      >
        {controlsOpen ? 'ESCONDER CONTROLOS' : 'MOSTRAR CONTROLOS'}
      </button>

      {/* ✅ LAYOUT PRINCIPAL */}
      <div className={`customizador-layout ${controlsOpen ? '' : 'controls-hidden'}`}>
        {/* ───── CONTROLOS ───── */}
        <aside className="customizador-controls">
          <EditorControls
            produto={produtoAtual as any}
            perfil={perfil as any}
            valores={valores}
            onUpdate={setValores}
            onGerarSucesso={(path) => setPreviewPath(path)}
            stlUrl={previewPath}
          />
        </aside>

        {/* ───── VIEWER ───── */}
        <main className="customizador-viewer">
          <STLViewer
            blankUrl={blankUrl}
            storagePath={previewPath}
            filename={`${String(produtoAtual.id)}.stl`}
          />
        </main>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
 EXPORT COM SUSPENSE
────────────────────────────────────────────── */
export default function CustomizadorPage() {
  return (
    <Suspense fallback={<div>Carregando…</div>}>
      <CustomizadorConteudo />
    </Suspense>
  );
}