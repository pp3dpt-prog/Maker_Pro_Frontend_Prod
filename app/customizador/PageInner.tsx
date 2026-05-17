'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import GeneratedEditor from '@/components/GeneratedEditor';
import CustomizadorClient from './CustomizadorClient';
import DownloadStlButton from '@/components/DownloadStlButton';
import styles from './ConfiguratorLayout.module.css';

type GenerationSchema = {
  parameters: Record<string, any>;
};

type Design = {
  id: string;
  nome: string;
  familia: string;
  credit_cost: number;
  generation_schema: GenerationSchema;
  stl_file_path?: string | null;
  total_likes: number;
  total_downloads: number;
  estado: string;
  plano_minimo: string | null;
};

type UserProfile = {
  creditos_disponiveis: number;
  role: string | null;
  plano_id: string | null;
  prod_planos?: { nome: string } | { nome: string }[] | null;
};

const VISUAL_PARAMS = ['mostrar_texto'];

const HIERARQUIA_PLANOS = [
  'Experimental',
  'Maker Pro',
  'Plano Fundador Pro',
  'Commercial License',
];

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

  const [design, setDesign] = useState<Design | null>(null);
  const [familyDesigns, setFamilyDesigns] = useState<Design[]>([]);
  const [params, setParams] = useState<Record<string, any> | null>(null);
  const [mode, setMode] = useState<'preview' | 'stl' | 'generating'>('preview');
  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [likes, setLikes] = useState(0);
  const [liked, setLiked] = useState(false);
  const [liking, setLiking] = useState(false);
  const [showRetry, setShowRetry] = useState(false);

  // Auth
  useEffect(() => {
    async function loadAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUserId(session.user.id);
        const { data: perfil } = await supabase
          .from('prod_perfis')
          .select('creditos_disponiveis, role, plano_id, prod_planos(nome)')
          .eq('id', session.user.id)
          .maybeSingle();
        setUserProfile(perfil as UserProfile ?? null);
      }
      setAuthLoading(false);
    }
    loadAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUserId(session.user.id);
        const { data: perfil } = await supabase
          .from('prod_perfis')
          .select('creditos_disponiveis, role, plano_id, prod_planos(nome)')
          .eq('id', session.user.id)
          .maybeSingle();
        setUserProfile(perfil as UserProfile ?? null);
      } else {
        setUserId(null);
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
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
        setDesign(data);
        setLikes(data.total_likes ?? 0);

        const schema = data.generation_schema;
        if (schema?.parameters) {
          const initialParams: Record<string, any> = {};
          Object.entries(schema.parameters).forEach(([key, def]: any) => {
            initialParams[key] = def.default ?? null;
          });
          setParams(initialParams);
        }

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
  const userPlanoNome = Array.isArray(userProfile?.prod_planos)
  ? (userProfile?.prod_planos as any[])[0]?.nome ?? null
  : (userProfile?.prod_planos as any)?.nome ?? null;

  const temAcessoPlano = (planoMinimo: string | null): boolean => {
    if (!planoMinimo) return true;
    if (isAdmin) return true;
    if (!userPlanoNome) return false;
    const nivelUser = HIERARQUIA_PLANOS.indexOf(userPlanoNome);
    const nivelMinimo = HIERARQUIA_PLANOS.indexOf(planoMinimo);
    return nivelUser >= nivelMinimo;
  };

  const handleParamsChange = (newParams: Record<string, any>) => {
    setParams(newParams);
    if (mode === 'stl') {
      setMode('preview');
      setStlUrl(null);
    }
  };

  const handleDesignChange = (newDesignId: string) => {
    const p = new URLSearchParams();
    p.set('id', newDesignId);
    if (familiaParam) p.set('familia', familiaParam);
    router.push(`/customizador?${p.toString()}`);
  };

  const gerarSTL = async () => {
    if (!userId) {
      router.push('/login');
      return;
    }
    if (!params || !designId) return;

    try {
      setMode('generating');
      const paramsBackend = filtrarParamsBackend(params);

      // Detetar sistema: 'scad' para novos produtos (sem base_geometry),
      // 'legacy' para pet tags com base_geometry estático
      const isScad = !design?.generation_schema?.base_geometry;
      const system = isScad ? 'scad' : 'legacy';

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };

      // Sistema SCAD requer autenticação no backend Docker
      if (isScad) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }
      }

      const res = await fetch('/api/gerar-stl-pro', {
        method: 'POST',
        headers,
        body: JSON.stringify({ id: designId, params: paramsBackend, system }),
      });

      if (!res.ok) throw new Error('Erro ao gerar STL');

      if (isScad) {
        // Sistema novo: resposta é JSON com URL assinada
        const data = await res.json();
        if (!data?.url) throw new Error('URL do STL não recebida');
        setStlUrl(data.url);
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

  const handleDownloadSuccess = (novosCreditos: number) => {
    setUserProfile((prev) => prev ? { ...prev, creditos_disponiveis: novosCreditos } : prev);
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
  if (loading || authLoading || !design || !params) return <main className={styles.fallback}>A carregar…</main>;

  // Verificar acesso ao design
  const designBloqueado = design.estado === 'exclusivo' && !temAcessoPlano(design.plano_minimo) && !isAdmin;
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

  const isFree = !design.credit_cost || design.credit_cost === 0;
  const temCreditos = isFree || (userProfile?.creditos_disponiveis ?? 0) >= design.credit_cost;
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

        {/* Editor de parâmetros */}
        {designBloqueado ? (
          // Design exclusivo sem acesso — mostrar mensagem
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            textAlign: 'center', gap: 12, padding: '20px 0',
          }}>
            <div style={{ fontSize: 40 }}>🔒</div>
            <h4 style={{ color: '#f1f5f9', margin: 0 }}>Conteúdo Exclusivo</h4>
            <p style={{ color: '#64748b', fontSize: 13, margin: 0 }}>
              Este design requer o plano <strong style={{ color: '#a78bfa' }}>{design.plano_minimo}</strong> ou superior.
            </p>
            <a
              href="/precario"
              style={{
                padding: '10px 20px', borderRadius: 10,
                background: 'rgba(167,139,250,0.15)',
                border: '1px solid rgba(167,139,250,0.3)',
                color: '#a78bfa', fontWeight: 700, fontSize: 13,
                textDecoration: 'none',
              }}
            >
              Ver planos →
            </a>
          </div>
        ) : (
          <GeneratedEditor
            schema={design.generation_schema}
            values={params}
            onChange={handleParamsChange}
          />
        )}

        {/* Área de ação */}
        {!designBloqueado && (
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>

            {/* Preço */}
            <div style={{
              padding: '10px 14px', borderRadius: 10,
              backgroundColor: '#0f172a', border: '1px solid #1e293b',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Custo do download</span>
              {isFree ? (
                <span style={{ fontSize: 14, fontWeight: 800, color: '#34d399' }}>Gratuito</span>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#60a5fa' }}>{design.credit_cost} ₡</span>
                  {userId && (
                    <span style={{ fontSize: 11, color: temCreditos ? '#64748b' : '#f87171', fontWeight: 600 }}>
                      (tens {userProfile?.creditos_disponiveis ?? 0} ₡)
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Aviso créditos insuficientes */}
            {userId && !isFree && !temCreditos && (
              <div style={{
                padding: '8px 12px', borderRadius: 8,
                backgroundColor: 'rgba(248,113,113,0.1)',
                border: '1px solid rgba(248,113,113,0.3)',
                fontSize: 12, color: '#f87171', textAlign: 'center',
              }}>
                Créditos insuficientes.{' '}
                <a href="/precario" style={{ color: '#60a5fa', fontWeight: 700, textDecoration: 'none' }}>
                  Adquirir créditos →
                </a>
              </div>
            )}

            {/* Botão Gerar STL */}
            <button
              className={styles.primaryBtn}
              onClick={gerarSTL}
              disabled={mode === 'generating'}
              style={{
                opacity: mode === 'generating' ? 0.6 : 1,
                cursor: mode === 'generating' ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {mode === 'generating'
                ? 'A gerar STL…'
                : !userId
                  ? '🔒 Login para Gerar STL'
                  : 'Gerar STL'
              }
            </button>

            {/* Botão Download */}
            {mode === 'stl' && userId && (
              <DownloadStlButton
                designId={designId}
                params={paramsParaDownload}
                creditCost={design.credit_cost ?? 0}
                creditsAvailable={userProfile?.creditos_disponiveis ?? 0}
                onSuccess={handleDownloadSuccess}
              />
            )}
          </div>
        )}
      </aside>

      {/* Viewer */}
      <section className={styles.viewer}>
        <CustomizadorClient
          designId={designId}
          mode={mode}
          params={params}
          stlUrl={stlUrl}
          stlFilePath={design.stl_file_path}
        />
      </section>
    </main>
    </>
  );
}
