'use client';

import { useState } from 'react';

type Props = { onClose: () => void };

const inp: React.CSSProperties = {
  width: '100%', background: '#0a1120', border: '1px solid #1e293b',
  borderRadius: 8, padding: '10px 14px', color: '#f1f5f9',
  fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};
const lbl: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
};

export default function SupportModal({ onClose }: Props) {
  const [assunto,    setAssunto]    = useState('');
  const [mensagem,   setMensagem]   = useState('');
  const [prioridade, setPrioridade] = useState('media');
  const [status, setStatus] = useState<'idle'|'loading'|'ok'|'error'>('idle');
  const [erro,   setErro]   = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assunto.trim() || !mensagem.trim()) { setErro('Preenche o assunto e a mensagem.'); return; }
    setStatus('loading'); setErro('');
    try {
      const res = await fetch('/api/suporte/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assunto, mensagem, prioridade }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao enviar.');
      setStatus('ok');
    } catch (err: any) {
      setErro(err.message); setStatus('error');
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(6px)', zIndex: 100,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#0f172a', border: '1px solid #1e293b', borderRadius: 20,
        padding: 32, width: '100%', maxWidth: 480, position: 'relative',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16, background: 'none',
          border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 20,
        }}>✕</button>

        {status === 'ok' ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>Pedido enviado!</h3>
            <p style={{ color: '#64748b', margin: '0 0 24px', fontSize: 14 }}>
              Iremos responder por email assim que possível.
            </p>
            <button onClick={onClose} style={{
              padding: '12px 28px', background: '#1d4ed8', color: '#fff',
              border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>Fechar</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>Abrir pedido de suporte</h2>
            <p style={{ color: '#64748b', fontSize: 13, margin: '0 0 24px' }}>
              Descreve o problema e respondemos o mais breve possível.
            </p>

            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Assunto</label>
              <input style={inp} value={assunto} onChange={e => setAssunto(e.target.value)}
                placeholder="Ex: Erro ao gerar STL" maxLength={120} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={lbl}>Descrição</label>
              <textarea style={{ ...inp, height: 120, resize: 'vertical' }}
                value={mensagem} onChange={e => setMensagem(e.target.value)}
                placeholder="Explica o que aconteceu, em que produto, que erro viste..." maxLength={1000} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={lbl}>Prioridade</label>
              <select style={inp} value={prioridade} onChange={e => setPrioridade(e.target.value)}>
                <option value="baixa">Baixa — dúvida geral</option>
                <option value="media">Média — problema funcional</option>
                <option value="alta">Alta — não consigo usar a plataforma</option>
              </select>
            </div>

            {erro && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{erro}</p>}

            <button type="submit" disabled={status === 'loading'} style={{
              width: '100%', padding: '14px', background: status === 'loading' ? '#1e293b' : '#1d4ed8',
              color: '#fff', border: 'none', borderRadius: 10, fontSize: 15,
              fontWeight: 700, cursor: status === 'loading' ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}>
              {status === 'loading' ? 'A enviar…' : 'Enviar pedido'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
