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

  // Carregamento de dados inicial (Mantido e Seguro)
  useEffect(() => {
    async function carregarDados() {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // 1. Perfil + Nome do Plano (Tabela prod_perfis)
        const { data: perfilData } = await supabase
          .from('prod_perfis')
          .select('*, prod_planos(nome)')
          .eq('id', session.user.id)
          .maybeSingle();
        
        if (perfilData) setPerfil(perfilData);

        // 2. Transações Reais (Tabela prod_transacoes)
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

  // Nova Função: Atualizar Tipo de Perfil (Maker vs Cliente)
  const atualizarTipoPerfil = async (eMaker: boolean) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Atualiza na base de dados a coluna de acesso comercial
    const { error } = await supabase
      .from('prod_perfis')
      .update({ acesso_comercial_ativo: eMaker })
      .eq('id', session.user.id);

    if (!error) {
      setPerfil({ ...perfil, acesso_comercial_ativo: eMaker });
      alert(eMaker ? "Perfil Maker Ativado! Agora pode baixar STLs." : "Perfil Cliente Ativado.");
    }
  };

  if (loading) return (
    <div style={{ background: '#0f172a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'sans-serif' }}>
      Sincronizando o seu ecossistema MakerPro...
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* SIDEBAR PERSISTENTE (CONGELADA) */}
      <aside style={{ width: '280px', borderRight: '1px solid #1e293b', padding: '30px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '11px', color: '#64748b', marginBottom: '25px', textTransform: 'uppercase', letterSpacing: '1px' }}>Painel de Controlo</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <button onClick={() => setActiveTab("conta")} style={{ padding: '12px 16px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer', backgroundColor: activeTab === "conta" ? '#1e293b' : 'transparent', color: activeTab === "conta" ? '#3b82f6' : '#94a3b8', fontWeight: 'bold' }}>👤 Minha Conta</button>
          <button onClick={() => setActiveTab("pagamentos")} style={{ padding: '12px 16px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer', backgroundColor: activeTab === "pagamentos" ? '#1e293b' : 'transparent', color: activeTab === "pagamentos" ? '#3b82f6' : '#94a3b8', fontWeight: 'bold' }}>💳 Pagamentos</button>
          <button onClick={() => setActiveTab("historico")} style={{ padding: '12px 16px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer', backgroundColor: activeTab === "historico" ? '#1e293b' : 'transparent', color: activeTab === "historico" ? '#3b82f6' : '#94a3b8', fontWeight: 'bold' }}>📂 Meus Projetos</button>
        </nav>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')} style={{ padding: '12px', background: 'transparent', color: '#f87171', border: '1px solid #451a1a', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>Sair</button>
      </aside>

      {/* CONTEÚDO PRINCIPAL */}
      <main style={{ flex: 1, padding: '50px', overflowY: 'auto' }}>
        
        {/* ABA: CONTA */}
        {activeTab === 'conta' && (
          <div style={{ maxWidth: '900px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '35px' }}>Estado da Conta</h1>
            
            {/* Métricas Reais de Créditos */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
              <div style={{ padding: '24px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                <p style={{ color: '#94a3b8', fontSize: '11px' }}>PLANO ATUAL</p>
                <h3 style={{ fontSize: '20px', color: '#4ade80', margin: '5px 0' }}>{perfil?.prod_planos?.nome || "Grátis"}</h3>
              </div>
              <div style={{ padding: '24px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                <p style={{ color: '#94a3b8', fontSize: '11px' }}>SALDO DISPONÍVEL</p>
                <h3 style={{ fontSize: '28px', color: '#3b82f6', margin: '5px 0' }}>{perfil?.creditos_disponiveis ?? 0}</h3>
              </div>
              <div style={{ padding: '24px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                <p style={{ color: '#94a3b8', fontSize: '11px' }}>CONSUMO TOTAL</p>
                <h3 style={{ fontSize: '28px', color: '#f59e0b', margin: '5px 0' }}>{perfil?.creditos ?? 0}</h3>
              </div>
            </div>

            {/* NOVO: SELECTOR DE TIPO DE PERFIL (Dinâmico) */}
            <div style={{ marginBottom: '40px', padding: '30px', background: '#1e293b', borderRadius: '20px', border: '1px solid #334155' }}>
              <h4 style={{ marginBottom: '10px', fontSize: '18px' }}>🚀 Definição de Perfil Profissional</h4>
              <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '25px' }}>Diga-nos como pretende usar a MakerPro para adaptarmos as ferramentas.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div onClick={() => atualizarTipoPerfil(false)} style={{ padding: '20px', borderRadius: '15px', cursor: 'pointer', border: !perfil?.acesso_comercial_ativo ? '2px solid #3b82f6' : '1px solid #334155', background: !perfil?.acesso_comercial_ativo ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}>
                  <span style={{ fontSize: '24px' }}>🏠</span>
                  <h5 style={{ margin: '10px 0 5px 0' }}>Cliente Final</h5>
                  <p style={{ fontSize: '11px', color: '#64748b' }}>Quero personalizar e encomendar peças impressas.</p>
                </div>

                <div onClick={() => atualizarTipoPerfil(true)} style={{ padding: '20px', borderRadius: '15px', cursor: 'pointer', border: perfil?.acesso_comercial_ativo ? '2px solid #4ade80' : '1px solid #334155', background: perfil?.acesso_comercial_ativo ? 'rgba(74, 222, 128, 0.1)' : 'transparent' }}>
                  <span style={{ fontSize: '24px' }}>🛠️</span>
                  <h5 style={{ margin: '10px 0 5px 0' }}>Maker / Empresa</h5>
                  <p style={{ fontSize: '11px', color: '#64748b' }}>Tenho impressora 3D e quero baixar os ficheiros STL.</p>
                </div>
              </div>
            </div>

            {/* Informações de Segurança (Iniciais) */}
            <div style={{ padding: '30px', background: '#1e293b', borderRadius: '20px', border: '1px solid #334155' }}>
              <h4 style={{ marginBottom: '20px', fontSize: '16px', color: '#94a3b8' }}>🛡️ Dados de Segurança</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #0f172a', paddingBottom: '10px' }}>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>E-mail</span>
                  <span style={{ fontSize: '13px' }}>{perfil?.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #0f172a', paddingBottom: '10px' }}>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>ID de Utilizador</span>
                  <span style={{ fontSize: '11px', color: '#475569', fontFamily: 'monospace' }}>{perfil?.id}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA: PAGAMENTOS (Lendo da prod_transacoes) */}
        {activeTab === 'pagamentos' && (
          <div style={{ maxWidth: '900px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '35px' }}>Histórico Financeiro</h1>
            <div style={{ background: '#1e293b', borderRadius: '20px', border: '1px solid #334155', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#0f172a' }}>
                  <tr>
                    <th style={{ padding: '18px 25px', color: '#94a3b8', fontSize: '11px' }}>DATA</th>
                    <th style={{ padding: '18px 25px', color: '#94a3b8', fontSize: '11px' }}>DESCRIÇÃO</th>
                    <th style={{ padding: '18px 25px', color: '#94a3b8', fontSize: '11px' }}>ALTERAÇÃO CRÉD.</th>
                    <th style={{ padding: '18px 25px', color: '#94a3b8', fontSize: '11px', textAlign: 'center' }}>PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {transacoes.length > 0 ? transacoes.map((t, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '18px 25px', fontSize: '13px' }}>{new Date(t.criado_em).toLocaleDateString()}</td>
                      <td style={{ padding: '18px 25px', fontSize: '13px' }}>{t.descricao}</td>
                      <td style={{ padding: '18px 25px', fontSize: '13px', fontWeight: 'bold', color: t.creditos_alterados > 0 ? '#4ade80' : '#f87171' }}>
                        {t.creditos_alterados > 0 ? `+${t.creditos_alterados}` : t.creditos_alterados}
                      </td>
                      <td style={{ padding: '18px 25px', textAlign: 'center' }}>
                         <span style={{ color: '#475569', fontSize: '12px' }}>Disponível Brevemente</span>
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

        {/* ABA: HISTÓRICO PROJETOS */}
        {activeTab === 'historico' && (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <div style={{ fontSize: '50px', marginBottom: '20px' }}>📂</div>
            <h3 style={{ color: '#94a3b8' }}>A sua pasta está vazia.</h3>
            <p style={{ color: '#64748b' }}>Os seus designs personalizados aparecerão aqui após a geração.</p>
          </div>
        )}
      </main>
    </div>
  );
}