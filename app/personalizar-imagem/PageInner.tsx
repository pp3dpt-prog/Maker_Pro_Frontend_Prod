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
  tipo_utilizador: string | null;
  downloads_mes: number;
  downloads_limite: number;
};

const VISUAL_PARAMS = ['mostrar_texto'];

// ── Análise automática de cores da imagem ────────────────────────────────────

type ColorLevel = { brightness: number; r: number; g: number; b: number; percentage: number };
type ImageAnalysis = { suggestedColors: number; levels: ColorLevel[] };

function kmeans1D(samples: number[], k: number): number[] {
  // k-means++ initialisation para centros mais distintos
  const centers: number[] = [samples[Math.floor(Math.random() * samples.length)]];
  while (centers.length < k) {
    const dists = samples.map(v => Math.min(...centers.map(c => (v - c) ** 2)));
    const total = dists.reduce((a, b) => a + b, 0);
    let r = Math.random() * total;
    for (let i = 0; i < samples.length; i++) { r -= dists[i]; if (r <= 0) { centers.push(samples[i]); break; } }
    if (centers.length < k) centers.push(samples[samples.length - 1]);
  }
  for (let iter = 0; iter < 25; iter++) {
    const sums = new Array(k).fill(0), counts = new Array(k).fill(0);
    for (const v of samples) {
      let best = 0, bestD = Infinity;
      for (let i = 0; i < k; i++) { const d = Math.abs(v - centers[i]); if (d < bestD) { bestD = d; best = i; } }
      sums[best] += v; counts[best]++;
    }
    for (let i = 0; i < k; i++) if (counts[i] > 0) centers[i] = Math.round(sums[i] / counts[i]);
  }
  return centers.sort((a, b) => a - b);
}

function wcss1D(samples: number[], centers: number[]): number {
  return samples.reduce((s, v) => s + Math.min(...centers.map(c => (v - c) ** 2)), 0);
}

function analyzeImage(url: string): Promise<ImageAnalysis> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const W = Math.min(img.naturalWidth, 200), H = Math.min(img.naturalHeight, 200);
      const canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, W, H);
      const { data } = ctx.getImageData(0, 0, W, H);

      // Amostrar cada 4 pixels para performance
      const grays: number[] = [], pixels: [number,number,number][] = [];
      for (let i = 0; i < data.length; i += 16) {
        const r = data[i], g = data[i+1], b = data[i+2];
        grays.push(Math.round(0.299 * r + 0.587 * g + 0.114 * b));
        pixels.push([r, g, b]);
      }

      // Encontrar K óptimo pelo método do cotovelo
      const wcssVals = Array.from({ length: 5 }, (_, i) => wcss1D(grays, kmeans1D(grays, i + 2)));
      let bestK = 3, biggestDrop = 0;
      for (let i = 0; i < wcssVals.length - 1; i++) {
        const drop = (wcssVals[i] - wcssVals[i+1]) / (wcssVals[0] || 1);
        if (drop > biggestDrop) { biggestDrop = drop; bestK = i + 2; }
      }
      bestK = Math.max(2, Math.min(6, bestK));

      const centers = kmeans1D(grays, bestK);
      const rgbSums = centers.map(() => [0,0,0]);
      const counts = new Array(bestK).fill(0);

      for (let idx = 0; idx < grays.length; idx++) {
        let best = 0, bestD = Infinity;
        for (let i = 0; i < bestK; i++) { const d = Math.abs(grays[idx] - centers[i]); if (d < bestD) { bestD = d; best = i; } }
        counts[best]++;
        rgbSums[best][0] += pixels[idx][0];
        rgbSums[best][1] += pixels[idx][1];
        rgbSums[best][2] += pixels[idx][2];
      }

      const total = grays.length;
      const levels: ColorLevel[] = centers.map((brightness, i) => ({
        brightness,
        r: counts[i] > 0 ? Math.round(rgbSums[i][0] / counts[i]) : brightness,
        g: counts[i] > 0 ? Math.round(rgbSums[i][1] / counts[i]) : brightness,
        b: counts[i] > 0 ? Math.round(rgbSums[i][2] / counts[i]) : brightness,
        percentage: Math.round(counts[i] / total * 100),
      }));

      resolve({ suggestedColors: bestK, levels });
    };
    img.src = url;
  });
}
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
  const [imageAnalysis, setImageAnalysis] = useState<ImageAnalysis | null>(null);
  const [analysing, setAnalysing] = useState(false);

  // Auth — mesma estratégia dupla do customizador:
  // INITIAL_SESSION como fonte autoritativa + getSession() como fallback aos 2s
  useEffect(() => {
    let profileLoaded = false;
    let authSettled = false;

    function finishAuth() {
      if (!authSettled) { authSettled = true; setAuthLoading(false); }
    }

    async function handleSession(session: { user: { id: string; email?: string } } | null) {
      if (session?.user && !profileLoaded) {
        profileLoaded = true;
        setUserId(session.user.id);
        try {
          const { createClient } = await import('@/lib/supabase/client');
          const sb = createClient();
          const { data: perfil } = await sb
            .from('prod_perfis')
            .select('role, plano, tipo_utilizador, downloads_mes, downloads_limite')
            .eq('id', session.user.id)
            .maybeSingle();
          setUserProfile(perfil as UserProfile ?? null);
        } catch (_) { /* sem perfil — continua */ }
      } else if (!session?.user) {
        setUserId(null);
        setUserProfile(null);
      }
      finishAuth();
    }

    // Subscrição via onAuthStateChange (INITIAL_SESSION é autoritativo)
    let subscription: { unsubscribe: () => void } | null = null;
    import('@/lib/supabase/client').then(({ createClient }) => {
      const sb = createClient();
      const { data } = sb.auth.onAuthStateChange(async (event, session) => {
        if (
          event === 'INITIAL_SESSION' ||
          event === 'SIGNED_IN'       ||
          event === 'TOKEN_REFRESHED' ||
          event === 'SIGNED_OUT'
        ) {
          await handleSession(session?.user ? session : null);
        }
      });
      subscription = data.subscription;

      // Fallback: se INITIAL_SESSION demorar >2s, tenta getSession()
      setTimeout(async () => {
        if (!authSettled) {
          try {
            const { data: { session } } = await sb.auth.getSession();
            await handleSession(session?.user ? session : null);
          } catch (_) { finishAuth(); }
        }
      }, 2000);
    });

    // Failsafe absoluto: 10s
    const hardTimer = setTimeout(finishAuth, 10000);

    return () => {
      subscription?.unsubscribe();
      clearTimeout(hardTimer);
    };
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
        const initial: Record<string, any> = {};
        if (schema?.parameters) {
          Object.entries(schema.parameters).forEach(([k, def]: any) => {
            initial[k] = def.default ?? null;
          });
        }
        setParams(initial);

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

    // Gerar preview local e analisar cores
    const localUrl = URL.createObjectURL(file);
    setPreviewImageUrl(localUrl);
    setImageAnalysis(null);
    setAnalysing(true);
    analyzeImage(localUrl).then(result => {
      setImageAnalysis(result);
      setAnalysing(false);
    });

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
  const userPlano = userProfile?.plano || 'gratuito';
  const tipo = userProfile?.tipo_utilizador ?? null;
  const isClienteFinal = tipo === 'consumidor' || tipo === 'ambos';
  const isMaker = !userId || tipo === 'maker' || tipo === 'ambos' || isAdmin;

  // acesso_maker só bloqueia o download — qualquer utilizador autenticado pode gerar/pré-visualizar
  const stlBloqueadoDownload = !isAdmin && !temAcessoPlano(userPlano, design.acesso_maker);
  const canDownloadStl = isMaker && !stlBloqueadoDownload;

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
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#8a96aa' }}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M6 1v7M3.5 5.5L6 8l2.5-2.5M2 11h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {formatCount(design.total_downloads ?? 0)} downloads
              </div>
            </div>
          </div>

          {/* Parâmetros — sempre visíveis para designs ativos */}
          <GeneratedEditor schema={design.generation_schema} values={params} onChange={handleParamsChange} onFileUpload={handleFileUpload} />

          {/* Ações */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Contador de downloads — só para makers */}
            {isMaker && userId && (
              <div style={{ padding: '10px 14px', borderRadius: 10, backgroundColor: '#0f172a', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: '#8a96aa', fontWeight: 600 }}>Downloads este mês</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: semDownloads ? '#f87171' : '#34d399' }}>
                  {userProfile?.downloads_mes ?? 0} / {userProfile?.downloads_limite ?? 3}
                </span>
              </div>
            )}

            {isMaker && semDownloads && (
              <div style={{ padding: '8px 12px', borderRadius: 8, backgroundColor: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)', fontSize: 12, color: '#f87171', textAlign: 'center' }}>
                Limite mensal atingido.{' '}
                <a href="/pricing" style={{ color: '#60a5fa', fontWeight: 700, textDecoration: 'none' }}>Upgrade do plano →</a>
              </div>
            )}

            {/* Botão Gerar — qualquer utilizador autenticado pode gerar para pré-visualizar */}
            {!userId ? (
              <button
                className={styles.primaryBtn}
                onClick={() => { window.location.href = `/login?redirect=${encodeURIComponent(window.location.href)}`; }}
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
              >
                🔒 Login para gerar pré-visualização
              </button>
            ) : (
              <button
                className={styles.primaryBtn}
                onClick={gerarSTL}
                disabled={mode === 'generating'}
                style={{
                  opacity: mode === 'generating' ? 0.6 : 1,
                  cursor: mode === 'generating' ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                  ...(isClienteFinal && !isMaker && { background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }),
                }}
              >
                {mode === 'generating'
                  ? (isClienteFinal && !isMaker ? 'A gerar pré-visualização…' : 'A gerar STL…')
                  : (isClienteFinal && !isMaker ? '🔍 Pré-visualizar peça em 3D' : 'Gerar STL')}
              </button>
            )}

            {/* Aviso de plano para makers sem acesso ao download */}
            {userId && isMaker && stlBloqueadoDownload && (
              <a href="/pricing" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', borderRadius: 10, background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', color: '#a78bfa', fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
                🔒 {design.acesso_maker ? `Plano ${design.acesso_maker} para descarregar STL` : 'STL não disponível neste plano'}
              </a>
            )}

            {/* Download STL — só makers com plano suficiente */}
            {canDownloadStl && mode === 'done' && userId && (
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
        </aside>

        {/* ── Área direita: preview proporcional ao marcador ─────────────── */}
        <div className={styles.viewer} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 40 }}>
          {mode === 'generating' ? (
            <div style={{ textAlign: 'center', color: '#94a3b8' }}>
              <div style={{ fontSize: 48, marginBottom: 16, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</div>
              <p style={{ fontSize: 16, fontWeight: 600 }}>A gerar STL…</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : (() => {
            // Dimensões reais do marcador em mm
            const larg = Number(params?.largura_mm ?? 20);
            const alt  = Number(params?.altura_mm  ?? 150);
            const ratio = larg / alt;

            // Calcular tamanho do preview para caber no viewer (max 480px altura)
            const maxH = 480, maxW = 280;
            let pW: number, pH: number;
            if (ratio > maxW / maxH) { pW = maxW; pH = Math.round(maxW / ratio); }
            else                      { pH = maxH; pW = Math.round(maxH * ratio); }

            // Parâmetros de ajuste da imagem
            const ajuste    = params?.img_ajuste ?? 'Preencher';
            const posX      = Number(params?.img_pos_x  ?? 0);
            const posY      = Number(params?.img_pos_y  ?? 0);
            const zoom      = Number(params?.img_zoom   ?? 100);
            const contraste = Number(params?.contraste  ?? 0);
            const brilho    = Number(params?.brilho     ?? 0);
            const modoCor   = !!(params?.modo_cor);
            const cssFilter = `contrast(${1 + contraste}) brightness(${1 + brilho})${modoCor ? '' : ' grayscale(1)'}`;
            const fitMap: Record<string, string> = {
              'Preencher': 'cover',
              'Ajustar':   'contain',
              'Esticar':   'fill',
            };
            const objFit = fitMap[ajuste] ?? 'cover';
            const objPos = `${50 + posX}% ${50 + posY}%`;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                {/* Etiqueta de dimensões */}
                <p style={{ color: '#8a96aa', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  {larg} × {alt} mm
                </p>

                {/* Contorno proporcional ao marcador */}
                <div style={{
                  width: pW, height: pH,
                  border: '2px solid #3b82f6',
                  borderRadius: 4,
                  overflow: 'hidden',
                  position: 'relative',
                  background: '#0f172a',
                  boxShadow: '0 0 0 1px #1e293b, 0 8px 32px rgba(0,0,0,0.5)',
                }}>
                  {previewImageUrl ? (
                    <img
                      src={previewImageUrl}
                      alt="Preview"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: objFit as any,
                        objectPosition: objPos,
                        display: 'block',
                        transform: `scale(${zoom / 100})`,
                        transformOrigin: objPos,
                        filter: cssFilter,
                      }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8, color: '#8a96aa' }}>
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21 15 16 10 5 21"/>
                      </svg>
                      <span style={{ fontSize: 11 }}>Carrega uma imagem</span>
                    </div>
                  )}
                </div>

                {mode === 'done' && (
                  <p style={{ color: '#34d399', fontSize: 13, fontWeight: 600 }}>✅ STL gerado com sucesso</p>
                )}

                {/* Análise de cores */}
                {analysing && (
                  <p style={{ color: '#8a96aa', fontSize: 12 }}>🔍 A analisar cores…</p>
                )}
                {imageAnalysis && !analysing && (
                  <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '16px 20px', width: pW, boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        🎨 {imageAnalysis.suggestedColors} tons detectados
                      </p>
                      <button
                        onClick={() => params && setParams({ ...params, num_cores: imageAnalysis.suggestedColors })}
                        style={{ padding: '4px 12px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
                      >
                        Aplicar
                      </button>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {imageAnalysis.levels.map((lvl, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 8,
                            background: `rgb(${lvl.r},${lvl.g},${lvl.b})`,
                            border: '1px solid #1e293b',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.4)',
                          }} title={`R:${lvl.r} G:${lvl.g} B:${lvl.b}`} />
                          <span style={{ fontSize: 10, color: '#8a96aa' }}>{lvl.percentage}%</span>
                          <span style={{ fontSize: 9, color: '#8a96aa' }}>filamento {i + 1}</span>
                        </div>
                      ))}
                    </div>
                    <p style={{ margin: '10px 0 0', fontSize: 11, color: '#8a96aa', lineHeight: 1.5 }}>
                      Filamento 1 = tom mais escuro → filamento {imageAnalysis.suggestedColors} = tom mais claro
                    </p>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </main>
    </>
  );
}
