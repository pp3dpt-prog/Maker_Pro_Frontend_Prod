type FamilyCardProps = {
  familia: string;
  modelCount: number;
  thumbnail_url?: string;
  descricao?: string;
};

const FAMILY_CONFIG: Record<string, {
  icon: string;
  description: string;
  accent: string;
  accentDark: string;
  glow: string;
  tag: string;
}> = {
  'pet-tags': {
    icon: '🐾',
    description: 'Identificadores únicos para o teu companheiro. Personalizáveis ao milímetro.',
    accent: '#f472b6',
    accentDark: '#9d174d',
    glow: 'rgba(244,114,182,0.35)',
    tag: 'Popular',
  },
  'caixas': {
    icon: '📦',
    description: 'Caixas paramétricas com dimensões exatas. Com ou sem tampa, à tua medida.',
    accent: '#fb923c',
    accentDark: '#9a3412',
    glow: 'rgba(251,146,60,0.35)',
    tag: 'Mais vendido',
  },
  'peças mecânicas': {
    icon: '⚙️',
    description: 'Componentes de precisão para robótica, prototipagem e automação.',
    accent: '#94a3b8',
    accentDark: '#334155',
    glow: 'rgba(148,163,184,0.3)',
    tag: 'Técnico',
  },
  'hueforge / artístico': {
    icon: '🎨',
    description: 'Peças decorativas multi-camada. Arte que sai da impressora pronta a expor.',
    accent: '#a78bfa',
    accentDark: '#4c1d95',
    glow: 'rgba(167,139,250,0.4)',
    tag: 'Destaque',
  },
  'vasos': {
    icon: '🌿',
    description: 'Vasos e recipientes com geometria orgânica. Design vivo para espaços vivos.',
    accent: '#34d399',
    accentDark: '#064e3b',
    glow: 'rgba(52,211,153,0.35)',
    tag: 'Novo',
  },
};

function getConfig(familia: string) {
  const key = familia.toLowerCase();
  return (
    FAMILY_CONFIG[key] ||
    FAMILY_CONFIG[Object.keys(FAMILY_CONFIG).find((k) => key.includes(k)) ?? ''] || {
      icon: '🖨️',
      description: 'Designs paramétricos para impressão 3D de alta precisão.',
      accent: '#60a5fa',
      accentDark: '#1e3a8a',
      glow: 'rgba(96,165,250,0.35)',
      tag: 'Novo',
    }
  );
}

export default function FamilyCard({
  familia,
  modelCount,
  thumbnail_url,
  descricao,
}: FamilyCardProps) {
  const cfg = getConfig(familia);
  const description = descricao || cfg.description;

  return (
    <>
      <style>{`
        .fcard {
          position: relative;
          border-radius: 20px;
          overflow: hidden;
          background: #0d1117;
          border: 1px solid rgba(255,255,255,0.06);
          cursor: pointer;
          transition: transform 0.35s cubic-bezier(.22,.68,0,1.2), box-shadow 0.35s ease, border-color 0.3s ease;
          display: flex;
          flex-direction: column;
          height: 380px;
          text-decoration: none;
        }
        .fcard:hover {
          transform: translateY(-6px) scale(1.015);
          border-color: var(--accent-color);
          box-shadow: 0 0 40px var(--glow-color), 0 20px 60px rgba(0,0,0,0.5);
        }
        .fcard__image-wrap {
          position: relative;
          height: 200px;
          overflow: hidden;
          flex-shrink: 0;
        }
        .fcard__image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 0.5s ease, filter 0.4s ease;
          filter: brightness(0.7) saturate(0.8);
        }
        .fcard:hover .fcard__image {
          transform: scale(1.07);
          filter: brightness(0.85) saturate(1.1);
        }
        .fcard__image-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
          font-size: 72px;
          transition: transform 0.5s ease;
        }
        .fcard:hover .fcard__image-placeholder {
          transform: scale(1.07);
        }
        .fcard__image-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            transparent 30%,
            rgba(13,17,23,0.7) 70%,
            rgba(13,17,23,0.95) 100%
          );
          pointer-events: none;
        }
        .fcard__badge {
          position: absolute;
          top: 14px;
          right: 14px;
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          background: rgba(13,17,23,0.75);
          backdrop-filter: blur(8px);
          border: 1px solid var(--accent-color);
          color: var(--accent-color);
        }
        .fcard__count-badge {
          position: absolute;
          bottom: 14px;
          left: 14px;
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          background: rgba(13,17,23,0.8);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.1);
          color: rgba(255,255,255,0.8);
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .fcard__dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent-color);
          box-shadow: 0 0 6px var(--accent-color);
        }
        .fcard__body {
          padding: 20px 22px 22px;
          display: flex;
          flex-direction: column;
          flex: 1;
          gap: 8px;
        }
        .fcard__title {
          font-size: 20px;
          font-weight: 800;
          color: #f1f5f9;
          letter-spacing: -0.02em;
          margin: 0;
          text-transform: capitalize;
          transition: color 0.25s;
          line-height: 1.2;
        }
        .fcard:hover .fcard__title {
          color: var(--accent-color);
        }
        .fcard__desc {
          font-size: 13px;
          color: #64748b;
          line-height: 1.6;
          margin: 0;
          flex: 1;
        }
        .fcard__footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .fcard__cta {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: #475569;
          transition: color 0.25s;
        }
        .fcard:hover .fcard__cta {
          color: var(--accent-color);
        }
        .fcard__arrow {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid rgba(255,255,255,0.08);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.25s, border-color 0.25s, transform 0.3s cubic-bezier(.22,.68,0,1.4);
          color: #475569;
        }
        .fcard:hover .fcard__arrow {
          background: var(--accent-color);
          border-color: var(--accent-color);
          color: #000;
          transform: translateX(4px);
        }
        /* Linha de acento no topo */
        .fcard__accent-line {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--accent-color), transparent);
          opacity: 0;
          transition: opacity 0.35s ease;
        }
        .fcard:hover .fcard__accent-line {
          opacity: 1;
        }
      `}</style>

      <div
        className="fcard"
        style={{
          '--accent-color': cfg.accent,
          '--glow-color': cfg.glow,
        } as React.CSSProperties}
      >
        {/* Linha de acento animada no topo */}
        <div className="fcard__accent-line" />

        {/* Imagem */}
        <div className="fcard__image-wrap">
          {thumbnail_url ? (
            <img src={thumbnail_url} alt={familia} className="fcard__image" />
          ) : (
            <div className="fcard__image-placeholder">{cfg.icon}</div>
          )}
          <div className="fcard__image-overlay" />

          {/* Badge de tag */}
          <div className="fcard__badge">{cfg.tag}</div>

          {/* Contador de modelos */}
          <div className="fcard__count-badge">
            <span className="fcard__dot" />
            {modelCount} modelo{modelCount !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Corpo */}
        <div className="fcard__body">
          <h3 className="fcard__title">{familia}</h3>
          <p className="fcard__desc">{description}</p>

          <div className="fcard__footer">
            <span className="fcard__cta">Explorar família</span>
            <div className="fcard__arrow">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 7h10M8 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
