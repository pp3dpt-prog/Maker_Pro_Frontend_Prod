'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("conta");
  const [perfil, setPerfil] = useState<any>(null);
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarDados() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Procuramos o perfil e os detalhes do plano
        const { data: perfilData } = await supabase
          .from('prod_perfis')
          .select('*, prod_planos(nome, tipo)') // 'tipo' ajudará a saber se é comercial
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (perfilData) setPerfil(perfilData);

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

  if (loading) return <div style={{ background: '#0f172a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>A carregar dados seguros...</div>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* SIDEBAR MANTIDA */}
      <aside style={{ width: '280px', borderRight: '1px solid #1e293b', padding: '30px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '11px', color: '#64748b', marginBottom: '25px', textTransform: 'uppercase' }}>MakerPro Dashboard</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <button onClick={() => setActiveTab("conta")} style={{ padding: '12px 16px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer', backgroundColor: activeTab === "conta" ? '#1e293b' : 'transparent', color: activeTab === "conta" ? '#3b82f6' : '#94a3b8' }}>👤 Perfil</button>
          <button onClick={() => setActiveTab("pagamentos")} style={{ padding: '12px 16px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer', backgroundColor: activeTab === "pagamentos" ? '#1e293b' : 'transparent', color: activeTab === "pagamentos" ? '#3b82f6' : '#94a3b8' }}>💳 Faturação</button>
        </nav>
      </aside>

      <main style={{ flex: 1, padding: '50px', overflowY: 'auto' }}>
        
        {activeTab === 'conta' && (
          <div style={{ maxWidth: '900px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '30px' }}>Informações da Conta</h1>
            
            {/* STATUS DO PERFIL (Leitura Apenas) */}
            <div style={{ background: '#1e293b', padding: '30px', borderRadius: '20px', border: '1px solid #334155', marginBottom: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '18px' }}>Tipo de Utilizador: 
                    <span style={{ color: perfil?.acesso_comercial_ativo ? '#4ade80' : '#3b82f6', marginLeft: '10px' }}>
                      {perfil?.acesso_comercial_ativo ? 'MAKER / PRO' : 'CLIENTE FINAL'}
                    </span>
                  </h4>
                  <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '8px' }}>
                    {perfil?.acesso_comercial_ativo 
                      ? "Tem permissão para descarregar ficheiros STL e vender as peças." 
                      : "Perfil limitado a personalização e encomenda de peças impressas."}
                  </p>
                </div>
                
                {/* Botão de Upgrade (Fluxo de Ticket/Planos) */}
                {!perfil?.acesso_comercial_ativo && (
                  <button 
                    onClick={() => window.location.href = 'mailto:suporte@makerpro.com?subject=Pedido de Upgrade para Maker'}
                    style={{ padding: '12px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Quero ser Maker
                  </button>
                )}
              </div>
            </div>

            {/* DETALHES TÉCNICOS E LICENÇA */}
            <div style={{ padding: '30px', background: '#1e293b', borderRadius: '20px', border: '1px solid #334155' }}>
              <h4 style={{ marginBottom: '20px', fontSize: '16px', color: '#94a3b8' }}>Licenciamento e Segurança</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                {/* LICENÇA COMERCIAL (Baseada em Plano Ativo) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #0f172a', paddingBottom: '10px' }}>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>Licença Comercial de Produção</span>
                  <span style={{ 
                    fontSize: '12px', fontWeight: 'bold', 
                    color: perfil?.acesso_comercial_ativo ? '#4ade80' : '#f87171',
                    background: perfil?.acesso_comercial_ativo ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)',
                    padding: '4px 12px', borderRadius: '20px'
                  }}>
                    {perfil?.acesso_comercial_ativo ? 'ATIVA ✅' : 'INATIVA ❌'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #0f172a', paddingBottom: '10px' }}>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>Plano Atual</span>
                  <span style={{ fontSize: '13px', fontWeight: 'bold' }}>{perfil?.prod_planos?.nome || "Sem Plano Ativo"}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #0f172a', paddingBottom: '10px' }}>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>Email de Registo</span>
                  <span style={{ fontSize: '13px' }}>{perfil?.email}</span>
                </div>
              </div>

              {/* NOTA SOBRE MUDANÇA DE PERFIL */}
              {!perfil?.acesso_comercial_ativo && (
                <p style={{ marginTop: '20px', fontSize: '11px', color: '#475569', fontStyle: 'italic' }}>
                  * A ativação da licença comercial requer a subscrição de um plano Pro e validação técnica via ticket de suporte.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ABA PAGAMENTOS (MANTIDA PARA HISTÓRICO) */}
        {activeTab === 'pagamentos' && (
          <div style={{ maxWidth: '900px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '30px' }}>Histórico de Transações</h1>
            <div style={{ background: '#1e293b', borderRadius: '20px', border: '1px solid #334155', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#0f172a' }}>
                  <tr>
                    <th style={{ padding: '18px 25px', color: '#94a3b8', fontSize: '11px' }}>DATA</th>
                    <th style={{ padding: '18px 25px', color: '#94a3b8', fontSize: '11px' }}>TIPO</th>
                    <th style={{ padding: '18px 25px', color: '#94a3b8', fontSize: '11px' }}>CRÉDITOS</th>
                  </tr>
                </thead>
                <tbody>
                  {transacoes.map((t, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '18px 25px', fontSize: '13px' }}>{new Date(t.criado_em).toLocaleDateString()}</td>
                      <td style={{ padding: '18px 25px', fontSize: '13px' }}>{t.descricao}</td>
                      <td style={{ padding: '18px 25px', fontSize: '13px', color: t.creditos_alterados > 0 ? '#4ade80' : '#f87171' }}>
                        {t.creditos_alterados > 0 ? `+${t.creditos_alterados}` : t.creditos_alterados}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}