'use client';

import Preview3D from './Preview3D';
import STLViewer from '@/components/STLViewer';

type Params = {
  largura: number;
  comprimento: number;
  altura: number;
  espessura: number;
};

type Props = {
  designId: string;
  mode: 'preview' | 'stl';
  params: Params;
  stlUrl?: string | null;
};

export default function CustomizadorClient({
  designId,
  mode,
  params,
  stlUrl,
}: Props) {
  return (
    <div style={{ width: '100%', height: '100%' }}>
      {mode === 'preview' && (
        <Preview3D
          largura={params.largura}
          comprimento={params.comprimento}
          altura={params.altura}
          espessura={params.espessura}
        />
      )}

      {mode === 'stl' && stlUrl && (
        <STLViewer
          stlUrl={stlUrl}
          state="ready"
          schema={{ grid: true }}
        />
      )}
    </div>
  );
}