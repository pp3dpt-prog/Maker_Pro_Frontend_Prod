'use client';

import { useState } from 'react';

type TipoInteresse = 'vender' | 'publicidade' | 'ambos';

const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0a1120', border: '1px solid #1e293b', borderRadius: 8,
  padding: '10px 14px', color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
};

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: '#8a96aa', marginBottom: 6,
};

export default function ParceriaCTA({ produtoSlug, produtoNome }: { produtoSlug: string; produtoNome: string }) {
  const [open, setOpen] = useState(false);
  const [tipoInteresse, setTipoInteresse] = useState<TipoInteresse>('vender');
  const [empresa, setEmpresa] = useState('');
  const [nomeContacto, setNomeContacto] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [cidade, setCidade] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [status, setStatus] = useState<'idle' | 'a-enviar' | 'sucesso' | 'erro'>('idle');
  const [erro, setErro] = useState('');

  function resetForm() {
    setTipoInteresse('vender');
    setEmpresa('');
    setNomeContacto('');
    setEmail('');
    setTelefone('');
    setCidade('');
    setMensagem('');
    setStatus('idle');
    setErro('');
  }

  async function submeter() {
    if (!empresa.trim() || !nomeContacto.trim() || !email.trim()) {
      setErro('Preenche empresa, nome de contacto e email.');
      return;
    }
    setStatus('a-enviar');
    setErro('');
    try {
      const res = await fetch('/api/parceiros/candidatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_interesse: tipoInteresse,
          empresa, nome_contacto: nomeContacto, email, telefone, cidade, mensagem,
          produto_slug: produtoSlug, produto_nome: produtoNome,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao submeter.');
      setStatus('sucesso');
    } catch (e: unknown) {
      setErro(e instanceof Error ? e.message : 'Erro ao submeter.');
      setStatus('erro');
    }
  }

  return (
    <div style={{ marginTop: 24, padding: 20, background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: '#f1f5f9' }}>🤝 Tens uma empresa?</h3>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Torna-te parceiro para vender estes produtos ou anuncia-te no nosso site.</p>
        </div>
        <button
          onClick={() => { resetForm(); setOpen(true); }}
          style={{ padding: '10px 20px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Quero ser parceiro
        </button>
      </div>

      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: 28, maxWidth: 480, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}
          >
            {status === 'sucesso' ? (
              <>
                <h3 style={{ margin: '0 0 10px', fontSize: 18, fontWeight: 800, color: '#34d399' }}>Candidatura enviada ✓</h3>
                <p style={{ margin: '0 0 20px', fontSize: 14, color: '#cbd5e1', lineHeight: 1.6 }}>
                  Obrigado! Vamos analisar o teu pedido e entrar em contacto brevemente.
                </p>
                <button
                  onClick={() => setOpen(false)}
                  style={{ padding: '10px 20px', background: '#1e293b', color: '#cbd5e1', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
                >
                  Fechar
                </button>
              </>
            ) : (
              <>
                <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 800, color: '#f1f5f9' }}>Torna-te parceiro</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={labelStyle}>Tenho interesse em</label>
                    <select value={tipoInteresse} onChange={e => setTipoInteresse(e.target.value as TipoInteresse)} style={inputStyle}>
                      <option value="vender">Vender produtos na minha loja</option>
                      <option value="publicidade">Publicidade no site</option>
                      <option value="ambos">Ambos</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Nome da empresa *</label>
                    <input style={inputStyle} value={empresa} onChange={e => setEmpresa(e.target.value)} placeholder="Ex: Retiro Pet" />
                  </div>
                  <div>
                    <label style={labelStyle}>Nome de contacto *</label>
                    <input style={inputStyle} value={nomeContacto} onChange={e => setNomeContacto(e.target.value)} placeholder="O teu nome" />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Email *</label>
                      <input type="email" style={inputStyle} value={email} onChange={e => setEmail(e.target.value)} placeholder="contacto@..." />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={labelStyle}>Telefone</label>
                      <input style={inputStyle} value={telefone} onChange={e => setTelefone(e.target.value)} placeholder="+351..." />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Cidade</label>
                    <input style={inputStyle} value={cidade} onChange={e => setCidade(e.target.value)} placeholder="Ex: Quarteira" />
                  </div>
                  <div>
                    <label style={labelStyle}>Mensagem</label>
                    <textarea
                      style={{ ...inputStyle, minHeight: 80, resize: 'vertical' }}
                      value={mensagem}
                      onChange={e => setMensagem(e.target.value)}
                      placeholder="Conta-nos um pouco sobre a tua empresa…"
                    />
                  </div>

                  {erro && <p style={{ margin: 0, fontSize: 13, color: '#f87171' }}>{erro}</p>}

                  <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                    <button
                      onClick={submeter}
                      disabled={status === 'a-enviar'}
                      style={{ flex: 1, padding: '12px 20px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: status === 'a-enviar' ? 'default' : 'pointer', opacity: status === 'a-enviar' ? 0.7 : 1 }}
                    >
                      {status === 'a-enviar' ? 'A enviar…' : 'Enviar candidatura'}
                    </button>
                    <button
                      onClick={() => setOpen(false)}
                      style={{ padding: '12px 20px', background: 'transparent', color: '#94a3b8', border: '1px solid #1e293b', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
