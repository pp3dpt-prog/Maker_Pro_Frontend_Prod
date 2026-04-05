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

  const isMaker = perfil?.acesso_comercial_ativo === true;

  useEffect(() => {
    async function carregarDados() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // 1. Dados do Perfil e Plano
        const { data: perfilData } = await supabase
          .from('prod_perfis')
          .select('*, prod_planos(nome)')
          .eq('id', session.user.id)
          .maybeSingle();
        if (perfilData) setPerfil(perfilData);

        // 2. Transações (Créditos ou Encomendas)
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
      
      {/* SIDEBAR COMPLETA */}
      <aside style={{ width: '280px', borderRight: '1px solid #1e293b', padding: '30px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '11px', color: '#64748b', marginBottom: '25px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          {isMaker ? 'Painel Maker Pro' : 'Minha Conta'}
        </h2>
        
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <button onClick={() => setActiveTab("conta")} style={{ padding: '12px 16px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer', backgroundColor: activeTab === "conta" ? '#1e293b' : 'transparent', color: activeTab === "conta" ? '#3b82f6' : '#94a3b8', fontWeight: 'bold' }}>👤 Resumo</button>
          <button onClick={() => setActiveTab("faturacao")} style={{ padding: '12px 16px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer', backgroundColor: activeTab === "faturacao" ? '#1e293b' : 'transparent', color: activeTab === "faturacao" ? '#3b82f6' : '#94a3b8', fontWeight: 'bold' }}>💳 {isMaker ? 'Créditos e Planos' : 'Minhas Encomendas'}</button>
          <button onClick={() => setActiveTab("projetos")} style={{ padding: '12px 16px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer', backgroundColor: activeTab === "projetos" ? '#1e293b' : 'transparent', color: activeTab === "projetos" ? '#3b82f6' : '#94a3b8', fontWeight: 'bold' }}>📂 {isMaker ? 'Ficheiros STL' : 'Meus Projetos'}</button>
        </nav>

        {/* BOTÃO LOGOUT (Recuperado) */}
        <button 
          onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')}
          style={{ padding: '12px', background: 'transparent', color: '#f87171', border: '1px solid #451a1a', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}
        >
          Sair da Conta
        </button>
      </aside>

      <main style={{ flex: 1, padding: '50px', overflowY: 'auto' }}>
        
        {/* ABA 1: RESUMO (Métricas Recuperadas) */}
        {activeTab === 'conta' && (
          <div style={{ maxWidth: '900px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '35px' }}>
               <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>Bem-vindo, {perfil?.email?.split('@')[0]}</h1>
               {!isMaker && (
                 <button onClick={() => window.location.href = '/preçario'} style={{ padding: '12px 24px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: 'bold' }}>
                   TORNE-SE MAKER
                 </button>
               )}
            </div>
            
            {/* Métricas de Créditos (Sempre visíveis para controlo) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
              <div style={{ padding: '24px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
                <p style={{ color: '#94a3b8', fontSize: '11px' }}>PLANO ATIVO</p>
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

            {/* STATUS DE LICENÇA (Regra de Negócio: Bloqueada para Admin) */}
            <div style={{ padding: '30px', background: '#1e293b', borderRadius: '20px', border: '1px solid #334155' }}>
              <h4 style={{ marginBottom: '20px', fontSize: '16px' }}>🛡️ Segurança e Licenciamento</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #0f172a', paddingBottom: '10px' }}>
                  <span style={{ color: '#64748b' }}>Licença Comercial</span>
                  <span style={{ color: isMaker ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
                    {isMaker ? '✅ ATIVA' : '❌ INATIVA (Apenas Uso Pessoal)'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #0f172a', paddingBottom: '10px' }}>
                  <span style={{ color: '#64748b' }}>UID</span>
                  <span style={{ fontSize: '11px', color: '#475569', fontFamily: 'monospace' }}>{perfil?.id}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: FATURAÇÃO (Diferenciada por Perfil) */}
        {activeTab === 'faturacao' && (
          <div style={{ maxWidth: '900px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '35px' }}>
              {isMaker ? 'Histórico de Créditos' : 'Histórico de Encomendas'}
            </h1>
            <div style={{ background: '#1e293b', borderRadius: '20px', border: '1px solid #334155', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#0f172a' }}>
                  <tr>
                    <th style={{ padding: '18px 25px', color: '#94a3b8', fontSize: '11px', textAlign: 'left' }}>DATA</th>
                    <th style={{ padding: '18px 25px', color: '#94a3b8', fontSize: '11px', textAlign: 'left' }}>DESCRIÇÃO</th>
                    <th style={{ padding: '18px 25px', color: '#94a3b8', fontSize: '11px', textAlign: 'right' }}>{isMaker ? 'CRÉDITOS' : 'ESTADO'}</th>
                  </tr>
                </thead>
                <tbody>
                  {transacoes.map((t, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #334155' }}>
                      <td style={{ padding: '18px 25px', fontSize: '13px' }}>{new Date(t.criado_em).toLocaleDateString()}</td>
                      <td style={{ padding: '18px 25px', fontSize: '13px' }}>{t.descricao}</td>
                      <td style={{ padding: '18px 25px', fontSize: '13px', textAlign: 'right', fontWeight: 'bold' }}>
                        {isMaker ? (t.creditos_alterados > 0 ? `+${t.creditos_alterados}` : t.creditos_alterados) : 'Enviado 📦'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA 3: PROJETOS (Recuperada) */}
        {activeTab === 'projetos' && (
          <div style={{ textAlign: 'center', padding: '100px 0' }}>
            <div style={{ fontSize: '50px', marginBottom: '20px' }}>📁</div>
            <h3 style={{ color: '#94a3b8' }}>{isMaker ? 'Os seus ficheiros STL exportados aparecerão aqui.' : 'A sua pasta de projetos está vazia.'}</h3>
            <p style={{ color: '#64748b' }}>Comece a criar no editor para ver os seus ficheiros aqui.</p>
          </div>
        )}

      </main>
    </div>
  );
}