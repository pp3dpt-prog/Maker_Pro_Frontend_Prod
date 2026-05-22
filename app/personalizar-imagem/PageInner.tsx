'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import GeneratedEditor from '@/components/GeneratedEditor';
import DownloadStlButton from '@/components/DownloadStlButton';
import styles from '@/app/customizador/ConfiguratorLayout.module.css';

type GenerationSchema = {
  parameters: Record<string, any>;
};

type Design = {
  id: string;
  nome: string;
  familia: string;
  generation_schema: GenerationSchema;
  total_likes: number;
  total_downloads: number;
  estado: string;
  acesso_maker: 'gratuito' | 'pessoal' | 'pessoal_plus' | 'comercial' | null;
};

type UserProfile = {
  role: string | null;
  plano: string;
  downloads_mes: number;
  downloads_limite: number;
};

const VISUAL_PARAMS = ['mostrar_texto'];
const PLANO_ORDEM = ['gratuito', 'pessoal', 'pessoal_plus', 'comercial'];

function temAcessoPlano(userPlano: string, acesso: string | null): boolean {
  if (!acesso) return false;
  const nivelUser = PLANO_ORDEM.indexOf(userPlano.startsWith('comercial') ? 'comercial' : userPlano);
  const nivelMin  = PLANO_ORDEM.indexOf(acesso);
  return nivelUser >= nivelMin;
}

function filtrarParamsBackend(params: Record<string, any>): Record<string, any> {
  return Object.fromEntries(Object.entries(params).filter(([k]) => !VISUAL_PARAMS.includes(k)));
}

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'k';
  return String(n);
}

export default function PageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const designId = searchParams.get('id');
  const familiaParam = searchParams.get('familia');

  const [design, setDesign] = useState<Design | null>(null);
  const [familyDesigns, setFamilyDesigns] = useState<Design[]>([]);
  const [params, setParams] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRetry, setShowRetry] = useState(false);

  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [mode, setMode] = useState<'idle' | 'generating' | 'done'>('idle');
  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [txtUrl, setTxtUrl] = useState<string | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);

  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [likes, setLikes] = useState(0);

  // Auth
  useEffect(() => {
    async function loadAuth() {
      const resp = await fetch('/api/auth/refresh', { method: 'POST' });
      if (resp.ok) {
        const { user_id } = await resp.json();
        if (user_id) {
          setUserId(user_id);
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          const { data: perfil } = await supabase
            .from('prod_perfis')
            .select('role, plano, downloads_mes, downloads_limite')
            .eq('id', user_id)
            .maybeSingle();
          setUserProfile(perfil as UserProfile ?? null);
        }
      }
      setAuthLoading(false);
    }
    loadAuth();
  }, []);

  // Retry timeout
  useEffect(() => {
    if (loading && !design && !error) {
      const timer = setTimeout(() => setShowRetry(true), 8000);
      return () => clearTimeout(timer);
    } else {
      setShowRetry(false);
    }
  }, [loading, design, error]);

  // Load design
  useEffect(() => {
    if (!designId) return;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        setShowRetry(false);
        const res = await fetch(`/api/produto?id=${designId}`);
        if (!res.ok) throw new Error('Erro ao carregar design');
        const data: Design = await res.json();
        setDesign(data);
        setLikes(data.total_likes ?? 0);

        const schema = data.generation_schema;
        if (schema?.parameters) {
          const initial: Record<string, any> = {};
          Object.entries(schema.parameters).forEach(([k, def]: any) => {
            initial[k] = def.default ?? null;
          });
          setParams(initial);
        }

        if (familiaParam) {
          const fRes = await fetch(`/api/designs-familia?familia=${encodeURIComponent(familiaParam)}`);
          if (fRes.ok) setFamilyDesigns((await fRes.json()) || []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [designId, familiaParam]);

  // Upload de imagem
  const handleFileUpload = async (_paramName: string, file: File): Promise<string> => {
    const refreshResp = await fetch('/api/auth/refresh', { method: 'POST' });
    if (!refreshResp.ok) throw new Error('Não autenticado');
    const { access_token, user_id } = await refreshResp.json();
    if (!access_token || !user_id) throw new Error('Não autenticado');

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const uid = Math.random().toString(36).slice(2, 10);
    const storagePath = `uploads/${user_id}/${Date.now()}_${uid}.${ext}`;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const uploadResp = await fetch(
      `${supabaseUrl}/storage/v1/object/makers_pro_stl_prod/${storagePath}`,
      { method: 'POST', headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': file.type }, body: file }
    );
    if (!uploadResp.ok) throw new Error(`Erro no upload: ${await uploadResp.text()}`);

    // Gerar preview local da imagem
    setPreviewImageUrl(URL.createObjectURL(file));

    return storagePath;
  };

  const handleParamsChange = (newParams: Record<string, any>) => {
    setParams(newParams);
    if (mode === 'done') { setMode('idle'); setStlUrl(null); setTxtUrl(null); }
  };

  const handleDesignChange = (newId: string) => {
    const p = new URLSearchParams();
    p.set('id', newId);
    if (familiaParam) p.set('familia', familiaParam);
    router.push(`/personalizar-imagem?${p.toString()}`);
  };

  const gerarSTL = async () => {
    if (!userId) { router.push('/login'); return; }
    if (!params || !designId) return;

    try {
      setMode('generating');
      const paramsBackend = filtrarParamsBackend(params);

      const refreshResp = await fetch('/api/auth/refresh', { method: 'POST' });
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (refreshResp.ok) {
        const { access_token } = await refreshResp.json();
        if (access_token) headers['Authorization'] = `Bearer ${access_token}`;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120_000);
      let res: Response;
      try {
        res = await fetch('/api/gerar-stl-hueforge', {
          method: 'POST',
          headers,
          body: JSON.stringify({ id: designId, params: paramsBackend }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!res!.ok) throw new Error('Erro ao gerar STL');
      const data = await res!.json();
      if (!data?.url) throw new Error('URL do STL não recebida');

      setStlUrl(data.url);
      setTxtUrl(data.txtUrl ?? null);
      setMode('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar STL');
      setMode('idle');
    }
  };

  const handleLike = async () => {
    if (liked || liking || !designId) return;
    setLiking(true);
    setLikes(p => p + 1);
    setLiked(true);
    try {
      await fetch('/api/like', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ design_id: designId }) });
    } catch { setLikes(p => p - 1); setLiked(false); }
    finally { setLiking(false); }
  };

  const handleDownloadSuccess = () => {
    setUserProfile(prev => prev ? { ...prev, downloads_mes: prev.downloads_mes + 1 } : prev);
  };

  // ── Render guards ─────────────────────────────────────────────────────────
  if (!designId) return <main style={{ padding: 40, color: '#94a3b8' }}>Produto inválido</main>;
  if (error) return <main style={{ padding: 40, color: '#ef4444' }}>{error}</main>;
  if (showRetry) {
    return (
      <main style={{ padding: 40, textAlign: 'center' }}>
        <p style={{ color: '#94a3b8', marginBottom: 16 }}>O carregamento está a demorar mais do que o esperado.</p>
        <button onClick={() => window.location.reload()} style={{ padding: '10px 20px', background: 'rgba(30,64,175,0.2)', border: '1px solid rgba(30,64,175,0.4)', color: '#60a5fa', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
          Tentar novamente
        </button>
      </main>
    );
  }
  if (error && !loading) return (
    <main style={{ padding: 40, color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: 12 }}>
      <p style={{ color: '#f87171', fontSize: 14 }}>Erro ao carregar produto: {error}</p>
      <button onClick={() => window.location.reload()} style={{ padding: '8px 20px', background: '#2563eb', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, cursor: 'pointer' }}>
        Tentar novamente
      </button>
    </main>
  );
  if (loading || authLoading || !design || !params) return <main style={{ padding: 40, color: '#94a3b8' }}>A carregar…</main>;

  const isAdmin = userProfile?.role === 'admin';
  const userPlano = userProfile?.plano ?? 'gratuito';
  const designBloqueado = !isAdmin && !temAcessoPlano(userPlano, design.acesso_maker);
  const semDownloads = userId && (userProfile?.downloads_mes ?? 0) >= (userProfile?.downloads_limite ?? 3);
  const paramsParaDownload = filtrarParamsBackend(params);

  return (
    <>
      <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
        <Link href="/produtos" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94a3b8', textDecoration: 'none', fontSize: 14 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Voltar para os produtos
        </Link>
      </div>

      <main className={styles.root}>
        {/* ── Painel esquerdo ─────────────────────────────────────────────── */}
        <aside className={styles.panel}>
          {/* Selector de família */}
          {familyDesigns.length > 1 && (
            <div style={{ padding: 12, backgroundColor: '#1e293b', borderRadius: 8, border: '1px solid #334155', marginBottom: 4 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 500 }}>Outros modelos:</label>
              <select value={designId} onChange={e => handleDesignChange(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', backgroundColor: '#0f172a', color: '#fff', border: '1px solid #475569', borderRadius: 6, fontSize: 14, fontFamily: 'inherit' }}>
                {familyDesigns.map(d => <option key={d.id} value={d.id}>{d.nome}</option>)}
              </select>
            </div>
          )}

          {/* Nome + stats */}
          <div style={{ marginBottom: 8 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 16, color: '#f1f5f9' }}>{design.nome}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={handleLike} disabled={liked || liking} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, border: `1px solid ${liked ? '#f43f5e' : 'rgba(255,255,255,0.1)'}`, background: liked ? 'rgba(244,63,94,0.12)' : 'transparent', color: liked ? '#f43f5e' : '#64748b', fontSize: 12, fontWeight: 700, cursor: liked ? 'default' : 'pointer', fontFamily: 'inherit' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill={liked ? '#f43f5e' : 'none'}>
                  <path d="M6 10.5S1 7 1 3.5a2.5 2.5 0 015 0 2.5 2.5 0 015 0C11 7 6 10.5 6 10.5z" stroke={liked ? '#f43f5e' : 'currentColor'} strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
                {formatCount(likes)}
              </button>
              <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748b' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1v7M3.5 5.5L6 8l2.5-2.5M2 11h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {formatCount(design.total_downloads ?? 0)} downloads
              </div>
            </div>
          </div>

          {/* Parâmetros */}
          {designBloqueado ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: 12, padding: '20px 0' }}>
              <div style={{ fontSize: 40 }}>🔒</div>
              <h4 style={{ color: '#f1f5f9', margin: 0 }}>Conteúdo Exclusivo</h4>
              <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>Este design requer o plano <strong style={{ color: '#a78bfa' }}>{design.acesso_maker}</strong> ou superior.</p>
              <a href="/pricing" style={{ padding: '10px 20px', borderRadius: 10, background: 'rgba(167,139,250,0.15)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>Ver planos →</a>
            </div>
          ) : (
            <GeneratedEditor schema={design.generation_schema} values={params} onChange={handleParamsChange} onFileUpload={handleFileUpload} />
          )}

          {/* Ações */}
          {!designBloqueado && (
            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {userId && (
                <div style={{ padding: '10px 14px', borderRadius: 10, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Downloads este mês</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: semDownloads ? '#f87171' : '#34d399' }}>
                    {userProfile?.downloads_mes ?? 0} / {userProfile?.downloads_limite ?? 3}
                  </span>
                </div>
              )}

              {semDownloads && (
                <div style={{ padding: '8px 12px', borderRadius: 8, backgroundColor: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', fontSize: 12, color: '#f87171', textAlign: 'center' }}>
                  Limite mensal atingido.{' '}
                  <a href="/pricing" style={{ color: '#60a5fa', fontWeight: 700, textDecoration: 'none' }}>Upgrade do plano →</a>
                </div>
              )}

              <button className={styles.primaryBtn} onClick={gerarSTL} disabled={mode === 'generating'} style={{ opacity: mode === 'generating' ? 0.6 : 1, cursor: mode === 'generating' ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}>
                {mode === 'generating' ? 'A gerar STL…' : !userId ? '🔒 Login para Gerar STL' : 'Gerar STL'}
              </button>

              {mode === 'done' && userId && (
                <DownloadStlButton designId={designId} params={paramsParaDownload} onSuccess={handleDownloadSuccess} />
              )}

              {mode === 'done' && txtUrl && (
                <a href={txtUrl} download="hueforge_cores.txt" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="12" y1="11" x2="12" y2="17"/>
                    <polyline points="9 14 12 17 15 14"/>
                  </svg>
                  Guia de Cores (TXT)
                </a>
              )}
            </div>
          )}
        </aside>

        {/* ── Área direita: preview da imagem ─────────────────────────────── */}
        <div className={styles.viewer} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 40 }}>
          {mode === 'generating' ? (
            <div style={{ textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 48, marginBottom: 16, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</div>
              <p style={{ fontSize: 16, fontWeight: 600 }}>A gerar STL…</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : previewImageUrl ? (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#64748b', fontSize: 12, marginBottom: 12, fontWeight: 500 }}>IMAGEM CARREGADA</p>
              <img src={previewImageUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: 'calc(100vh - 220px)', borderRadius: 12, border: '1px solid #1e293b', objectFit: 'contain' }} />
              {mode === 'done' && (
                <p style={{ color: '#34d399', fontSize: 13, marginTop: 12, fontWeight: 600 }}>✅ STL gerado com sucesso</p>
              )}
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#334155' }}>
              <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: 16 }}>
                <rect x="3" y="3" width="18" height="18" rx="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21 15 16 10 5 21"/>
              </svg>
              <p style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Carrega uma imagem</p>
              <p style={{ fontSize: 13 }}>A imagem aparecerá aqui após o upload</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
