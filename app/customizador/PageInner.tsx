'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import GeneratedEditor from '@/components/GeneratedEditor';
import CustomizadorClient from './CustomizadorClient';
import DownloadStlButton from '@/components/DownloadStlButton';
import IfThenPayDownloadButton from '@/components/IfThenPayDownloadButton';
import PedidoOrcamentoModal from '@/components/PedidoOrcamentoModal';
import { useCart } from '@/components/loja/CartContext';
import styles from './ConfiguratorLayout.module.css';

type LojaProduto = {
  id: string; slug: string; nome: string;
  preco_cents: number; preco_promo_cents: number | null;
  requer_orcamento: boolean; foto: string | null;
};

type GenerationSchema = {
  parameters: Record<string, any>;
  base_geometry?: string | null;
};

type Design = {
  id: string;
  nome: string;
  familia: string;
  generation_schema: GenerationSchema;
  stl_file_path?: string | null;
  thumbnail_url?: string | null;
  total_likes: number;
  total_downloads: number;
  estado: string;
  acesso_maker: 'gratuito' | 'pessoal' | 'pessoal_plus' | 'comercial' | null;
  requer_licenca_comercial: boolean;
};

type UserProfile = {
  role: string | null;
  plano: string;
  tipo_utilizador: string | null;
  downloads_mes: number;
  downloads_limite: number;
  downloads_comprados: number;
};

const VISUAL_PARAMS = ['mostrar_texto'];

const PLANO_ORDEM = ['gratuito', 'pessoal', 'pessoal_plus', 'comercial'];

function temAcessoPlano(userPlano: string, acesso: string | null): boolean {
  if (!acesso) return false; // null = não disponível para makers
  const nivelUser  = PLANO_ORDEM.indexOf(userPlano.split('_')[0] === 'comercial' ? 'comercial' : userPlano);
  const nivelMin   = PLANO_ORDEM.indexOf(acesso);
  return nivelUser >= nivelMin;
}

function filtrarParamsBackend(params: Record<string, any>): Record<string, any> {
  return Object.fromEntries(
    Object.entries(params).filter(([k]) => !VISUAL_PARAMS.includes(k))
  );
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
  const produtoParam = searchParams.get('produto');
  const { addItem } = useCart();

  const [lojaProduto, setLojaProduto] = useState<LojaProduto | null>(null);
  const [stlPath, setStlPath] = useState<string | null>(null);
  const [addedMsg, setAddedMsg] = useState('');

  const [design, setDesign] = useState<Design | null>(null);
  const [familyDesigns, setFamilyDesigns] = useState<Design[]>([]);
  const [params, setParams] = useState<Record<string, any> | null>(null);
  const [mode, setMode] = useState<'preview' | 'stl' | 'generating'>('preview');
  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [paramsChanged, setParamsChanged] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [showPedidoModal, setShowPedidoModal] = useState(false);

  const [txtUrl, setTxtUrl] = useState<string | null>(null);

  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [showRetry, setShowRetry] = useState(false);

  // Auth: onAuthStateChange é a fonte única e autoritativa.
  // INITIAL_SESSION dispara exatamente uma vez na subscrição com o estado real da sessão.
  // getSession() é chamado apenas como fallback caso INITIAL_SESSION demore >2s.
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
        setUserEmail(session.user.email ?? null);
        try {
          const { data: perfil } = await supabase
            .from('prod_perfis')
            .select('role, plano, tipo_utilizador, downloads_mes, downloads_limite, downloads_comprados')
            .eq('id', session.user.id)
            .maybeSingle();
          setUserProfile(perfil as UserProfile ?? null);
        } catch (_) { /* sem perfil — continua */ }
      } else if (!session?.user) {
        setUserId(null);
        setUserEmail(null);
        setUserProfile(null);
      }
      finishAuth();
    }

    // INITIAL_SESSION é o evento autoritativo — trata-o como todos os outros
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (
        event === 'INITIAL_SESSION' ||
        event === 'SIGNED_IN'       ||
        event === 'TOKEN_REFRESHED' ||
        event === 'SIGNED_OUT'
      ) {
        await handleSession(session?.user ? session : null);
      }
    });

    // Fallback: se INITIAL_SESSION demorar >2s, tenta getSession() diretamente
    const fallbackTimer = setTimeout(async () => {
      if (!authSettled) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          await handleSession(session?.user ? session : null);
        } catch (_) { finishAuth(); }
      }
    }, 2000);

    // Failsafe absoluto: liberta authLoading após 10s
    const hardTimer = setTimeout(finishAuth, 10000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(fallbackTimer);
      clearTimeout(hardTimer);
    };
  }, []);

  // Retry timeout
  useEffect(() => {
    if (loading && !design && !error) {
      const timer = setTimeout(() => setShowRetry(true), 8000); // 8 seconds
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
        setShowRetry(false); // reset retry flag when starting load

        const res = await fetch(`/api/produto?id=${designId}`);
        if (!res.ok) throw new Error('Erro ao carregar design');

        const data: Design = await res.json();

        // Redirecionar produtos com image_upload para /personalizar-imagem
        const hasImageUpload = Object.values(data.generation_schema?.parameters ?? {})
          .some((p: any) => p?.ui?.widget === 'image_upload');
        if (hasImageUpload) {
          const p = new URLSearchParams();
          p.set('id', data.id);
          if (familiaParam) p.set('familia', familiaParam);
          router.replace(`/personalizar-imagem?${p.toString()}`);
          return;
        }

        setDesign(data);
        setLikes(data.total_likes ?? 0);

        const schema = data.generation_schema;
        const initialParams: Record<string, any> = {};
        if (schema?.parameters) {
          Object.entries(schema.parameters).forEach(([key, def]: any) => {
            initialParams[key] = def.default ?? null;
          });
        }
        setParams(initialParams);

        if (familiaParam) {
          const familyRes = await fetch(`/api/designs-familia?familia=${encodeURIComponent(familiaParam)}`);
          if (familyRes.ok) {
            const familyData = await familyRes.json();
            setFamilyDesigns(familyData || []);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
        setShowRetry(false);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [designId, familiaParam]);

  // Verificar acesso ao plano
  const isAdmin = userProfile?.role === 'admin';

  const handleParamsChange = (newParams: Record<string, any>) => {
    setParams(newParams);
    if (mode === 'stl') {
      setMode('preview');
      setStlUrl(null);
      setTxtUrl(null);
    }
    setParamsChanged(true);
  };

  // Upload de imagem para o Supabase Storage
  const handleFileUpload = async (paramName: string, file: File): Promise<string> => {
    // Usar endpoint server-side para obter token (evita onAuthStateChange que bloqueia)
    const refreshResp = await fetch('/api/auth/refresh', { method: 'POST' });
    if (!refreshResp.ok) throw new Error('Não autenticado');
    const { access_token, user_id } = await refreshResp.json();
    if (!access_token || !user_id) throw new Error('Não autenticado');

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const uid = Math.random().toString(36).slice(2, 10);
    const storagePath = `uploads/${user_id}/${Date.now()}_${uid}.${ext}`;
    const bucket = 'makers_pro_stl_prod';

    // Upload direto via REST API do Supabase Storage (sem cliente JS que pode bloquear)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const uploadResp = await fetch(
      `${supabaseUrl}/storage/v1/object/${bucket}/${storagePath}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${access_token}`,
          'Content-Type': file.type,
        },
        body: file,
      }
    );

    if (!uploadResp.ok) {
      const errText = await uploadResp.text();
      throw new Error(`Erro no upload: ${errText}`);
    }

    return storagePath;
  };

  const handleDesignChange = (newDesignId: string) => {
    const p = new URLSearchParams();
    p.set('id', newDesignId);
    if (familiaParam) p.set('familia', familiaParam);
    router.push(`/customizador?${p.toString()}`);
  };

  // Carregar produto da loja ligado (quando se chega via /produto/[slug] → Personalizar)
  useEffect(() => {
    if (!produtoParam) return;
    (async () => {
      const { data } = await supabase
        .from('prod_loja_produtos')
        .select('id, slug, nome, preco_cents, preco_promo_cents, requer_orcamento, prod_loja_imagens(url, ordem)')
        .eq('slug', produtoParam)
        .eq('estado', 'ativo')
        .maybeSingle();
      if (data) {
        const fotos = ((data as any).prod_loja_imagens ?? []).sort((a: any, b: any) => a.ordem - b.ordem);
        setLojaProduto({
          id: data.id, slug: data.slug, nome: data.nome,
          preco_cents: data.preco_cents, preco_promo_cents: data.preco_promo_cents,
          requer_orcamento: !!data.requer_orcamento, foto: fotos[0]?.url ?? null,
        });
      }
    })();
  }, [produtoParam]);

  function adicionarPersonalizadoAoCarrinho() {
    if (!lojaProduto) return;
    const preco = lojaProduto.requer_orcamento ? null : (lojaProduto.preco_promo_cents ?? lojaProduto.preco_cents);
    addItem({
      produto_id: lojaProduto.id,
      slug: lojaProduto.slug,
      nome: lojaProduto.nome,
      foto: lojaProduto.foto,
      variante_id: null,
      variante_label: null,
      preco_cents: preco,
      requer_orcamento: lojaProduto.requer_orcamento,
      personalizacao: { params: params ? filtrarParamsBackend(params) : null, stl_url: stlUrl, stl_path: stlPath },
      personalizacao_label: 'Peça personalizada',
    });
    setAddedMsg('Adicionado ao carrinho ✓');
    setTimeout(() => setAddedMsg(''), 3000);
  }

  const gerarSTL = async () => {
    if (!userId) {
      router.push('/login');
      return;
    }
    if (!params || !designId) return;

    try {
      setMode('generating');
      setParamsChanged(false);
      const paramsBackend = filtrarParamsBackend(params);

      // Detetar sistema: 'scad' para novos produtos (sem base_geometry),
      // 'legacy' para pet tags com base_geometry estático
      const isScad = !design?.generation_schema?.base_geometry;
      const system = isScad ? 'scad' : 'legacy';

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      // Sistema SCAD requer autenticação no backend Docker
      if (isScad) {
        const refreshResp = await fetch('/api/auth/refresh', { method: 'POST' });
        if (refreshResp.ok) {
          const { access_token } = await refreshResp.json();
          if (access_token) headers['Authorization'] = `Bearer ${access_token}`;
        }
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120_000);
      let res: Response;
      try {
        res = await fetch('/api/gerar-stl-pro', {
          method: 'POST',
          headers,
          body: JSON.stringify({ id: designId, params: paramsBackend, system }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
      }

      if (!res!.ok) throw new Error('Erro ao gerar STL');

      if (isScad) {
        // Sistema novo: resposta é JSON com URL assinada
        const data = await res.json();
        if (!data?.url) throw new Error('URL do STL não recebida');
        setStlUrl(data.url);
        setStlPath(data.storagePath ?? null);
        // HueForge: URL do ficheiro TXT com instruções de cor
        if (data.txtUrl) setTxtUrl(data.txtUrl);
        else setTxtUrl(null);
      } else {
        // Sistema legado: resposta é binário STL
        const blob = await res.blob();
        setStlUrl(URL.createObjectURL(blob));
      }

      setMode('stl');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar STL');
      setMode('preview');
    }
  };

  const handleLike = async () => {
    if (liked || liking || !designId) return;
    setLiking(true);
    setLikes((prev) => prev + 1);
    setLiked(true);
    try {
      await fetch('/api/like', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ design_id: designId }),
      });
    } catch {
      setLikes((prev) => prev - 1);
      setLiked(false);
    } finally {
      setLiking(false);
    }
  };

  const handleDownloadSuccess = () => {
    setUserProfile((prev) => {
      if (!prev) return prev;
      // Consome primeiro os comprados (igual ao backend), senão a quota mensal
      if ((prev.downloads_comprados ?? 0) > 0) {
        return { ...prev, downloads_comprados: prev.downloads_comprados - 1 };
      }
      return { ...prev, downloads_mes: prev.downloads_mes + 1 };
    });
  };

  if (!designId) return <main className={styles.fallback}>Produto inválido</main>;
  if (error) return <main className={styles.fallback}><div style={{ color: '#ef4444' }}>{error}</div></main>;
  if (showRetry) {
    return (
      <main className={styles.fallback} style={{ textAlign: 'center', padding: '40px' }}>
        <p style={{ color: '#94a3b8', marginBottom: '16px' }}>O carregamento está a demorar mais do que o esperado.</p>
        <button
          onClick={() => {
            setShowRetry(false);
            window.location.reload();
          }}
          style={{
            padding: '10px 20px',
            background: 'rgba(30,64,175,0.2)',
            border: '1px solid rgba(30,64,175,0.4)',
            color: '#60a5fa',
            borderRadius: '6px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Tentar novamente
        </button>
      </main>
    );
  }
  if (error && !loading) return (
    <main className={styles.fallback} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <p style={{ color: '#f87171', fontSize: 14 }}>Erro ao carregar produto: {error}</p>
      <button onClick={() => window.location.reload()} style={{ padding: '8px 20px', background: '#2563eb', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, cursor: 'pointer' }}>
        Tentar novamente
      </button>
    </main>
  );
  if (loading || authLoading || !design || !params) return <main className={styles.fallback}>A carregar…</main>;

  // Verificar acesso ao design
  const userPlano = userProfile?.plano || 'gratuito'; // || em vez de ?? para tratar string vazia
  const tipo = userProfile?.tipo_utilizador ?? null;
  const isClienteFinal = tipo === 'consumidor' || tipo === 'ambos';

  // Qualquer utilizador com login pode gerar/pré-visualizar o STL.
  // O download é que fica restrito por plano (acesso_maker).
  const isMaker = !userId || tipo === 'maker' || tipo === 'ambos' || isAdmin;

  // stlBloqueadoDownload: plano insuficiente para DESCARREGAR o STL.
  // NÃO bloqueia a geração/pré-visualização — isso é livre para qualquer utilizador autenticado.
  const stlBloqueadoDownload = !isAdmin && !temAcessoPlano(userPlano, design.acesso_maker);

  // Pode descarregar: tem de ser maker/ambos E ter plano suficiente
  const canDownloadStl = isMaker && !stlBloqueadoDownload;

  const semDownloads = userId && (userProfile?.downloads_mes ?? 0) >= (userProfile?.downloads_limite ?? 3);
  // Downloads avulsos comprados (0,99€) — funcionam em qualquer design, ignoram o gate de plano
  const hasComprado = (userProfile?.downloads_comprados ?? 0) > 0;
  // Pode descarregar grátis: tem plano + tem quota mensal
  const podeDescarregarGratis = canDownloadStl && !semDownloads;
  const designRascunho = design.estado === 'rascunho' && !isAdmin;
  const designInativo = design.estado === 'inativo' && !isAdmin;

  if (designRascunho || designInativo) {
    return (
      <main className={styles.fallback}>
        <div style={{ textAlign: 'center', color: '#64748b' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
          <h2 style={{ color: '#f1f5f9', marginBottom: 8 }}>Design não disponível</h2>
          <p>Este design não está disponível de momento.</p>
          <a href="/produtos" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 700 }}>
            ← Voltar ao catálogo
          </a>
        </div>
      </main>
    );
  }

  const paramsParaDownload = filtrarParamsBackend(params);

  return (
    <>
      {/* BOTÃO DE VOLTAR */}
      <div style={{
        padding: '20px 24px 0',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <Link href="/produtos" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: '#94a3b8',
          textDecoration: 'none',
          fontSize: '14px',
          transition: 'color 0.2s'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Voltar para os produtos
        </Link>
      </div>

      <main className={styles.root}>
      <aside className={styles.panel}>

        {/* Badge admin */}
        {isAdmin && design.estado !== 'ativo' && (
          <div style={{
            padding: '4px 10px', borderRadius: 6, marginBottom: 8,
            fontSize: 11, fontWeight: 800, letterSpacing: '0.08em',
            background: design.estado === 'rascunho' ? 'rgba(251,191,36,0.15)' :
                        design.estado === 'inativo'   ? 'rgba(248,113,113,0.15)' :
                        'rgba(167,139,250,0.15)',
            color: design.estado === 'rascunho' ? '#fbbf24' :
                   design.estado === 'inativo'   ? '#f87171' :
                   '#a78bfa',
            border: `1px solid ${design.estado === 'rascunho' ? 'rgba(251,191,36,0.3)' :
                                  design.estado === 'inativo'   ? 'rgba(248,113,113,0.3)' :
                                  'rgba(167,139,250,0.3)'}`,
          }}>
            {design.estado === 'rascunho' ? '✏️ Rascunho' :
             design.estado === 'inativo'   ? '⛔ Inativo' :
             '⭐ Exclusivo'}
          </div>
        )}

        {/* Selector de designs da família */}
        {familyDesigns.length > 1 && (
          <div style={{ padding: 12, backgroundColor: '#1e293b', borderRadius: 8, border: '1px solid #334155', marginBottom: 4 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 500 }}>
              Outros modelos:
            </label>
            <select
              value={designId}
              onChange={(e) => handleDesignChange(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', backgroundColor: '#0f172a', color: '#ffffff', border: '1px solid #475569', borderRadius: 6, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {familyDesigns.map((d) => (
                <option key={d.id} value={d.id}>{d.nome}</option>
              ))}
            </select>
          </div>
        )}

        {/* Nome + stats */}
        <div style={{ marginBottom: 8 }}>
          <h3 style={{ margin: '0 0 8px', fontSize: 16, color: '#f1f5f9' }}>{design.nome}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Like */}
            <button
              onClick={handleLike}
              disabled={liked || liking}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 20,
                border: `1px solid ${liked ? '#f43f5e' : 'rgba(255,255,255,0.1)'}`,
                background: liked ? 'rgba(244,63,94,0.12)' : 'transparent',
                color: liked ? '#f43f5e' : '#64748b',
                fontSize: 12, fontWeight: 700,
                cursor: liked ? 'default' : 'pointer',
                fontFamily: 'inherit', transition: 'all 0.2s',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill={liked ? '#f43f5e' : 'none'}>
                <path d="M6 10.5S1 7 1 3.5a2.5 2.5 0 015 0 2.5 2.5 0 015 0C11 7 6 10.5 6 10.5z"
                  stroke={liked ? '#f43f5e' : 'currentColor'} strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              {formatCount(likes)}
            </button>

            <div style={{ width: 1, height: 14, background: 'rgba(255,255,255,0.08)' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#64748b' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v7M3.5 5.5L6 8l2.5-2.5M2 11h8"
                  stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {formatCount(design.total_downloads ?? 0)} downloads
            </div>
          </div>
        </div>

        {/* Editor de parâmetros — sempre visível para designs ativos */}
        <GeneratedEditor
          schema={design.generation_schema}
          values={params}
          onChange={handleParamsChange}
          onFileUpload={handleFileUpload}
        />

        {/* Área de ação */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Contador de downloads — só para makers (consumidores não descarregam STL) */}
            {isMaker && userId && (
              <div style={{
                padding: '10px 14px', borderRadius: 10,
                backgroundColor: '#0f172a', border: '1px solid #1e293b',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Downloads este mês</span>
                <span style={{ fontSize: 14, fontWeight: 800, color: semDownloads ? '#f87171' : '#34d399' }}>
                  {userProfile?.downloads_mes ?? 0} / {userProfile?.downloads_limite ?? 3}
                </span>
              </div>
            )}

            {/* Aviso de limite de downloads — só para makers */}
            {isMaker && semDownloads && (
              <div style={{
                padding: '8px 12px', borderRadius: 8,
                backgroundColor: 'rgba(248,113,113,0.1)',
                border: '1px solid rgba(248,113,113,0.3)',
                fontSize: 12, color: '#f87171', textAlign: 'center',
              }}>
                Limite mensal atingido.{' '}
                <a href="/pricing" style={{ color: '#60a5fa', fontWeight: 700, textDecoration: 'none' }}>
                  Upgrade do plano →
                </a>
              </div>
            )}

            {/* Botão Encomendar peça impressa */}
            {(() => {
              if (!userId) {
                const next = encodeURIComponent(`/customizador?id=${designId}${familiaParam ? `&familia=${encodeURIComponent(familiaParam)}` : ''}`);
                return (
                  <Link
                    href={`/login?redirect=${next}`}
                    style={{
                      padding: '12px 16px', borderRadius: 10,
                      background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                      color: 'white', border: 'none', fontWeight: 800, fontSize: 14,
                      cursor: 'pointer', textAlign: 'center', textDecoration: 'none',
                      boxShadow: '0 8px 20px rgba(37,99,235,0.35)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    🔒 Inicia sessão para encomendar
                  </Link>
                );
              }

              if (!isClienteFinal) {
                return (
                  <div style={{
                    padding: '12px 14px', borderRadius: 10,
                    background: 'rgba(167,139,250,0.08)',
                    border: '1px solid rgba(167,139,250,0.25)',
                    fontSize: 12, color: '#cbd5e1', lineHeight: 1.5,
                  }}>
                    📦 Para encomendar a peça impressa precisas de ter o perfil <strong>cliente final</strong>.{' '}
                    <Link href="/bem-vindo" style={{ color: '#a78bfa', fontWeight: 700, textDecoration: 'none' }}>
                      Alterar perfil →
                    </Link>
                  </div>
                );
              }

              // Produto da loja ligado → adicionar ao carrinho (com o STL); senão, fallback para orçamento
              if (lojaProduto) {
                const stlPronto = mode === 'stl' && !!stlPath;
                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <button
                      type="button"
                      onClick={adicionarPersonalizadoAoCarrinho}
                      disabled={!stlPronto}
                      style={{
                        padding: '12px 16px', borderRadius: 10,
                        background: stlPronto ? 'linear-gradient(135deg, #2563eb, #1d4ed8)' : '#1e293b',
                        color: stlPronto ? 'white' : '#64748b', border: 'none', fontWeight: 800, fontSize: 14,
                        cursor: stlPronto ? 'pointer' : 'not-allowed',
                        boxShadow: stlPronto ? '0 8px 20px rgba(37,99,235,0.35)' : 'none',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      }}
                    >
                      🛒 Adicionar ao carrinho
                    </button>
                    {!stlPronto && <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>Pré-visualiza a peça primeiro para a adicionares.</p>}
                    {addedMsg && (
                      <p style={{ margin: 0, fontSize: 13, color: '#34d399', textAlign: 'center' }}>
                        {addedMsg} <Link href="/carrinho" style={{ color: '#60a5fa', fontWeight: 700 }}>Ver carrinho →</Link>
                      </p>
                    )}
                  </div>
                );
              }

              return (
                <button
                  type="button"
                  onClick={() => setShowPedidoModal(true)}
                  style={{
                    padding: '12px 16px', borderRadius: 10,
                    background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    color: 'white', border: 'none', fontWeight: 800, fontSize: 14,
                    cursor: 'pointer',
                    boxShadow: '0 8px 20px rgba(37,99,235,0.35)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}
                >
                  📦 Encomendar peça impressa
                </button>
              );
            })()}

            {/* Botão Gerar/Pré-visualizar STL — disponível para qualquer utilizador com login */}
            {!userId ? (
              /* Não autenticado */
              <button
                className={styles.primaryBtn}
                onClick={() => { window.location.href = `/login?redirect=${encodeURIComponent(window.location.href)}`; }}
                style={{ cursor: 'pointer', transition: 'all 0.2s' }}
              >
                🔒 Login para gerar pré-visualização
              </button>
            ) : (
              /* Autenticado: pode sempre gerar */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {paramsChanged && mode !== 'generating' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '6px 12px', borderRadius: 8,
                    background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)',
                    fontSize: 12, color: '#fbbf24', fontWeight: 600,
                  }}>
                    <span style={{ animation: 'pulse 1.5s infinite', display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#fbbf24' }} />
                    Parâmetros alterados — clica para actualizar
                  </div>
                )}
                <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
                <button
                  className={styles.primaryBtn}
                  onClick={gerarSTL}
                  disabled={mode === 'generating'}
                  style={{
                    opacity: mode === 'generating' ? 0.6 : 1,
                    cursor: mode === 'generating' ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s',
                    ...(paramsChanged && mode !== 'generating' && {
                      boxShadow: '0 0 0 2px rgba(251,191,36,0.5)',
                    }),
                    ...(isClienteFinal && !isMaker && {
                      background: 'linear-gradient(135deg, #0ea5e9, #0284c7)',
                    }),
                  }}
                >
                  {mode === 'generating'
                    ? (isClienteFinal && !isMaker ? 'A gerar pré-visualização…' : 'A gerar STL…')
                    : (isClienteFinal && !isMaker ? '🔍 Pré-visualizar peça em 3D' : 'Gerar STL')}
                </button>
              </div>
            )}

            {/* Acções de download — quando STL gerado e autenticado */}
            {mode === 'stl' && userId && (
              (podeDescarregarGratis || hasComprado) ? (
                /* Pode descarregar: por plano+quota grátis OU com download comprado */
                <>
                  <DownloadStlButton
                    designId={designId}
                    params={paramsParaDownload}
                    onSuccess={handleDownloadSuccess}
                  />
                  {!podeDescarregarGratis && hasComprado && (
                    <p style={{ margin: 0, fontSize: 12, color: '#34d399', textAlign: 'center' }}>
                      ✓ Tens {userProfile?.downloads_comprados} download(s) comprado(s) disponível(eis)
                    </p>
                  )}
                </>
              ) : (
                /* Não pode descarregar grátis e não tem comprados → comprar 0,99€ */
                <>
                  <IfThenPayDownloadButton
                    designId={designId}
                    designNome={design.nome}
                    params={paramsParaDownload}
                    isAdmin={isAdmin}
                  />
                  {stlBloqueadoDownload && (
                    <a href="/pricing" style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      padding: '8px 14px', borderRadius: 8,
                      background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.25)',
                      color: '#a78bfa', fontWeight: 600, fontSize: 12, textDecoration: 'none',
                    }}>
                      🔒 ou subscreve o plano {design.acesso_maker} para downloads incluídos →
                    </a>
                  )}
                </>
              )
            )}

            {/* Botão Download TXT — só aparece para HueForge */}
            {mode === 'stl' && txtUrl && (
              <a
                href={txtUrl}
                download="hueforge_cores.txt"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  padding: '10px 16px',
                  borderRadius: 10,
                  background: 'rgba(16,185,129,0.12)',
                  border: '1px solid rgba(16,185,129,0.3)',
                  color: '#34d399',
                  fontWeight: 700,
                  fontSize: 13,
                  textDecoration: 'none',
                  transition: 'all 0.2s',
                }}
              >
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

      {/* Viewer */}
      <section className={styles.viewer}>
        <CustomizadorClient
          designId={designId}
          mode={mode}
          params={params}
          stlUrl={stlUrl}
          stlFilePath={design.stl_file_path}
          thumbnailUrl={design.thumbnail_url}
        />
      </section>
    </main>

    {showPedidoModal && params && (
      <PedidoOrcamentoModal
        isOpen={showPedidoModal}
        onClose={() => setShowPedidoModal(false)}
        design={{
          id: design.id,
          nome: design.nome,
          familia: design.familia,
          generation_schema: design.generation_schema,
        }}
        params={params}
        stlUrl={stlUrl && stlUrl.startsWith('https://') ? stlUrl : null}
        defaultEmail={userEmail ?? undefined}
        userId={userId}
      />
    )}
    </>
  );
}
