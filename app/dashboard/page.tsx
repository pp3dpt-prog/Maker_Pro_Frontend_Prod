'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

type Perfil = {
  id: string;
  email: string;
  role: string | null;
  plano: string;
  tipo_utilizador: string;
  downloads_mes: number;
  downloads_limite: number;
};

type UserAsset = {
  id: string;
  design_id: string;
  nome_personalizado: string;
  stl_url: string;
  last_rendered_at: string;
  is_archived: boolean;
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'conta' | 'plano' | 'projetos'>('conta');
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [assets, setAssets] = useState<UserAsset[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function carregarDados() {
      try {
        const resp = await fetch('/api/auth/refresh', { method: 'POST' });
        if (!resp.ok) return;
        const { user_id } = await resp.json();
        if (!user_id) return;

        const { data: perfilData } = await supabase
          .from('prod_perfis')
          .select('id, email, role, plano, tipo_utilizador, downloads_mes, downloads_limite')
          .eq('id', user_id)
          .maybeSingle();
        if (perfilData) setPerfil(perfilData as Perfil);

        const { data: assetsData } = await supabase
          .from('prod_user_assets')
          .select('*')
          .eq('user_id', user_id)
          .order('last_rendered_at', { ascending: false });
        if (assetsData) setAssets(assetsData as UserAsset[]);
      } catch (_) {
        // erro de rede — não bloquear o loading
      } finally {
        setLoading(false);
      }
    }
    carregarDados();
  }, []);

  if (loading) return (
    <div style={{ background: '#0f172a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'sans-serif' }}>
      A carregar o teu painel…
    </div>
  );

  const downloadsRestantes = Math.max(0, (perfil?.downloads_limite ?? 3) - (perfil?.downloads_mes ?? 0));
  const temLicencaComercial = perfil?.plano?.startsWith('comercial');

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>

      {/* SIDEBAR */}
      <aside style={{ width: '280px', borderRight: '1px solid #1e293b', padding: '30px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '11px', color: '#64748b', marginBottom: '25px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Painel
        </h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {[
            { id: 'conta',   label: '👤 Resumo da Conta' },
            { id: 'plano',   label: '🎯 Plano & Downloads' },
            { id: 'projetos', label: '📂 Meus Ficheiros STL' },
          ].map((item) => (
            <button key={item.id} onClick={() => setActiveTab(item.id as any)}
              style={{ padding: '12px 16px', borderRadius: '10px', border: 'none', textAlign: 'left', cursor: 'pointer', backgroundColor: activeTab === item.id ? '#1e293b' : 'transparent', color: activeTab === item.id ? '#3b82f6' : '#94a3b8', fontWeight: 'bold', fontFamily: 'inherit' }}>
              {item.label}
            </button>
          ))}
        </nav>
        <Link href="/produtos" style={{ display: 'block', textAlign: 'center', padding: '12px', marginBottom: '10px', background: '#2563eb', color: 'white', borderRadius: '10px', fontSize: '13px', fontWeight: 'bold', textDecoration: 'none' }}>
          🛍️ Ver Catálogo
        </Link>
        <button onClick={() => supabase.auth.signOut().then(() => window.location.href = '/')}
          style={{ padding: '12px', background: 'transparent', color: '#f87171', border: '1px solid #451a1a', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', fontFamily: 'inherit', width: '100%' }}>
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
              <StatCard label="PLANO ATIVO" value={perfil?.plano ?? 'Gratuito'} color="#4ade80" />
              <StatCard label="DOWNLOADS RESTANTES" value={String(downloadsRestantes)} color="#3b82f6" />
              <StatCard label="FICHEIROS STL" value={String(assets.length)} color="#a78bfa" />
            </div>
            <div style={{ padding: '30px', background: '#1e293b', borderRadius: '20px', border: '1px solid #334155' }}>
              <h4 style={{ marginBottom: '20px', fontSize: '16px' }}>🛡️ Estado da Licença</h4>
              <p style={{ color: '#94a3b8', fontSize: '14px' }}>
                {temLicencaComercial
                  ? '✅ Licença Comercial Ativa — podes vender as peças impressas.'
                  : '❌ Uso Pessoal — faz upgrade para um plano comercial para vender as tuas impressões.'}
              </p>
              {!temLicencaComercial && (
                <a href="/pricing" style={{ display: 'inline-block', marginTop: '12px', color: '#60a5fa', fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}>
                  Ver planos comerciais →
                </a>
              )}
            </div>
          </div>
        )}

        {/* ABA PLANO */}
        {activeTab === 'plano' && (
          <div style={{ maxWidth: '900px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>Plano & Downloads</h1>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '30px' }}>
              O teu plano determina quantos downloads podes fazer por mês.
            </p>
            <div style={{ padding: '30px', background: '#1e293b', borderRadius: '20px', border: '1px solid #334155', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                  <h3 style={{ margin: 0, color: '#f1f5f9', textTransform: 'capitalize' }}>{perfil?.plano ?? 'Gratuito'}</h3>
                  <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>Plano atual</p>
                </div>
                <a href="/pricing" style={{ padding: '10px 20px', borderRadius: '10px', background: '#2563eb', color: 'white', fontWeight: 700, fontSize: '13px', textDecoration: 'none' }}>
                  Fazer upgrade
                </a>
              </div>
              {/* Barra de progresso de downloads */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: '#94a3b8' }}>
                  <span>Downloads este mês</span>
                  <span style={{ color: downloadsRestantes === 0 ? '#f87171' : '#34d399', fontWeight: 700 }}>
                    {perfil?.downloads_mes ?? 0} / {perfil?.downloads_limite ?? 3}
                  </span>
                </div>
                <div style={{ height: '8px', background: '#0f172a', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: '4px', transition: 'width 0.3s',
                    background: downloadsRestantes === 0 ? '#f87171' : '#3b82f6',
                    width: `${Math.min(100, ((perfil?.downloads_mes ?? 0) / (perfil?.downloads_limite ?? 3)) * 100)}%`
                  }} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ABA FICHEIROS STL */}
        {activeTab === 'projetos' && (
          <div style={{ maxWidth: '900px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>📂 Meus Ficheiros STL</h1>
            <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '30px' }}>Cada download fica guardado aqui durante 30 dias.</p>
            {assets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <div style={{ fontSize: '50px', marginBottom: '20px' }}>📁</div>
                <h3 style={{ color: '#94a3b8', marginBottom: '10px' }}>Ainda não tens ficheiros guardados.</h3>
                <p style={{ color: '#64748b', fontSize: '14px' }}>Os teus downloads STL aparecerão aqui automaticamente.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {assets.map((asset) => (
                  <div key={asset.id} style={{ background: '#1e293b', borderRadius: '16px', border: '1px solid #334155', padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#0f172a', border: '1px solid #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                        {asset.stl_url?.endsWith('.zip') ? '🗜️' : '🧊'}
                      </div>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, color: '#f1f5f9', fontSize: '15px' }}>{asset.nome_personalizado || asset.design_id}</p>
                        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '12px' }}>
                          {asset.stl_url?.endsWith('.zip') ? 'ZIP' : 'STL'} · {new Date(asset.last_rendered_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <a href={asset.stl_url} download target="_blank" rel="noopener noreferrer"
                      style={{ padding: '10px 18px', borderRadius: '10px', background: '#0f172a', border: '1px solid #334155', color: '#94a3b8', fontSize: '13px', fontWeight: 700, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
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
