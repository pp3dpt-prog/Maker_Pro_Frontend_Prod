import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import DesignCard from '@/components/cards/DesignCard';

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

export default async function Page() {
  const supabase = await createClient();

  // Carregar designs completos com todos os campos necessários
  const { data, error } = await supabase
    .from('prod_designs')
    .select('id, nome, descricao, familia, preco_creditos, tags, thumbnail_url');

  if (error) {
    return (
      <main style={{ padding: 40 }}>
        <h2>Erro ao carregar catálogo</h2>
        <p>{error.message}</p>
      </main>
    );
  }

  const designs = (data ?? []) as Design[];

  // Agrupar designs por família
  const familias = designs.reduce<Record<string, Design[]>>(
    (acc, design) => {
      const familia = design.familia ?? 'geral';
      if (!acc[familia]) acc[familia] = [];
      acc[familia].push(design);
      return acc;
    },
    {}
  );

  return (
    <main style={{ padding: 40 }}>
      <h1>Catálogo MakerPro</h1>
      <p style={{ marginBottom: 40, color: '#888' }}>
        Explore a nossa coleção de designs paramétricos para impressão 3D.
      </p>

      {/* Renderizar por família */}
      {Object.entries(familias).map(([familia, designs]) => (
        <section key={familia} style={{ marginBottom: 50 }}>
          <h2 style={{ marginBottom: 10 }}>{familia}</h2>
          <p style={{ marginBottom: 20, color: '#888' }}>
            {designs.length} modelo{designs.length !== 1 ? 's' : ''} disponível{designs.length !== 1 ? 's' : ''}
          </p>

          {/* Grid de DesignCard */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
            gap: 24,
            marginBottom: 30,
          }}>
            {designs.map(design => (
              <Link
                key={design.id}
                href={{
                  pathname: '/customizador',
                  query: { id: design.id },
                }}
                style={{ textDecoration: 'none' }}
              >
                <DesignCard design={design} />
              </Link>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}