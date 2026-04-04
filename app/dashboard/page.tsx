'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Dashboard() {
  const [perfil, setPerfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarSessao() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        const { data, error } = await supabase
          .from('prod_perfis')
          .select('creditos_disponiveis')
          .eq('id', session.user.id)
          .maybeSingle();

        if (data) setPerfil(data);
      }
      setLoading(false);
    }
    carregarSessao();
  }, []);

  if (loading) return <div style={{ color: 'white', padding: '20px' }}>A carregar...</div>;

  return (
    <div style={{ padding: '40px', background: '#0f172a', minHeight: '100vh', color: 'white' }}>
      <div style={{ background: '#1e293b', padding: '20px', borderRadius: '15px', border: '1px solid #334155', width: '250px' }}>
        <p style={{ color: '#94a3b8', fontSize: '12px' }}>Créditos Disponíveis</p>
        <h2 style={{ fontSize: '32px', color: '#3b82f6' }}>
          {perfil ? perfil.creditos_disponiveis : 0}
        </h2>
      </div>
      <p style={{ marginTop: '20px', color: '#64748b', fontSize: '11px' }}>
        Sessão ativa: {perfil ? "Sim" : "Não (Verifica o ID no Supabase)"}
      </p>
    </div>
  );
}