'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    
    // O Supabase envia um link de recuperação para o email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://maker-pro-frontend-prod.vercel.app/update-password', // Onde o utilizador define a nova password
    });

    if (error) alert(error.message);
    else alert('Verifica o teu email para redefinir a password!');
    
    setLoading(false);
  }

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', padding: '40px', color: 'white' }}>
      <div style={{ maxWidth: '400px', margin: '80px auto', backgroundColor: '#1e293b', padding: '30px', borderRadius: '20px' }}>
        <h1 style={{ marginBottom: '20px' }}>Recuperar Password</h1>
        <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            type="email" 
            placeholder="O teu email" 
            onChange={(e) => setEmail(e.target.value)}
            style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #475569', color: 'white' }} 
          />
          <button disabled={loading} style={{ padding: '12px', backgroundColor: '#3b82f6', borderRadius: '8px', border: 'none', color: 'white', fontWeight: 'bold' }}>
            {loading ? 'A enviar...' : 'Enviar link de recuperação'}
          </button>
        </form>
      </div>
    </div>
  );
}