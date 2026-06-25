'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

interface OrcamentoData {
  design_nome: string;
  familia: string | null;
  preco_estimado: number | null;
  prazo_entrega_dias: number | null;
  notas_orcamento: string | null;
  estado: string;
  token_expira_em: string | null;
  contacto_nome: string;
}

type PageState =
  | 'loading'
  | 'show_quote'
  | 'responding'
  | 'success_aceite'
  | 'success_recusado'
  | 'already_responded'
  | 'token_expired'
  | 'not_found'
  | 'error';

export default function OrcamentoPage() {
  const params = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = params.token;
  const respostaParam = searchParams.get('resposta'); // 'aceitar' | 'recusar' | null

  const [pageState, setPageState] = useState<PageState>('loading');
  const [orcamento, setOrcamento] = useState<OrcamentoData | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [estadoFinal, setEstadoFinal] = useState('');

  const responder = useCallback(async (resposta: 'aceitar' | 'recusar') => {
    setPageState('responding');
    try {
      const res = await fetch('/api/orcamento/responder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, resposta }),
      });
      const json = await res.json();

      if (!res.ok) {
        if (json.error === 'already_responded') {
          setEstadoFinal(json.estado);
          setPageState('already_responded');
        } else if (json.error === 'token_expired') {
          setPageState('token_expired');
        } else {
          setErrorMsg(json.error || 'Erro ao processar resposta.');
          setPageState('error');
        }
        return;
      }

      setEstadoFinal(json.estado);
      setPageState(resposta === 'aceitar' ? 'success_aceite' : 'success_recusado');
    } catch {
      setErrorMsg('Erro de ligação. Tenta novamente.');
      setPageState('error');
    }
  }, [token]);

  useEffect(() => {
    async function init() {
      // Fetch quote details
      try {
        const res = await fetch(`/api/orcamento/${token}`);
        const json = await res.json();

        if (!res.ok) {
          if (res.status === 404) { setPageState('not_found'); return; }
          setErrorMsg(json.error || 'Erro desconhecido');
          setPageState('error');
          return;
        }

        // Already responded?
        if (['aceite', 'recusado'].includes(json.estado)) {
          setEstadoFinal(json.estado);
          setPageState('already_responded');
          return;
        }

        // Token expired?
        if (json.token_expira_em && new Date(json.token_expira_em) < new Date()) {
          setPageState('token_expired');
          return;
        }

        setOrcamento(json);

        // If resposta param is already in URL, immediately respond
        if (respostaParam === 'aceitar' || respostaParam === 'recusar') {
          await responder(respostaParam);
          return;
        }

        setPageState('show_quote');
      } catch {
        setErrorMsg('Erro ao carregar orçamento.');
        setPageState('error');
      }
    }

    init();
  }, [token, respostaParam, responder]);

  const containerStyle: React.CSSProperties = {
    minHeight: '100vh',
    background: '#080c10',
    color: '#f1f5f9',
    fontFamily: 'Inter, Arial, sans-serif',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  };

  const cardStyle: React.CSSProperties = {
    background: '#0f172a',
    border: '1px solid #1e293b',
    borderRadius: 20,
    padding: '40px 36px',
    maxWidth: 520,
    width: '100%',
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (pageState === 'loading' || pageState === 'responding') {
    return (
      <div style={containerStyle}>
        <div style={{ textAlign: 'center', color: '#8a96aa' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>⏳</div>
          <p style={{ margin: 0, fontSize: 16 }}>
            {pageState === 'responding' ? 'A processar a tua resposta...' : 'A carregar orçamento...'}
          </p>
        </div>
      </div>
    );
  }

  // ── Not found ──────────────────────────────────────────────────────────────
  if (pageState === 'not_found') {
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
          <h1 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 800 }}>Orçamento não encontrado</h1>
          <p style={{ color: '#8a96aa', fontSize: 14, margin: '0 0 28px' }}>
            O link pode estar incorreto ou o orçamento pode ter sido removido.
          </p>
          <a href="mailto:pp3d.pt@gmail.com" style={{ color: '#93c5fd', fontSize: 14 }}>Contacta-nos para ajuda</a>
        </div>
      </div>
    );
  }

  // ── Token expired ──────────────────────────────────────────────────────────
  if (pageState === 'token_expired') {
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⏰</div>
          <h1 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 800 }}>Link expirado</h1>
          <p style={{ color: '#8a96aa', fontSize: 14, margin: '0 0 28px' }}>
            O prazo de 7 dias para responder a este orçamento terminou.
            Contacta-nos diretamente para solicitar um novo orçamento.
          </p>
          <a href="mailto:pp3d.pt@gmail.com" style={{ color: '#93c5fd', fontSize: 14 }}>pp3d.pt@gmail.com</a>
        </div>
      </div>
    );
  }

  // ── Already responded ──────────────────────────────────────────────────────
  if (pageState === 'already_responded') {
    const isAceite = estadoFinal === 'aceite';
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>{isAceite ? '✅' : '❌'}</div>
          <h1 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 800 }}>
            Já respondeste a este orçamento
          </h1>
          <p style={{ color: '#8a96aa', fontSize: 14, margin: '0 0 8px' }}>
            A tua resposta foi: <strong style={{ color: isAceite ? '#86efac' : '#fca5a5' }}>
              {isAceite ? 'Aceite' : 'Recusado'}
            </strong>
          </p>
          <p style={{ color: '#828fa3', fontSize: 13, margin: 0 }}>
            Se precisas de alterar a tua decisão, <a href="mailto:pp3d.pt@gmail.com" style={{ color: '#93c5fd' }}>contacta-nos</a>.
          </p>
        </div>
      </div>
    );
  }

  // ── Success ────────────────────────────────────────────────────────────────
  if (pageState === 'success_aceite' || pageState === 'success_recusado') {
    const isAceite = pageState === 'success_aceite';
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>{isAceite ? '🎉' : '👋'}</div>
          <h1 style={{ margin: '0 0 16px', fontSize: 24, fontWeight: 800 }}>
            {isAceite ? 'Orçamento aceite!' : 'Orçamento recusado'}
          </h1>
          <p style={{ color: '#94a3b8', fontSize: 15, margin: '0 0 24px', lineHeight: 1.6 }}>
            {isAceite
              ? 'Ótimo! Entraremos em contacto contigo em breve para combinar os detalhes e dar início à produção.'
              : 'Compreendemos. Se mudares de ideias ou quiseres explorar outras opções, não hesites em contactar-nos.'}
          </p>
          <a
            href="mailto:pp3d.pt@gmail.com"
            style={{ color: '#93c5fd', fontSize: 14 }}
          >
            pp3d.pt@gmail.com
          </a>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (pageState === 'error') {
    return (
      <div style={containerStyle}>
        <div style={{ ...cardStyle, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 800 }}>Ocorreu um erro</h1>
          <p style={{ color: '#f87171', fontSize: 14, margin: '0 0 24px' }}>{errorMsg}</p>
          <button
            onClick={() => { setPageState('loading'); router.refresh(); }}
            style={{ padding: '10px 24px', background: '#1e293b', color: '#f1f5f9', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  // ── Show quote ─────────────────────────────────────────────────────────────
  if (pageState === 'show_quote' && orcamento) {
    const expiresAt = orcamento.token_expira_em ? new Date(orcamento.token_expira_em) : null;
    const daysLeft = expiresAt ? Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

    return (
      <div style={containerStyle}>
        <div style={{ maxWidth: 540, width: '100%' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📋</div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 800 }}>O teu orçamento</h1>
            <p style={{ margin: '6px 0 0', color: '#8a96aa', fontSize: 14 }}>
              Olá, {orcamento.contacto_nome}! Aqui estão os detalhes do teu pedido.
            </p>
          </div>

          {/* Quote card */}
          <div style={cardStyle}>
            <div style={{ marginBottom: 24 }}>
              <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800 }}>{orcamento.design_nome}</h2>
              {orcamento.familia && <p style={{ margin: 0, color: '#8a96aa', fontSize: 13 }}>{orcamento.familia}</p>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div style={{ background: '#080c10', borderRadius: 12, padding: '18px 20px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, color: '#8a96aa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Preço</p>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#86efac' }}>
                  €{orcamento.preco_estimado != null ? Number(orcamento.preco_estimado).toFixed(2) : '—'}
                </p>
              </div>
              <div style={{ background: '#080c10', borderRadius: 12, padding: '18px 20px', textAlign: 'center' }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, color: '#8a96aa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Prazo</p>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#93c5fd' }}>
                  {orcamento.prazo_entrega_dias ?? '—'}
                  <span style={{ fontSize: 14, fontWeight: 400, color: '#8a96aa' }}> dias</span>
                </p>
              </div>
            </div>

            {orcamento.notas_orcamento && (
              <div style={{ background: '#080c10', borderRadius: 10, padding: '14px 16px', marginBottom: 24 }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, color: '#8a96aa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Notas</p>
                <p style={{ margin: 0, fontSize: 14, color: '#f1f5f9', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{orcamento.notas_orcamento}</p>
              </div>
            )}

            {daysLeft != null && (
              <p style={{ margin: '0 0 24px', fontSize: 12, color: '#8a96aa', textAlign: 'center' }}>
                ⏰ Este orçamento expira em <strong style={{ color: daysLeft <= 1 ? '#f87171' : '#fde68a' }}>{daysLeft} {daysLeft === 1 ? 'dia' : 'dias'}</strong>
              </p>
            )}

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button
                onClick={() => responder('aceitar')}
                style={{
                  flex: 1,
                  padding: '16px',
                  background: '#16a34a',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#15803d')}
                onMouseLeave={e => (e.currentTarget.style.background = '#16a34a')}
              >
                ✅ Aceitar orçamento
              </button>
              <button
                onClick={() => responder('recusar')}
                style={{
                  flex: 1,
                  padding: '16px',
                  background: '#dc2626',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#b91c1c')}
                onMouseLeave={e => (e.currentTarget.style.background = '#dc2626')}
              >
                ❌ Recusar
              </button>
            </div>
          </div>

          <p style={{ textAlign: 'center', marginTop: 20, color: '#828fa3', fontSize: 12 }}>
            Dúvidas?{' '}
            <a href="mailto:pp3d.pt@gmail.com" style={{ color: '#93c5fd' }}>pp3d.pt@gmail.com</a>
          </p>
        </div>
      </div>
    );
  }

  return null;
}
