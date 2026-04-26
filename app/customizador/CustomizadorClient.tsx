'use client';

import { useState } from 'react';
import GeneratedEditor from '@/components/GeneratedEditor';

type Props = {
  produto: {
    id: string;
    nome: string;
    generation_schema: any;
  };
};

export default function CustomizadorClient({ produto }: Props) {
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
      const res = await fetch('/gerar-stl-pro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
    <div>
      <h1>{produto.nome}</h1>

      <GeneratedEditor
        schema={schema}
        values={values}
        onChange={setValues}
      />

      <button onClick={gerarSTL} disabled={loading}>
        {loading ? 'A gerar…' : 'Gerar STL'}
      </button>
    </div>
  );
}