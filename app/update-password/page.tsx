'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [erro, setErro] = useState('');
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState('A validar link…');
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get('code');
        const tokenHash = url.searchParams.get('token_hash');
        const type = url.searchParams.get('type');

        const hash = window.location.hash.startsWith('#')
          ? window.location.hash.slice(1)
          : '';
        const hashParams = new URLSearchParams(hash);
        const hashAccessToken = hashParams.get('access_token');
        const hashRefreshToken = hashParams.get('refresh_token');
        const hashError = hashParams.get('error_description') || hashParams.get('error');

        if (hashError) {
          if (!cancelled) setErro(decodeURIComponent(hashError));
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (cancelled) return;
          if (error) {
            setErro('Link inválido ou expirado: ' + error.message);
            return;
          }
        } else if (tokenHash && type) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: type as 'recovery',
          });
          if (cancelled) return;
          if (error) {
            setErro('Link inválido ou expirado: ' + error.message);
            return;
          }
        } else if (hashAccessToken && hashRefreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: hashAccessToken,
            refresh_token: hashRefreshToken,
          });
          if (cancelled) return;
          if (error) {
            setErro('Link inválido ou expirado: ' + error.message);
            return;
          }
        } else {
          const { data } = await supabase.auth.getSession();
          if (cancelled) return;
          if (!data.session) {
            setErro('Link de recuperação inválido. Pede um novo email em /forgot-password.');
            return;
          }
        }

        window.history.replaceState({}, '', '/update-password');
        if (!cancelled) {
          setReady(true);
          setStatus('');
        }
      } catch (e: any) {
        if (!cancelled) setErro('Erro ao validar link: ' + (e?.message || String(e)));
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

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
            style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #475569', color: 'white' }}
          />
          <button
            disabled={!ready || loading}
            type="submit"
            style={{ padding: '12px', backgroundColor: '#3b82f6', borderRadius: '8px', border: 'none', color: 'white', fontWeight: 'bold', cursor: (!ready || loading) ? 'not-allowed' : 'pointer', opacity: (!ready || loading) ? 0.6 : 1 }}
          >
            {!ready ? status : loading ? 'A guardar...' : 'Guardar nova password'}
          </button>
        </form>
      </div>
    </div>
  );
}
