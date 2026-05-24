'use client';

import { useState, useEffect, Suspense } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useSearchParams } from 'next/navigation';

function UpdatePasswordInner() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    let cancelled = false;

    async function prepareRecoverySession() {
      const code = searchParams.get('code');

      if (code) {
        await supabase.auth.signOut().catch(() => {});
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          setErro('Link inválido ou expirado. Pede um novo email de recuperação.');
          return;
        }
        window.history.replaceState({}, '', '/update-password');
        setReady(true);
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (cancelled) return;
      if (data.session) {
        setReady(true);
      } else {
        setErro('Sessão de recuperação não encontrada. Pede um novo email.');
      }
    }

    prepareRecoverySession();
    return () => { cancelled = true; };
  }, [searchParams]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!ready) return;
    setLoading(true);
    setErro('');
    setMensagem('');

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErro('Erro ao atualizar: ' + error.message);
      setLoading(false);
      return;
    }

    setMensagem('Password alterada com sucesso!');
    await supabase.auth.signOut();
    setTimeout(() => router.push('/login'), 1500);
  }

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', padding: '40px', color: 'white', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '400px', backgroundColor: '#1e293b', padding: '30px', borderRadius: '20px', marginTop: '80px', border: '1px solid #334155' }}>
        <h1 style={{ marginBottom: '20px', fontSize: '20px' }}>Define a tua nova password</h1>

        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {erro && <p style={{ color: '#f87171', fontSize: '14px', margin: 0 }}>{erro}</p>}
          {mensagem && <p style={{ color: '#4ade80', fontSize: '14px', margin: 0 }}>{mensagem}</p>}

          <input
            type="password"
            placeholder="Nova password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!ready || loading}
            style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #475569', color: 'white' }}
          />
          <button
            disabled={!ready || loading}
            type="submit"
            style={{ padding: '12px', backgroundColor: '#3b82f6', borderRadius: '8px', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', opacity: (!ready || loading) ? 0.6 : 1 }}
          >
            {!ready ? 'A validar link…' : loading ? 'A guardar...' : 'Guardar nova password'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function UpdatePassword() {
  return (
    <Suspense>
      <UpdatePasswordInner />
    </Suspense>
  );
}
