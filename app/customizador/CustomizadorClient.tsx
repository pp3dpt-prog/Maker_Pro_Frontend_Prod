'use client';

import { useState } from 'react';
import Preview3D from './Preview3D';
import STLViewer from '@/components/STLViewer';

type ViewerState = 'idle' | 'generating' | 'ready';

/**
 * Props típicas recebidas da página:
 * - design.id
 * - valores iniciais vindos do generation_schema
 */
type Props = {
  designId: string;
  initialParams: Record<string, any>;
};

export default function CustomizadorClient({ designId, initialParams }: Props) {
  // ============================
  // STATE
  // ============================
  const [params, setParams] = useState<Record<string, any>>(initialParams);
  const [viewerState, setViewerState] = useState<ViewerState>('idle');
  const [stlUrl, setStlUrl] = useState<string | undefined>(undefined);

  // ============================
  // HANDLERS
  // ============================
  function updateParam(key: string, value: any) {
    setParams(prev => ({
      ...prev,
      [key]: value,
    }));
  }

  async function gerarPreviewSTL() {
    try {
      setViewerState('generating');
      setStlUrl(undefined);

      const res = await fetch('/api/gerar-stl-pro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: designId,
          params,
        }),
      });

      if (!res.ok) {
        const err = await res.text();
        console.error(err);
        setViewerState('idle');
        return;
      }

      // ✅ CRÍTICO: tratar como BINÁRIO
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      setStlUrl(url);
      setViewerState('ready');
    } catch (e) {
      console.error(e);
      setViewerState('idle');
    }
  }

  // ============================
  // UI
  // ============================
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 24 }}>
      {/* ===================== */}
      {/* VISUALIZAÇÃO 3D       */}
      {/* ===================== */}
      <div style={{ height: 450 }}>
        {stlUrl ? (
          <STLViewer
            stlUrl={stlUrl}
            state={viewerState}
            schema={{ grid: true, autoFrame: true }}
          />
        ) : (
          <Preview3D
            largura={params.largura}
            comprimento={params.comprimento}
            altura={params.altura}
            espessura={params.espessura}
          />
        )}
      </div>

      {/* ===================== */}
      {/* CONTROLOS             */}
      {/* ===================== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Exemplo de sliders */}
        <label>
          Largura
          <input
            type="range"
            min={10}
            max={200}
            step={1}
            value={params.largura}
            onChange={e => updateParam('largura', Number(e.target.value))}
          />
        </label>

        <label>
          Comprimento
          <input
            type="range"
            min={10}
            max={300}
            step={1}
            value={params.comprimento}
            onChange={e =>
              updateParam('comprimento', Number(e.target.value))
            }
          />
        </label>

        <label>
          Altura
          <input
            type="range"
            min={5}
            max={150}
            step={1}
            value={params.altura}
            onChange={e => updateParam('altura', Number(e.target.value))}
          />
        </label>

        <label>
          Espessura
          <input
            type="range"
            min={1}
            max={10}
            step={0.5}
            value={params.espessura}
            onChange={e => updateParam('espessura', Number(e.target.value))}
          />
        </label>

        <button
          onClick={gerarPreviewSTL}
          disabled={viewerState === 'generating'}
          style={{
            marginTop: 16,
            padding: '12px 16px',
            fontWeight: 'bold',
          }}
        >
          {viewerState === 'generating' ? 'A gerar STL…' : 'Gerar STL'}
        </button>
      </div>
    </div>
  );
}