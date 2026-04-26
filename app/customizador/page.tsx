'use client';
export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
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

type Perfil =
  | {
      id: string;
      creditos: number;
      creditos_disponiveis: number;
    }
  | null;

/* ======================================================
   HELPERS
====================================================== */

function sanitizePayload(
  valores: Record<string, any>,
  allowedKeys: Set<string>
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(valores ?? {})) {
    if (!allowedKeys.has(k)) continue;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v;
    }
  }
  return out;
}

async function getTokenOrRefresh(setAccessToken: (t: string | null) => void) {
  try {
    const s = await supabase.auth.getSession();
    const t = s.data?.session?.access_token ?? null;
    if (t) {
      setAccessToken(t);
      return t;
    }
  } catch {}

  try {
    const r = await supabase.auth.refreshSession();
    const t = r.data?.session?.access_token ?? null;
    if (t) {
      setAccessToken(t);
      return t;
    }
  } catch {}

  setAccessToken(null);
  return null;
}

/* ======================================================
   COMPONENTE
====================================================== */

function CustomizadorClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const familiaURL = searchParams.get('familia');

  const [loading, setLoading] = useState(true);
  const [produtoAtual, setProdutoAtual] = useState<ProdutoAtual | null>(null);
  const [modelos, setModelos] = useState<any[]>([]);
  const [valores, setValores] = useState<ValoresProduto>({});
  const [perfil, setPerfil] = useState<Perfil>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [finalPath, setFinalPath] = useState<string | null>(null);
  const [loadingFinal, setLoadingFinal] = useState(false);
  const [downloading, setDownloading] = useState(false);

  /* ===== AUTH ===== */
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      setAccessToken(session?.access_token ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  /* ===== FETCH DADOS ===== */
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

      const { data: session } = await supabase.auth.getSession();
      if (session?.session?.user?.id) {
        const { data: perfilData } = await supabase
          .from('prod_perfis')
          .select('id, creditos, creditos_disponiveis')
          .eq('id', session.session.user.id)
          .maybeSingle();
        setPerfil((perfilData as any) ?? null);
      }

      setLoading(false);
    }

    fetchData();
    return () => {
      alive = false;
    };
  }, [id, familiaURL]);

  /* ======================================================
     GUARDS ✅ (corretos)
  ======================================================= */

  if (loading) return <div>Iniciando…</div>;
  if (!produtoAtual) return <div>Produto não encontrado.</div>;

  /* ======================================================
     DERIVADOS SEM HOOKS ✅
  ======================================================= */

  const viewerSchema = produtoAtual.viewer_schema ?? {};

  const custo = Number.isFinite(Number(produtoAtual.custo_creditos))
    ? Number(produtoAtual.custo_creditos)
    : 1;

  const allowedKeys = new Set<string>();
  for (const f of produtoAtual.ui_schema ?? []) {
    if (f?.name && typeof f.name === 'string') {
      allowedKeys.add(f.name);
    }
  }

  const BACKEND_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL ??
    'https://maker-pro-docker-prod.onrender.com').replace(/\/$/, '');

  /* ======================================================
     STL FINAL
  ======================================================= */

  async function gerarSTLFinal() {
    if (!produtoAtual) return;   // 🔒 GUARDA LOCAL (obrigatória!)
    
    setLoadingFinal(true);
    try {
      const token = await getTokenOrRefresh(setAccessToken);
      if (!token) return;

      const safeValores = sanitizePayload(valores as any, allowedKeys);

      const res = await fetch(`${BACKEND_BASE}/gerar-stl-pro`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: produtoAtual.id,   // ✅ TS AGORA ACEITA
          mode: 'final',
          params: safeValores,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json?.storagePath) return;

      setFinalPath(json.storagePath);
    } finally {
      setLoadingFinal(false);
    }
  }


  async function cobrarDownload() {
    if (!perfil) return;
    await supabase
      .from('prod_perfis')
      .update({
        creditos_disponiveis: perfil.creditos_disponiveis - custo,
        creditos: perfil.creditos + custo,
      })
      .eq('id', perfil.id);
  }

  async function descarregarSTLFinal() {
    if (!produtoAtual) return; // 🔒 GUARDA LOCAL

    if (!finalPath) return;

    setDownloading(true);
    try {
      await cobrarDownload();
      const { data } = await supabase.storage
        .from('makers_pro_stl_prod')
        .download(finalPath);

      if (!data) return;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `design_${produtoAtual.id}_${Date.now()}.stl`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  /* ======================================================
     UI
  ======================================================= */

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
      <Link href="/dashboard" style={{ textDecoration: 'underline' }}>
        ← VOLTAR
      </Link>

      <h2 style={{ marginTop: 20 }}>{produtoAtual.nome}</h2>

      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 24 }}>
        <aside>
          <EditorControls produto={produtoAtual} valores={valores} onUpdate={setValores} />

          <button onClick={gerarSTLFinal} disabled={loadingFinal}>
            {loadingFinal ? 'A GERAR STL…' : 'GERAR STL FINAL'}
          </button>

          <button onClick={descarregarSTLFinal} disabled={!finalPath || downloading}>
            {downloading ? 'A DESCARREGAR…' : 'DESCARREGAR STL'}
          </button>
        </aside>

        <main>
          <STLViewer viewerSchema={viewerSchema} valores={valores} />
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