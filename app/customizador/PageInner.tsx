'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import GeneratedEditor from '@/components/GeneratedEditor';
import CustomizadorClient from './CustomizadorClient';
import styles from './ConfiguratorLayout.module.css';

type GenerationSchema = {
  parameters: Record<string, any>;
};

type Design = {
  id: string;
  nome: string;
  generation_schema: GenerationSchema;
};

export default function PageInner() {
  const searchParams = useSearchParams();
  const designId = searchParams.get('id');

  // ------------------------------
  // STATE
  // ------------------------------
  const [design, setDesign] = useState<Design | null>(null);
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
      } catch (err) {
        console.error(err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [designId]);

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
        <h3>{design.nome}</h3>

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