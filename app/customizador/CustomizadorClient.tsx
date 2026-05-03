'use client';

import { useState } from 'react';
import GeneratedEditor from '@/components/GeneratedEditor';
import STLViewer from '@/components/STLViewer';
import { createClient } from '@/lib/supabase/client';
import DownloadStlButton from '@/components/DownloadStlButton';

type Produto = {
  id: string;
  nome: string;
  generation_schema: any;
};

type Props = {
  produto: Produto;
};

export default function CustomizadorClient({ produto }: Props) {
  const supabase = createClient();
  const schema = produto.generation_schema;

  const [values, setValues] = useState<Record<string, any>>(() => {
    const init: Record<string, any> = {};
    Object.entries(schema.parameters).forEach(([k, def]: any) => {
      init[k] = def.default;
    });
    return init;
  });

  const [loading, setLoading] = useState(false);
  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function gerarSTL() {
    setLoading(true);
    setError(null);

    try {
      // obter sessão
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Precisas de estar autenticado para gerar STL.');
      }

      const res = await fetch('/api/gerar-stl-pro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          design_id: produto.id,
          params: values,
        }),
      });

      /*
        ✅ CORREÇÃO CRÍTICA E FINAL
        Só tentamos ler JSON se o backend declará-lo explicitamente.
      */
      const contentType = res.headers.get('content-type') || '';

      if (!contentType.includes('application/json')) {
        const text = await res.text();
        throw new Error(text || 'Resposta inesperada do backend.');
      }

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Erro ao gerar STL.');
      }

      if (!json.url) {
        throw new Error('Backend não devolveu URL do STL.');
      }

      // ✅ URL temporário para visualização
      setStlUrl(json.url);
    } catch (err: any) {
      setError(err.message || 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '380px 1fr',
        gap: 32,
        alignItems: 'start',
      }}
    >
      {/* COLUNA ESQUERDA — PARÂMETROS */}
      <div>
        <GeneratedEditor
          schema={schema}
          values={values}
          onChange={setValues}
        />

        {error && (
          <p style={{ color: '#f87171', marginTop: 12 }}>
            {error}
          </p>
        )}

        <div style={{ marginTop: 24 }}>
          <button
            onClick={gerarSTL}
            disabled={loading}
            style={{
              padding: '10px 18px',
              borderRadius: 8,
              border: '1px solid #3b82f6',
              background: loading ? '#020617' : '#000',
              color: '#3b82f6',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'A gerar…' : 'Gerar STL'}
          </button>
        </div>
      </div>

      {/* COLUNA DIREITA — STL VIEWER */}
      <div
        style={{
          height: 480,
          border: '1px dashed #334155',
          borderRadius: 12,
          background: '#020617',
        }}
      >
        
      {stlUrl ? (
        <>
          <STLViewer
            stlUrl={stlUrl}
            state={loading ? 'generating' : 'ready'}
          />

          <div style={{ marginTop: 16 }}>
            <DownloadStlButton
              designId={produto.id}
              params={values}
              disabled={loading}
            />
          </div>
        </>
      ) : (
        <p>Gere o STL para visualizar o modelo</p>
      )}

      </div>
    </div>
  );
}