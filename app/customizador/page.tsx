'use client';

import { useState } from 'react';
import Preview3D from './Preview3D';
import STLViewer from '@/components/STLViewer';

type ViewerState = 'idle' | 'generating' | 'ready';

type Props = {
  designId: string;
  initialParams: Record<string, any>;
};

export default function CustomizadorClient({ designId, initialParams }: Props) {
  const [params, setParams] = useState<Record<string, any>>(initialParams);
  const [viewerState, setViewerState] = useState<ViewerState>('idle');
  const [stlUrl, setStlUrl] = useState<string>();

  // ✅ CORRIGIDO
  function updateParam(key: string, value: any) {
    setParams(prev => ({
      ...prev,
      [key]: value,
    }));
  }

  async function gerarPreviewSTL() {
    setViewerState('generating');
    setStlUrl(undefined);

    const res = await fetch('/api/gerar-stl-pro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: designId,
        params,
      }),
    });

    if (!res.ok) {
      setViewerState('idle');
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);

    setStlUrl(url);
    setViewerState('ready');
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 24 }}>
      <div style={{ height: 450 }}>
        {stlUrl ? (
          <STLViewer
            stlUrl={stlUrl}
            state={viewerState}
            schema={{ grid: true }}
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <label>
          Largura
          <input
            type="range"
            min={10}
            max={200}
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
        >
          {viewerState === 'generating' ? 'A gerar STL…' : 'Gerar STL'}
        </button>
      </div>
    </div>
  );
}