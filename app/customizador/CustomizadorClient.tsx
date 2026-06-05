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
  thumbnailUrl?: string | null; // imagem de preview para produtos sem preview nativo
};

export default function CustomizadorClient({
  designId,
  mode,
  params,
  stlUrl,
  stlFilePath,
  thumbnailUrl,
}: Props) {
  // Preview ao vivo (3D em tempo real):
  //  - pet-tags: têm stlFilePath (modelo em branco + texto sobreposto)
  //  - porta-chaves nome: params Text + Font_name (letras 3D geradas no browser)
  const hasPetTagPreview = !!stlFilePath;
  const isNameKey = typeof params?.Text === 'string' && typeof params?.Font_name === 'string';
  const temPreviewVivo = hasPetTagPreview || isNameKey;

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {mode === 'preview' && (
        <>
          {temPreviewVivo ? (
            /* Preview 3D ao vivo — actualiza com os parâmetros em tempo real */
            <Preview3D params={params} stlFilePath={stlFilePath} />
          ) : thumbnailUrl ? (
            /* Produtos sem preview ao vivo: mostrar thumbnail como exemplo */
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617' }}>
              <img
                src={thumbnailUrl}
                alt="Preview do produto"
                style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
              />
            </div>
          ) : (
            /* Sem thumbnail nem preview ao vivo: cubo genérico */
            <Preview3D params={params} stlFilePath={null} />
          )}
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
            {temPreviewVivo
              ? <><strong style={{ color: '#60a5fa' }}>Pré-visualização em tempo real.</strong>{' '}Pode mostrar pequenas irregularidades que <strong>não aparecem no STL final</strong>.</>
              : thumbnailUrl
                ? <><strong style={{ color: '#60a5fa' }}>Exemplo do produto.</strong>{' '}Gera o STL para ver o resultado exacto com os teus parâmetros.</>
                : <><strong style={{ color: '#60a5fa' }}>Pré-visualização aproximada.</strong>{' '}Gera o STL para ver o modelo com os teus parâmetros.</>
            }
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
