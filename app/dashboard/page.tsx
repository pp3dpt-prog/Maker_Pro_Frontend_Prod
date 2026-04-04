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
        // 1. Carregar Perfil e Plano
        const { data: perfilData } = await supabase
          .from('prod_perfis')
          .select('*, prod_planos(*)')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (perfilData) setPerfil(perfilData);

        // 2. Carregar Histórico de Pagamentos (Simulação ou Real)
        const { data: pagamentosData } = await supabase
          .from('prod_pagamentos') // Substitui pelo nome real da tua tabela de faturas
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (pagamentosData) setPagamentos(pagamentosData);
      }
      setLoading(false);
    }
    carregarDados();
  }, []);

  if (loading) return <div style={{ background: '#0f172a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>Carregando...</div>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* SIDEBAR */}
      <aside style={{ width: '280px', borderRight: '1px solid #1e293b', padding: '30px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '11px', color: '#64748b', marginBottom: '25px', textTransform: 'uppercase' }}>Menu MakerPro</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <button onClick={() => setActiveTab("conta")} style={{ padding: '12px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer', backgroundColor: activeTab === "conta" ? '#1e293b' : 'transparent', color: activeTab === "conta" ? '#3b82f6' : '#94a3b8' }}>👤 Minha Conta</button>
          <button onClick={() => setActiveTab("pagamentos")} style={{ padding: '12px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer', backgroundColor: activeTab === "pagamentos" ? '#1e293b' : 'transparent', color: activeTab === "pagamentos" ? '#3b82f6' : '#94a3b8' }}>💳 Pagamentos & Faturas</button>
          <button onClick={() => setActiveTab("historico")} style={{ padding: '12px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer', backgroundColor: activeTab === "historico" ? '#1e293b' : 'transparent', color: activeTab === "historico" ? '#3b82f6' : '#94a3b8' }}>📂 Histórico</button>
        </nav>
      </aside>

      {/* CONTEÚDO */}
      <main style={{ flex: 1, padding: '50px' }}>
        
        {/* ABA: CONTA */}
        {activeTab === 'conta' && (
          <div>
            <h1 style={{ fontSize: '28px', marginBottom: '30px' }}>Estado da Conta</h1>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '40px' }}>
              <div style={{ padding: '24px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                <p style={{ color: '#94a3b8', fontSize: '12px' }}>Plano Atual</p>
                <h3 style={{ color: '#4ade80', margin: '5px 0' }}>{perfil?.prod_planos?.nome || "Experimental"}</h3>
              </div>
              <div style={{ padding: '24px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                <p style={{ color: '#94a3b8', fontSize: '12px' }}>Créditos Disponíveis</p>
                <h3 style={{ color: '#3b82f6', margin: '5px 0' }}>{perfil?.creditos_disponiveis ?? 0}</h3>
              </div>
              <div style={{ padding: '24px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                <p style={{ color: '#94a3b8', fontSize: '12px' }}>Total Consumido</p>
                <h3 style={{ color: '#f59e0b', margin: '5px 0' }}>{perfil?.creditos ?? 0}</h3>
              </div>
            </div>
          </div>
        )}

        {/* ABA: PAGAMENTOS COM DOWNLOAD */}
        {activeTab === 'pagamentos' && (
          <div>
            <h1 style={{ fontSize: '28px', marginBottom: '10px' }}>Histórico de Faturação</h1>
            <p style={{ color: '#64748b', marginBottom: '30px' }}>Consulte e baixe as suas faturas anteriores.</p>

            <div style={{ background: '#1e293b', borderRadius: '20px', border: '1px solid #334155', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#0f172a' }}>
                  <tr>
                    <th style={{ padding: '15px 20px', color: '#94a3b8', fontSize: '13px' }}>Data</th>
                    <th style={{ padding: '15px 20px', color: '#94a3b8', fontSize: '13px' }}>Plano</th>
                    <th style={{ padding: '15px 20px', color: '#94a3b8', fontSize: '13px' }}>Valor</th>
                    <th style={{ padding: '15px 20px', color: '#94a3b8', fontSize: '13px', textAlign: 'center' }}>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pagamentos.length > 0 ? (
                    pagamentos.map((pag, index) => (
                      <tr key={index} style={{ borderBottom: '1px solid #334155' }}>
                        <td style={{ padding: '15px 20px', fontSize: '14px' }}>{new Date(pag.created_at).toLocaleDateString()}</td>
                        <td style={{ padding: '15px 20px', fontSize: '14px' }}>{pag.plano_nome}</td>
                        <td style={{ padding: '15px 20px', fontSize: '14px' }}>{pag.valor}€</td>
                        <td style={{ padding: '15px 20px', textAlign: 'center' }}>
                          {pag.url_fatura ? (
                            <a href={pag.url_fatura} target="_blank" rel="noreferrer" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '13px', fontWeight: 'bold' }}>
                              📥 Download PDF
                            </a>
                          ) : (
                            <span style={{ color: '#475569', fontSize: '12px' }}>Processando...</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                        Ainda não existem faturas disponíveis para download.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA: HISTÓRICO */}
        {activeTab === 'historico' && (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📂</div>
            <h3 style={{ color: '#94a3b8' }}>Nenhum download registado.</h3>
          </div>
        )}

      </main>
    </div>
  );
}