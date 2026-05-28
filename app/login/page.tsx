'use client';
import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

function LoginForm() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro]         = useState('');
  const [loading, setLoading]   = useState(false);
  const router       = useRouter();
  const searchParams = useSearchParams();
  const redirectTo   = searchParams.get('redirect') || '/dashboard';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setErro('Email ou password incorrectos.');
    } else {
      // Hard navigation para garantir que os cookies de sessão são sincronizados
      // antes de qualquer componente cliente tentar ler o auth state.
      window.location.href = redirectTo;
    }
  };

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
            <img src="/favicon.ico" alt="PP3D.pt" style={{ width: '44px', height: '44px', borderRadius: '50%' }} />
            <span style={{ fontSize: '24px', fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>PP3D<span style={{ color: '#3b82f6' }}>.pt</span></span>
          </Link>
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '12px' }}>Bem-vindo de volta</p>
        </div>

        {/* Card */}
        <div style={{ background: '#0f172a', borderRadius: '24px', border: '1px solid #1e293b', padding: '40px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '28px', textAlign: 'center' }}>Entrar na conta</h1>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {erro && <p style={{ color: '#f87171', fontSize: '14px', margin: 0, padding: '12px', background: 'rgba(248,113,113,0.1)', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.2)' }}>{erro}</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>Email</label>
              <input type="email" placeholder="o@teu.email" value={email} onChange={e => setEmail(e.target.value)} required
                style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid #334155', backgroundColor: '#0a0a0a', color: 'white', fontSize: '15px', fontFamily: 'inherit', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>Password</label>
                <Link href="/forgot-password" style={{ fontSize: '12px', color: '#3b82f6', textDecoration: 'none' }}>Esqueceste?</Link>
              </div>
              <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required
                style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid #334155', backgroundColor: '#0a0a0a', color: 'white', fontSize: '15px', fontFamily: 'inherit', outline: 'none' }} />
            </div>

            <button type="submit" disabled={loading}
              style={{ marginTop: '8px', padding: '14px', backgroundColor: loading ? '#1e3a5f' : '#2563eb', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background 0.2s' }}>
              {loading ? 'A entrar…' : 'Entrar'}
            </button>
          </form>

          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginTop: '24px' }}>
            Ainda não tens conta?{' '}
            <Link href="/register" style={{ color: '#3b82f6', fontWeight: 700, textDecoration: 'none' }}>Criar conta grátis</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return <Suspense><LoginForm /></Suspense>;
}
