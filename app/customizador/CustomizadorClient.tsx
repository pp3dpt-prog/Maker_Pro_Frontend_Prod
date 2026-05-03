'use client';

import { useEffect, useState } from 'react';

// -----------------------------
// Tipos
// -----------------------------
type ParamSchema = {
  label: string;
  min?: number;
  max?: number;
  step?: number;
  default: number | boolean;
  tipo: 'number' | 'boolean';
};

type Produto = {
  id: string;
  nome: string;
  generation_schema: {
    params: Record<string, ParamSchema>;
  };
};

type CustomizadorClientProps = {
  produto: Produto;
};

// -----------------------------
// Componente
// -----------------------------
export default function CustomizadorClient({
  produto,
}: CustomizadorClientProps) {
  const [params, setParams] = useState<Record<string, number | boolean>>({});
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -----------------------------
  // Inicializar valores default
  // -----------------------------
  useEffect(() => {
    const defaults: Record<string, number | boolean> = {};

    for (const [key, schema] of Object.entries(
      produto.generation_schema.params
    )) {
      defaults[key] = schema.default;
    }

    setParams(defaults);
  }, [produto]);

  // -----------------------------
  // Atualizar parametro
  // -----------------------------
  function updateParam(key: string, value: number | boolean) {
    setParams(prev => ({ ...prev, [key]: value }));
  }

  // -----------------------------
  // Gerar preview (API proxy)
  // -----------------------------
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

  // -----------------------------
  // Render
  // -----------------------------
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      {/* -----------------------------
           Painel de configuração
         ----------------------------- */}
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">
          {produto.nome}
        </h1>

        <p className="text-sm opacity-70">
          Configure as dimensões e opções do produto antes de gerar o ficheiro STL.
        </p>

        {/* Sliders dinâmicos */}
        {Object.entries(produto.generation_schema.params).map(
          ([key, schema]) => (
            <div key={key} className="space-y-2">
              <label className="block text-sm font-medium">
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
          className="w-full rounded bg-white text-black py-2 font-semibold disabled:opacity-50"
        >
          {loading ? 'A gerar…' : 'Gerar STL'}
        </button>

        {error && (
          <div className="text-red-500 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* -----------------------------
           Painel de preview
         ----------------------------- */}
      <div className="bg-neutral-900 rounded-lg flex items-center justify-center">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt="Preview STL"
            className="max-w-full max-h-[600px]"
          />
        ) : (
          <div className="opacity-50 text-sm">
            Preview aparecerá aqui
          </div>
        )}
      </div>
    </div>
  );
}