'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { Check, RefreshCw, Loader2, Zap } from 'lucide-react';

interface Plano {
  id: string;
  nome: string;
  preco: number;
  preco_mensal: number | null;
  preco_anual: number | null;
  validade_dias: number;
  limite_downloads: number;
  permite_venda_comercial: boolean;
  gratuito: boolean;
  recarga_creditos_mensal: number;
  vantagens?: string[];
}

const BG_PAGE   = '#080c10';
const BG_CARD   = '#111827';
const BG_CARD_H = '#131d2e';
const BORDER    = 'rgba(255,255,255,0.07)';
const BORDER_H  = 'rgba(99,102,241,0.5)';

export default function PricingPage() {
  const router = useRouter();
  const [planos, setPlanos]       = useState<Plano[]>([]);
  const [loading, setLoading]     = useState(true);
  const [erro, setErro]           = useState<string | null>(null);
  const [aderindoId, setAderindoId] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('prod_planos').select('*').order('preco', { ascending: true })
      .then(({ data, error }) => {
        if (error) { setErro(error.message); }
        else if (!data?.length) { setErro('Nenhum plano disponível.'); }
        else { setPlanos(data); }
        setLoading(false);
      });
  }, []);

  const getPoupanca = (p: Plano) => {
    const m = p.preco_mensal ?? p.preco;
    const a = p.preco_anual;
    if (!a || !m) return null;
    return Math.round(((m * 12 - a) / (m * 12)) * 100);
  };

  const getPopularId = () => {
    const pagos = planos.filter(p => !p.gratuito);
    if (pagos.length >= 2) return pagos[Math.floor(pagos.length / 2)].id;
    return pagos[0]?.id ?? null;
  };

  const handleGratuito = async (planoId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login?redirect=/pricing'); return; }
    setAderindoId(planoId);
    const res = await fetch('/api/aderir-gratuito', { method: 'POST' });
    setAderindoId(null);
    if (res.ok) { router.push('/dashboard'); router.refresh(); }
  };

  if (loading) return (
    <div style={{ background: BG_PAGE, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 14 }}>
      A carregar planos...
    </div>
  );

  if (erro) return (
    <div style={{ background: BG_PAGE, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32, textAlign: 'center' }}>
      <p style={{ color: '#f87171', fontSize: 14 }}>{erro}</p>
      <button onClick={() => window.location.reload()} style={{ padding: '10px 24px', background: '#4f46e5', border: 'none', borderRadius: 10, color: 'white', fontWeight: 700, cursor: 'pointer' }}>
        Tentar novamente
      </button>
    </div>
  );

  const popularId = getPopularId();

  return (
    <div style={{ background: BG_PAGE, minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' }}>

      {/* HEADER */}
      <div style={{ textAlign: 'center', padding: '96px 24px 64px' }}>
        <p style={{ fontSize: 11, fontWeight: 900, color: '#6366f1', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 16 }}>
          Preçário
        </p>
        <h1 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 900, letterSpacing: '-0.03em', margin: '0 0 16px', lineHeight: 1.1 }}>
          Simples e transparente
        </h1>
        <p style={{ color: '#64748b', fontSize: 16, maxWidth: 400, margin: '0 auto', lineHeight: 1.6 }}>
          Começa grátis. Evolui quando precisares.
        </p>
      </div>

      {/* GRID */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 96px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20, alignItems: 'stretch' }}>
        {planos.map((plano) => {
          const isPopular  = plano.id === popularId && !plano.gratuito;
          const poupanca   = getPoupanca(plano);
          const precoMensal = plano.preco_mensal ?? plano.preco;
          const precoAnual  = plano.preco_anual;

          const features: string[] = plano.vantagens?.length ? plano.vantagens : [
            'Configurador 3D completo',
            `${plano.limite_downloads} downloads STL incluídos`,
            plano.gratuito && plano.recarga_creditos_mensal > 0
              ? `+${plano.recarga_creditos_mensal} créditos renovados por mês`
              : plano.permite_venda_comercial ? 'Licença Comercial incluída' : 'Licença de uso pessoal',
          ];

          return (
            <div
              key={plano.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 20,
                overflow: 'hidden',
                border: `1px solid ${isPopular ? BORDER_H : BORDER}`,
                background: isPopular ? BG_CARD_H : BG_CARD,
                boxShadow: isPopular ? '0 0 40px rgba(99,102,241,0.12)' : 'none',
              }}
            >
              {/* Barra de cor no topo */}
              <div style={{
                height: 4,
                background: plano.gratuito
                  ? '#374151'
                  : isPopular
                    ? 'linear-gradient(90deg,#6366f1,#8b5cf6)'
                    : '#1e293b',
              }} />

              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, padding: 28 }}>

                {/* Badge */}
                <div style={{ marginBottom: 20 }}>
                  {isPopular && (
                    <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 900, color: '#a5b4fc', background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)', padding: '3px 10px', borderRadius: 99, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>
                      Mais Popular
                    </span>
                  )}
                  {plano.gratuito && (
                    <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 900, color: '#94a3b8', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', padding: '3px 10px', borderRadius: 99, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 10 }}>
                      Grátis
                    </span>
                  )}
                  <h2 style={{ fontSize: 20, fontWeight: 900, letterSpacing: '-0.02em', margin: 0, color: isPopular ? '#a5b4fc' : 'white' }}>
                    {plano.nome}
                  </h2>
                  {plano.permite_venda_comercial && (
                    <p style={{ fontSize: 11, color: '#4ade80', fontWeight: 600, marginTop: 4 }}>Inclui Licença Comercial</p>
                  )}
                </div>

                {/* Preço */}
                <div style={{ marginBottom: 24 }}>
                  {plano.gratuito ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontSize: 48, fontWeight: 900, lineHeight: 1 }}>0€</span>
                        <span style={{ fontSize: 14, color: '#475569' }}>/mês</span>
                      </div>
                      <p style={{ fontSize: 11, color: '#334155', marginTop: 6 }}>Sem cartão de crédito</p>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{ fontSize: 48, fontWeight: 900, lineHeight: 1 }}>{precoMensal}€</span>
                        <span style={{ fontSize: 14, color: '#475569' }}>/mês</span>
                      </div>
                      {precoAnual && (
                        <p style={{ fontSize: 12, color: '#475569', marginTop: 6 }}>
                          ou{' '}
                          <span style={{ color: '#94a3b8', fontWeight: 600 }}>{precoAnual}€/ano</span>
                          {poupanca && poupanca > 0 && (
                            <span style={{ marginLeft: 6, color: '#4ade80', fontWeight: 700 }}>— poupa {poupanca}%</span>
                          )}
                        </p>
                      )}
                    </>
                  )}
                </div>

                {/* Créditos */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 10, background: isPopular ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)', flexShrink: 0 }}>
                    <Zap size={16} color={isPopular ? '#818cf8' : '#64748b'} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 22, fontWeight: 900, lineHeight: 1, margin: 0 }}>{plano.limite_downloads}</p>
                    <p style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>créditos STL incluídos</p>
                  </div>
                  {plano.gratuito && plano.recarga_creditos_mensal > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 8, padding: '5px 8px', flexShrink: 0 }}>
                      <RefreshCw size={10} color="#4ade80" />
                      <span style={{ fontSize: 10, fontWeight: 900, color: '#4ade80' }}>+{plano.recarga_creditos_mensal}/mês</span>
                    </div>
                  )}
                </div>

                {/* Divider */}
                <div style={{ height: 1, background: 'rgba(255,255,255,0.05)', marginBottom: 20 }} />

                {/* Features */}
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                  {features.map((f, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 13, color: '#94a3b8' }}>
                      <Check size={13} color={isPopular ? '#818cf8' : '#475569'} style={{ flexShrink: 0, marginTop: 1 }} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* Botões */}
                {plano.gratuito ? (
                  <button
                    onClick={() => handleGratuito(plano.id)}
                    disabled={aderindoId === plano.id}
                    style={{ width: '100%', padding: '13px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: 800, fontSize: 13, letterSpacing: '0.05em', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: aderindoId === plano.id ? 0.5 : 1, transition: 'background 0.2s' }}
                  >
                    {aderindoId === plano.id
                      ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> A ativar...</>
                      : 'Começar Grátis'}
                  </button>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Mensal */}
                    <button
                      onClick={() => router.push(`/checkout?plan=${plano.id}&intervalo=mensal`)}
                      style={{
                        width: '100%', padding: '13px 16px', borderRadius: 12, border: 'none',
                        background: isPopular ? '#4f46e5' : 'rgba(255,255,255,0.07)',
                        color: 'white', fontWeight: 800, fontSize: 14, cursor: 'pointer',
                        boxShadow: isPopular ? '0 4px 20px rgba(79,70,229,0.3)' : 'none',
                        transition: 'opacity 0.15s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
                      onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                    >
                      Subscrição Mensal — {precoMensal}€
                    </button>

                    {/* Anual */}
                    {precoAnual ? (
                      <button
                        onClick={() => router.push(`/checkout?plan=${plano.id}&intervalo=anual`)}
                        style={{ width: '100%', padding: '11px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'transparent', color: '#64748b', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'color 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.color = '#e2e8f0'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)'; }}
                        onMouseLeave={e => { e.currentTarget.style.color = '#64748b'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                      >
                        Anual — {precoAnual}€
                        {poupanca && poupanca > 0 && (
                          <span style={{ fontSize: 10, fontWeight: 900, color: '#4ade80', background: 'rgba(74,222,128,0.12)', padding: '2px 6px', borderRadius: 6 }}>
                            -{poupanca}%
                          </span>
                        )}
                      </button>
                    ) : (
                      <p style={{ textAlign: 'center', color: '#1e293b', fontSize: 12, margin: 0, padding: '8px 0' }}>Plano anual brevemente</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: 'center', paddingBottom: 80 }}>
        <p style={{ color: '#1e293b', fontSize: 13 }}>Dúvidas? Fala connosco.</p>
      </div>
    </div>
  );
}
