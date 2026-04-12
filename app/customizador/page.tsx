'use client';

import { useEffect, useState, Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import STLViewer from '@/components/STLViewer';
import EditorControls, { ValoresProduto } from '@/components/EditorControls';

/* ──────────────────────────────────────────────
 TIPOS
────────────────────────────────────────────── */
type ProdutoAtual = {
  id: string | number;
  nome?: string;
  familia?: string;
  ui_schema?: any[];
  parametros_default?: Record<string, any>;
};

type Perfil = {
  id: string;
  creditos_disponiveis: number;
} | null;

/* ──────────────────────────────────────────────
 COMPONENTE
────────────────────────────────────────────── */
function CustomizadorConteudo() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const familiaURL = searchParams.get('familia');

  const [loading, setLoading] = useState(true);
  const [produtoAtual, setProdutoAtual] = useState<ProdutoAtual | null>(null);
  const [modelos, setModelos] = useState<any[]>([]);
  const [perfil, setPerfil] = useState<Perfil>(null);

  const [valores, setValores] = useState<ValoresProduto>({});
  const [previewPath, setPreviewPath] = useState<string | null>(null);

  /* ──────────────────────────────────────────────
   FETCH DADOS
  ────────────────────────────────────────────── */
  useEffect(() => {
    async function fetchData() {
      if (!familiaURL) {
        setLoading(false);
        return;
      }

      // FORMAS / DESIGNS
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

      // PERFIL (opcional)
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

  /* ──────────────────────────────────────────────
   AUTO‑PREVIEW REAL (DEBOUNCE)
  ────────────────────────────────────────────── */
  useEffect(() => {
    if (!produtoAtual) return;
    if (!Object.keys(valores).length) return;

    const timer = setTimeout(async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) return;

      const res = await fetch('/api/gerar-stl-pro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: produtoAtual.id,
          mode: 'preview',
          ...valores,
        }),
      });

      const data = await res.json();
      if (res.ok && data.storagePath) {
        setPreviewPath(data.storagePath);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [valores, produtoAtual]);

  if (loading) return <div>Iniciando…</div>;
  if (!produtoAtual) return <div>Produto não encontrado.</div>;

  /* ──────────────────────────────────────────────
   RENDER
  ────────────────────────────────────────────── */
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
      <Link href="/dashboard">← VOLTAR</Link>

      <h2 style={{ marginTop: 20 }}>
        {produtoAtual.nome?.toUpperCase()}
      </h2>

      {/* ✅ ESCOLHA DE FORMAS */}
      {modelos.length > 0 && (
        <>
          <h3 style={{ marginTop: 25 }}>FORMA:</h3>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {modelos.map((item) => {
              const ativo = String(item.id) === String(produtoAtual.id);

              return (
                <Link
                  key={item.id}
                  href={`/customizador?id=${item.id}&familia=${familiaURL}`}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 10,
                    background: ativo ? '#2563eb' : '#e5e7eb',
                    color: ativo ? 'white' : 'black',
                    fontWeight: 700,
                    textDecoration: 'none',
                  }}
                >
                  {String(item.nome ?? '')
                    .replace(/(Pet Tag - |Caixa Paramétrica - )/gi, '')
                    .toUpperCase()}
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* ✅ LAYOUT */}
      <div className="customizador-layout">
        <aside className="customizador-controls">
          <EditorControls
            produto={produtoAtual}
            valores={valores}
            onUpdate={setValores}
          />
        </aside>

        <main className="customizador-viewer">
          <STLViewer storagePath={previewPath} />
        </main>
      </div>
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