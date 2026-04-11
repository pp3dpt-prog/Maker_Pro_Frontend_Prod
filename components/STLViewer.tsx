'use client';

import { useState } from 'react';
import { gerarStl } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';

type STLViewerProdutoMode = {
  mode: 'produto';
  produto: {
    id: string;
    nome?: string;
  };
  valores: Record<string, string | number | boolean>;
};

type STLViewerStorageMode = {
  mode: 'storage';
  storagePath: string;
};

type STLViewerProps = STLViewerProdutoMode | STLViewerStorageMode;

export default function STLViewer(props: STLViewerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);

    try {
      let path: string;

      if (props.mode === 'storage') {
        path = props.storagePath;
      } else {
        const result = await gerarStl(props.produto.id, props.valores);
        path = result.storagePath;
      }

      const { data, error } = await supabase
        .storage
        .from('designs-vault')
        .download(path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'modelo.stl';
      a.click();
      URL.revokeObjectURL(url);

    } catch (err: any) {
      setError(err.message || 'Erro ao obter STL');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={handleClick} disabled={loading}>
        {loading ? 'A processar…' : 'Obter STL'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}