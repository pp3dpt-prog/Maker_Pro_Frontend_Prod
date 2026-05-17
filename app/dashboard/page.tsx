'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type Perfil = {
  id: string;
  email: string;
  creditos: number;
  creditos_disponiveis: number;
  acesso_comercial_ativo: boolean;
  prod_planos?: { nome: string } | null;
};

type Transacao = {
  criado_em: string;
  descricao: string;
  creditos_alterados: number;
};

type UserAsset = {
  id: string;
  design_id: string;
  stl_url: string;
  last_rendered_at: string;
  is_archived: boolean;
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'conta' | 'faturacao' | 'projetos'>('conta');
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [transacoes, setTransacoes] = useState<Transacao[]>([]);
  const [assets, setAssets] = useState<UserAsset[]>([]);
  const [loading, setLoading] = useState(true);

  const isMaker = perfil?.acesso_comercial_ativo === true;

  useEffect(() => {
    async function carregarDados() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); return; }

      const { data: perfilData } = await supabase
        .from('prod_perfis')
        .select('*, prod_planos(nome)')
        .eq('id', session.user.id)
        .maybeSingle();
      if (perfilData) setPerfil(perfilData as Perfil);

      const { data: transData } = await supabase
        .from('prod_transacoes')
        .select('*')
        .eq('user_id', session.user.id)
        .order('criado_em', { ascending: false });
      if (transData) setTransacoes(transData as Transacao[]);

      const { data: assetsData } = await supabase
        .from('prod_user_assets')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('is_archived', false)
        .order('last_rendered_at', { ascending: false });
      if (assetsData) setAssets(assetsData as UserAsset[]);

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

      {/* SIDEBAR */}
      <aside style={{ width: '280px', borderRight: '1px solid #1e293b', padding: '30px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '11px', color: '#64748b', marginBottom: '25px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Menu Maker
        </h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {[
            { id: 'conta', label: '👤 Resumo da Conta' },
            { id: 'faturacao', label: '💳 Compras e Créditos' },
            { id: 'projetos', label: '📂 Meus Ficheiros STL' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              style={{
                padding: '12px 16px', borderRadius: '10px', border: 'none',
                textAlign: 'left', cursor: 'pointer',
                backgroundColor: activeTab === item.id ? '#1e293b' : 'transparent',
                color: activeTab === item.id ? '#3b82f6' : '#94a3b8',
                fontWeight: 'bold', fontFamily: 'inherit',
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
        <Link
          href="/produtos"
          style={{
            display: 'block', textAlign: 'center', padding: '12px', marginBottom: '10px',
            background: '#2563eb', color: 'white', borderRadius: '10px',
            fontSize: '13px', fontWeight: 'bold', textDecoration: 'none',
          }}
        >
          🛍️ Ver Catálogo
        </Link>
        <button
          onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')}
          style={{ padding: '12px', background: 'transparent', color: '#f87171', border: '1px solid #451a1a', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', fontFamily: 'inherit', width: '100%' }}
        >
          Sair
        </button>
      </aside>

      {/* CONTEÚDO */}
      <main style={{ flex: 1, padding: '50px', overflowY: 'auto' }}>

        {/* ABA CONTA */}
        {activeTab === 'conta' && (
          <div style={{ maxWidth: '900px' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold', marginBottom: '35px' }}>
              Olá, {perfil?.email?.split('@')[0]}
            </h1>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px', marginBottom: '40px' }}>
              <StatCard label="PLANO ATIVO" value={perfil?.prod_planos?.nome || 'Uso Pessoal'} color="#4ade80" />
              <StatCard label="CRÉDITOS DISPONÍVEIS" value={String(perfil?.creditos_disponiveis ?? 0)} color="#3b82f6" />
              <StatCard label="FICHEIROS STL" value={String(assets.length)} color="#a78bfa" />
            </div>
            <div style={{ padding: '30px', background: '#1e293b', borderRadius: '20px', border: '1px solid #334155' }}>
              <h4 style={{ marginBottom: '20px', fontSize: '16px' }}>🛡️ Estado da Licença</h4>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                {isMaker
                  ? '✅ Licença Comercial Ativa: Pode vender as peças impressas.'
                  : '❌ Apenas Uso Pessoal: Atualize para um plano Maker para vender as suas impressões.'}
              </p>
            </div>
          </div>
        )}

        {/* ABA FATURAÇÃO */}
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
                      <td style={{ padding: '18px', fontSize: '13px' }}>{new Date(t.criado_em).toLocaleDateString('pt-PT')}</td>
                      <td style={{ padding: '18px', fontSize: '13px' }}>{t.descricao}</td>
                      <td style={{ padding: '18px', textAlign: 'right', fontSize: '13px', fontWeight: 'bold', color: t.creditos_alterados > 0 ? '#4ade80' : '#f87171' }}>
                        {t.creditos_alterados > 0 ? `+${t.creditos_alterados}` : t.creditos_alterados} ₡
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={3} style={{ padding: '40px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                        Não existem registos de faturação.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA FICHEIROS STL */}
        {activeTab === 'projetos' && (
          <div style={{ maxWidth: '900px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>📂 Meus Ficheiros STL</h1>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '30px' }}>
              Cada download fica guardado aqui durante 30 dias.
            </p>

            {assets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <div style={{ fontSize: '50px', marginBottom: '20px' }}>📁</div>
                <h3 style={{ color: '#94a3b8', marginBottom: '10px' }}>Ainda não tens ficheiros guardados.</h3>
                <p style={{ color: '#64748b', fontSize: '14px' }}>Os teus downloads STL aparecerão aqui automaticamente.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {assets.map((asset) => (
                  <div
                    key={asset.id}
                    style={{
                      background: '#1e293b',
                      borderRadius: '16px',
                      border: '1px solid #334155',
                      padding: '20px 24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {/* Ícone */}
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '12px',
                        background: '#0f172a', border: '1px solid #334155',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '20px', flexShrink: 0,
                      }}>
                        {asset.stl_url?.endsWith('.zip') ? '🗜️' : '🧊'}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, color: '#f1f5f9', fontSize: '15px' }}>
                          {asset.design_id}
                        </p>
                        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '12px' }}>
                          {asset.stl_url?.endsWith('.zip') ? 'ZIP (caixa + tampa)' : 'STL'}
                          {' · '}
                          {new Date(asset.last_rendered_at).toLocaleDateString('pt-PT', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </p>
                      </div>
                    </div>

                    <a
                      href={asset.stl_url}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        padding: '10px 18px',
                        borderRadius: '10px',
                        background: '#0f172a',
                        border: '1px solid #334155',
                        color: '#94a3b8',
                        fontSize: '13px',
                        fontWeight: 700,
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        flexShrink: 0,
                        transition: 'all 0.2s',
                      }}
                    >
                      ⬇️ Descarregar
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: '24px', background: '#1e293b', borderRadius: '16px', border: '1px solid #334155' }}>
      <p style={{ color: '#94a3b8', fontSize: '11px', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '1px' }}>{label}</p>
      <h3 style={{ fontSize: '24px', color, margin: 0, fontWeight: 900 }}>{value}</h3>
    </div>
  );
}
