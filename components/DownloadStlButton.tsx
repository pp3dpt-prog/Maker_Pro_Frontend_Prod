'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Props = {
  designId: string;
  params: Record<string, any>;
  creditCost: number;
  creditsAvailable: number;
  onSuccess?: (novosCreditos: number) => void;
};

export default function DownloadStlButton({
  designId,
  params,
  creditCost,
  creditsAvailable,
  onSuccess,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFree = !creditCost || creditCost === 0;
  const canDownload = isFree || creditsAvailable >= creditCost;

  async function handleDownload() {
    setError(null);
    setLoading(true);


    try {
      // 1. Obter token via servidor (evita onAuthStateChange que bloqueia o fluxo)
      const refreshResp = await fetch('/api/auth/refresh', { method: 'POST' });
      if (!refreshResp.ok) throw new Error('É necessário estar autenticado.');
      const { access_token, user_id: userId } = await refreshResp.json();
      if (!access_token) throw new Error('É necessário estar autenticado.');

      // 2. Verificar créditos (double-check no cliente antes de chamar o backend)
      if (!isFree && creditsAvailable < creditCost) {
        throw new Error(`Créditos insuficientes. Precisas de ${creditCost} ₡.`);
      }

      // 3. Chamar o backend para gerar e descarregar o STL (ou ZIP)
      const res = await fetch('/api/download-stl', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        },
        body: JSON.stringify({ design_id: designId, params }),
      });

      if (res.status === 402) {
        throw new Error('Créditos insuficientes.');
      }
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Erro ao gerar o download.');
      }

      // 4. Extrair o blob (STL ou ZIP)
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition');
      let filename = blob.type.includes('zip') ? `${designId}.zip` : `${designId}.stl`;
      if (disposition) {
        const match = disposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (match?.[1]) filename = match[1].replace(/['"]/g, '');
      }

      // 5. Guardar no Supabase Storage (área privada do utilizador)
      const storagePath = `${userId}/${filename}`;
      await supabase.storage
        .from('user-stls')           // bucket privado — cria-o no Supabase se não existir
        .upload(storagePath, blob, {
          contentType: blob.type || 'application/octet-stream',
          upsert: true,              // substitui se já existir com o mesmo nome
        });
      // Nota: se o upload falhar não bloqueamos o download — é best-effort

      // 6. Se tem custo: debitar créditos + registar transação
      let novosCreditos = creditsAvailable;
      if (!isFree) {
        const { data: perfilAtualizado } = await supabase
          .from('prod_perfis')
          .update({ creditos_disponiveis: creditsAvailable - creditCost })
          .eq('id', userId)
          .select('creditos_disponiveis')
          .single();

        if (perfilAtualizado) {
          novosCreditos = perfilAtualizado.creditos_disponiveis;
        }

        // Registar transação negativa
        await supabase.from('prod_transacoes').insert({
          user_id: userId,
          descricao: `Download: ${filename}`,
          creditos_alterados: -creditCost,
        });
      }

      // 7. Incrementar total_downloads no design
      await supabase.rpc('increment_downloads', { design_id: designId });
      // (cria esta função no Supabase — ver migration abaixo)

      // 8. Disparar download no browser
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);

      setDone(true);
      onSuccess?.(novosCreditos);

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
        disabled={!canDownload || loading || done}
        style={{
          padding: '12px 16px',
          borderRadius: 10,
          border: done
            ? '1px solid #34d399'
            : canDownload
              ? '1px solid #334155'
              : '1px solid rgba(248,113,113,0.4)',
          background: done
            ? 'rgba(52,211,153,0.1)'
            : canDownload
              ? '#0f172a'
              : 'rgba(248,113,113,0.06)',
          color: done
            ? '#34d399'
            : canDownload
              ? '#e2e8f0'
              : '#f87171',
          fontWeight: 700,
          fontSize: 14,
          cursor: (!canDownload || loading || done) ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          width: '100%',
          fontFamily: 'inherit',
        }}
      >
        {loading ? (
          <>
            <Spinner />
            A preparar download…
          </>
        ) : done ? (
          '✅ Download concluído!'
        ) : !canDownload ? (
          `⚠️ Créditos insuficientes`
        ) : (
          <>
            <DownloadIcon />
            {isFree ? 'Download gratuito' : `Download (${creditCost} ₡)`}
          </>
        )}
      </button>

      {error && (
        <p style={{ margin: 0, color: '#f87171', fontSize: 12, textAlign: 'center' }}>
          {error}
        </p>
      )}

      {done && (
        <p style={{ margin: 0, color: '#64748b', fontSize: 11, textAlign: 'center' }}>
          Ficheiro guardado na tua área privada.
        </p>
      )}
    </div>
  );
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <path d="M7.5 1v9M4 7l3.5 3.5L11 7M2 13h11"
        stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function Spinner() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none"
      style={{ animation: 'spin 0.8s linear infinite' }}>
      <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.5"
        strokeDasharray="20" strokeDashoffset="10" strokeLinecap="round"/>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
