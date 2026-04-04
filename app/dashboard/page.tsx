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
        // 1. Perfil + Nome do Plano
        const { data: perfilData } = await supabase
          .from('prod_perfis')
          .select('*, prod_planos(nome)')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (perfilData) setPerfil(perfilData);

        // 2. Transações (da tua tabela prod_transacoes)
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
      A preparar o seu Dashboard MakerPro...
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* SIDEBAR - TODAS AS OPÇÕES + LOGOUT */}
      <aside style={{ width: '280px', borderRight: '1px solid #1e293b', padding: '30px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '11px', color: '#64748b', marginBottom: '25px', textTransform: 'uppercase', letterSpacing: '1px' }}>Menu MakerPro</h2>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <button onClick={() => setActiveTab("conta")} style={{ padding: '12px 16px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer', backgroundColor: activeTab === "conta" ? '#1e293b' : 'transparent', color: activeTab === "conta" ? '#3b82f6' : '#94a3b8', fontWeight: 'bold' }}>👤 Minha Conta</button>
          <button onClick={() => setActiveTab("pagamentos")} style={{ padding: '12px 16px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer', backgroundColor: activeTab === "pagamentos" ? '#1e293b' : 'transparent', color: activeTab === "pagamentos" ? '#3b82f6' : '#94a3b8', fontWeight: 'bold' }}>💳 Pagamentos</button>
          <button onClick={() => setActiveTab("historico")} style={{ padding: '12px 16px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer', backgroundColor: activeTab === "historico" ? '#1e293b' : 'transparent', color: activeTab === "historico" ? '#3b82f6' : '#94a3b8', fontWeight: 'bold' }}>📂 Meus Projetos</button>
        </nav>

        <button 
          onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')}
          style={{ padding: '12px', background: 'transparent', color: '#f87171', border: '1px solid #451a1a', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
        >
          Sair da Conta
        </button>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main style={{ flex: 1, padding: '50px', overflowY: 'auto' }}>
        
        {/* ABA 1: CONTA (Métricas + Segurança) */}
        {activeTab === 'conta' && (
          <div style={{ maxWidth: '900px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '35px' }}>Resumo da Conta</h1>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
              <div style={{ padding: '24px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                <p style={{ color: '#94a3b8', fontSize: '12px' }}>Plano Ativo</p>
                <h3 style={{ fontSize: '22px', color: '#4ade80', margin: '5px 0' }}>{perfil?.prod_planos?.nome || "Experimental"}</h3>
              </div>
              <div style={{ padding: '24px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                <p style={{ color: '#94a3b8', fontSize: '12px' }}>Saldo Disponível</p>
                <h3 style={{ fontSize: '28px', color: '#3b82f6', margin: '5px 0' }}>{perfil?.creditos_disponiveis ?? 0}</h3>
              </div>
              <div style={{ padding: '24px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                <p style={{ color: '#94a3b8', fontSize: '12px' }}>Consumo Total</p>
                <h3 style={{ fontSize: '28px', color: '#f59e0b', margin: '5px 0' }}>{perfil?.creditos ?? 0}</h3>
              </div>
            </div>

            <div style={{ padding: '30px', background: '#1e293b', borderRadius: '20px', border: '1px solid #334155' }}>
              <h4 style={{ marginBottom: '25px', fontSize: '18px' }}>🛡️ Dados do Perfil</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '15px' }}>
                  <span style={{ color: '#94a3b8' }}>Email</span>
                  <span>{perfil?.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '15px' }}>
                  <span style={{ color: '#94a3b8' }}>Venda Comercial</span>
                  <span style={{ color: perfil?.acesso_comercial_ativo ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
                    {perfil?.acesso_comercial_ativo ? '✅ AUTORIZADA' : '❌ NEGADA'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '15px' }}>
                  <span style={{ color: '#94a3b8' }}>ID (UID)</span>
                  <span style={{ color: '#475569', fontSize: '11px', fontFamily: 'monospace' }}>{perfil?.id}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: PAGAMENTOS (Lendo prod_transacoes) */}
        {activeTab === 'pagamentos' && (
          <div style={{ maxWidth: '900px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '35px' }}>Faturação e Transações</h1>
            <div style={{ background: '#1e293b', borderRadius: '20px', border: '1px solid #334155', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#0f172a' }}>
                  <tr>
                    <th style={{ padding: '18px 25px', color: '#94a3b8', fontSize: '12px' }}>DATA</th>
                    <th style={{ padding: '18px 25px', color: '#94a3b8', fontSize: '12px' }}>DESCRIÇÃO</th>
                    <th style={{ padding: '18px 25px', color: '#94a3b8', fontSize: '12px' }}>VALOR/CRÉD</th>
                    <th style={{ padding: '18px 25px', color: '#94a3b8', fontSize: '12px', textAlign: 'center' }}>PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {transacoes.length > 0 ? transacoes.map((t, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '18px 25px' }}>{new Date(t.criado_em).toLocaleDateString()}</td>
                      <td style={{ padding: '18px 25px' }}>{t.descricao || 'Subscrição'}</td>
                      <td style={{ padding: '18px 25px' }}>{t.creditos_alterados > 0 ? `+${t.creditos_alterados}` : t.creditos_alterados}</td>
                      <td style={{ padding: '18px 25px', textAlign: 'center' }}>
                        {t.url_fatura ? (
                          <a href={t.url_fatura} target="_blank" style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '13px' }}>Download</a>
                        ) : <span style={{ color: '#475569' }}>-</span>}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>Nenhuma transação registada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA 3: HISTÓRICO DE PROJETOS (Recuperada) */}
        {activeTab === 'historico' && (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <div style={{ fontSize: '50px', marginBottom: '20px' }}>📁</div>
            <h3 style={{ color: '#94a3b8' }}>A sua pasta de projetos está vazia.</h3>
            <p style={{ color: '#64748b' }}>Comece a criar no editor para ver os seus ficheiros aqui.</p>
          </div>
        )}

      </main>
    </div>
  );
}