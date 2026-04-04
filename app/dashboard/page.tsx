'use client';

import { useState, useEffect } from 'react';
// Mudamos a importação para a forma mais estável que evita o erro da imagem
import { createClient } from '@supabase/supabase-js';

export default function Dashboard() {
  // Inicialização manual para garantir que o VS Code não reclame do pacote NextJS
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [activeTab, setActiveTab] = useState("historico");
  const [profile, setProfile] = useState<any>(null);

  const tabs = [
    { id: "historico", label: "Histórico de Downloads" },
    { id: "pagamentos", label: "Pagamentos" },
    { id: "conta", label: "Estado da Conta" }
  ];

  async function fetchProfile(userId: string) {
    // Busca os créditos na coluna confirmada por ti
    const { data, error } = await supabase
      .from('prod_perfis')
      .select('creditos_disponiveis, data_expiracao_plano')
      .eq('id', userId)
      .single();
    
    if (data) {
      setProfile(data);
    } else if (error) {
      console.error("Erro ao carregar créditos:", error.message);
    }
  }

  useEffect(() => {
    // Pegar a sessão de forma segura
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && session.user) {
        fetchProfile(session.user.id);
      }
    });
  }, []);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a', color: 'white' }}>
      <aside style={{ width: '260px', backgroundColor: '#0f172a', borderRight: '1px solid #1e293b', padding: '24px' }}>
        <h2 style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>Menu</h2>
        
        {/* Bloco de Créditos - Corrigido para ler 'creditos_disponiveis' */}
        <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '12px', marginBottom: '30px', border: '1px solid #334155' }}>
          <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Créditos Disponíveis</p>
          <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>
            {profile ? profile.creditos_disponiveis : 0} 
            <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '5px' }}>créditos</span>
          </h3>
          <p style={{ fontSize: '10px', color: '#64748b', marginTop: '8px' }}>
            Ativo até: {profile?.data_expiracao_plano ? new Date(profile.data_expiracao_plano).toLocaleDateString('pt-PT') : "Sem plano ativo"}
          </p>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{ padding: '12px 16px', borderRadius: '12px', backgroundColor: activeTab === tab.id ? '#1e293b' : 'transparent', color: activeTab === tab.id ? '#3b82f6' : '#94a3b8', border: 'none', textAlign: 'left', cursor: 'pointer', fontWeight: activeTab === tab.id ? 'bold' : 'normal' }}>
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      <main style={{ flex: 1, padding: '40px' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '30px' }}>{tabs.find(t => t.id === activeTab)?.label}</h1>
        <div style={{ backgroundColor: '#1e293b', borderRadius: '20px', padding: '30px', border: '1px solid #334155' }}>
          <p style={{ color: '#94a3b8' }}>Conteúdo para {activeTab} carregado aqui...</p>
        </div>
      </main>
    </div>
  );
}