'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      alert('Erro ao atualizar: ' + error.message);
    } else {
      alert('Password alterada com sucesso!');
      router.push('/login'); // Redireciona para o login após sucesso
    }
    
    setLoading(false);
  }

  return (
    <div style={{ backgroundColor: '#0f172a', minHeight: '100vh', padding: '40px', color: 'white', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '400px', backgroundColor: '#1e293b', padding: '30px', borderRadius: '20px', marginTop: '80px', border: '1px solid #334155' }}>
        <h1 style={{ marginBottom: '20px', fontSize: '20px' }}>Define a tua nova password</h1>
        
        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            type="password" 
            placeholder="Nova password" 
            required
            onChange={(e) => setPassword(e.target.value)}
            style={{ padding: '12px', borderRadius: '8px', backgroundColor: '#0f172a', border: '1px solid #475569', color: 'white' }} 
          />
          <button 
            disabled={loading} 
            type="submit" 
            style={{ padding: '12px', backgroundColor: '#3b82f6', borderRadius: '8px', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {loading ? 'A guardar...' : 'Guardar nova password'}
          </button>
        </form>
      </div>
    </div>
  );
}