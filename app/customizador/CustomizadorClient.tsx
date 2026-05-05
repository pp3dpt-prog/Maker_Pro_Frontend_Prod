'use client';

/**
 * ATENÇÃO IMPORTANTE
 * ------------------
 * Este componente:
 *  ✅ NÃO tem sliders
 *  ✅ NÃO tem botões
 *  ✅ NÃO tem texto
 *  ✅ NÃO tem layout
 *
 * Ele existe APENAS para:
 *  - Renderizar o preview 3D
 *  - Renderizar o STL viewer
 *  - Conter lógica 3D / geração STL
 *
 * TODA a UI (sliders, botões, labels)
 * pertence ao PageInner.tsx
 */

type Props = {
  designId: string;
};

export default function CustomizadorClient({ designId }: Props) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
      }}
    >
      {/* ✅ AQUI ENTRA APENAS O 3D */}

      {/* Exemplo (quando ligares o teu código real):
          <Preview3D designId={designId} />
          ou
          <STLViewer url={...} />
      */}

      {/* TEMPORÁRIO (opcional, podes remover):
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          fontSize: 12,
          opacity: 0.5,
        }}
      >
        Design ID: {designId}
      </div>
      */}
    </div>
  );
}