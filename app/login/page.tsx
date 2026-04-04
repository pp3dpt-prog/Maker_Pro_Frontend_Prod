'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // O erro "missing email" acontece se estas variáveis estiverem vazias
    if (!email || !password) {
      alert("Por favor, preencha todos os campos.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      alert("Erro no login: " + error.message);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  };

  return (
    <div style={{ padding: '100px', color: 'white', background: '#0f172a', minHeight: '100vh' }}>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '300px', margin: 'auto' }}>
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