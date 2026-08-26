'use client';

import { useRef, useState } from 'react';
import { MessageCircle, X, Send, Loader2 } from 'lucide-react';

interface Mensagem {
  role: 'user' | 'assistant';
  content: string;
}

export default function AdminAssistant() {
  const [aberto, setAberto] = useState(false);
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [input, setInput] = useState('');
  const [aEnviar, setAEnviar] = useState(false);
  const [erro, setErro] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  async function enviar() {
    const texto = input.trim();
    if (!texto || aEnviar) return;

    const historico = mensagens;
    setMensagens(prev => [...prev, { role: 'user', content: texto }, { role: 'assistant', content: '' }]);
    setInput('');
    setAEnviar(true);
    setErro('');

    try {
      const res = await fetch('/api/admin/marketing/assistente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: texto, historico }),
      });

      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Erro ao contactar o assistente.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acumulado = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acumulado += decoder.decode(value, { stream: true });
        setMensagens(prev => {
          const copia = [...prev];
          copia[copia.length - 1] = { role: 'assistant', content: acumulado };
          return copia;
        });
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
      }
    } catch (e: any) {
      setErro(e?.message ?? 'Erro desconhecido.');
      setMensagens(prev => prev.slice(0, -1));
    } finally {
      setAEnviar(false);
    }
  }

  return (
    <>
      {aberto && (
        <div style={{
          position: 'fixed', bottom: 96, right: 24, width: 360, height: 480, zIndex: 60,
          background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16,
          display: 'flex', flexDirection: 'column', boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#f1f5f9' }}>🤖 Assistente pp3d</span>
            <button onClick={() => setAberto(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {mensagens.length === 0 && (
              <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>
                Pergunta-me sobre vendas, produtos mais populares, campanhas ou o que publicar a seguir —
                respondo com base nos dados reais da loja.
              </p>
            )}
            {mensagens.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                background: m.role === 'user' ? '#1d4ed8' : '#1e293b',
                color: '#f1f5f9', borderRadius: 12, padding: '8px 12px', fontSize: 13,
                maxWidth: '85%', whiteSpace: 'pre-wrap', lineHeight: 1.45,
              }}>
                {m.content || (aEnviar && i === mensagens.length - 1 ? '…' : '')}
              </div>
            ))}
            {erro && <p style={{ fontSize: 12, color: '#f87171' }}>{erro}</p>}
          </div>

          <div style={{ padding: 12, borderTop: '1px solid #1e293b', display: 'flex', gap: 8 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
              placeholder="Pergunta ao assistente..."
              disabled={aEnviar}
              style={{ flex: 1, background: '#0a1120', border: '1px solid #1e293b', borderRadius: 8, padding: '8px 12px', color: '#f1f5f9', fontSize: 13, outline: 'none' }}
            />
            <button
              onClick={enviar}
              disabled={aEnviar || !input.trim()}
              style={{ background: '#1d4ed8', border: 'none', borderRadius: 8, width: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer', opacity: aEnviar || !input.trim() ? 0.5 : 1 }}
            >
              {aEnviar ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      )}

      <button
        onClick={() => setAberto(v => !v)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 60,
          width: 56, height: 56, borderRadius: '50%', background: '#1d4ed8', border: 'none',
          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 10px 30px rgba(29,78,216,0.5)', cursor: 'pointer',
        }}
        aria-label="Abrir assistente"
      >
        {aberto ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </>
  );
}
