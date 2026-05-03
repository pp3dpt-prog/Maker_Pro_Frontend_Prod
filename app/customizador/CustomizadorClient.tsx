'use client';

import { useEffect, useState } from 'react';

/* ============================
   Tipos
============================ */
type ParamSchema = {
  label: string;
  tipo: 'number' | 'boolean';
  default: number | boolean;
  min?: number;
  max?: number;
  step?: number;
};

type Produto = {
  id: string;
  nome: string;
  generation_schema: {
    params: Record<string, ParamSchema>;
  };
};

type Props = {
  produto: Produto;
};

/* ============================
   Componente
============================ */
export default function CustomizadorClient({ produto }: Props) {
  const [params, setParams] = useState<Record<string, number | boolean>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ============================
     Defaults do schema
  ============================ */
  useEffect(() => {
    const initial: Record<string, number | boolean> = {};
    Object.entries(produto.generation_schema.params).forEach(
      ([key, schema]) => {
        initial[key] = schema.default;
      }
    );
    setParams(initial);
  }, [produto]);

  /* ============================
     Atualizar parâmetro (CORRETO)
  ============================ */
  function updateParam(key: string, value: number | boolean) {
    setParams(prev => ({
      ...prev,
      [key]: value,
    }));
  }

  /* ============================
     Gerar preview
  ============================ */
  async function gerarPreview() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/gerar-stl-pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          design_id: produto.id,
          params,
        }),
      });

      if (!res.ok) {
        throw new Error(`Erro ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (e) {
      console.error(e);
      setError('Erro ao gerar preview');
    } finally {
      setLoading(false);
    }
  }

  /* ============================
     Render
  ============================ */
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
      {/* Configuração */}
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">{produto.nome}</h1>
          <p className="text-sm opacity-70 mt-1">
            Configure as dimensões e opções antes de gerar o ficheiro STL.
          </p>
        </div>

        {Object.entries(produto.generation_schema.params).map(
          ([key, schema]) => (
            <div key={key} className="space-y-2">
              <label className="text-sm font-medium block">
                {schema.label}
              </label>

              {schema.tipo === 'number' && (
                <input
                  type="range"
                  min={schema.min}
                  max={schema.max}
                  step={schema.step ?? 1}
                  value={params[key] as number}
                  onChange={e =>
                    updateParam(key, Number(e.target.value))
                  }
                  className="w-full"
                />
              )}

              {schema.tipo === 'boolean' && (
                <input
                  type="checkbox"
                  checked={params[key] as boolean}
                  onChange={e =>
                    updateParam(key, e.target.checked)
                  }
                />
              )}

              <div className="text-xs opacity-60">
                Valor: {String(params[key])}
              </div>
            </div>
          )
        )}

        <button
          type="button"
          onClick={gerarPreview}
          disabled={loading}
          className="w-full bg-white text-black font-semibold py-2 rounded disabled:opacity-50"
        >
          {loading ? 'A gerar preview…' : 'Gerar STL'}
        </button>

        {error && (
          <div className="text-red-500 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Preview */}
      <div className="flex items-center justify-center bg-neutral-900 rounded-lg min-h-[320px]">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Preview STL"
            className="max-w-full max-h-full object-contain"
          />
        ) : (
          <div className="text-sm opacity-50">
            Preview aparecerá aqui
          </div>
        )}
      </div>
    </div>
  );
}