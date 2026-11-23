'use client';

import { useState } from 'react';
import { X, CheckCircle2, Loader2 } from 'lucide-react';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  defaultEmail?: string;
};

export default function PedidoReparacaoModal({ isOpen, onClose, defaultEmail }: Props) {
  const [equipamento, setEquipamento] = useState('');
  const [problema, setProblema] = useState('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [telefone, setTelefone] = useState('');
  const [morada, setMorada] = useState('');
  const [notas, setNotas] = useState('');

  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  if (!isOpen) return null;

  const canSubmit =
    equipamento.trim().length > 1 &&
    problema.trim().length > 5 &&
    nome.trim().length > 1 &&
    /\S+@\S+\.\S+/.test(email) &&
    telefone.trim().length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setErro(null);

    try {
      const res = await fetch('/api/pedido-reparacao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          equipamento: equipamento.trim(),
          problema_descricao: problema.trim(),
          contacto: { nome: nome.trim(), email: email.trim(), telefone: telefone.trim() },
          morada: morada.trim(),
          notas: notas.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || 'Erro ao enviar pedido.');
      }

      setEnviado(true);
    } catch (err: any) {
      setErro(err?.message ?? 'Erro desconhecido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 20, overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#0f172a', color: '#f1f5f9',
          borderRadius: 20, border: '1px solid #1e293b',
          width: '100%', maxWidth: 640,
          maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid #1e293b',
          position: 'sticky', top: 0, background: '#0f172a', zIndex: 2,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Pedir reparação</h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
              Orçamento sem compromisso — respondemos por email.
            </p>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 6, borderRadius: 8 }}>
            <X size={22} />
          </button>
        </div>

        {enviado ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(34,197,94,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <CheckCircle2 size={32} color="#34d399" />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800 }}>Pedido enviado!</h3>
            <p style={{ margin: '0 0 24px', color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>
              Recebemos o teu pedido de reparação. Vamos analisar e responder em <strong style={{ color: '#f1f5f9' }}>{email}</strong> com o orçamento. Podes acompanhar o estado no teu <strong style={{ color: '#f1f5f9' }}>painel</strong>.
            </p>
            <button onClick={onClose} style={{ padding: '12px 28px', borderRadius: 10, background: '#2563eb', color: 'white', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
            <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Equipamento
              </h3>
              <Field label="Que equipamento é? *">
                <input type="text" value={equipamento} onChange={(e) => setEquipamento(e.target.value)} required placeholder="Ex.: Computador portátil, router, impressora…" style={inputStyle} />
              </Field>
              <Field label="Descreve o problema *">
                <textarea value={problema} onChange={(e) => setProblema(e.target.value)} required rows={4} placeholder="O que acontece, desde quando, já tentaste alguma coisa…" style={{ ...inputStyle, resize: 'vertical', minHeight: 90 }} />
              </Field>
            </section>

            <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Contacto
              </h3>
              <Field label="Nome completo *">
                <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required style={inputStyle} />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Email *">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required style={inputStyle} />
                </Field>
                <Field label="Telefone *">
                  <input type="tel" value={telefone} onChange={(e) => setTelefone(e.target.value)} required style={inputStyle} />
                </Field>
              </div>
              <Field label="Morada (se precisares de deslocação)">
                <input type="text" value={morada} onChange={(e) => setMorada(e.target.value)} placeholder="Rua, número, código-postal, localidade" style={inputStyle} />
              </Field>
            </section>

            <section>
              <Field label="Notas adicionais">
                <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={3} placeholder="Qualquer informação extra que ajude no orçamento." style={{ ...inputStyle, resize: 'vertical', minHeight: 70 }} />
              </Field>
            </section>

            <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(148,163,184,0.06)', border: '1px solid rgba(148,163,184,0.12)', fontSize: 12, color: '#8a96aa', lineHeight: 1.6 }}>
              🔒 <strong style={{ color: '#94a3b8' }}>Privacidade:</strong> estes dados são usados exclusivamente para avaliar e responder ao teu pedido de reparação.
            </div>

            {erro && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', fontSize: 13 }}>
                {erro}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid #1e293b' }}>
              <button type="button" onClick={onClose} disabled={loading} style={{ padding: '12px 20px', borderRadius: 10, background: 'transparent', border: '1px solid #334155', color: '#cbd5e1', fontWeight: 600, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer' }}>
                Cancelar
              </button>
              <button type="submit" disabled={!canSubmit || loading} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 10, background: canSubmit && !loading ? '#2563eb' : '#1e293b', color: 'white', border: 'none', fontWeight: 700, fontSize: 14, cursor: canSubmit && !loading ? 'pointer' : 'not-allowed', opacity: canSubmit && !loading ? 1 : 0.6 }}>
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'A enviar…' : 'Enviar pedido'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 10,
  color: '#f1f5f9',
  fontSize: 14,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>{label}</span>
      {children}
    </label>
  );
}
