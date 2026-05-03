'use client';

import { useState } from 'react';

type PreviewPayload = {
  design_id: string;
  params: Record<string, any>;
};

export default function CustomizadorClient() {
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function gerarPreview() {
    setLoading(true);
    setError(null);
    setPreviewUrl(null);

    const payload: PreviewPayload = {
      design_id: 'caixa-exemplo',
      params: {
        largura: 80,
        altura: 50,
        profundidade: 40,
        tem_tampa: true,
      },
    };

    try {
      const res = await fetch('/api/gerar-stl-pro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Erro HTTP ${res.status}`);
      }

      // ✅ O preview NÃO é JSON – é imagem/binário
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
    } catch (err: any) {
      console.error(err);
      setError('Erro ao gerar preview');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={gerarPreview}
        disabled={loading}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? 'A gerar preview…' : 'Gerar STL'}
      </button>

      {error && (
        <div className="text-red-500">
          {error}
        </div>
      )}

      {previewUrl && (
        <div className="mt-4">
          <p className="mb-2">Preview:</p>
          <img
            src={previewUrl}
            alt="Preview STL"
            className="max-w-full rounded border"
          />
        </div>
      )}
    </div>
  );
}