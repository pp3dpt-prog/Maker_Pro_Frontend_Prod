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
  parametros_default?: Record<string, any>;
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
      if (!familiaURL) {
        setLoading(false);
        return;
      }

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

      <h2 style={{ marginTop: 20 }}>
        {produtoAtual.nome?.toUpperCase()}
      </h2>

      {/* ✅ SELETOR DE FORMAS (JSX CORRECTO) */}
      <h3 style={{ marginTop: 25 }}>FORMA</h3>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {modelos.map((item) => {
          const ativo = String(item.id) === String(produtoAtual.id);
          return (
            <Link
              key={String(item.id)}
              href={`/customizador?id=${item.id}&familia=${familiaURL}`}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                background: ativo ? '#2563eb' : '#0f172a',
                color: 'white',
                fontWeight: 800,
                textDecoration: 'none',
                border: '1px solid #334155',
              }}
            >
              {String(item.nome ?? '')
                .replace(/(Pet Tag - |Caixa Paramétrica - )/gi, '')
                .toUpperCase()}
            </Link>
          );
        })}
      </div>

      {/* ✅ BOTÃO MOSTRAR / OCULTAR TEXTO (como estava antes) */}
      <button
        onClick={() => setMostrarTexto((v) => !v)}
        style={{
          width: '100%',
          marginTop: 20,
          marginBottom: 20,
          padding: 15,
          borderRadius: 10,
          border: 'none',
          background: mostrarTexto ? '#ef4444' : '#22c55e',
          color: 'white',
          fontWeight: 900,
          cursor: 'pointer',
        }}
      >
        {mostrarTexto ? 'VER PEÇA LIMPA' : 'VISUALIZAR PERSONALIZAÇÃO'}
      </button>

      {/* ✅ LAYOUT LATERAL */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '360px 1fr',
          gap: 24,
          alignItems: 'start',
        }}
      >
        <aside>
          <EditorControls
            produto={produtoAtual}
            valores={valores}
            onUpdate={setValores}
          />
        </aside>

        <main>
          <STLViewer
            baseStlUrl={blankUrl}
            // ✅ Mostra texto só quando o botão está activo
            nome={mostrarTexto ? String(valores.nome_pet ?? valores.nome ?? '') : ''}
            telefone={mostrarTexto ? String(valores.telefone ?? '') : ''}
            font={String(valores.fonte ?? 'Open Sans')}
            fontSize={Number(valores.fontSize ?? 7)}
            xPos={Number(valores.xPos ?? 0)}
            yPos={Number(valores.yPos ?? 0)}
            relevo={true}
          />
        </main>
      </div>

      {/* Responsivo simples */}
      <style jsx>{`
        @media (max-width: 900px) {
          div[style*="grid-template-columns: 360px 1fr"] {
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
