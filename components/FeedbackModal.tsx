'use client';
import { useState } from 'react';
import StarRating from './StarRating';

type Props = { onClose: () => void };

const inp: React.CSSProperties = {
  width: '100%', background: '#0a1120', border: '1px solid #1e293b',
  borderRadius: 8, padding: '10px 14px', color: '#f1f5f9',
  fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};
const label: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: '#8a96aa',
  textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6,
};

export default function FeedbackModal({ onClose }: Props) {
  const [nome, setNome] = useState('');
  const [avaliacao, setAvaliacao] = useState(0);
  const [mensagem, setMensagem] = useState('');
  const [metodo, setMetodo] = useState<'nenhum' | 'email' | 'whatsapp'>('nenhum');
  const [contacto, setContacto] = useState('');
  const [aceitaContacto, setAceitaContacto] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [erro, setErro] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mensagem.trim()) { setErro('Escreve a tua mensagem.'); return; }
    if (metodo !== 'nenhum' && contacto.trim() && !aceitaContacto) {
      setErro('Confirma que aceitas ser contactado, ou deixa o contacto em branco.');
      return;
    }
    setStatus('loading'); setErro('');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome, avaliacao: avaliacao || null, mensagem,
          contacto_metodo: metodo === 'nenhum' ? null : metodo,
          contacto_valor: metodo === 'nenhum' ? null : contacto,
          aceita_contacto: metodo !== 'nenhum' && aceitaContacto,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro.');
      setStatus('ok');
    } catch (err: any) { setErro(err.message); setStatus('error'); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 20, padding: 32, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#8a96aa', cursor: 'pointer', fontSize: 20 }}>✕</button>

        {status === 'ok' ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🙏</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>Obrigado!</h3>
            <p style={{ color: '#8a96aa', fontSize: 14, margin: '0 0 24px' }}>
              Recebemos a tua mensagem — vamos rever e, se precisares de resposta, entramos em contacto.
            </p>
            <button onClick={onClose} style={{ padding: '12px 28px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Fechar</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>Deixa o teu feedback</h2>
            <p style={{ color: '#8a96aa', fontSize: 13, margin: '0 0 24px' }}>
              Compraste, falaste connosco, ou só queres dar uma opinião? Conta-nos — lemos tudo.
            </p>

            <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <StarRating value={avaliacao} onChange={setAvaliacao} size={32} />
              <span style={{ fontSize: 12, color: '#8a96aa' }}>Avaliação (opcional)</span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label} htmlFor="fb-nome">O teu nome (opcional)</label>
              <input id="fb-nome" style={inp} value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Pedro" maxLength={60} />
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={label} htmlFor="fb-mensagem">Mensagem *</label>
              <textarea id="fb-mensagem" style={{ ...inp, height: 90, resize: 'vertical' }}
                value={mensagem} onChange={e => setMensagem(e.target.value)}
                placeholder="O que gostaste? O que podemos melhorar?" maxLength={1000} required />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={label}>Queres resposta? (opcional)</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {(['nenhum', 'email', 'whatsapp'] as const).map(m => (
                  <button key={m} type="button" onClick={() => { setMetodo(m); if (m === 'nenhum') { setContacto(''); setAceitaContacto(false); } }}
                    style={{
                      flex: 1, padding: '9px 8px', borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      background: metodo === m ? '#1d4ed8' : '#0a1120',
                      color: metodo === m ? '#fff' : '#94a3b8',
                      border: `1px solid ${metodo === m ? '#1d4ed8' : '#1e293b'}`,
                    }}>
                    {m === 'nenhum' ? 'Não' : m === 'email' ? '📧 Email' : '💬 WhatsApp'}
                  </button>
                ))}
              </div>
            </div>

            {metodo !== 'nenhum' && (
              <div style={{ marginBottom: 16 }}>
                <label style={label} htmlFor="fb-contacto">{metodo === 'email' ? 'O teu email' : 'O teu número de WhatsApp'}</label>
                <input id="fb-contacto" style={inp} value={contacto} onChange={e => setContacto(e.target.value)}
                  type={metodo === 'email' ? 'email' : 'tel'}
                  placeholder={metodo === 'email' ? 'o@teu.email' : '9xxxxxxxx'} />
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 10, cursor: 'pointer' }}>
                  <input type="checkbox" checked={aceitaContacto} onChange={e => setAceitaContacto(e.target.checked)} style={{ marginTop: 3 }} />
                  <span style={{ fontSize: 12, color: '#8a96aa', lineHeight: 1.5 }}>
                    Aceito ser contactado por {metodo === 'email' ? 'email' : 'WhatsApp'} sobre este feedback.
                  </span>
                </label>
              </div>
            )}

            {erro && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{erro}</p>}

            <button type="submit" disabled={status === 'loading'} style={{
              width: '100%', padding: '14px', background: status === 'loading' ? '#1e293b' : '#1d4ed8',
              color: '#fff', border: 'none', borderRadius: 10, fontSize: 15,
              fontWeight: 700, cursor: status === 'loading' ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}>
              {status === 'loading' ? 'A enviar…' : 'Enviar feedback'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
