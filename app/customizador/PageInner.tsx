'use client';

import { useEffect, useState } from 'react';
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
};

type UserProfile = {
  creditos_disponiveis: number;
};

export default function PageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const designId = searchParams.get('id');
  const familiaParam = searchParams.get('familia');

  // ------------------------------
  // STATE
  // ------------------------------
  const [design, setDesign] = useState<Design | null>(null);
  const [familyDesigns, setFamilyDesigns] = useState<Design[]>([]);
  const [params, setParams] = useState<Record<string, any> | null>(null);
  const [mode, setMode] = useState<'preview' | 'stl' | 'generating'>('preview');
  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Auth
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ------------------------------
  // AUTH + PERFIL
  // ------------------------------
  useEffect(() => {
  async function loadAuth() {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.user) {
      setUserId(session.user.id);

      const { data: perfil } = await supabase
        .from('prod_perfis')
        .select('creditos_disponiveis')
        .eq('id', session.user.id)
        .maybeSingle();

      setUserProfile(perfil ?? null);
    }

    setAuthLoading(false);
  }

  loadAuth();

  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      setUserId(session.user.id);
      const { data: perfil } = await supabase
        .from('prod_perfis')
        .select('creditos_disponiveis')
        .eq('id', session.user.id)
        .maybeSingle();
      setUserProfile(perfil ?? null);
    } else {
      setUserId(null);
      setUserProfile(null);
    }
  });

  return () => subscription.unsubscribe();
}, []);

  // ------------------------------
  // LOAD DESIGN + SCHEMA
  // ------------------------------
  useEffect(() => {
    if (!designId) return;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        // Buscar design incluindo credit_cost
        const res = await fetch(`/api/produto?id=${designId}`);
        if (!res.ok) throw new Error('Erro ao carregar design');

        const data: Design = await res.json();
        setDesign(data);

        // Inicializar parâmetros
        const schema = data.generation_schema;
        if (schema?.parameters) {
          const initialParams: Record<string, any> = {};
          Object.entries(schema.parameters).forEach(([key, def]: any) => {
            initialParams[key] = def.default ?? null;
          });
          setParams(initialParams);
        }

        // Carregar designs da família
        if (familiaParam) {
          const familyRes = await fetch(`/api/designs-familia?familia=${encodeURIComponent(familiaParam)}`);
          if (familyRes.ok) {
            const familyData = await familyRes.json();
            setFamilyDesigns(familyData || []);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [designId, familiaParam]);

  // ------------------------------
  // HANDLERS
  // ------------------------------
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
    // Guardar de login
    if (!userId) {
      router.push('/login');
      return;
    }

    if (!params || !designId) return;

    try {
      setMode('generating');

      const res = await fetch('/api/gerar-stl-pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: designId, params }),
      });

      if (!res.ok) throw new Error('Erro ao gerar STL');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      setStlUrl(url);
      setMode('stl');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar STL');
      setMode('preview');
    }
  };

  // Callback chamado pelo DownloadStlButton após download com sucesso
  // Atualiza os créditos localmente sem precisar de reload
  const handleDownloadSuccess = (novosCreditos: number) => {
    setUserProfile((prev) => prev ? { ...prev, creditos_disponiveis: novosCreditos } : prev);
  };

  // ------------------------------
  // GUARDS
  // ------------------------------
  if (!designId) {
    return <main className={styles.fallback}>Produto inválido</main>;
  }

  if (error) {
    return (
      <main className={styles.fallback}>
        <div style={{ color: '#ef4444' }}>{error}</div>
      </main>
    );
  }

  if (loading || authLoading || !design || !params) {
    return <main className={styles.fallback}>A carregar…</main>;
  }

  const isFree = !design.credit_cost || design.credit_cost === 0;
  const temCreditos = isFree || (userProfile?.creditos_disponiveis ?? 0) >= design.credit_cost;

  // ------------------------------
  // UI
  // ------------------------------
  return (
    <main className={styles.root}>
      {/* Painel de configuração (esquerda) */}
      <aside className={styles.panel}>

        {/* Selector de designs da família */}
        {familyDesigns.length > 1 && (
          <div style={{
            padding: 12,
            backgroundColor: '#1e293b',
            borderRadius: 8,
            border: '1px solid #334155',
            marginBottom: 4,
          }}>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 8, fontWeight: 500 }}>
              Outros modelos:
            </label>
            <select
              value={designId}
              onChange={(e) => handleDesignChange(e.target.value)}
              style={{
                width: '100%', padding: '8px 10px',
                backgroundColor: '#0f172a', color: '#ffffff',
                border: '1px solid #475569', borderRadius: 6,
                fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {familyDesigns.map((d) => (
                <option key={d.id} value={d.id}>{d.nome}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ marginBottom: 8 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: '#f1f5f9' }}>{design.nome}</h3>
        </div>

        {/* Editor de parâmetros */}
        <GeneratedEditor
          schema={design.generation_schema}
          values={params}
          onChange={handleParamsChange}
        />

        {/* ── Área de ação ── */}
        <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Preço */}
          <div style={{
            padding: '10px 14px',
            borderRadius: 10,
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Custo do download</span>
            {isFree ? (
              <span style={{ fontSize: 14, fontWeight: 800, color: '#34d399' }}>Gratuito</span>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: '#60a5fa' }}>
                  {design.credit_cost} ₡
                </span>
                {userId && (
                  <span style={{
                    fontSize: 11, color: temCreditos ? '#64748b' : '#f87171',
                    fontWeight: 600,
                  }}>
                    (tens {userProfile?.creditos_disponiveis ?? 0} ₡)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Aviso de créditos insuficientes */}
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
            title={!userId ? 'É necessário fazer login para gerar STL' : undefined}
            style={{
              opacity: mode === 'generating' ? 0.6 : 1,
              cursor: mode === 'generating' ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
              position: 'relative',
            }}
          >
            {mode === 'generating'
              ? 'A gerar STL…'
              : !userId
                ? '🔒 Login para Gerar STL'
                : 'Gerar STL'
            }
          </button>

          {/* Botão Download — só aparece após gerar */}
          {mode === 'stl' && userId && (
            <DownloadStlButton
              designId={designId}
              params={params}
              creditCost={design.credit_cost ?? 0}
              creditsAvailable={userProfile?.creditos_disponiveis ?? 0}
              onSuccess={handleDownloadSuccess}
            />
          )}
        </div>
      </aside>

      {/* Viewer (direita) */}
      <section className={styles.viewer}>
        <CustomizadorClient
          designId={designId}
          mode={mode}
          params={params}
          stlUrl={stlUrl}
        />
      </section>
    </main>
  );
}
