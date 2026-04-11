'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      alert(error.message);
    } else {
      alert("Conta criada com sucesso! Verifica o teu email.");
      router.push('/dashboard');
    }
  }

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', padding: '40px 20px', color: 'white' }}>
      <div style={{ maxWidth: '400px', margin: '80px auto', padding: '30px', backgroundColor: '#1e293b', borderRadius: '20px', border: '1px solid #334155' }}>
        <h1 style={{ marginBottom: '20px', textAlign: 'center' }}>Criar Conta</h1>
        
        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
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
            Registar
          </button>
        </form>
      </div>
    </div>
  );
}