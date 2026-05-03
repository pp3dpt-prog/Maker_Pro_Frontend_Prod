'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  designId: string;
  params: Record<string, any>;
  disabled?: boolean;
};

export default function DownloadStlButton({
  designId,
  params,
  disabled = false,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setError(null);
    setLoading(true);

    try {
      // Obter token da sessão
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error('É necessário estar autenticado.');
      }

      // Chamar o backend
      const res = await fetch('/api/download-stl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          design_id: designId,
          params,
        }),
      });

      if (res.status === 402) {
        throw new Error('Créditos insuficientes para este download.');
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Erro ao gerar o download.');
      }

      // Extrair nome do ficheiro
      const disposition = res.headers.get('Content-Disposition');
      let filename = 'download.stl';

      if (disposition) {
        const match = disposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }

      // Fazer download do ficheiro (STL ou ZIP)
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();

      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleDownload}
        disabled={disabled || loading}
        style={{
          padding: '10px 16px',
          borderRadius: 10,
          border: '1px solid #334155',
          background: loading ? '#020617' : '#0f172a',
          color: '#e5e7eb',
          fontWeight: 'bold',
          cursor: loading || disabled ? 'not-allowed' : 'pointer',
          opacity: loading || disabled ? 0.6 : 1,
        }}
      >
        {loading ? 'A gerar download…' : '⬇️ Download STL'}
      </button>

      {error && (
        <p style={{ marginTop: 8, color: '#f87171', fontSize: 13 }}>
          {error}
        </p>
      )}
    </div>
  );
}