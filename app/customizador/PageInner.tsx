'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import GeneratedEditor from '@/components/GeneratedEditor';
import CustomizadorClient from './CustomizadorClient';
import styles from './ConfiguratorLayout.module.css';

type GenerationSchema = {
  parameters: Record<string, any>;
};

type Design = {
  id: string;
  nome: string;
  familia: string;
  generation_schema: GenerationSchema;
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

  // ------------------------------
  // LOAD DESIGN + SCHEMA FROM DB (API)
  // ------------------------------
  useEffect(() => {
    if (!designId) return;

    async function load() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`/api/produto?id=${designId}`);
        if (!res.ok) {
          throw new Error('Erro ao carregar design');
        }

        const data: Design = await res.json();
        setDesign(data);

        // Inicializar parâmetros com valores default do schema
        const schema = data.generation_schema;
        if (schema?.parameters) {
          const initialParams: Record<string, any> = {};
          Object.entries(schema.parameters).forEach(([key, def]: any) => {
            initialParams[key] = def.default ?? null;
          });
          setParams(initialParams);
        }

        // Se temos uma família, carregar todos os designs dessa família
        if (familiaParam) {
          const familyRes = await fetch(`/api/designs-familia?familia=${encodeURIComponent(familiaParam)}`);
          if (familyRes.ok) {
            const familyData = await familyRes.json();
            setFamilyDesigns(familyData || []);
          }
        }
      } catch (err) {
        console.error(err);
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
    // Se estava vendo STL, volta ao preview quando mexe nos parâmetros
    if (mode === 'stl') {
      setMode('preview');
      setStlUrl(null);
    }
  };

  const handleDesignChange = (newDesignId: string) => {
    // Atualizar URL com novo design
    const params = new URLSearchParams();
    params.set('id', newDesignId);
    if (familiaParam) {
      params.set('familia', familiaParam);
    }
    router.push(`/customizador?${params.toString()}`);
  };

  const gerarSTL = async () => {
    if (!params || !designId) return;

    try {
      // Muda para estado "generating" e mostra animação de loading
      setMode('generating');

      const res = await fetch('/api/gerar-stl-pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: designId,
          params,
        }),
      });

      if (!res.ok) throw new Error('Erro ao gerar STL');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      setStlUrl(url);
      setMode('stl');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Erro ao gerar STL');
      setMode('preview');
    }
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

  if (loading || !design || !params) {
    return <main className={styles.fallback}>A carregar…</main>;
  }

  // ------------------------------
  // UI
  // ------------------------------
  return (
    <main className={styles.root}>
      {/* Painel de configuração (esquerda) */}
      <aside className={styles.panel}>
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 12 }}>{design.nome}</h3>
          
          {/* Selector de designs da família */}
          {familyDesigns.length > 1 && (
            <div style={{
              padding: 12,
              backgroundColor: '#1e293b',
              borderRadius: 8,
              border: '1px solid #334155',
              marginBottom: 16,
            }}>
              <label style={{
                display: 'block',
                fontSize: '12px',
                color: '#94a3b8',
                marginBottom: 8,
                fontWeight: 500,
              }}>
                Outros modelos:
              </label>
              <select
                value={designId}
                onChange={(e) => handleDesignChange(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  border: '1px solid #475569',
                  borderRadius: 6,
                  fontSize: '14px',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                {familyDesigns.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.nome}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Render dynamic editor based on schema */}
        <GeneratedEditor
          schema={design.generation_schema}
          values={params}
          onChange={handleParamsChange}
        />

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
          {mode === 'generating' ? 'Gerando STL...' : 'Gerar STL'}
        </button>
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