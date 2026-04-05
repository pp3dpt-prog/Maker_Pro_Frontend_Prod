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

  const atualizarTipoPerfil = async (eMaker: boolean) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // Atualiza a coluna acesso_comercial_ativo na prod_perfis
    const { error } = await supabase
      .from('prod_perfis')
      .update({ acesso_comercial_ativo: eMaker })
      .eq('id', session.user.id);

    if (!error) {
      setPerfil({ ...perfil, acesso_comercial_ativo: eMaker });
      alert(eMaker ? "Perfil Maker Ativado! Licença Comercial Ativa." : "Perfil Cliente Ativado.");
    }
  };

  if (loading) return (
    <div style={{ background: '#0f172a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'sans-serif' }}>
      A carregar o seu ecossistema...
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>
      
      {/* SIDEBAR */}
      <aside style={{ width: '280px', borderRight: '1px solid #1e293b', padding: '30px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '11px', color: '#64748b', marginBottom: '25px', textTransform: 'uppercase', letterSpacing: '1px' }}>Menu</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <button onClick={() => setActiveTab("conta")} style={{ padding: '12px 16px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer', backgroundColor: activeTab === "conta" ? '#1e293b' : 'transparent', color: activeTab === "conta" ? '#3b82f6' : '#94a3b8', fontWeight: 'bold' }}>👤 Conta</button>
          <button onClick={() => setActiveTab("pagamentos")} style={{ padding: '12px 16px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer', backgroundColor: activeTab === "pagamentos" ? '#1e293b' : 'transparent', color: activeTab === "pagamentos" ? '#3b82f6' : '#94a3b8', fontWeight: 'bold' }}>💳 Pagamentos</button>
          <button onClick={() => setActiveTab("historico")} style={{ padding: '12px 16px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer', backgroundColor: activeTab === "historico" ? '#1e293b' : 'transparent', color: activeTab === "historico" ? '#3b82f6' : '#94a3b8', fontWeight: 'bold' }}>📂 Projetos</button>
        </nav>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')} style={{ padding: '12px', background: 'transparent', color: '#f87171', border: '1px solid #451a1a', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>Sair</button>
      </aside>

      <main style={{ flex: 1, padding: '50px', overflowY: 'auto' }}>
        
        {activeTab === 'conta' && (
          <div style={{ maxWidth: '900px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '35px' }}>O meu Perfil</h1>
            
            {/* MÉTRICAS (Plano e Créditos) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
              <div style={{ padding: '24px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                <p style={{ color: '#94a3b8', fontSize: '11px' }}>PLANO</p>
                <h3 style={{ fontSize: '20px', color: '#4ade80', margin: '5px 0' }}>{perfil?.prod_planos?.nome || "Grátis"}</h3>
              </div>
              <div style={{ padding: '24px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                <p style={{ color: '#94a3b8', fontSize: '11px' }}>CRÉDITOS</p>
                <h3 style={{ fontSize: '28px', color: '#3b82f6', margin: '5px 0' }}>{perfil?.creditos_disponiveis ?? 0}</h3>
              </div>
              <div style={{ padding: '24px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                <p style={{ color: '#94a3b8', fontSize: '11px' }}>TOTAL USADO</p>
                <h3 style={{ fontSize: '28px', color: '#f59e0b', margin: '5px 0' }}>{perfil?.creditos ?? 0}</h3>
              </div>
            </div>

            {/* SELETOR DE PERFIL */}
            <div style={{ marginBottom: '40px', padding: '30px', background: '#1e293b', borderRadius: '20px', border: '1px solid #334155' }}>
              <h4 style={{ marginBottom: '10px', fontSize: '18px' }}>🚀 Escolha o seu modo de uso</h4>
              <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '25px' }}>Altere entre Cliente ou Maker para desbloquear ferramentas de download.</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div onClick={() => atualizarTipoPerfil(false)} style={{ padding: '20px', borderRadius: '15px', cursor: 'pointer', border: !perfil?.acesso_comercial_ativo ? '2px solid #3b82f6' : '1px solid #334155', background: !perfil?.acesso_comercial_ativo ? 'rgba(59, 130, 246, 0.1)' : 'transparent' }}>
                  <span style={{ fontSize: '24px' }}>🏠</span>
                  <h5 style={{ margin: '10px 0 5px 0' }}>Cliente Final</h5>
                  <p style={{ fontSize: '11px', color: '#64748b' }}>Apenas personalização e encomenda.</p>
                </div>

                <div onClick={() => atualizarTipoPerfil(true)} style={{ padding: '20px', borderRadius: '15px', cursor: 'pointer', border: perfil?.acesso_comercial_ativo ? '2px solid #4ade80' : '1px solid #334155', background: perfil?.acesso_comercial_ativo ? 'rgba(74, 222, 128, 0.1)' : 'transparent' }}>
                  <span style={{ fontSize: '24px' }}>🛠️</span>
                  <h5 style={{ margin: '10px 0 5px 0' }}>Maker / Pro</h5>
                  <p style={{ fontSize: '11px', color: '#64748b' }}>Download de STL e Licença Comercial.</p>
                </div>
              </div>
            </div>

            {/* SEGURANÇA E LICENÇA (REINSERIDO) */}
            <div style={{ padding: '30px', background: '#1e293b', borderRadius: '20px', border: '1px solid #334155' }}>
              <h4 style={{ marginBottom: '20px', fontSize: '16px', color: '#94a3b8' }}>🛡️ Detalhes da Conta</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                {/* STATUS DA LICENÇA COMERCIAL */}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #0f172a', paddingBottom: '10px' }}>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>Licença Comercial</span>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: 'bold', 
                    color: perfil?.acesso_comercial_ativo ? '#4ade80' : '#f87171',
                    background: perfil?.acesso_comercial_ativo ? 'rgba(74, 222, 128, 0.1)' : 'rgba(248, 113, 113, 0.1)',
                    padding: '2px 8px',
                    borderRadius: '5px'
                  }}>
                    {perfil?.acesso_comercial_ativo ? 'ATIVA' : 'INATIVA'}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #0f172a', paddingBottom: '10px' }}>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>E-mail</span>
                  <span style={{ fontSize: '13px' }}>{perfil?.email}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748b', fontSize: '13px' }}>User UID</span>
                  <span style={{ fontSize: '11px', color: '#475569', fontFamily: 'monospace' }}>{perfil?.id}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* OUTRAS ABAS (MANTIDAS) */}
        {activeTab === 'pagamentos' && (
          <div style={{ maxWidth: '900px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '35px' }}>Pagamentos</h1>
            <div style={{ background: '#1e293b', borderRadius: '20px', border: '1px solid #334155', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead style={{ background: '#0f172a' }}>
                  <tr>
                    <th style={{ padding: '18px 25px', color: '#94a3b8', fontSize: '11px' }}>DATA</th>
                    <th style={{ padding: '18px 25px', color: '#94a3b8', fontSize: '11px' }}>DESCRIÇÃO</th>
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