'use client';

import { useState } from 'react';
import GeneratedEditor from '@/components/GeneratedEditor';
import Preview3D from './Preview3D';
import { createClient } from '@/lib/supabase/client';

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

  async function gerarSTL() {
    setLoading(true);

    try {
      // ✅ Obter sessão autenticada
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        alert('Precisas de estar autenticado para gerar STL.');
        return;
      }

      // ✅ Enviar token no header Authorization
      const res = await fetch('/api/gerar-stl-pro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: produto.id,
          mode: 'final',
          params: values,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Erro ao gerar STL');
      }

      alert('STL gerado com sucesso');
    } catch (err: any) {
      alert(err.message || 'Erro inesperado');
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

      {/* COLUNA DIREITA — PREVIEW 3D */}
      <div
        style={{
          height: 420,
          border: '1px dashed #334155',
          borderRadius: 12,
          background: '#020617',
        }}
      >
        <Preview3D
          largura={values.largura}
          altura={values.altura}
          comprimento={values.comprimento}
          espessura={values.espessura}
        />
      </div>
    </div>
  );
}