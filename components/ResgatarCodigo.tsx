'use client';

import { useState } from 'react';

// Cartão "Tens um código?" do dashboard: downloads gratuitos, planos, etc.
export default function ResgatarCodigo({ onResgatado }: { onResgatado?: () => void }) {
  const [codigo, setCodigo] = useState('');
  const [aEnviar, setAEnviar] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; texto: string } | null>(null);

  async function resgatar() {
    if (!codigo.trim()) return;
    setAEnviar(true); setMsg(null);
    try {
      const res = await fetch('/api/codigos/resgatar', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo }),
      });
      const data = await res.json();
      if (data.ok) { setMsg({ ok: true, texto: data.mensagem ?? 'Código aplicado.' }); setCodigo(''); onResgatado?.(); }
      else setMsg({ ok: false, texto: data.erro ?? 'Código inválido.' });
    } catch {
      setMsg({ ok: false, texto: 'Erro de ligação. Tenta outra vez.' });
    }
    setAEnviar(false);
  }

  return (
    <div style={{ padding: '30px', background: '#1e293b', borderRadius: '20px', border: '1px solid #334155', marginTop: '20px' }}>
      <h4 style={{ margin: '0 0 8px', fontSize: '16px' }}>🎟️ Tens um código?</h4>
      <p style={{ margin: '0 0 14px', color: '#94a3b8', fontSize: '14px' }}>
        Usa-o aqui para receber downloads gratuitos ou ativar um plano. Códigos de desconto da loja usam-se ao finalizar a encomenda.
      </p>
      <div style={{ display: 'flex', gap: 10, maxWidth: 420 }}>
        <input
          value={codigo}
          onChange={e => setCodigo(e.target.value.toUpperCase())}
          onKeyDown={e => { if (e.key === 'Enter') resgatar(); }}
          placeholder="CÓDIGO"
          aria-label="Código"
          style={{ flex: 1, minWidth: 0, background: '#0f172a', border: '1px solid #334155', borderRadius: 10, padding: '10px 14px', color: '#f1f5f9', fontSize: 14, fontFamily: 'monospace', outline: 'none' }}
        />
        <button onClick={resgatar} disabled={aEnviar || !codigo.trim()}
          style={{ padding: '0 18px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: aEnviar ? 'wait' : 'pointer', opacity: !codigo.trim() ? 0.5 : 1 }}>
          {aEnviar ? '…' : 'Usar código'}
        </button>
      </div>
      {msg && <p style={{ margin: '10px 0 0', fontSize: 13, color: msg.ok ? '#34d399' : '#f87171' }}>{msg.texto}</p>}
    </div>
  );
}
