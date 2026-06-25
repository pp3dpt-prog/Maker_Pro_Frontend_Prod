'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, ArrowLeft, CreditCard, Shield, Zap, Lock } from 'lucide-react';
import type { CSSProperties } from 'react';

interface Plano {
  id: string;
  nome: string;
  preco: number;
  preco_mensal: number | null;
  preco_anual: number | null;
  validade_dias: number;
  limite_downloads: number;
  permite_venda_comercial: boolean;
  vantagens?: string[];
}

interface Props {
  plano: Plano;
  intervalo: 'mensal' | 'anual';
  userEmail: string;
  planoAtualNome: string | null;
  isAdmin?: boolean;
}

const inp: CSSProperties = {
  width: '100%', background: '#080c10', border: '1px solid #1e293b',
  borderRadius: 10, padding: '12px 16px', color: '#f1f5f9',
  fontSize: 14, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  transition: 'border-color 0.15s',
};

export default function CheckoutClient({ plano, intervalo, userEmail, planoAtualNome, isAdmin }: Props) {
  const router = useRouter();
  const [loading, setLoading]           = useState(false);
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [nif, setNif]                   = useState('');
  const [erro, setErro]                 = useState('');

  const preco = intervalo === 'anual'
    ? (plano.preco_anual ?? plano.preco_mensal ?? plano.preco)
    : (plano.preco_mensal ?? plano.preco);

  const precoMensal = plano.preco_mensal ?? plano.preco;
  const poupanca = intervalo === 'anual' && plano.preco_anual
    ? Math.round(((precoMensal * 12 - plano.preco_anual) / (precoMensal * 12)) * 100)
    : null;

  const features: string[] = plano.vantagens?.length ? plano.vantagens : [
    'Configurador 3D paramétrico completo',
    `${plano.limite_downloads} downloads STL por mês`,
    plano.permite_venda_comercial ? 'Licença Comercial incluída' : 'Licença de uso pessoal',
  ];

  const handleConfirmar = async () => {
    if (!nomeCompleto.trim()) { setErro('O nome completo é obrigatório para a fatura.'); return; }
    setErro(''); setLoading(true);
    try {
      if (intervalo === 'anual') {
        // Anual → IfThenPay (pagamento único, renovação manual com avisos)
        const res = await fetch('/api/ifthenpay/gateway', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            descricao: `Subscrição anual ${plano.nome}`,
            valor: preco,
            tipo: 'subscricao_anual',
            plano_id: plano.id,
            nome_completo: nomeCompleto.trim(),
            nif: nif.trim(),
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Erro ao iniciar pagamento.');
        if (json.redirectUrl) { window.location.href = json.redirectUrl; return; }
        throw new Error('Não foi possível obter o link de pagamento.');
      }

      // Mensal → Stripe (subscrição com renovação automática)
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plano_id: plano.id, intervalo, nome_completo: nomeCompleto.trim(), nif: nif.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao iniciar pagamento.');
      if (json.url) window.location.href = json.url;
    } catch (err: any) {
      setErro(err.message);
      setLoading(false);
    }
  };

  // Simulação admin (só anual IfThenPay) — testa sem pagar
  const simularAnual = async () => {
    setLoading(true); setErro('');
    try {
      const res = await fetch('/api/ifthenpay/simular', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descricao: `Subscrição anual ${plano.nome}`, valor: preco, tipo: 'subscricao_anual', plano_id: plano.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro na simulação.');
      window.location.href = '/dashboard';
    } catch (err: any) {
      setErro(err.message); setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080c10', color: '#f1f5f9', fontFamily: 'Inter, sans-serif' }}>

      {/* Header */}
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px 0' }}>
        <button
          onClick={() => router.push('/pricing')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', color: '#8a96aa', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', padding: 0, marginBottom: 40 }}
          onMouseEnter={e => (e.currentTarget.style.color = '#f1f5f9')}
          onMouseLeave={e => (e.currentTarget.style.color = '#64748b')}
        >
          <ArrowLeft size={16} /> Voltar aos planos
        </button>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '0 24px 80px', display: 'grid', gridTemplateColumns: '1fr 420px', gap: 24, alignItems: 'start' }}>

        {/* ── Coluna esquerda: resumo do plano ─────────────────────────── */}
        <div>
          {/* Card principal do plano */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 20, overflow: 'hidden', marginBottom: 16 }}>
            {/* Gradient top bar */}
            <div style={{ background: 'linear-gradient(135deg, #1d4ed8, #7c3aed)', padding: '32px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  {intervalo === 'anual' ? '📅 Plano Anual' : '🗓️ Plano Mensal'}
                </span>
                {poupanca && (
                  <span style={{ background: 'rgba(74,222,128,0.2)', border: '1px solid rgba(74,222,128,0.4)', color: '#4ade80', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 20 }}>
                    Poupa {poupanca}%
                  </span>
                )}
              </div>
              <h1 style={{ margin: '0 0 8px', fontSize: 28, fontWeight: 900, letterSpacing: '-0.5px', color: '#fff' }}>{plano.nome}</h1>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontSize: 48, fontWeight: 900, color: '#fff', lineHeight: 1 }}>{preco}€</span>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15 }}>/ {intervalo === 'anual' ? 'ano' : 'mês'}</span>
              </div>
              {intervalo === 'anual' && plano.preco_mensal && (
                <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,0.5)', fontSize: 13 }}>
                  Equivale a {(preco as number / 12).toFixed(2)}€/mês
                  {plano.preco_mensal && <span style={{ marginLeft: 8, textDecoration: 'line-through' }}>{(plano.preco_mensal * 12).toFixed(0)}€/ano</span>}
                </p>
              )}
            </div>

            {/* Detalhes */}
            <div style={{ padding: '24px 28px' }}>
              {[
                { label: 'Downloads por mês', value: `${plano.limite_downloads} downloads` },
                { label: 'Validade', value: `${plano.validade_dias} dias` },
                { label: 'Licença', value: plano.permite_venda_comercial ? '✓ Comercial incluída' : 'Uso pessoal' },
              ].map((row, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < 2 ? '1px solid #1e293b' : 'none' }}>
                  <span style={{ color: '#8a96aa', fontSize: 14 }}>{row.label}</span>
                  <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 14 }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: '20px 24px' }}>
            <p style={{ margin: '0 0 14px', fontSize: 11, fontWeight: 800, color: '#8a96aa', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Incluído no plano</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {features.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle2 size={15} color="#6366f1" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: '#94a3b8' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Coluna direita: formulário ────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 20, padding: 28 }}>
            <p style={{ margin: '0 0 20px', fontSize: 11, fontWeight: 800, color: '#6366f1', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
              Dados de faturação
            </p>

            {/* Email (readonly) */}
            <div style={{ background: '#080c10', border: '1px solid #1e293b', borderRadius: 10, padding: '10px 16px', marginBottom: 12 }}>
              <p style={{ margin: '0 0 2px', fontSize: 10, color: '#828fa3', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Email</p>
              <p style={{ margin: 0, color: '#f1f5f9', fontSize: 14, fontWeight: 600 }}>{userEmail}</p>
            </div>

            <div style={{ marginBottom: 12 }}>
              <p style={{ margin: '0 0 6px', fontSize: 10, color: '#8a96aa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Nome completo <span style={{ color: '#f87171' }}>*</span>
              </p>
              <input
                style={inp}
                value={nomeCompleto}
                onChange={e => setNomeCompleto(e.target.value)}
                placeholder="Nome como aparece na fatura"
                onFocus={e => (e.target.style.borderColor = '#6366f1')}
                onBlur={e  => (e.target.style.borderColor = '#1e293b')}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <p style={{ margin: '0 0 6px', fontSize: 10, color: '#8a96aa', textTransform: 'uppercase', letterSpacing: '0.08em' }}>NIF (opcional)</p>
              <input
                style={inp}
                value={nif}
                onChange={e => setNif(e.target.value)}
                placeholder="Ex: 123456789"
                maxLength={9}
                onFocus={e => (e.target.style.borderColor = '#6366f1')}
                onBlur={e  => (e.target.style.borderColor = '#1e293b')}
              />
            </div>

            {erro && (
              <p style={{ color: '#f87171', fontSize: 13, marginBottom: 12, padding: '8px 12px', background: 'rgba(248,113,113,0.1)', borderRadius: 8 }}>
                {erro}
              </p>
            )}

            {/* CTA Button */}
            <button
              onClick={handleConfirmar}
              disabled={loading}
              style={{
                width: '100%', padding: '16px', borderRadius: 12, border: 'none',
                background: loading ? '#1e293b' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                color: '#fff', fontWeight: 900, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 8px 32px rgba(99,102,241,0.35)',
                transition: 'all 0.2s', opacity: loading ? 0.7 : 1,
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <CreditCard size={16} />
              {loading
                ? 'A redirecionar para pagamento…'
                : intervalo === 'anual'
                  ? `Pagar ${preco}€ (MB WAY / Multibanco)`
                  : `Pagar ${preco}€ com cartão`}
            </button>

            <p style={{ margin: '12px 0 0', textAlign: 'center', fontSize: 12, color: '#7f8da2', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
              <Lock size={11} /> Pagamento seguro via {intervalo === 'anual' ? 'IfThenPay' : 'Stripe'}
            </p>

            {/* Simulação admin — só plano anual, testa sem pagar */}
            {isAdmin && intervalo === 'anual' && (
              <button
                onClick={simularAnual}
                disabled={loading}
                style={{
                  width: '100%', marginTop: 10, padding: '10px', borderRadius: 8,
                  background: 'rgba(167,139,250,0.1)', border: '1px dashed #a78bfa',
                  color: '#a78bfa', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                🧪 Simular pagamento anual (admin)
              </button>
            )}
          </div>

          {/* Trust badges */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { icon: <Shield size={16} color="#4ade80" />, text: 'Dados seguros e encriptados' },
              { icon: <Zap size={16} color="#818cf8" />,    text: 'Acesso imediato após pagamento' },
            ].map((b, i) => (
              <div key={i} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                {b.icon}
                <span style={{ fontSize: 11, color: '#8a96aa', lineHeight: 1.4 }}>{b.text}</span>
              </div>
            ))}
          </div>

          {/* Fatura info */}
          <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '12px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 16 }}>🧾</span>
            <p style={{ margin: 0, fontSize: 12, color: '#8a96aa', lineHeight: 1.5 }}>
              A fatura será enviada para o teu email em <strong style={{ color: '#94a3b8' }}>até 24 horas</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
