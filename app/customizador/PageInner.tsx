'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import CustomizadorClient from './CustomizadorClient';
import styles from './ConfiguratorLayout.module.css';

type Params = {
  largura: number;
  comprimento: number;
  altura: number;
  espessura: number;
};

export default function PageInner() {
  const searchParams = useSearchParams();
  const designId = searchParams.get('id');

  // ------------------------------
  // STATE
  // ------------------------------
  const [params, setParams] = useState<Params | null>(null);
  const [mode, setMode] = useState<'preview' | 'stl'>('preview');
  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ------------------------------
  // LOAD PARAMETERS FROM DB (API)
  // ------------------------------
  useEffect(() => {
    if (!designId) return;

    async function load() {
      try {
        setLoading(true);

        const res = await fetch(`/api/designs/${designId}`);
        if (!res.ok) throw new Error('Erro ao carregar parâmetros');

        const data = await res.json();

        setParams(data.parametros_default);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [designId]);

  // ------------------------------
  // HANDLERS
  // ------------------------------
  function updateParam<K extends keyof Params>(
    key: K,
    value: Params[K]
  ) {
    setParams(prev =>
      prev
        ? {
            ...prev,
            [key]: value,
          }
        : prev
    );

    // Sempre que mexe nos parâmetros,
    // volta automaticamente ao preview
    setMode('preview');
  }

  async function gerarSTL() {
    if (!params || !designId) return;

    try {
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
    }
  }

  // ------------------------------
  // GUARDS
  // ------------------------------
  if (!designId) {
    return <main className={styles.fallback}>Produto inválido</main>;
  }

  if (loading || !params) {
    return <main className={styles.fallback}>A carregar…</main>;
  }

  // ------------------------------
  // UI
  // ------------------------------
  return (
    <main className={styles.root}>
      {/* Painel de configuração (esquerda) */}
      <aside className={styles.panel}>
        <h3>Configuração</h3>

        <label>
          Largura ({params.largura} mm)
          <input
            type="range"
            min={50}
            max={300}
            value={params.largura}
            onChange={e =>
              updateParam('largura', Number(e.target.value))
            }
          />
        </label>

        <label>
          Comprimento ({params.comprimento} mm)
          <input
            type="range"
            min={50}
            max={400}
            value={params.comprimento}
            onChange={e =>
              updateParam('comprimento', Number(e.target.value))
            }
          />
        </label>

        <label>
          Altura ({params.altura} mm)
          <input
            type="range"
            min={30}
            max={200}
            value={params.altura}
            onChange={e =>
              updateParam('altura', Number(e.target.value))
            }
          />
        </label>

        <label>
          Espessura ({params.espessura} mm)
          <input
            type="range"
            min={1}
            max={10}
            step={0.5}
            value={params.espessura}
            onChange={e =>
              updateParam('espessura', Number(e.target.value))
            }
          />
        </label>

        <button className={styles.primaryBtn} onClick={gerarSTL}>
          Gerar STL
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