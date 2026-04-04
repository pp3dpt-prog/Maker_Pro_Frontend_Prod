'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Cliente Supabase estável para evitar erros de compilação
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("historico");
  const [perfil, setPerfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const tabs = [
    { id: "historico", label: "Histórico de Downloads" },
    { id: "pagamentos", label: "Pagamentos" },
    { id: "conta", label: "Estado da Conta" }
  ];

  useEffect(() => {
    async function carregarDados() {
      // Obtém a sessão atual de forma direta
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Busca o perfil completo na tabela prod_perfis
        const { data, error } = await supabase
          .from('prod_perfis')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle();

        if (data) {
          setPerfil(data);
        }
      }
      setLoading(false);
    }
    carregarDados();
  }, []);

  if (loading) return (
    <div style={{ background: '#0f172a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'sans-serif' }}>
      A carregar dashboard...
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* SIDEBAR */}
      <aside style={{ width: '280px', backgroundColor: '#0f172a', borderRight: '1px solid #1e293b', padding: '30px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '12px', color: '#64748b', marginBottom: '25px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Menu Principal
        </h2>

        {/* CARTÃO DE CRÉDITOS */}
        <div style={{ backgroundColor: '#1e293b', padding: '20px', borderRadius: '16px', marginBottom: '35px', border: '1px solid #334155' }}>
          <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '5px' }}>Créditos Disponíveis</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <h3 style={{ fontSize: '32px', fontWeight: 'bold', color: '#3b82f6', margin: 0 }}>
              {perfil ? perfil.creditos_disponiveis : 0}
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>unidades</span>
          </div>
          {perfil?.data_expiracao_plano && (
            <p style={{ fontSize: '10px', color: '#475569', marginTop: '10px' }}>
              Expira em: {new Date(perfil.data_expiracao_plano).toLocaleDateString('pt-PT')}
            </p>
          )}
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '14px 18px',
                borderRadius: '12px',
                backgroundColor: activeTab === tab.id ? '#1e293b' : 'transparent',
                color: activeTab === tab.id ? '#3b82f6' : '#94a3b8',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                fontWeight: activeTab === tab.id ? 'bold' : '500',
                transition: 'all 0.2s',
                fontSize: '14px'
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <button 
          onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')}
          style={{ padding: '12px', background: 'transparent', color: '#f87171', border: '1px solid #451a1a', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' }}
        >
          Terminar Sessão
        </button>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main style={{ flex: 1, padding: '50px' }}>
        <header style={{ marginBottom: '40px' }}>
          <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>
            {tabs.find(t => t.id === activeTab)?.label}
          </h1>
        </header>
        
        <div style={{ backgroundColor: '#1e293b', borderRadius: '24