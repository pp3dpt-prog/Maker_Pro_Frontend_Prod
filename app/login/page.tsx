'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [erro, setErro] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro('');

    if (!email || !password) {
      setErro('Por favor, preencha todos os campos.');
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setErro('Erro no login: ' + error.message);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  return (
    <div style={{ padding: '100px', color: 'white', background: '#0f172a', minHeight: '100vh' }}>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px', margin: 'auto' }}>
        {erro && (
          <p style={{ color: '#f87171', fontSize: '14px', margin: 0 }}>{erro}</p>
        )}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ padding: '10px', borderRadius: '5px', color: 'black' }}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ padding: '10px', borderRadius: '5px', color: 'black' }}
        />
        <button type="submit" style={{ padding: '10px', background: '#3b82f6', border: 'none', borderRadius: '5px', color: 'white', fontWeight: 'bold' }}>
          Entrar
        </button>
      </form>
    </div>
  );
}
