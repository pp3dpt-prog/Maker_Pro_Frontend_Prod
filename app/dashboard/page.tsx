'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Cliente Supabase estável
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("conta");
  const [perfil, setPerfil] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarDados() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // Busca os dados do perfil e faz JOIN com a tabela de planos
        const { data, error } = await supabase
          .from('prod_perfis')
          .select('*, prod_planos(*)')
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
      Carregando informações...
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* SIDEBAR */}
      <aside style={{ width: '280px', backgroundColor: '#0f172a', borderRight: '1px solid #1e293b', padding: '30px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '11px', color: '#64748b', marginBottom: '25px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Menu MakerPro
        </h2>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <button
            onClick={() => setActiveTab("conta")}
            style={{
              padding: '12px 16px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '14px',
              backgroundColor: activeTab === "conta" ? '#1e293b' : 'transparent',
              color: activeTab === "conta" ? '#3b82f6' : '#94a3b8',
              fontWeight: activeTab === "conta" ? 'bold' : '500'
            }}
          >
            👤 Minha Conta
          </button>
          <button
            onClick={() => setActiveTab("historico")}
            style={{
              padding: '12px 16px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer', fontSize: '14px',
              backgroundColor: activeTab === "historico" ? '#1e293b' : 'transparent',
              color: activeTab === "historico" ? '#3b82f6' : '#94a3b8',
              fontWeight: activeTab === "historico" ? 'bold' : '500'
            }}
          >
            📂 Histórico de Downloads
          </button>
        </nav>

        <button 
          onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')}
          style={{ padding: '12px', background: 'transparent', color: '#f87171', border: '1px solid #451a1a', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' }}
        >
          Sair da Conta
        </button>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main style={{ flex: 1, padding: '50px', backgroundColor: '#0f172a' }}>
        
        {activeTab === 'conta' && (
          <div style={{ maxWidth: '900px' }}>
            <header style={{ marginBottom: '40px' }}>
              <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>Estado da Conta</h1>
              <p style={{ color: '#64748b', marginTop: '8px' }}>Gerencie o seu plano e visualize o seu consumo de créditos.</p>
            </header>

            {/* GRID DE CARTÕES DE MÉTRICAS */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '40px' }}>
              
              {/* PLANO ATUAL */}
              <div style={{ padding: '24px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>Plano Ativo</p>
                <h3 style={{ fontSize: '24px', color: '#4ade80', margin: 0 }}>
                  {perfil?.prod_planos?.nome || "Experimental"}
                </h3>
                <p style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>
                  {perfil?.prod_planos?.limite_downloads} downloads incluídos
                </p>
              </div>

              {/* SALDO DISPONÍVEL */}
              <div style={{ padding: '24px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>Créditos para Uso</p>
                <h3 style={{ fontSize: '32px', color: '#3b82f6', margin: 0 }}>
                  {perfil?.creditos_disponiveis ?? 0}
                </h3>
              </div>

              {/* TOTAL CONSUMIDO (A coluna 'creditos' da tua tabela) */}
              <div style={{ padding: '24px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>Total Consumido</p>
                <h3 style={{ fontSize: '32px', color: '#f59e0b', margin: 0 }}>
                  {perfil?.creditos ?? 0}
                </h3>
                <p style={{ fontSize: '11px', color: '#64748b', marginTop: '8px' }}>Acumulado histórico</p>
              </div>
            </div>

            {/* DETALHES DO PERFIL */}
            <div style={{ padding: '30px', background: '#1e293b', borderRadius: '20px', border: '1px solid #334155' }}>
              <h4 style={{ marginBottom: '25px', fontSize: '18px' }}>Informações do Utilizador</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '15px', borderBottom: '1px solid #334155' }}>
                  <span style={{ color: '#94a3b8' }}>Email de Registo</span>
                  <span style={{ fontWeight: '500' }}>{perfil?.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '15px', borderBottom: '1px solid #334155' }}>
                  <span style={{ color: '#94a3b8' }}>Acesso Comercial</span>
                  <span style={{ color: perfil?.acesso_comercial_ativo ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
                    {perfil?.acesso_comercial_ativo ? '✅ ATIVADO' : '❌ DESATIVADO'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '15px', borderBottom: '1px solid #334155' }}>
                  <span style={{ color: '#94a3b8' }}>ID da Conta</span>
                  <span style={{ color: '#475569', fontSize: '12px', fontFamily: 'monospace' }}>{perfil?.id}</span>
                </div>
              </div>

              <button 
                onClick={() => alert('Link de redefinição enviado para o seu email.')}
                style={{ marginTop: '30px', padding: '12px 24px', background: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(59, 130, 246, 0.1)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
              >
                Alterar Password
              </button>
            </div>
          </div>
        )}

        {activeTab === 'historico' && (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <div style={{ fontSize: '50px', marginBottom: '20px' }}>📁</div>
            <h2 style={{ color: '#94a3b8' }}>Ainda não existem downloads registados.</h2>
            <p style={{ color: '#64748b', marginBottom: '30px' }}>Os teus projetos aparecerão aqui assim que começares a criar.</p>
            <button onClick={() => window.location.href = '/editor'} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '14px 28px', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
              Abrir Editor MakerPro
            </button>
          </div>
        )}

      </main>
    </div>
  );
}