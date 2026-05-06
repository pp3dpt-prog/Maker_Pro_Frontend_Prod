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
  const familias = designs.reduce<Record<string, FamilyInfo>>(
    (acc, design) => {
      const familia = design.familia ?? 'geral';
      if (!acc[familia]) {
        acc[familia] = {
          count: 0,
          thumbnail_url: design.thumbnail_url, // Usar thumbnail do primeiro design
          designs: [],
        };
      }
      acc[familia].count++;
      acc[familia].designs.push(design);
      return acc;
    },
    {}
  );

  return (
    <main className="bg-slate-950 min-h-screen">
      <div style={{ padding: '60px 40px' }}>
        <h1 className="text-4xl font-bold text-white mb-4">
          Catálogo MakerPro
        </h1>
        <p className="text-slate-400 text-lg mb-12 max-w-2xl">
          Explore as nossas famílias de designs paramétricos para impressão 3D. 
          Escolha uma família para descobrir todos os modelos disponíveis.
        </p>

        {/* Grid de Famílias */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 32,
        }}>
          {Object.entries(familias).map(([familia, info]) => (
            <Link
              key={familia}
              href={{
                pathname: '/familia',
                query: { name: familia },
              }}
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
      </div>
    </main>
  );
}