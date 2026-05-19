'use client';

import { useState } from 'react';

type Props = {
  designId: string;
  params: Record<string, any>;
  onSuccess?: () => void;
};

export default function DownloadStlButton({ designId, params, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload() {
    setError(null);
    setLoading(true);
    try {
      const refreshResp = await fetch('/api/auth/refresh', { method: 'POST' });
      if (!refreshResp.ok) throw new Error('É necessário estar autenticado.');
      const { access_token } = await refreshResp.json();
      if (!access_token) throw new Error('É necessário estar autenticado.');

      const res = await fetch('/api/download-stl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${access_token}` },
        body: JSON.stringify({ design_id: designId, params }),
      });

      if (res.status === 402) {
        const text = await res.text();
        if (text === 'DOWNLOAD_LIMIT_REACHED') throw new Error('Limite de downloads mensais atingido. Faz upgrade do teu plano.');
        throw new Error('Não tens acesso a este download.');
      }
      if (!res.ok) throw new Error(await res.text() || 'Erro ao gerar o download.');

      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition');
      let filename = blob.type.includes('zip') ? `${designId}.zip` : `${designId}.stl`;
      if (disposition) {
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match?.[1]) filename = match[1].replace(/['"]/g, '');
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setDone(true);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Erro inesperado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <button
        onClick={handleDownload}
        disabled={loading || done}
        style={{
          padding: '12px 16px', borderRadius: 10,
          border: done ? '1px solid #34d399' : '1px solid #334155',
          background: done ? 'rgba(52,211,153,0.1)' : '#0f172a',
          color: done ? '#34d399' : '#e2e8f0',
          fontWeight: 700, fontSize: 14,
          cursor: (loading || done) ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          transition: 'all 0.2s',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          width: '100%', fontFamily: 'inherit',
        }}
      >
        {loading ? (<><Spinner />A preparar download…</>) : done ? '✅ Download concluído!' : (<><DownloadIcon />Download STL</>)}
      </button>
      {error && <p style={{ margin: 0, color: '#f87171', fontSize: 12, textAlign: 'center' }}>{error}</p>}
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 1v9M4 7l3.5 3.5L11 7M2 13h11" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
      <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.5" strokeDasharray="20" strokeDashoffset="10" strokeLinecap="round"/>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
