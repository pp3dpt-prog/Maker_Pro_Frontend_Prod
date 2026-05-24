'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function ForgotPassword() {
  const [email, setEmail]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro]         = useState('');

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErro('');
    setMensagem('');

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/update-password`,
    });

    if (error) {
      setErro(error.message);
    } else {
      setMensagem('Link enviado! Verifica o teu email.');
    }

    setLoading(false);
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
          <p style={{ color: '#64748b', fontSize: '14px', marginTop: '12px' }}>Recuperar password</p>
        </div>

        <div style={{ background: '#0f172a', borderRadius: '24px', border: '1px solid #1e293b', padding: '40px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px', textAlign: 'center' }}>Esqueceste a password?</h1>
          <p style={{ color: '#64748b', fontSize: '13px', textAlign: 'center', marginBottom: '28px' }}>
            Envia-nos o teu email e receberes um link para redefinir.
          </p>

          {mensagem ? (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: '40px', marginBottom: '16px' }}>📬</div>
              <p style={{ color: '#4ade80', fontWeight: 600, marginBottom: '8px' }}>{mensagem}</p>
              <p style={{ color: '#64748b', fontSize: '13px' }}>Podes fechar esta página.</p>
            </div>
          ) : (
            <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {erro && <p style={{ color: '#f87171', fontSize: '14px', margin: 0, padding: '12px', background: 'rgba(248,113,113,0.1)', borderRadius: '8px', border: '1px solid rgba(248,113,113,0.2)' }}>{erro}</p>}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '13px', color: '#94a3b8', fontWeight: 600 }}>Email</label>
                <input type="email" placeholder="o@teu.email" value={email} onChange={e => setEmail(e.target.value)} required
                  style={{ padding: '12px 16px', borderRadius: '10px', border: '1px solid #334155', backgroundColor: '#0a0a0a', color: 'white', fontSize: '15px', fontFamily: 'inherit', outline: 'none' }} />
              </div>

              <button type="submit" disabled={loading}
                style={{ marginTop: '8px', padding: '14px', backgroundColor: loading ? '#1e3a5f' : '#2563eb', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 700, fontSize: '15px', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                {loading ? 'A enviar…' : 'Enviar link de recuperação'}
              </button>
            </form>
          )}

          <p style={{ textAlign: 'center', color: '#64748b', fontSize: '14px', marginTop: '24px' }}>
            <Link href="/login" style={{ color: '#3b82f6', fontWeight: 700, textDecoration: 'none' }}>← Voltar ao login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
