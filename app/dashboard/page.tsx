'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';


export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("conta");
  const [perfil, setPerfil] = useState<any>(null);
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Consideramos Maker quem tem acesso comercial ou plano ativo
  const isMaker = perfil?.acesso_comercial_ativo === true;

  useEffect(() => {
    async function carregarDados() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // 1. Dados do Perfil, Créditos e Plano atual
        const { data: perfilData } = await supabase
          .from('prod_perfis')
          .select('*, prod_planos(nome)')
          .eq('id', session.user.id)
          .maybeSingle();
        if (perfilData) setPerfil(perfilData);

        // 2. Histórico de Faturação e Uso de Créditos
        // Esta tabela deve registar tanto a compra de créditos quanto o consumo
        const { data: transData } = await supabase
          .from('prod_transacoes')
          .select('*')
          .eq('user_id', session.user.id)
          .order('criado_em', { ascending: false });
        if (transData) setTransacoes(transData);
      }
      setLoading(false);
    }
    carregarDados();
  }, []);

  if (loading) return (
    <div style={{ background: '#0f172a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'sans-serif' }}>
      A carregar o seu Painel Maker...
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* SIDEBAR - Focada em Maker */}
      <aside style={{ width: '280px', borderRight: '1px solid #1e293b', padding: '30px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '11px', color: '#64748b', marginBottom: '25px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Menu Maker
        </h2>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <button 
            onClick={() => setActiveTab("conta")} 
            style={{ padding: '12px 16px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer', backgroundColor: activeTab === "conta" ? '#1e293b' : 'transparent', color: activeTab === "conta" ? '#3b82f6' : '#94a3b8', fontWeight: 'bold' }}
          >
            👤 Resumo da Conta
          </button>
          
          <button 
            onClick={() => setActiveTab("faturacao")} 
            style={{ padding: '12px 16px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer', backgroundColor: activeTab === "faturacao" ? '#1e293b' : 'transparent', color: activeTab === "faturacao" ? '#3b82f6' : '#94a3b8', fontWeight: 'bold' }}
          >
            💳 Compras e Créditos
          </button>
          
          <button 
            onClick={() => setActiveTab("projetos")} 
            style={{ padding: '12px 16px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer', backgroundColor: activeTab === "projetos" ? '#1e293b' : 'transparent', color: activeTab === "projetos" ? '#3b82f6' : '#94a3b8', fontWeight: 'bold' }}
          >
            📂 Meus Ficheiros STL
          </button>
        </nav>

        <button 
          onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')}
          style={{ padding: '12px', background: 'transparent', color: '#f87171', border: '1px solid #451a1a', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
        >
          Sair
        </button>
      </aside>

      <main style={{ flex: 1, padding: '50px', overflowY: 'auto' }}>
        
        {/* ABA 1: RESUMO */}
        {activeTab === 'conta' && (
          <div style={{ maxWidth: '900px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '35px' }}>Olá, {perfil?.email?.split('@')[0]}</h1>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
              <div style={{ padding: '24px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                <p style={{ color: '#94a3b8', fontSize: '11px' }}>PLANO ATIVO</p>
                <h3 style={{ fontSize: '20px', color: '#4ade80', margin: '5px 0' }}>{perfil?.prod_planos?.nome || "Uso Pessoal"}</h3>
              </div>
              <div style={{ padding: '24px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                <p style={{ color: '#94a3b8', fontSize: '11px' }}>CRÉDITOS DISPONÍVEIS</p>
                <h3 style={{ fontSize: '28px', color: '#3b82f6', margin: '5px 0' }}>{perfil?.creditos_disponiveis ?? 0}</h3>
              </div>
              <div style={{ padding: '24px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                <p style={{ color: '#94a3b8', fontSize: '11px' }}>TOTAL USADO</p>
                <h3 style={{ fontSize: '28px', color: '#f59e0b', margin: '5px 0' }}>{perfil?.creditos ?? 0}</h3>
              </div>
            </div>

            <div style={{ padding: '30px', background: '#1e293b', borderRadius: '20px', border: '1px solid #334155' }}>
              <h4 style={{ marginBottom: '20px', fontSize: '16px' }}>🛡️ Estado da Licença</h4>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                {isMaker 
                  ? "✅ Licença Comercial Ativa: Pode vender as peças impressas." 
                  : "❌ Apenas Uso Pessoal: Atualize para um plano Maker para vender as suas impressões."}
              </p>
            </div>
          </div>
        )}

        {/* ABA 2: FATURAÇÃO E HISTÓRICO DE CRÉDITOS */}
        {activeTab === 'faturacao' && (
          <div style={{ maxWidth: '900px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>Histórico de Compras e Créditos</h1>
            
            <div style={{ background: '#1e293b', borderRadius: '20px', border: '1px solid #334155', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#0f172a' }}>
                  <tr>
                    <th style={{ padding: '18px', textAlign: 'left', color: '#64748b', fontSize: '11px' }}>DATA</th>
                    <th style={{ padding: '18px', textAlign: 'left', color: '#64748b', fontSize: '11px' }}>CONCEITO</th>
                    <th style={{ padding: '18px', textAlign: 'right', color: '#64748b', fontSize: '11px' }}>MOVIMENTO</th>
                  </tr>
                </thead>
                <tbody>
                  {transacoes.length > 0 ? transacoes.map((t, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '18px', fontSize: '13px' }}>{new Date(t.criado_em).toLocaleDateString()}</td>
                      <td style={{ padding: '18px', fontSize: '13px' }}>{t.descricao}</td>
                      <td style={{ padding: '18px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold' }}>
                        <span style={{ color: t.creditos_alterados > 0 ? '#4ade80' : '#f87171' }}>
                          {t.creditos_alterados > 0 ? `+${t.creditos_alterados}` : t.creditos_alterados}
                        </span>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={3} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                        Não existem registos de faturação ou uso de créditos.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA 3: PROJETOS */}
        {activeTab === 'projetos' && (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <div style={{ fontSize: '50px', marginBottom: '20px' }}>📁</div>
            <h3 style={{ color: '#94a3b8' }}>Os seus ficheiros STL exportados aparecerão aqui.</h3>
            <p style={{ color: '#64748b' }}>Cada exportação utiliza 1 crédito do seu saldo.</p>
          </div>
        )}

      </main>
    </div>
  );
}