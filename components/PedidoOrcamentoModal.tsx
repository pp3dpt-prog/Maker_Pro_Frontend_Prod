'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, CheckCircle2, Loader2 } from 'lucide-react';

type ParamDef = {
  ui?: { label?: string; widget?: string };
  unit?: string;
  order?: number;
};

type GenerationSchema = {
  parameters: Record<string, ParamDef>;
  base_geometry?: string | null;
};

type DesignSummary = {
  id: string;
  nome: string;
  familia: string;
  generation_schema: GenerationSchema;
};

type Props = {
  isOpen: boolean;
  onClose: () => void;
  design: DesignSummary;
  params: Record<string, any>;
  defaultEmail?: string;
  userId?: string | null;
  stlUrl?: string | null;
};

const HIDDEN_PARAMS = new Set(['mostrar_texto']);

function formatValue(v: any, unit?: string): string {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v === 'boolean') return v ? 'Sim' : 'Não';
  if (typeof v === 'number') return unit ? `${v} ${unit}` : String(v);
  return String(v);
}

export default function PedidoOrcamentoModal({
  isOpen,
  onClose,
  design,
  params,
  defaultEmail,
  userId,
  stlUrl,
}: Props) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState(defaultEmail ?? '');
  const [telefone, setTelefone] = useState('');
  const [moradaFat, setMoradaFat] = useState('');
  const [moradaEnvio, setMoradaEnvio] = useState('');
  const [mesmaMorada, setMesmaMorada] = useState(true);
  const [notas, setNotas] = useState('');

  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (defaultEmail && !email) setEmail(defaultEmail);
  }, [defaultEmail]);

  const paramsRows = useMemo(() => {
    const schemaParams = design.generation_schema?.parameters ?? {};
    return Object.entries(schemaParams)
      .filter(([k]) => !HIDDEN_PARAMS.has(k))
      .sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0))
      .map(([key, def]) => ({
        key,
        label: def.ui?.label ?? key,
        value: formatValue(params?.[key], def.unit),
      }));
  }, [design, params]);

  if (!isOpen) return null;

  const canSubmit =
    nome.trim().length > 1 &&
    /\S+@\S+\.\S+/.test(email) &&
    telefone.trim().length >= 6 &&
    moradaFat.trim().length > 5 &&
    (mesmaMorada || moradaEnvio.trim().length > 5);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || loading) return;

    setLoading(true);
    setErro(null);

    try {
      const res = await fetch('/api/pedido-orcamento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          design_id: design.id,
          design_nome: design.nome,
          familia: design.familia,
          params,
          params_resumo: paramsRows,
          user_id: userId ?? null,
          stl_url: stlUrl ?? null,
          contacto: {
            nome: nome.trim(),
            email: email.trim(),
            telefone: telefone.trim(),
          },
          morada_faturacao: moradaFat.trim(),
          morada_envio: mesmaMorada ? moradaFat.trim() : moradaEnvio.trim(),
          mesma_morada: mesmaMorada,
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
          width: '100%', maxWidth: 720,
          maxHeight: '90vh', overflowY: 'auto',
          boxShadow: '0 30px 80px rgba(0,0,0,0.5)',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '20px 24px', borderBottom: '1px solid #1e293b',
          position: 'sticky', top: 0, background: '#0f172a', zIndex: 2,
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>
              Pedir orçamento de peça impressa
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
              Recebes uma resposta por email com preço e prazo.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{
              background: 'transparent', border: 'none', color: '#94a3b8',
              cursor: 'pointer', padding: 6, borderRadius: 8,
            }}
          >
            <X size={22} />
          </button>
        </div>

        {enviado ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'rgba(34,197,94,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              <CheckCircle2 size={32} color="#34d399" />
            </div>
            <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800 }}>
              Pedido enviado!
            </h3>
            <p style={{ margin: '0 0 24px', color: '#94a3b8', fontSize: 14, lineHeight: 1.6 }}>
              Recebemos o teu pedido de orçamento. Vamos analisar a peça e responder em <strong style={{ color: '#f1f5f9' }}>{email}</strong> nas próximas 24h úteis.
            </p>
            <button
              onClick={onClose}
              style={{
                padding: '12px 28px', borderRadius: 10,
                background: '#2563eb', color: 'white',
                border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}
            >
              Fechar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* Resumo da peça */}
            <section>
              <h3 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Configuração atual
              </h3>
              <div style={{
                background: '#1e293b', border: '1px solid #334155',
                borderRadius: 12, padding: 16,
              }}>
                <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: '#f1f5f9' }}>
                  {design.nome}
                  <span style={{ color: '#8a96aa', fontWeight: 500, marginLeft: 8, fontSize: 12 }}>
                    ({design.familia})
                  </span>
                </div>
                {paramsRows.length === 0 ? (
                  <div style={{ fontSize: 13, color: '#8a96aa' }}>Sem parâmetros configuráveis.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
                    {paramsRows.map(row => (
                      <div key={row.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 13, padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <span style={{ color: '#94a3b8' }}>{row.label}</span>
                        <span style={{ color: '#f1f5f9', fontWeight: 600, textAlign: 'right' }}>{row.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {/* Dados de contacto */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Contacto
              </h3>
              <Field label="Nome completo *">
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                  style={inputStyle}
                />
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <Field label="Email *">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </Field>
                <Field label="Telefone *">
                  <input
                    type="tel"
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    required
                    style={inputStyle}
                  />
                </Field>
              </div>
            </section>

            {/* Moradas */}
            <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#cbd5e1', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Moradas
              </h3>
              <Field label="Morada de faturação *">
                <textarea
                  value={moradaFat}
                  onChange={(e) => setMoradaFat(e.target.value)}
                  required
                  rows={2}
                  placeholder="Rua, número, código-postal, localidade, NIF (se aplicável)"
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
                />
              </Field>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#cbd5e1', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={mesmaMorada}
                  onChange={(e) => setMesmaMorada(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#2563eb' }}
                />
                Morada de envio igual à de faturação
              </label>
              {!mesmaMorada && (
                <Field label="Morada de envio *">
                  <textarea
                    value={moradaEnvio}
                    onChange={(e) => setMoradaEnvio(e.target.value)}
                    required
                    rows={2}
                    placeholder="Rua, número, código-postal, localidade"
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
                  />
                </Field>
              )}
            </section>

            {/* Notas */}
            <section>
              <Field label="Notas para o orçamento">
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={5}
                  placeholder="Quantidade pretendida, cores preferidas, prazo desejado e qualquer informação adicional necessária para a produção da peça."
                  style={{ ...inputStyle, resize: 'vertical', minHeight: 110 }}
                />
              </Field>
            </section>

            {/* Aviso STL anexado */}
            {stlUrl && (
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(14,165,233,0.08)',
                border: '1px solid rgba(14,165,233,0.25)',
                fontSize: 12, color: '#94a3b8', lineHeight: 1.6,
                display: 'flex', alignItems: 'flex-start', gap: 8,
              }}>
                <span style={{ fontSize: 16, flexShrink: 0 }}>📎</span>
                <span>
                  O ficheiro STL da pré-visualização será <strong style={{ color: '#e0f2fe' }}>anexado ao email</strong> para que possamos começar a análise imediatamente.
                </span>
              </div>
            )}

            {/* Aviso de privacidade */}
            <div style={{
              padding: '10px 14px', borderRadius: 10,
              background: 'rgba(148,163,184,0.06)',
              border: '1px solid rgba(148,163,184,0.12)',
              fontSize: 12, color: '#8a96aa', lineHeight: 1.6,
            }}>
              🔒 <strong style={{ color: '#94a3b8' }}>Privacidade:</strong> O nome completo, morada e número de telefone são recolhidos exclusivamente para processar a tua encomenda e organizar o envio. Estes dados não são partilhados com terceiros para fins comerciais nem utilizados para marketing.
            </div>

            {erro && (
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                background: 'rgba(248,113,113,0.1)',
                border: '1px solid rgba(248,113,113,0.3)',
                color: '#f87171', fontSize: 13,
              }}>
                {erro}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 8, borderTop: '1px solid #1e293b' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                style={{
                  padding: '12px 20px', borderRadius: 10,
                  background: 'transparent', border: '1px solid #334155',
                  color: '#cbd5e1', fontWeight: 600, fontSize: 14,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!canSubmit || loading}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '12px 24px', borderRadius: 10,
                  background: canSubmit && !loading ? '#2563eb' : '#1e293b',
                  color: 'white', border: 'none',
                  fontWeight: 700, fontSize: 14,
                  cursor: canSubmit && !loading ? 'pointer' : 'not-allowed',
                  opacity: canSubmit && !loading ? 1 : 0.6,
                }}
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'A enviar…' : 'Enviar pedido de orçamento'}
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
