'use client';
import { supabase } from '@/lib/supabase';
import { useState, useEffect } from 'react';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState('historico');

  const menuItems = [
    { id: 'historico', label: 'Histórico de Downloads' },
    { id: 'pagamentos', label: 'Pagamentos' },
    { id: 'conta', label: 'Estado da Conta' },
  ];
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    // 1. Carregar a sessão do utilizador logado
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    });
  }, []); // [] garante que corre apenas uma vez ao carregar a página

  async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('prod_perfis')
    .select('creditos_disponiveis, data_expiracao_plano')
    .eq('id', userId)
    .single();
  
  if (data) {
    // ESTA LINHA É CRUCIAL PARA O DIAGNÓSTICO
    console.log("CONTEÚDO DO PERFIL:", data); 
    setUserProfile(data);
  } else {
    console.error("ERRO OU SEM DADOS:", error);
  }
}

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a', color: 'white' }}>
      
      {/* Barra Lateral Estilizada */}
      <aside style={{ width: '260px', backgroundColor: '#0f172a', borderRight: '1px solid #1e293b', padding: '24px' }}>
        <h2 style={{ fontSize: '14px', color: '#64748b', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>Menu</h2>
        
        <div style={{ 
            backgroundColor: '#1e293b', 
            padding: '16px', 
            borderRadius: '12px', 
            marginBottom: '30px',
            border: '1px solid #334155'
            }}>
            <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '4px' }}>Créditos Disponíveis</p>
            <h3 style={{ fontSize: '20px', fontWeight: 'bold', color: '#3b82f6' }}>{userProfile?.creditos_disponiveis ?? 0}{" "}
              <span style={{ fontSize: '12px', color: '#64748b' }}>créditos</span>
            </h3>
            
            <p style={{ fontSize: '10px', color: '#64748b', marginTop: '8px' }}>
              Ativo até: {userProfile?.data_expiracao_plano 
                ? new Date(userProfile.data_expiracao_plano).toLocaleDateString('pt-PT') 
                : 'Sem plano ativo'}
            </p>
            </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {menuItems.map((item) => (
            <button 
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                padding: '12px 16px',
                borderRadius: '12px',
                backgroundColor: activeTab === item.id ? '#1e293b' : 'transparent',
                color: activeTab === item.id ? '#3b82f6' : '#94a3b8',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontWeight: activeTab === item.id ? 'bold' : 'normal',
                transition: 'all 0.2s'
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Botão de Suporte na barra lateral */}
        <button style={{ 
          marginTop: '40px', 
          width: '100%', 
          padding: '12px', 
          backgroundColor: '#3b82f6', 
          borderRadius: '12px', 
          border: 'none', 
          color: 'white', 
          fontWeight: 'bold',
          cursor: 'pointer' 
        }}>
          Pedir Suporte
        </button>
      </aside>

      {/* Área de Conteúdo */}
      <main style={{ flex: 1, padding: '40px' }}>
        <h1 style={{ fontSize: '24px', marginBottom: '30px' }}>
          {menuItems.find(m => m.id === activeTab)?.label}
        </h1>
        
        <div style={{ backgroundColor: '#1e293b', borderRadius: '20px', padding: '30px', border: '1px solid #334155' }}>
          {/* Aqui é onde vais injetar os dados da base de dados */}
          <p style={{ color: '#94a3b8' }}>Conteúdo para {activeTab} carregado aqui...</p>
        </div>
      </main>
    </div>
  );
}