'use client';

import { useState } from 'react';
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
  coresPatamares?: string[]; // cores do preview do porta-chaves com patamares (só visual)
};

export default function CustomizadorClient({
  designId,
  mode,
  params,
  stlUrl,
  stlFilePath,
  thumbnailUrl,
  coresPatamares,
}: Props) {
  // Preview ao vivo (3D em tempo real):
  //  - pet-tags: têm stlFilePath (modelo em branco + texto sobreposto)
  //  - porta-chaves nome: params Text + Font_name (letras 3D geradas no browser)
  //  - letras decorativas: params letra + nome + fonte_inicial (letra + nome geradas no browser)
  //  - porta-chaves texto com patamares: params nome + fonte + offset_cor1 (níveis empilhados gerados no browser)
  //  - letra caixa de luz: params letra + borda_moldura + espessura_inicial (casca/tampa traseira/nome, geradas no browser)
  const hasPetTagPreview = !!stlFilePath;
  const isNameKey = typeof params?.Text === 'string' && typeof params?.Font_name === 'string';
  // Tem de vir ANTES de isLetraNome: o schema da caixa de luz partilha quase
  // todos os nomes de parâmetros com "Letras Decorativas" — só
  // borda_moldura/espessura_inicial são exclusivos da caixa de luz.
  const isCaixaLuz = !isNameKey
    && typeof params?.letra === 'string'
    && params?.borda_moldura !== undefined && params?.espessura_inicial !== undefined;
  const isLetraNome = !isNameKey && !isCaixaLuz
    && typeof params?.letra === 'string' && typeof params?.nome === 'string'
    && typeof params?.fonte_inicial === 'string';
  const isPatamares = !isNameKey && !isLetraNome && !isCaixaLuz
    && typeof params?.nome === 'string' && typeof params?.fonte === 'string'
    && params?.offset_cor1 !== undefined;
  const temPreviewVivo = hasPetTagPreview || isNameKey || isLetraNome || isPatamares || isCaixaLuz;

  // Caixa de luz: além da peça do "modo" selecionado (para gerar o STL), o
  // preview permite ver várias peças montadas em conjunto (ex.: corpo + nome,
  // ou tudo junto) — isto é só visual, não altera o que é gerado como STL.
  const [pecasVisiveis, setPecasVisiveis] = useState<string[]>(['corpo']);
  function togglePeca(peca: string) {
    setPecasVisiveis(prev => {
      if (prev.includes(peca)) {
        return prev.length > 1 ? prev.filter(p => p !== peca) : prev; // não deixar ficar vazio
      }
      return [...prev, peca];
    });
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      {mode === 'preview' && (
        <>
          {temPreviewVivo ? (
            /* Preview 3D ao vivo — actualiza com os parâmetros em tempo real */
            <Preview3D params={params} stlFilePath={stlFilePath} coresPatamares={coresPatamares} pecasCaixaLuz={isCaixaLuz ? pecasVisiveis : undefined} />
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
              ? <><strong style={{ color: '#60a5fa' }}>Pré-visualização em tempo real.</strong>{' '}Pode mostrar pequenas irregularidades que <strong>não aparecem no STL final</strong>.{' '}Gera o STL para ver o resultado final.</>
              : thumbnailUrl
                ? <><strong style={{ color: '#60a5fa' }}>Exemplo do produto.</strong>{' '}Gera o STL para ver o resultado exacto com os teus parâmetros.</>
                : <><strong style={{ color: '#60a5fa' }}>Pré-visualização aproximada.</strong>{' '}Gera o STL para ver o modelo com os teus parâmetros.</>
            }

            {isCaixaLuz && (
              <div style={{ pointerEvents: 'auto', display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                <span style={{ color: '#94a3b8' }}>Ver em conjunto:</span>
                {[
                  { key: 'corpo', label: 'Corpo' },
                  { key: 'tampa', label: 'Nome' },            // 'tampa' no schema = a peça do nome
                  { key: 'traseira', label: 'Tampa traseira' },
                ].map(({ key, label }) => (
                  <label key={key} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={pecasVisiveis.includes(key)}
                      onChange={() => togglePeca(key)}
                      style={{ cursor: 'pointer' }}
                    />
                    {label}
                  </label>
                ))}
              </div>
            )}
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

      {(mode === 'preview' || mode === 'stl') && (
        <div
          style={{
            position: 'absolute',
            bottom: 12,
            left: 12,
            right: 12,
            textAlign: 'center',
            color: '#8a96aa',
            fontSize: 11,
            letterSpacing: '0.02em',
            pointerEvents: 'none',
            zIndex: 10,
          }}
        >
          Arrasta para rotacionar · scroll para zoom
        </div>
      )}
    </div>
  );
}
