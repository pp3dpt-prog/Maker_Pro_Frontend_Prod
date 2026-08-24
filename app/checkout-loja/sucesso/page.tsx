'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useCart } from '@/components/loja/CartContext';
import { supabase } from '@/lib/supabaseClient';

const inp: React.CSSProperties = {
  width: '100%', background: '#0a1120', border: '1px solid #1e293b', borderRadius: 8,
  padding: '10px 14px', color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
};

function CriarContaRapida() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'confirmar' | 'error'>('idle');
  const [erro, setErro] = useState('');
  const [ligadas, setLigadas] = useState(0);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('pp3d_guest_info_v1');
      if (raw) {
        const info = JSON.parse(raw);
        if (info.email) setEmail(info.email);
        localStorage.removeItem('pp3d_guest_info_v1');
      }
    } catch {}
  }, []);

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) { setErro('A password deve ter pelo menos 6 caracteres.'); return; }
    setStatus('loading'); setErro('');
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setErro(error.message); setStatus('error'); return; }
    if (!data.session) { setStatus('confirmar'); return; }

    try {
      const res = await fetch('/api/loja/vincular-encomendas', { method: 'POST' });
      const json = await res.json();
      setLigadas(json.ligadas ?? 0);
    } catch {}
    setStatus('ok');
  }

  if (status === 'ok') {
    return (
      <div style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.3)', borderRadius: 10, padding: 14, marginBottom: 24, fontSize: 13, color: '#6ee7b7', lineHeight: 1.6 }}>
        Conta criada! {ligadas > 0 ? `${ligadas} encomenda${ligadas > 1 ? 's já aparecem' : ' já aparece'} no teu dashboard.` : 'Já podes acompanhar as tuas próximas encomendas no dashboard.'}{' '}
        <Link href="/dashboard" style={{ color: '#fff', fontWeight: 700 }}>Ver dashboard →</Link>
      </div>
    );
  }

  if (status === 'confirmar') {
    return (
      <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 10, padding: 14, marginBottom: 24, fontSize: 13, color: '#93c5fd', lineHeight: 1.6 }}>
        Enviámos um link de confirmação para <strong style={{ color: '#fff' }}>{email}</strong>. Depois de confirmares e entrares, as tuas encomendas ligam-se automaticamente à conta.
      </div>
    );
  }

  return (
    <div style={{ background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: 10, padding: 16, marginBottom: 24, textAlign: 'left' }}>
      <p style={{ fontSize: 13, color: '#93c5fd', lineHeight: 1.6, margin: '0 0 12px' }}>
        Guarda esta encomenda — cria conta em 10 segundos, sem repetir os teus dados.
      </p>
      <form onSubmit={criar} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="o@teu.email" required autoComplete="email" />
        <input style={inp} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Escolhe uma password" required autoComplete="new-password" />
        {erro && <p style={{ color: '#f87171', fontSize: 12, margin: 0 }}>{erro}</p>}
        <button type="submit" disabled={status === 'loading'} style={{ padding: '10px 16px', background: status === 'loading' ? '#1e3a5f' : '#2563eb', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: status === 'loading' ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {status === 'loading' ? 'A criar…' : 'Criar conta grátis'}
        </button>
      </form>
    </div>
  );
}

function Conteudo() {
  const params = useSearchParams();
  const { clear } = useCart();
  const orcamento = params.get('tipo') === 'orcamento';
  const numero = params.get('numero');
  const [logado, setLogado] = useState<boolean | null>(null);

  // Limpar carrinho ao chegar ao sucesso (cobre o regresso do Stripe).
  useEffect(() => { clear(); }, [clear]);
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setLogado(!!user));
  }, []);

  return (
    <main style={{ background: '#080c10', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ maxWidth: 480, textAlign: 'center', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 18, padding: 40 }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>{orcamento ? '📝' : '✅'}</div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#f1f5f9', margin: '0 0 12px' }}>
          {orcamento ? 'Pedido de orçamento enviado' : 'Pagamento concluído!'}
        </h1>
        <p style={{ fontSize: 15, color: '#94a3b8', lineHeight: 1.7, margin: '0 0 24px' }}>
          {orcamento
            ? <>Recebemos o teu pedido{numero ? <> (nº {numero})</> : ''}. Vamos confirmar o valor final e enviar-te os detalhes para pagamento.</>
            : <>Obrigado pela tua compra! Vais receber a confirmação por email{logado ? '. Podes acompanhar a encomenda no teu dashboard.' : '.'}</>}
        </p>
        {logado === false && <CriarContaRapida />}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link href="/loja" style={{ padding: '12px 22px', background: '#2563eb', color: '#fff', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Voltar à loja</Link>
          {logado && <Link href="/dashboard" style={{ padding: '12px 22px', background: 'transparent', color: '#94a3b8', border: '1px solid #1e293b', borderRadius: 12, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Dashboard</Link>}
        </div>
      </div>
    </main>
  );
}

export default function SucessoPage() {
  return (
    <Suspense fallback={<main style={{ background: '#080c10', minHeight: '100vh' }} />}>
      <Conteudo />
    </Suspense>
  );
}
