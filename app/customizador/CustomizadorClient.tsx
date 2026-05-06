'use client';

import Preview3D from './Preview3D';
import STLViewer from '@/components/STLViewer';
import LoadingViewer from './LoadingViewer';

type Props = {
  designId: string;
  mode: 'preview' | 'stl' | 'generating';
  params: Record<string, any>;
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
          params={params}
        />
      )}

      {mode === 'generating' && (
        <LoadingViewer />
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