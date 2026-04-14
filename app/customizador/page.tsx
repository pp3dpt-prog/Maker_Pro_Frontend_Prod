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
  creditos: number; // usados
  creditos_disponiveis: number; // saldo
} | null;

/**
 * ✅ Envia para o backend apenas:
 * - chaves que existam no ui_schema (whitelist)
 * - valores primitvos (string/number/boolean)
 * Isto evita “Tipo inválido em options” (arrays/objects são removidos). [1](https://amplifon-my.sharepoint.com/personal/pedro_pomar_amplifon_com/Documents/Ficheiros%20do%20Microsoft%20Copilot%20Chat/page.tsx)
 */
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

function CustomizadorClient() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const familiaURL = searchParams.get('familia');

  const [loading, setLoading] = useState(true);
  const [produtoAtual, setProdutoAtual] = useState<ProdutoAtual | null>(null);
  const [modelos, setModelos] = useState<any[]>([]);
  const [valores, setValores] = useState<ValoresProduto>({});
  const [mostrarTexto, setMostrarTexto] = useState(false);

  // Perfil e créditos
  const [perfil, setPerfil] = useState<Perfil>(null);

  // ✅ Sessão/token (para evitar falsos “não estás logado”)
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // STL final
  const [finalPath, setFinalPath] = useState<string | null>(null);
  const [loadingFinal, setLoadingFinal] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const custo = useMemo(() => {
    const c = Number(produtoAtual?.custo_creditos ?? 1);
    return Number.isFinite(c) && c > 0 ? c : 1;
  }, [produtoAtual?.custo_creditos]);

  // ✅ Inicializa token e mantém sincronizado
  useEffect(() => {
    let unsub: (() => void) | null = null;

    (async () => {
      const { data } = await supabase.auth.getSession();
      setAccessToken(data?.session?.access_token ?? null);

      const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
        setAccessToken(session?.access_token ?? null);
      });

      unsub = () => sub.subscription.unsubscribe();
    })();

    return () => {
      if (unsub) unsub();
    };
  }, []);

  useEffect(() => {
    async function fetchData() {
      if (!familiaURL) {
        setLoading(false);
        return;
      }

      // Designs / Modelos
      const { data, error } = await supabase
        .from('prod_designs')
        .select('*')
        .eq('familia', familiaURL);

      if (error) {
        console.error('Erro prod_designs:', error);
        setLoading(false);
        return;
      }

      if (data && data.length > 0) {
        setModelos(data);
        const selecionado = id
          ? data.find((d) => String(d.id) === String(id))
          : data[0];
        setProdutoAtual(selecionado ?? data[0]);
      }

      // Perfil (se autenticado)
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
  }, [id, familiaURL]);

  if (loading) return <div>Iniciando…</div>;
  if (!produtoAtual) return <div>Produto não encontrado.</div>;

  // ✅ Congelar id (evita TS vermelho em handlers)
  const produtoId = produtoAtual.id;

  // ✅ whitelist de params permitidos (vem do ui_schema)
  const allowedKeys = useMemo(() => {
    const s = new Set<string>();
    for (const f of produtoAtual.ui_schema ?? []) {
      if (f?.name && typeof f.name === 'string') s.add(f.name);
    }
    return s;
  }, [produtoAtual.ui_schema]);

  // blanks (mantém)
  const blankMap: Record<string, string> = {
    'tag-redonda': '/models/blank_redondo.stl',
    'tag-osso': '/models/blank_osso.stl',
    'tag-coracao': '/models/blank_coracao.stl',
    'tag-hexagono': '/models/blank_hexagono.stl',
  };

  const blankUrl = blankMap[String(produtoAtual.id)] ?? '/models/blank_redondo.stl';

  async function gerarSTLFinal() {
    setLoadingFinal(true);
    try {
      // mantém a regra: precisa estar logado para gerar
      let token = accessToken;
      if (!token) {
        const { data } = await supabase.auth.getSession();
        token = data?.session?.access_token ?? null;
        setAccessToken(token);
      }

      if (!token) {
        alert('Sessão não disponível neste momento. Faz refresh à página ou faz logout/login.');
        return;
      }

      // ✅ FILTRO: remove arrays/objects (ex.: options)
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

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error ?? 'Erro ao gerar STL final.');
        return;
      }

      if (!data.storagePath) {
        alert('Servidor não devolveu storagePath.');
        return;
      }

      setFinalPath(data.storagePath);
      alert('STL final gerado. Podes gerar novamente as vezes que quiseres.');
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
      // aqui sim: tem mesmo de estar logado
      let token = accessToken;
      if (!token) {
        const { data } = await supabase.auth.getSession();
        token = data?.session?.access_token ?? null;
        setAccessToken(token);
      }
      if (!token) {
        alert('Precisas de estar autenticado para descarregar.');
        return;
      }

      // cobra só no download
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
        <b>Nota:</b> a pré‑visualização é apenas aproximada do ficheiro final.
        Podes <b>gerar o STL final as vezes que quiseres</b> até ficar como queres.
        O <b>download</b> consome <b>{custo}</b> crédito(s).
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '360px 1fr',
          gap: 24,
          alignItems: 'start',
        }}
      >
        <aside>
          <EditorControls produto={produtoAtual} valores={valores} onUpdate={setValores} />

          <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #334155' }}>
            <div style={{ fontSize: 13, color: '#cbd5e1', marginBottom: 10 }}>
              <b>Saldo:</b> {perfil ? perfil.creditos_disponiveis : '—'}{' '}
              <b>Usados:</b> {perfil ? perfil.creditos : '—'}
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                onClick={gerarSTLFinal}
                disabled={loadingFinal}
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: 'none',
                  background: '#3b82f6',
                  color: 'white',
                  fontWeight: 900,
                  cursor: 'pointer',
                  minHeight: 44,
                }}
              >
                {loadingFinal ? 'A GERAR STL FINAL…' : 'GERAR STL FINAL'}
              </button>

              <button
                onClick={descarregarSTLFinal}
                disabled={!finalPath || downloading}
                style={{
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: 'none',
                  background: finalPath ? '#10b981' : '#334155',
                  color: 'white',
                  fontWeight: 900,
                  cursor: finalPath ? 'pointer' : 'not-allowed',
                  minHeight: 44,
                }}
                title={!finalPath ? 'Gera primeiro o STL final.' : ''}
              >
                {downloading ? 'A DESCARREGAR…' : `DESCARREGAR STL (-${custo})`}
              </button>
            </div>

            {finalPath && (
              <div style={{ marginTop: 10, fontSize: 12, color: '#94a3b8' }}>
                STL final pronto: <code>{finalPath}</code>
              </div>
            )}
          </div>
        </aside>

        <main>
          <STLViewer
            baseStlUrl={blankUrl}
            nome={mostrarTexto ? String((valores as any).nome ?? '') : ''}
            telefone={mostrarTexto ? String((valores as any).telefone ?? '') : ''}
            font={String((valores as any).fonte ?? 'Aladin')}
            fontSize={Number((valores as any).fontSize ?? 10)}
            xPos={Number((valores as any).xPos ?? 0)}
            yPos={Number((valores as any).yPos ?? 0)}
            fontSizeN={Number((valores as any).fontSizeN ?? 8)}
            xPosN={Number((valores as any).xPosN ?? 0)}
            yPosN={Number((valores as any).yPosN ?? -10)}
            relevo={true}
          />
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