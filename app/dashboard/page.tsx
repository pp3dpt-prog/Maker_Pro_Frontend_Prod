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
  const [pagamentos, setPagamentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarDados() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // 1. Perfil + Join com Planos
        const { data: perfilData } = await supabase
          .from('prod_perfis')
          .select('*, prod_planos(*)')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (perfilData) setPerfil(perfilData);

        // 2. Histórico de Pagamentos
        const { data: pagamentosData } = await supabase
          .from('prod_pagamentos')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (pagamentosData) setPagamentos(pagamentosData);
      }
      setLoading(false);
    }
    carregarDados();
  }, []);

  if (loading) return (
    <div style={{ background: '#0f172a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'sans-serif' }}>
      A carregar o seu ecossistema MakerPro...
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* SIDEBAR PERSISTENTE */}
      <aside style={{ width: '280px', borderRight: '1px solid #1e293b', padding: '30px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '11px', color: '#64748b', marginBottom: '25px', textTransform: 'uppercase', letterSpacing: '1px' }}>Painel Principal</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <button onClick={() => setActiveTab("conta")} style={{ padding: '12px 16px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer', backgroundColor: activeTab === "conta" ? '#1e293b' : 'transparent', color: activeTab === "conta" ? '#3b82f6' : '#94a3b8', fontWeight: activeTab === "conta" ? 'bold' : '500' }}>👤 Minha Conta</button>
          <button onClick={() => setActiveTab("pagamentos")} style={{ padding: '12px 16px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer', backgroundColor: activeTab === "pagamentos" ? '#1e293b' : 'transparent', color: activeTab === "pagamentos" ? '#3b82f6' : '#94a3b8', fontWeight: activeTab === "pagamentos" ? 'bold' : '500' }}>💳 Pagamentos</button>
          <button onClick={() => setActiveTab("historico")} style={{ padding: '12px 16px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer', backgroundColor: activeTab === "historico" ? '#1e293b' : 'transparent', color: activeTab === "historico" ? '#3b82f6' : '#94a3b8', fontWeight: activeTab === "historico" ? 'bold' : '500' }}>📂 Histórico</button>
        </nav>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')} style={{ padding: '12px', background: 'transparent', color: '#f87171', border: '1px solid #451a1a', borderRadius: '10px', cursor: 'pointer', fontSize: '13px' }}>Terminar Sessão</button>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main style={{ flex: 1, padding: '50px', overflowY: 'auto' }}>
        
        {/* SECÇÃO: CONTA (Métricas + Dados de Segurança) */}
        {activeTab === 'conta' && (
          <div style={{ maxWidth: '900px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '35px' }}>Estado da Conta</h1>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
              <div style={{ padding: '24px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>Plano Atual</p>
                <h3 style={{ fontSize: '22px', color: '#4ade80', margin: 0 }}>{perfil?.prod_planos?.nome || "Experimental"}</h3>
              </div>
              <div style={{ padding: '24px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>Saldo Disponível</p>
                <h3 style={{ fontSize: '28px', color: '#3b82f6', margin: 0 }}>{perfil?.creditos_disponiveis ?? 0}</h3>
              </div>
              <div style={{ padding: '24px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                <p style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '8px' }}>Consumo Total</p>
                <h3 style={{ fontSize: '28px', color: '#f59e0b', margin: 0 }}>{perfil?.creditos ?? 0}</h3>
              </div>
            </div>

            <div style={{ padding: '30px', background: '#1e293b', borderRadius: '20px', border: '1px solid #334155' }}>
              <h4 style={{ marginBottom: '25px', fontSize: '18px' }}>🛡️ Informações do Perfil</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '15px', borderBottom: '1px solid #334155' }}>
                  <span style={{ color: '#94a3b8' }}>Email</span>
                  <span>{perfil?.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '15px', borderBottom: '1px solid #334155' }}>
                  <span style={{ color: '#94a3b8' }}>Licença Comercial</span>
                  <span style={{ color: perfil?.acesso_comercial_ativo ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
                    {perfil?.acesso_comercial_ativo ? '✅ ATIVADA' : '❌ DESATIVADA'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '15px', borderBottom: '1px solid #334155' }}>
                  <span style={{ color: '#94a3b8' }}>ID do Utilizador</span>
                  <span style={{ color: '#475569', fontSize: '11px', fontFamily: 'monospace' }}>{perfil?.id}</span>
                </div>
              </div>
              <button onClick={() => alert('Link de recuperação enviado!')} style={{ marginTop: '25px', padding: '10px 20px', background: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Alterar Password</button>
            </div>
          </div>
        )}

        {/* SECÇÃO: PAGAMENTOS (Com Download de Fatura) */}
        {activeTab === 'pagamentos' && (
          <div style={{ maxWidth: '900px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '35px' }}>Histórico Financeiro</h1>
            <div style={{ background: '#1e293b', borderRadius: '20px', border: '1px solid #334155', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#0f172a' }}>
                  <tr>
                    <th style={{ padding: '18px 25px', color: '#94a3b8', fontSize: '12px' }}>DATA</th>
                    <th style={{ padding: '18px 25px', color: '#94a3b8', fontSize: '12px' }}>PLANO</th>
                    <th style={{ padding: '18px 25px', color: '#94a3b8', fontSize: '12px' }}>VALOR</th>
                    <th style={{ padding: '18px 25px', color: '#94a3b8', fontSize: '12px', textAlign: 'center' }}>AÇÃO</th>
                  </tr>
                </thead>
                <tbody>
                  {pagamentos.length > 0 ? pagamentos.map((pag, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '18px 25px' }}>{new Date(pag.created_at).toLocaleDateString()}</td>
                      <td style={{ padding: '18px 25px' }}>{pag.plano_nome || 'Subscrição'}</td>
                      <td style={{ padding: '18px 25px' }}>{pag.valor}€</td>
                      <td style={{ padding: '18px 25px', textAlign: 'center' }}>
                        {pag.url_fatura ? (
                          <a href={pag.url_fatura} target="_blank" style={{ color: '#3b82f6', fontWeight: 'bold', textDecoration: 'none' }}>📥 Baixar PDF</a>
                        ) : <span style={{ color: '#475569' }}>-</span>}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>Ainda não realizou transações.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* SECÇÃO: HISTÓRICO */}
        {activeTab === 'historico' && (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <h3 style={{ color: '#94a3b8' }}>A sua pasta de projetos está vazia.</h3>
          </div>
        )}
      </main>
    </div>
  );
}