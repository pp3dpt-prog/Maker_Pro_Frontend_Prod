'use client';
import { useState } from 'react';
import StarRating from './StarRating';

type Props = { onClose: () => void };

const inp: React.CSSProperties = {
  width: '100%', background: '#0a1120', border: '1px solid #1e293b',
  borderRadius: 8, padding: '10px 14px', color: '#f1f5f9',
  fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
};

export default function ReviewModal({ onClose }: Props) {
  const [avaliacao,  setAvaliacao]  = useState(0);
  const [comentario, setComentario] = useState('');
  const [nome,       setNome]       = useState('');
  const [status, setStatus] = useState<'idle'|'loading'|'ok'|'error'>('idle');
  const [erro,   setErro]   = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!avaliacao) { setErro('Escolhe uma avaliação de 1 a 5 estrelas.'); return; }
    setStatus('loading'); setErro('');
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avaliacao, comentario, user_name: nome }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro.');
      setStatus('ok');
    } catch (err: any) { setErro(err.message); setStatus('error'); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 20, padding: 32, width: '100%', maxWidth: 440, position: 'relative' }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'none', border: 'none', color: '#8a96aa', cursor: 'pointer', fontSize: 20 }}>✕</button>

        {status === 'ok' ? (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🙏</div>
            <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>Obrigado pelo feedback!</h3>
            <p style={{ color: '#8a96aa', fontSize: 14, margin: '0 0 24px' }}>
              {avaliacao >= 4 ? 'A tua review vai aparecer na página principal.' : 'O teu feedback vai ajudar-nos a melhorar.'}
            </p>
            <button onClick={onClose} style={{ padding: '12px 28px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Fechar</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>Avaliar a PP3D</h2>
            <p style={{ color: '#8a96aa', fontSize: 13, margin: '0 0 24px' }}>A tua opinião ajuda-nos a melhorar e outros utilizadores a escolher.</p>

            <div style={{ marginBottom: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <StarRating value={avaliacao} onChange={setAvaliacao} size={36} />
              <span style={{ fontSize: 13, color: '#8a96aa' }}>
                {avaliacao === 0 ? 'Clica para avaliar' : ['', 'Muito mau', 'Mau', 'Razoável', 'Bom', 'Excelente!'][avaliacao]}
              </span>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8a96aa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                O teu nome (opcional)
              </label>
              <input style={inp} value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Pedro" maxLength={40} />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#8a96aa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Comentário (opcional)
              </label>
              <textarea style={{ ...inp, height: 90, resize: 'vertical' }}
                value={comentario} onChange={e => setComentario(e.target.value)}
                placeholder="O que gostaste mais? O que podemos melhorar?" maxLength={300} />
              <span style={{ fontSize: 11, color: '#828fa3' }}>{comentario.length}/300</span>
            </div>

            {erro && <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{erro}</p>}

            <button type="submit" disabled={status === 'loading'} style={{
              width: '100%', padding: '14px', background: status === 'loading' ? '#1e293b' : '#1d4ed8',
              color: '#fff', border: 'none', borderRadius: 10, fontSize: 15,
              fontWeight: 700, cursor: status === 'loading' ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}>
              {status === 'loading' ? 'A enviar…' : 'Enviar avaliação'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
