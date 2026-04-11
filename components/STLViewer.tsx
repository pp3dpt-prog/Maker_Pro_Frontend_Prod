'use client';

import { useState } from 'react';
import { gerarStl } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';

/**
 * Modo 1: STLViewer gera STL a partir de um produto (customizador)
 */
type STLViewerProdutoMode = {
  produto: {
    id: string;
    nome?: string;
  };
  valores: Record<string, string | number | boolean>;
  url?: never;
};

/**
 * Modo 2: STLViewer apenas faz preview/download de um STL existente
 */
type STLViewerUrlMode = {
  url: string;
  valores?: Record<string, string | number | boolean>;
  produto?: never;
};

type STLViewerProps = STLViewerProdutoMode | STLViewerUrlMode;

export default function STLViewer(props: STLViewerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerateOrDownload() {
    setLoading(true);
    setError(null);

    try {
      // ─────────────────────────────────────────
      // MODO URL → apenas download
      // ─────────────────────────────────────────
      if ('url' in props) {
        const response = await fetch(props.url);
        if (!response.ok) {
          throw new Error('Erro ao descarregar STL');
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = 'modelo.stl';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);

        return;
      }

      // ─────────────────────────────────────────
      // MODO PRODUTO → gerar STL
      // ─────────────────────────────────────────
      const result = await gerarStl(props.produto.id, props.valores);
      const storagePath = result.storagePath;

      const { data, error } = await supabase
        .storage
        .from('designs-vault')
        .download(storagePath);

      if (error) throw error;

      const objectUrl = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `${props.produto.id}.stl`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={handleGenerateOrDownload} disabled={loading}>
        {loading ? 'A processar…' : 'Obter STL'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}