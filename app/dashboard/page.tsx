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
        
        <div style={{ backgroundColor: '#1e293b', borderRadius: '24px', padding: '40px', border: '1px solid #334155', minHeight: '450px' }}>
          
          {/* ABA: HISTÓRICO */}
          {activeTab === 'historico' && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>📂</div>
              <h3 style={{ color: '#94a3b8' }}>Ainda não tem downloads realizados.</h3>
              <button onClick={() => window.location.href = '/editor'} style={{ marginTop: '20px', background: '#3b82f6', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                Ir para o Editor
              </button>
            </div>
          )}

          {/* ABA: ESTADO DA CONTA */}
          {activeTab === 'conta' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
                <div style={{ padding: '24px', background: '#0f172a', borderRadius: '16px', border: '1px solid #334155' }}>
                  <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>Plano Atual</p>
                  <h4 style={{ fontSize: '24px', color: '#4ade80', margin: 0 }}>{perfil?.plano_nome || "Maker Free"}</h4>
                </div>
                <div style={{ padding: '24px', background: '#0f172a', borderRadius: '16px', border: '1px solid #334155' }}>
                  <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '8px' }}>Estado do Plano</p>
                  <h4 style={{ fontSize: '24px', color: 'white', margin: 0 }}>Ativo</h4>
                </div>
              </div>

              <div style={{ padding: '30px', background: '#0f172a', borderRadius: '16px', border: '1px solid #334155' }}>
                <h4 style={{ marginBottom: '20px', fontSize: '18px' }}>Informações de Segurança</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
                    ID da Conta: <span style={{ color: '#64748b', fontFamily: 'monospace' }}>{perfil?.id}</span>
                  </p>
                  <p style={{ color: '#94a3b8', fontSize: '14px', margin: 0 }}>
                    Email: <span style={{ color: '#64748b' }}>Sessão Protegida</span>
                  </p>
                </div>
                <button 
                  onClick={() => alert('Enviamos um link de recuperação para o seu email.')}
                  style={{ marginTop: '25px', padding: '12px 20px', background: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Alterar Password
                </button>
              </div>
            </div>
          )}

          {/* ABA: PAGAMENTOS */}
          {activeTab === 'pagamentos' && (
            <div style={{ color: '#94a3b8', textAlign: 'center', paddingTop: '40px' }}>
              <p>Não existem faturas pendentes ou histórico de pagamentos.</p>
              <button style={{ marginTop: '20px', color: '#3b82f6', background: 'none', border: 'none', textDecoration: 'underline', cursor: 'pointer' }}>
                Ver faturas no Stripe
              </button>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}