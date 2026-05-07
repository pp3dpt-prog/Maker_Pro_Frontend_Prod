import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import FamilyCard from '@/components/cards/FamilyCard';

export const dynamic = 'force-dynamic';

type Design = {
  id: string;
  nome: string;
  descricao: string;
  familia: string;
  preco_creditos: number;
  tags?: string[];
  thumbnail_url?: string;
};

type FamilyInfo = {
  count: number;
  thumbnail_url?: string;
  designs: Design[];
};

export default async function Page() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('prod_designs')
    .select('id, nome, descricao, familia, preco_creditos, tags, thumbnail_url');

  if (error) {
    return (
      <main style={{ padding: 40, color: 'white' }}>
        <h2>Erro ao carregar catálogo</h2>
        <p style={{ color: '#f87171' }}>{error.message}</p>
      </main>
    );
  }

  const designs = (data ?? []) as Design[];

  const familias = designs.reduce<Record<string, FamilyInfo>>(
    (acc, design) => {
      const familia = design.familia ?? 'geral';
      if (!acc[familia]) {
        acc[familia] = {
          count: 0,
          thumbnail_url: design.thumbnail_url,
          designs: [],
        };
      }
      acc[familia].count++;
      acc[familia].designs.push(design);
      return acc;
    },
    {}
  );

  const familiaEntries = Object.entries(familias);

  return (
    <main style={{ background: '#080c10', minHeight: '100vh' }}>
      <style>{`
        .catalog-header {
          padding: 64px 40px 40px;
          max-width: 1200px;
          margin: 0 auto;
        }
        .catalog-eyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #3b82f6;
          margin-bottom: 14px;
        }
        .catalog-title {
          font-size: clamp(28px, 4vw, 48px);
          font-weight: 900;
          color: #f1f5f9;
          letter-spacing: -0.03em;
          margin: 0 0 14px;
          line-height: 1.1;
        }
        .catalog-title span {
          color: #3b82f6;
        }
        .catalog-subtitle {
          font-size: 16px;
          color: #475569;
          max-width: 560px;
          line-height: 1.65;
          margin: 0;
        }
        .catalog-stats {
          display: flex;
          gap: 32px;
          margin-top: 32px;
          padding-top: 32px;
          border-top: 1px solid rgba(255,255,255,0.05);
        }
        .catalog-stat-value {
          font-size: 28px;
          font-weight: 900;
          color: #f1f5f9;
          letter-spacing: -0.03em;
          display: block;
        }
        .catalog-stat-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #334155;
        }
        .catalog-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 24px;
          padding: 0 40px 80px;
          max-width: 1200px;
          margin: 0 auto;
        }
        @media (max-width: 640px) {
          .catalog-header { padding: 40px 20px 32px; }
          .catalog-grid { padding: 0 20px 60px; gap: 16px; }
          .catalog-stats { gap: 24px; }
        }
      `}</style>

      <div className="catalog-header">
        <p className="catalog-eyebrow">Catálogo MakerPro</p>
        <h1 className="catalog-title">
          Designs para<br />
          <span>impressão 3D</span>
        </h1>
        <p className="catalog-subtitle">
          Famílias de modelos paramétricos, prontos a personalizar. 
          Ajusta as medidas, gera o STL e imprime.
        </p>

        <div className="catalog-stats">
          <div>
            <span className="catalog-stat-value">{familiaEntries.length}</span>
            <span className="catalog-stat-label">Famílias</span>
          </div>
          <div>
            <span className="catalog-stat-value">{designs.length}</span>
            <span className="catalog-stat-label">Modelos</span>
          </div>
        </div>
      </div>

      <div className="catalog-grid">
        {familiaEntries.map(([familia, info]) => (
          <Link
            key={familia}
            href={`/familia/${encodeURIComponent(familia)}`}
            style={{ textDecoration: 'none' }}
          >
            <FamilyCard
              familia={familia}
              modelCount={info.count}
              thumbnail_url={info.thumbnail_url}
            />
          </Link>
        ))}
      </div>
    </main>
  );
}
