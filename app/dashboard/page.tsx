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
        // 1. Carregar Perfil + Nome do Plano
        const { data: perfilData } = await supabase
          .from('prod_perfis')
          .select('*, prod_planos(nome)')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (perfilData) setPerfil(perfilData);

        // 2. Carregar Transações da tabela prod_transacoes
        // Note: Adicionei 'url_fatura' assumindo que a irás criar para o Stripe
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
    <div style={{ background: '#0f172a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
      Sincronizando dados...
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* SIDEBAR PERSISTENTE */}
      <aside style={{ width: '280px', borderRight: '1px solid #1e293b', padding: '30px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '11px', color: '#64748b', marginBottom: '25px', textTransform: 'uppercase' }}>Menu MakerPro</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <button onClick={() => setActiveTab("conta")} style={{ padding: '12px 16px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer', backgroundColor: activeTab === "conta" ? '#1e293b' : 'transparent', color: activeTab === "conta" ? '#3b82f6' : '#94a3b8', fontWeight: 'bold' }}>👤 Minha Conta</button>
          <button onClick={() => setActiveTab("pagamentos")} style={{ padding: '12px 16px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer', backgroundColor: activeTab === "pagamentos" ? '#1e293b' : 'transparent', color: activeTab === "pagamentos" ? '#3b82f6' : '#94a3b8', fontWeight: 'bold' }}>💳 Pagamentos</button>
          <button onClick={() => setActiveTab("historico")} style={{ padding: '12px 16px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer', backgroundColor: activeTab === "historico" ? '#1e293b' : 'transparent', color: activeTab === "historico" ? '#3b82f6' : '#94a3b8', fontWeight: 'bold' }}>📂 Projetos</button>
        </nav>
      </aside>

      <main style={{ flex: 1, padding: '50px', overflowY: 'auto' }}>
        
        {/* ABA CONTA: Métricas e Segurança */}
        {activeTab === 'conta' && (
          <div style={{ maxWidth: '900px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '35px' }}>Resumo da Conta</h1>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
              <div style={{ padding: '24px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                <p style={{ color: '#94a3b8', fontSize: '12px' }}>Plano Atual</p>
                <h3 style={{ fontSize: '22px', color: '#4ade80' }}>{perfil?.prod_planos?.nome || "Experimental"}</h3>
              </div>
              <div style={{ padding: '24px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                <p style={{ color: '#94a3b8', fontSize: '12px' }}>Saldo Disponível</p>
                <h3 style={{ fontSize: '28px', color: '#3b82f6' }}>{perfil?.creditos_disponiveis ?? 0}</h3>
              </div>
              <div style={{ padding: '24px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                <p style={{ color: '#94a3b8', fontSize: '12px' }}>Total Consumido</p>
                <h3 style={{ fontSize: '28px', color: '#f59e0b' }}>{perfil?.creditos ?? 0}</h3>
              </div>
            </div>

            <div style={{ padding: '30px', background: '#1e293b', borderRadius: '20px', border: '1px solid #334155' }}>
              <h4 style={{ marginBottom: '25px', fontSize: '18px' }}>🛡️ Detalhes de Segurança</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '15px' }}>
                  <span style={{ color: '#94a3b8' }}>Email</span>
                  <span>{perfil?.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #334155', paddingBottom: '15px' }}>
                  <span style={{ color: '#94a3b8' }}>Licença Comercial</span>
                  <span style={{ color: perfil?.acesso_comercial_ativo ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
                    {perfil?.acesso_comercial_ativo ? '✅ ATIVADA' : '❌ DESATIVADA'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA PAGAMENTOS: Lendo da prod_transacoes */}
        {activeTab === 'pagamentos' && (
          <div style={{ maxWidth: '900px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '35px' }}>Transações e Faturas</h1>
            <div style={{ background: '#1e293b', borderRadius: '20px', border: '1px solid #334155', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#0f172a' }}>
                  <tr>
                    <th style={{ padding: '18px 25px', color: '#94a3b8', fontSize: '12px' }}>DATA</th>
                    <th style={{ padding: '18px 25px', color: '#94a3b8', fontSize: '12px' }}>DESCRIÇÃO</th>
                    <th style={{ padding: '18px 25px', color: '#94a3b8', fontSize: '12px' }}>CRÉDITOS</th>
                    <th style={{ padding: '18px 25px', color: '#94a3b8', fontSize: '12px', textAlign: 'center' }}>FATURA</th>
                  </tr>
                </thead>
                <tbody>
                  {transacoes.length > 0 ? transacoes.map((t, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '18px 25px' }}>{new Date(t.criado_em).toLocaleDateString()}</td>
                      <td style={{ padding: '18px 25px' }}>{t.descricao}</td>
                      <td style={{ padding: '18px 25px' }}>{t.creditos_alterados > 0 ? `+${t.creditos_alterados}` : t.creditos_alterados}</td>
                      <td style={{ padding: '18px 25px', textAlign: 'center' }}>
                        {t.url_fatura ? (
                          <a href={t.url_fatura} target="_blank" style={{ color: '#3b82f6', fontWeight: 'bold', textDecoration: 'none' }}>Baixar PDF</a>
                        ) : <span style={{ color: '#475569' }}>-</span>}
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} style={{ padding: '50px', textAlign: 'center', color: '#64748b' }}>Nenhuma transação encontrada.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}