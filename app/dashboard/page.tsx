'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import StarRating from '@/components/StarRating';
import ReviewModal from '@/components/ReviewModal';

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
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'conta' | 'plano' | 'projetos' | 'suporte'>('conta');
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [assets, setAssets] = useState<UserAsset[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    let settled = false;

    async function carregarDados(user_id: string) {
      try {
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

        const { data: ticketsData } = await supabase
          .from('prod_tickets_suporte')
          .select('id, assunto, mensagem, status, prioridade, resposta, respondido_em, created_at')
          .eq('user_id', user_id)
          .order('created_at', { ascending: false });
        if (ticketsData) setTickets(ticketsData);
      } catch (_) {
        // erro de rede — não bloquear o loading
      }
    }

    // Verificação imediata — getUser() valida o token com o servidor Supabase,
    // evitando sessões "penduradas" onde o cookie existe mas o token expirou.
    supabase.auth.getUser().then(async ({ data: { user }, error }) => {
      if (error || !user) {
        router.replace('/login');
      } else {
        await carregarDados(user.id);
      }
      if (!settled) { settled = true; setLoading(false); }
    }).catch(() => {
      router.replace('/login');
      if (!settled) { settled = true; setLoading(false); }
    });

    // Reativo: detetar logout enquanto a página está aberta
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || (!session && event === 'INITIAL_SESSION')) {
        router.replace('/login');
        if (!settled) { settled = true; setLoading(false); }
      }
    });

    // Failsafe: liberta o loading após 10s
    const timer = setTimeout(() => {
      if (!settled) { settled = true; setLoading(false); }
    }, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [router]);

  if (loading) return (
    <div style={{ background: '#0f172a', height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'sans-serif' }}>
      A carregar o teu painel…
    </div>
  );

  const downloadsRestantes = Math.max(0, (perfil?.downloads_limite ?? 3) - (perfil?.downloads_mes ?? 0));
  const temLicencaComercial = perfil?.plano?.startsWith('comercial');

  async function avaliarTicket(ticket_id: string, avaliacao: number) {
    await fetch('/api/suporte/avaliar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket_id, avaliacao }),
    });
    setTickets(prev => prev.map(t => t.id === ticket_id ? { ...t, avaliacao } : t));
  }

  return (
    <>
    {showReview && <ReviewModal onClose={() => setShowReview(false)} />}
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'sans-serif' }}>

      {/* SIDEBAR */}
      <aside style={{ width: '280px', borderRight: '1px solid #1e293b', padding: '30px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '11px', color: '#64748b', marginBottom: '25px', textTransform: 'uppercase', letterSpacing: '1px' }}>
          Painel
        </h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          {[
            { id: 'conta',    label: '👤 Resumo da Conta' },
            { id: 'plano',    label: '🎯 Plano & Downloads' },
            { id: 'projetos', label: '📂 Meus Ficheiros STL' },
            { id: 'suporte',  label: '🎫 Suporte' },
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
        <button onClick={() => setShowReview(true)}
          style={{ padding: '10px', background: 'transparent', color: '#f59e0b', border: '1px solid #451a00', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', fontFamily: 'inherit', width: '100%', marginBottom: 8 }}>
          ⭐ Avaliar a PP3D
        </button>
        <form action="/api/auth/signout" method="POST" style={{ margin: 0 }}>
          <button type="submit"
            style={{ padding: '12px', background: 'transparent', color: '#f87171', border: '1px solid #451a1a', borderRadius: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', fontFamily: 'inherit', width: '100%' }}>
            Sair
          </button>
        </form>
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

        {/* ABA SUPORTE */}
        {activeTab === 'suporte' && (
          <div style={{ maxWidth: 800 }}>
            <h1 style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 8 }}>🎫 Os meus pedidos de suporte</h1>
            <p style={{ color: '#94a3b8', marginBottom: 24, fontSize: 14 }}>
              Para abrir um novo pedido clica no ícone <strong>🛟</strong> na barra de navegação.
            </p>

            {tickets.length === 0 ? (
              <div style={{ background: '#1e293b', borderRadius: 16, padding: 40, textAlign: 'center', color: '#475569' }}>
                Ainda não tens pedidos de suporte.
              </div>
            ) : tickets.map(t => (
              <div key={t.id} style={{ background: '#1e293b', borderRadius: 16, padding: 24, marginBottom: 16, border: '1px solid #334155' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, gap: 12 }}>
                  <div>
                    <p style={{ margin: '0 0 4px', fontWeight: 700, fontSize: 16, color: '#f1f5f9' }}>{t.assunto}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>{new Date(t.created_at).toLocaleString('pt-PT')}</p>
                  </div>
                  <span style={{
                    padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                    background: t.status === 'aberto' ? '#14532d' : '#1e293b',
                    color: t.status === 'aberto' ? '#86efac' : '#64748b',
                  }}>{t.status === 'aberto' ? 'Aberto' : 'Resolvido'}</span>
                </div>

                {t.mensagem && (
                  <div style={{ background: '#0f172a', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                    <p style={{ margin: '0 0 4px', fontSize: 11, color: '#475569', textTransform: 'uppercase' }}>A tua mensagem</p>
                    <p style={{ margin: 0, fontSize: 13, color: '#94a3b8', whiteSpace: 'pre-wrap' }}>{t.mensagem}</p>
                  </div>
                )}

                {t.resposta ? (
                  <>
                    <div style={{ background: '#0f2a1a', border: '1px solid #166534', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
                      <p style={{ margin: '0 0 4px', fontSize: 11, color: '#86efac', textTransform: 'uppercase' }}>
                        Resposta PP3D — {t.respondido_em ? new Date(t.respondido_em).toLocaleString('pt-PT') : ''}
                      </p>
                      <p style={{ margin: 0, fontSize: 14, color: '#d1fae5', whiteSpace: 'pre-wrap' }}>{t.resposta}</p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>A resposta foi útil?</span>
                      <StarRating
                        value={t.avaliacao ?? 0}
                        onChange={v => avaliarTicket(t.id, v)}
                        size={20}
                        readonly={!!t.avaliacao}
                      />
                      {t.avaliacao && <span style={{ fontSize: 12, color: '#f59e0b' }}>Obrigado!</span>}
                    </div>
                  </>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, color: '#475569', fontStyle: 'italic' }}>
                    A aguardar resposta…
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
    </>
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
