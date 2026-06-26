'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

const opcoes = [
  {
    id: 'consumidor',
    icon: '📦',
    titulo: 'Quero receber em casa',
    desc: 'Personalizo produtos e encomendo. Não tenho impressora.',
    cor: '#3b82f6',
    corBg: 'rgba(59,130,246,0.08)',
    corBorder: 'rgba(59,130,246,0.3)',
  },
  {
    id: 'maker',
    icon: '🖨️',
    titulo: 'Tenho impressora 3D',
    desc: 'Gero ficheiros STL e imprimo eu próprio.',
    cor: '#10b981',
    corBg: 'rgba(16,185,129,0.08)',
    corBorder: 'rgba(16,185,129,0.3)',
  },
  {
    id: 'ambos',
    icon: '🎯',
    titulo: 'As duas coisas',
    desc: 'Às vezes imprimo, outras vezes encomendo.',
    cor: '#a78bfa',
    corBg: 'rgba(167,139,250,0.08)',
    corBorder: 'rgba(167,139,250,0.3)',
  },
];

export default function BemVindo() {
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleContinuar() {
    if (!selecionado) return;
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      // Sessão expirada ou email ainda não confirmado — enviar para login
      window.location.href = '/login';
      return;
    }

    const { error } = await supabase
      .from('prod_perfis')
      .update({ tipo_utilizador: selecionado })
      .eq('id', user.id);

    if (error) {
      console.error('[bem-vindo] erro ao guardar tipo_utilizador:', error.message);
    }

    window.location.href = '/produtos';
  }

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '560px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
            <img src="/favicon.ico" alt="PP3D.pt" style={{ width: '48px', height: '48px', borderRadius: '50%' }} />
            <span style={{ fontSize: '26px', fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>PP3D<span style={{ color: '#3b82f6' }}>.pt</span></span>
          </Link>
          <h1 style={{ fontSize: '26px', fontWeight: 800, marginTop: '28px', marginBottom: '8px' }}>
            Bem-vindo! 👋
          </h1>
          <p style={{ color: '#8a96aa', fontSize: '15px' }}>
            Uma pergunta rápida para personalizarmos a tua experiência:
          </p>
        </div>

        {/* Opções */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '32px' }}>
          {opcoes.map((op) => (
            <button
              key={op.id}
              onClick={() => setSelecionado(op.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '20px',
                padding: '24px', borderRadius: '16px', cursor: 'pointer',
                border: `2px solid ${selecionado === op.id ? op.cor : '#1e293b'}`,
                background: selecionado === op.id ? op.corBg : '#0f172a',
                textAlign: 'left', fontFamily: 'inherit',
                transition: 'all 0.2s',
              }}
            >
              <span style={{ fontSize: '36px', flexShrink: 0 }}>{op.icon}</span>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: selecionado === op.id ? op.cor : '#f1f5f9', marginBottom: '4px' }}>
                  {op.titulo}
                </div>
                <div style={{ fontSize: '13px', color: '#8a96aa', lineHeight: 1.5 }}>{op.desc}</div>
              </div>
              <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
                <div style={{
                  width: '22px', height: '22px', borderRadius: '50%',
                  border: `2px solid ${selecionado === op.id ? op.cor : '#334155'}`,
                  background: selecionado === op.id ? op.cor : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {selecionado === op.id && <span style={{ color: 'white', fontSize: '12px', fontWeight: 900 }}>✓</span>}
                </div>
              </div>
            </button>
          ))}
        </div>

        <button
          onClick={handleContinuar}
          disabled={!selecionado || loading}
          style={{
            width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
            background: selecionado ? '#2563eb' : '#1e293b',
            color: selecionado ? 'white' : '#475569',
            fontWeight: 700, fontSize: '16px', cursor: selecionado ? 'pointer' : 'not-allowed',
            fontFamily: 'inherit', transition: 'all 0.2s',
            boxShadow: selecionado ? '0 8px 24px rgba(37,99,235,0.3)' : 'none',
          }}
        >
          {loading ? 'A guardar…' : 'Continuar →'}
        </button>

        <p style={{ textAlign: 'center', color: '#8a96aa', fontSize: '13px', marginTop: '20px' }}>
          Podes mudar isto a qualquer momento no teu perfil.
        </p>
      </div>
    </div>
  );
}
