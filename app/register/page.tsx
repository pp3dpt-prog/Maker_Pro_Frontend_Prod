'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Register() {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [erro, setErro]         = useState('');
  const [loading, setLoading]   = useState(false);
  const [confirmacaoPendente, setConfirmacaoPendente] = useState(false);
  const router = useRouter();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setErro('');

    if (password !== confirmar) {
      setErro('As passwords não coincidem.');
      return;
    }
    if (password.length < 6) {
      setErro('A password deve ter pelo menos 6 caracteres.');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);

    if (error) {
      setErro(error.message);
    } else if (!data.session) {
      // Supabase requer confirmação de email — sessão ainda não está ativa
      setConfirmacaoPendente(true);
    } else {
      window.location.href = '/bem-vindo';
    }
  }

  return (
    <div style={{ backgroundColor: '#0a0a0a', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
            <img src="/favicon.ico" alt="PP3D.pt" style={{ width: '44px', height: '44px', borderRadius: '50%' }} />
            <span style={{ fontSize: '24px', fontWeight: 900, color: 'white', letterSpacing: '-1px' }}>PP3D<span style={{ color: '#3b82f6' }}>.pt</span></span>
          </Link>
          <p style={{ color: '#8a96aa', fontSize: '14px', marginTop: '12px' }}>Cria a tua conta gratuita</p>
        </div>

        {/* Card */}
        <div style={{ background: '#0f172a', borderRadius: '24px', border: '1px solid #1e293b', padding: '40px' }}>

          {confirmacaoPendente ? (
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📬</div>
              <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '8px' }}>Confirma o teu email</h2>
              <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.6 }}>
                Enviámos um link para <strong style={{ color: '#f1f5f9' }}>{email}</strong>.<br />
                Clica no link para ativar a conta e continuar.
              </p>
              <p style={{ color: '#8a96aa', fontSize: '13px', marginTop: '16px' }}>
                Já confirmaste?{' '}
                <Link href="/login" style={{ color: '#3b82f6', fontWeight: 700, textDecoration: 'none' }}>Entrar</Link>
              </p>
            </div>
          ) : (
            <>
          <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px', textAlign: 'center' }}>Criar conta</h1>
          <p style={{ color: '#8a96aa', fontSize: '13px', textAlign: 'center', marginBottom: '28px' }}>
            3 downloads gratuitos para começar
          </p>

          <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {erro && <p style={{ color: '#f87171', fontSize: '14px', margin: 0, padding: '12px', background: 'rgba(248,113,113,0.1)', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.2)' }}>{erro}</p>}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="reg-email" style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>Email</label>
              <input id="reg-email" autoComplete="email" type="email" placeholder="o@teu.email" value={email} onChange={e => setEmail(e.target.value)} required
                style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid #334155', backgroundColor: '#0a0a0a', color: 'white', fontSize: '15px', fontFamily: 'inherit', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="reg-password" style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>Password</label>
              <input id="reg-password" autoComplete="new-password" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} required
                style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid #334155', backgroundColor: '#0a0a0a', color: 'white', fontSize: '15px', fontFamily: 'inherit', outline: 'none' }} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label htmlFor="reg-confirmar" style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>Confirmar password</label>
              <input id="reg-confirmar" autoComplete="new-password" type="password" placeholder="Repete a password" value={confirmar} onChange={e => setConfirmar(e.target.value)} required
                style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid #334155', backgroundColor: '#0a0a0a', color: 'white', fontSize: '15px', fontFamily: 'inherit', outline: 'none' }} />
            </div>

            <button type="submit" disabled={loading}
              style={{ marginTop: '8px', padding: '14px', backgroundColor: loading ? '#1e3a5f' : '#2563eb', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'background 0.2s' }}>
              {loading ? 'A criar conta…' : 'Criar conta grátis'}
            </button>
          </form>

          <p style={{ textAlign: 'center', color: '#8a96aa', fontSize: '14px', marginTop: '24px' }}>
            Já tens conta?{' '}
            <Link href="/login" style={{ color: '#3b82f6', fontWeight: 700, textDecoration: 'none' }}>Entrar</Link>
          </p>
            </>
          )}
        </div>

        <p style={{ textAlign: 'center', color: '#7f8da2', fontSize: '12px', marginTop: '20px' }}>
          Ao criares conta aceitas os nossos{' '}
          <Link href="/terms" style={{ color: '#828fa3', textDecoration: 'none' }}>Termos</Link> e{' '}
          <Link href="/privacy" style={{ color: '#828fa3', textDecoration: 'none' }}>Política de Privacidade</Link>
        </p>
      </div>
    </div>
  );
}
