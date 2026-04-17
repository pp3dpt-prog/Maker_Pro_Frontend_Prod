'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useMemo, useState } from 'react';
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
  parametros_default?: Record<string, any>;
  custo_creditos?: number;
};

type Perfil = {
  id: string;
  creditos: number;              // usados
  creditos_disponiveis: number;  // saldo
} | null;

function sanitizePayload(
  valores: Record<string, any>,
  allowedKeys: Set<string>
): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(valores || {})) {
    if (!allowedKeys.has(k)) continue;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      out[k] = v;
    }
  }
  return out;
}

async function getTokenOrRefresh(setAccessToken: (t: string | null) => void) {
  try {
    const s1 = await supabase.auth.getSession();
    const t1 = s1.data?.session?.access_token ?? null;
    if (t1) {
      setAccessToken(t1);
      return t1;
    }
  } catch {}

  try {
    const r = await supabase.auth.refreshSession();
    const t2 = r.data?.session?.access_token ?? null;
    if (t2) {
      setAccessToken(t2);
      return t2;
    }
  } catch {}

  setAccessToken(null);
  return null;
}

function CustomizadorClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const familiaURL = searchParams.get('familia');

  const [loading, setLoading] = useState(true);
  const [produtoAtual, setProdutoAtual] = useState<ProdutoAtual | null>(null);
  const [modelos, setModelos] = useState<any[]>([]);
  const [valores, setValores] = useState<ValoresProduto>({});
  const [mostrarTexto, setMostrarTexto] = useState(false);

  const [perfil, setPerfil] = useState<Perfil>(null);

  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [finalPath, setFinalPath] = useState<string | null>(null);
  const [loadingFinal, setLoadingFinal] = useState(false);
  const [downloading, setDownloading] = useState(false);


const [viewerMode, setViewerMode] = useState<'preview' | 'loading' | 'final'>('preview');
const [finalStlUrl, setFinalStlUrl] = useState<string | null>(null);


  // hooks sempre no topo (evita problemas de hooks)
  const custo = useMemo(() => {
    const c = Number(produtoAtual?.custo_creditos ?? 1);
    return Number.isFinite(c) && c > 0 ? c : 1;
  }, [produtoAtual?.custo_creditos]);

  const allowedKeys = useMemo(() => {
    const s = new Set<string>();
    for (const f of produtoAtual?.ui_schema ?? []) {
      if (f?.name && typeof f.name === 'string') s.add(f.name);
    }
    return s;
  }, [produtoAtual?.ui_schema]);

  // listener correto do supabase-js v2
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setAccessToken(session?.access_token ?? null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // carregar modelos + perfil
  useEffect(() => {
    let alive = true;

    async function fetchData() {
      if (!familiaURL) {
        if (alive) setLoading(false);
        return;
      }

      const { data: designs, error: designsErr } = await supabase
        .from('prod_designs')
        .select('*')
        .eq('familia', familiaURL);

      if (!alive) return;

      if (designsErr) {
        console.error('Erro prod_designs:', designsErr);
        setLoading(false);
        return;
      }

      if (designs && designs.length > 0) {
        setModelos(designs);
        const selecionado = id
          ? designs.find((d) => String(d.id) === String(id))
          : designs[0];
        setProdutoAtual(selecionado ?? designs[0]);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session;

      if (session?.user?.id) {
        const { data: perfilData, error: perfilErr } = await supabase
          .from('prod_perfis')
          .select('id, creditos, creditos_disponiveis')
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
    return () => {
      alive = false;
    };
  }, [id, familiaURL]);

  if (loading) return <div>Iniciando…</div>;
  if (!produtoAtual) return <div>Produto não encontrado.</div>;

  const produtoId = produtoAtual.id;

  // blanks (mantém)
  const blankMap: Record<string, string> = {
    'tag-redonda': '/models/blank_redondo.stl',
    'tag-osso': '/models/blank_osso.stl',
    'tag-coracao': '/models/blank_coracao.stl',
    'tag-hexagono': '/models/blank_hexagono.stl',
  };

  const blankUrl =
    blankMap[String(produtoAtual.id)] ?? '/models/blank_redondo.stl';

  async function gerarSTLFinal() {
  setViewerMode('loading');
  setLoadingFinal(true);

  try {
    const token = await getTokenOrRefresh(setAccessToken);

    if (!token) {
      setViewerMode('preview');
      alert('Sessão não disponível. Faz logout/login e tenta novamente.');
      return;
    }

    const safeValores = sanitizePayload(valores as any, allowedKeys);

    const res = await fetch('/api/gerar-stl-pro', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        id: produtoId,
        mode: 'final',
        ...safeValores,
      }),
    });

    // ✅ NÃO usar "data" aqui
    const result: { storagePath?: string; error?: string } = await res.json();

    if (!res.ok) {
      setViewerMode('preview');
      alert(result?.error ?? 'Erro ao gerar STL final.');
      return;
    }

    if (!result.storagePath) {
      setViewerMode('preview');
      alert('Servidor não devolveu storagePath.');
      return;
    }

    setFinalPath(result.storagePath);

    // ✅ criar URL assinada para mostrar no viewer
    const { data: signed, error: signErr } = await supabase
      .storage
      .from('designs-vault')
      .createSignedUrl(result.storagePath, 60 * 10); // 10 min

    if (signErr || !signed?.signedUrl) {
      setViewerMode('preview');
      alert('Não foi possível carregar o STL final no viewer.');
      return;
    }

    setFinalStlUrl(signed.signedUrl);
    setViewerMode('final');
  } catch (e: any) {
    console.error(e);
    setViewerMode('preview');
    alert('Erro inesperado ao gerar STL.');
  } finally {
    setLoadingFinal(false);
  }


  }

  async function cobrarDownload() {
    if (!perfil?.id) throw new Error('Perfil não carregado.');

    const disponiveis = Number(perfil.creditos_disponiveis ?? 0);
    const usados = Number(perfil.creditos ?? 0);

    if (disponiveis < custo) {
      throw new Error(`Saldo insuficiente. Necessitas de ${custo} crédito(s).`);
    }

    const novoDisponiveis = disponiveis - custo;
    const novoUsados = usados + custo;

    const { error } = await supabase
      .from('prod_perfis')
      .update({
        creditos_disponiveis: novoDisponiveis,
        creditos: novoUsados,
      })
      .eq('id', perfil.id);

    if (error) throw error;

    setPerfil({
      ...perfil,
      creditos_disponiveis: novoDisponiveis,
      creditos: novoUsados,
    });
  }

  async function descarregarSTLFinal() {
    if (!finalPath) {
      alert('Primeiro gera o STL final.');
      return;
    }

    setDownloading(true);
    try {
      const token = await getTokenOrRefresh(setAccessToken);
      if (!token) {
        alert('Precisas de estar autenticado para descarregar.');
        return;
      }

      await cobrarDownload();

      const { data, error } = await supabase.storage
        .from('designs-vault')
        .download(finalPath);

      if (error) throw error;
      if (!data) throw new Error('Download vazio.');

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `design_${String(produtoId)}_${Date.now()}.stl`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(e?.message ?? 'Erro no download/pagamento.');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 20 }}>
      <Link href="/dashboard">← VOLTAR</Link>

      <h2 style={{ marginTop: 20 }}>{produtoAtual.nome?.toUpperCase()}</h2>

      <h3 style={{ marginTop: 25 }}>FORMA</h3>
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
                background: ativo ? '#2563eb' : '#0f172a',
                color: 'white',
                fontWeight: 800,
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

      <button
        onClick={() => setMostrarTexto((v) => !v)}
        style={{
          width: '100%',
          marginTop: 25,
          marginBottom: 12,
          padding: 15,
          borderRadius: 8,
          border: 'none',
          background: mostrarTexto ? '#ef4444' : '#22c55e',
          color: 'white',
          fontWeight: 900,
          cursor: 'pointer',
        }}
      >
        {mostrarTexto ? 'VER PEÇA LIMPA' : 'VISUALIZAR PERSONALIZAÇÃO'}
      </button>

      <div
        style={{
          padding: 12,
          borderRadius: 10,
          border: '1px solid #334155',
          background: '#0b1220',
          color: '#cbd5e1',
          fontSize: 13,
          marginBottom: 20,
          lineHeight: 1.4,
        }}
      >
        <b>Nota:</b> a pré‑visualização é apenas aproximada do ficheiro final. Podes{' '}
        <b>gerar o STL final as vezes que quiseres</b> até ficar como queres. O{' '}
        <b>download</b> consome <b>{custo}</b> crédito(s).
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '380px 1fr',
          gap: 24,
          alignItems: 'start',
        }}
      >
        {/* PAINEL ESQUERDO COM SCROLL */}
        <aside
          style={{
            height: 'calc(100vh - 140px)',
            overflowY: 'auto',
            paddingRight: 8,
            paddingBottom: 24,
          }}
        >
          <EditorControls
            produto={produtoAtual}
            valores={valores}
            onUpdate={setValores}
          />

          {/* ✅ BOTÕES VOLTAM A APARECER */}
          <div style={{ marginTop: 20, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={gerarSTLFinal}
              disabled={loadingFinal}
              style={{ minHeight: 44 }}
            >
              {loadingFinal ? 'A GERAR STL…' : 'GERAR STL FINAL'}
            </button>

            <button
              onClick={descarregarSTLFinal}
              disabled={!finalPath || downloading}
              style={{ minHeight: 44 }}
            >
              {downloading ? 'A DESCARREGAR…' : 'DESCARREGAR STL'}
            </button>
          </div>
        </aside>

        {/* VIEWER SEMPRE VISÍVEL */}
        <main
          style={{
            position: 'sticky',
            top: 20,
            alignSelf: 'start',
          }}
        >
          <div style={{ position: 'relative' }}>
            <STLViewer
              baseStlUrl={
                viewerMode === 'final' && finalStlUrl
                  ? finalStlUrl
                  : blankUrl
              }
              nome={mostrarTexto ? String((valores as any).nome ?? '') : ''}
              telefone={mostrarTexto ? String((valores as any).telefone ?? '') : ''}
              font={String((valores as any).fonte ?? 'Aladin')}
              fontSize={Number((valores as any).fontSize ?? 10)}
              xPos={Number((valores as any).xPos ?? 0)}
              yPos={Number((valores as any).yPos ?? 0)}
              fontSizeN={Number((valores as any).fontSizeN ?? 8)}
              xPosN={Number((valores as any).xPosN ?? 0)}
              yPosN={Number((valores as any).yPosN ?? -10)}
              relevo
            />

            {viewerMode === 'loading' && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'rgba(2,6,23,0.75)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 900,
                  fontSize: 16,
                  zIndex: 10,
                }}
              >
                <div style={{ marginBottom: 10 }}>⏳ A gerar STL final…</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  Isto pode demorar alguns segundos
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <style jsx>{`
        @media (max-width: 900px) {
          div[style*='grid-template-columns: 360px 1fr'] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
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