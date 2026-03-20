'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr'

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ 
  email, 
  password 
})
    
    if (error) {
      alert(error.message);
    } else {
      router.push('/dashboard');
    }
  }

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', padding: '40px 20px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '30px', backgroundColor: '#1e293b', borderRadius: '20px', border: '1px solid #334155' }}>
        <h1 style={{ marginBottom: '20px', textAlign: 'center', fontSize: '24px' }}>Iniciar Sessão</h1>
        
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            type="email" 
            placeholder="Email" 
            required
            onChange={(e) => setEmail(e.target.value)} 
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0f172a', color: 'white' }} 
          />
          <input 
            type="password" 
            placeholder="Password" 
            required
            onChange={(e) => setPassword(e.target.value)} 
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #475569', backgroundColor: '#0f172a', color: 'white' }} 
          />
          <button 
            type="submit" 
            style={{ padding: '12px', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            Entrar
          </button>
        </form>
        
        <p style={{ marginTop: '20px', textAlign: 'center', fontSize: '14px', color: '#94a3b8' }}>
          Ainda não tens conta? <a href="/register" style={{ color: '#3b82f6', textDecoration: 'none' }}>Regista-te aqui</a>
        </p>
        <p style={{ marginTop: '15px', textAlign: 'center' }}>
          <a href="/forgot-password" style={{ color: '#94a3b8', fontSize: '12px', textDecoration: 'none' }}>
          Esqueceste-te da password?
          </a>
        </p>
      </div>
    </div>
  );
}