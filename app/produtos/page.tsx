import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Produto = {
  id: string | number;
  nome?: string;
  familia?: string;
};

function FamilyCard({ familia, produtos }: { familia: string; produtos: Produto[] }) {
  const principal = produtos[0];

  const href = `/customizador?id=${encodeURIComponent(
    String(principal.id)
  )}&familia=${encodeURIComponent(familia)}`;

  return (
    <Link href={href} className="group">
      <div className="
        rounded-xl border border-neutral-800
        bg-neutral-900
        p-6
        h-full
        transition
        hover:border-blue-500
        hover:bg-neutral-800
      ">
        <div className="text-sm text-neutral-400">
          ✨ Coleção Premium
        </div>

        <div className="text-xs text-neutral-500 mb-3">
          {produtos.length} Opções
        </div>

        <h3 className="text-lg font-semibold text-white mb-2 capitalize">
          {familia.replace(/-/g, ' ')}
        </h3>

        <p className="text-sm text-neutral-400 mb-4">
          Modelos de {familia.toLowerCase()} configuráveis em tempo real.
        </p>

        <span className="
          inline-block
          mt-auto
          font-medium
          text-blue-400
          group-hover:text-blue-300
        ">
          PERSONALIZAR →
        </span>
      </div>
    </Link>
  );
}

export default async function Page() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('prod_designs')
    .select('*');

  if (error) {
    return (
      <main className="p-8">
        <h2>MakerPro Catalog</h2>
        <p>Erro a carregar produtos: {error.message}</p>
      </main>
    );
  }

  const produtos = (data ?? []) as Produto[];

  const familias = produtos.reduce<Record<string, Produto[]>>(
    (acc, produto) => {
      const key = produto.familia ?? 'Geral';
      if (!acc[key]) acc[key] = [];
      acc[key].push(produto);
      return acc;
    },
    {}
  );

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold mb-2">Configurador 3D</h1>
      <h2 className="text-xl mb-6">MakerPro Catalog</h2>

      <p className="mb-6">
        Selecione a família de produtos para iniciar a configuração.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.keys(familias).map((nome) => (
          <FamilyCard
            key={nome}
            familia={nome}
            produtos={familias[nome]}
          />
        ))}
      </div>
    </main>
  );
}