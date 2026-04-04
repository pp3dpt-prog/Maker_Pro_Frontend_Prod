'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Inicialização limpa
const supabase = createClient(
  'https://zyjxzeossyjnhbtrnlln.supabase.co',
  'A_TUA_ANON_KEY_AQUI' // Substitui pela tua chave real
);

export default function Dashboard() {
  const [status, setStatus] = useState("A carregar...");
  const [creditos, setCreditos] = useState<any>(null);
  const [sessaoAtiva, setSessaoAtiva] = useState(false);

  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      setStatus("Sessão não encontrada. Por favor, faz login.");
      setSessaoAtiva(false);
      return;
    }

    setSessaoAtiva(true);
    const userId = session.user.id;
    setStatus("Ligado! ID: " + userId);

    // Buscar créditos
    const { data, error } = await supabase
      .from('prod_perfis')
      .select('creditos_disponiveis')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      setStatus("Erro ao ler tabela: " + error.message);
    } else if (data) {
      setCreditos(data.creditos_disponiveis);
    } else {
      setCreditos("NÃO EXISTE");
    }
  }

  useEffect(() => {
    checkSession();
  }, []);

  return (
    <div style={{ padding: '40px', background: '#0f172a', minHeight: '100vh', color: 'white', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#1e293b', padding: '30px', borderRadius: '16px', border: '1px solid #334155' }}>
        <h2 style={{ color: sessaoAtiva ? '#4ade80' : '#fb7185', marginBottom: '10px' }}>{status}</h2>
        
        <div style={{ marginTop: '20px' }}>
          <p style={{ color: '#94a3b8' }}>Créditos lidos da Base de Dados:</p>
          <h1 style={{ fontSize: '64px', margin: '10px 0' }}>{creditos !== null ? creditos : "---"}</h1>
        </div>

        {!sessaoAtiva && (
          <button 
            onClick={() => window.location.href = '/login'} 
            style={{ marginTop: '20px', padding: '12px 24px', background: '#3b82f6', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
          >
            Ir para Login
          </button>
        )}

        {creditos === "NÃO EXISTE" && (
          <p style={{ color: '#fbbf24', marginTop: '20px' }}>
            Atenção: Tens sessão iniciada, mas o teu ID não existe na tabela <strong>prod_perfis</strong>. 
            Cria uma linha com este ID no Supabase.
          </p>
        )}
      </div>
    </div>
  );
}