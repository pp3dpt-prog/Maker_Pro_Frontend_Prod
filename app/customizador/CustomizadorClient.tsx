'use client';

import Preview3D from './Preview3D';
import STLViewer from '@/components/STLViewer';
import LoadingViewer from './LoadingViewer';

type Props = {
  designId: string;
  mode: 'preview' | 'stl' | 'generating';
  params: Record<string, any>;
  stlUrl?: string | null;
  stlFilePath?: string | null; // caminho do modelo em branco (pet-tags)
};

export default function CustomizadorClient({
  designId,
  mode,
  params,
  stlUrl,
  stlFilePath,
}: Props) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {mode === 'preview' && (
        <>
          <Preview3D
            params={params}
            stlFilePath={stlFilePath}
          />
          <div
            style={{
              position: 'absolute',
              top: 12,
              left: 12,
              right: 12,
              padding: '10px 14px',
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              borderRadius: 10,
              color: '#e2e8f0',
              fontSize: 12,
              lineHeight: 1.45,
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              pointerEvents: 'none',
              zIndex: 10,
              maxWidth: 520,
            }}
          >
            <strong style={{ color: '#60a5fa' }}>Pré-visualização aproximada.</strong>{' '}
            As letras podem mostrar pequenas irregularidades aqui que{' '}
            <strong>não aparecem no ficheiro STL final</strong>. Podes gerar o STL
            as vezes que quiseres — só pagas quando fizeres o <strong>download</strong>.
          </div>
        </>
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
