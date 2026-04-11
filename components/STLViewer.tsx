'use client';

import { useState } from 'react';
import { gerarStl } from '@/lib/api';
import { supabase } from '@/lib/supabaseClient';

type STLViewerProps = {
  produto: {
    id: string;           // ex: "pet_tag_01"
    nome?: string;        // opcional
  };
  valores: Record<string, string | number | boolean>;
};

export default function STLViewer({ produto, valores }: STLViewerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      // 1️⃣ Chamar backend com produto.id
      const result = await gerarStl(produto.id, valores);

      const storagePath = result.storagePath;

      // 2️⃣ Download directo do bucket privado
      const { data, error } = await supabase
        .storage
        .from('designs-vault')
        .download(storagePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${produto.id}.stl`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={handleGenerate} disabled={loading}>
        {loading ? 'A gerar STL…' : 'Gerar STL'}
      </button>

      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}