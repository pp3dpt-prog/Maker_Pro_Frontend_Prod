'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://zyjxzeossyjnhbtrnlln.supabase.co',
  'A_TUA_ANON_KEY_AQUI' 
);

export default function Dashboard() {
  const [status, setStatus] = useState("A verificar sessão...");
  const [creditos, setCreditos] = useState<any>(null);

  useEffect(() => {
    async function check() {
      // 1. Pegar o utilizador que está REALMENTE logado agora
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setStatus("Erro: Não estás logado no browser!");
        return;
      }

      const meuID = user.id;
      setStatus("Logado com o ID: " + meuID);

      // 2. Tentar buscar a linha desse ID
      const { data, error } = await supabase
        .from('prod_perfis')
        .select('*')
        .eq('id', meuID)
        .maybeSingle();

      if (error) {
        setStatus("Erro na Base de Dados: " + error.message);
      } else if (data) {
        setCreditos(data.creditos_disponiveis);
        setStatus("Sucesso! Linha encontrada para o teu ID.");
      } else {
        setCreditos("NÃO EXISTE");
        setStatus("Atenção: Não existe nenhuma linha na tabela prod_perfis com o ID " + meuID);
      }
    }
    check();
  }, []);

  return (
    <div style={{ padding: '40px', background: '#0f172a', minHeight: '100vh', color: 'white', fontFamily: 'monospace' }}>
      <div style={{ border: '1px solid #334155', padding: '20px', borderRadius: '12px', background: '#1e293b' }}>
        <h2 style={{ color: '#3b82f6', marginBottom: '20px' }}>{status}</h2>
        
        <div style={{ padding: '15px', background: '#0f172a', borderRadius: '8px' }}>
          <p style={{ color: '#94a3b8', margin: '0' }}>Créditos lidos da BD:</p>
          <h1 style={{ fontSize: '60px', margin: '10px 0' }}>{creditos ?? "..."}</h1>
        </div>

        {creditos === "NÃO EXISTE" && (
          <div style={{ marginTop: '20px', color: '#fbbf24', fontSize: '14px' }}>
            <strong>Como resolver:</strong> vai ao Supabase, localiza a linha que tem o número 3, 
            e substitui o ID que lá está por este: <br/>
            <code style={{ background: '#000', padding: '4px', display: 'block', marginTop: '10px' }}>
              {status.replace("Logado com o ID: ", "")}
            </code>
          </div>
        )}
      </div>
    </div>
  );
}