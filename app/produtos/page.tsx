import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Produto = {
  id: string | number;
  nome?: string;
  familia?: string;
};

function FamilyCard({
  familia,
  produtos,
}: {
  familia: string;
  produtos: Produto[];
}) {
  const principal = produtos[0];

  const href = `/customizador?id=${encodeURIComponent(
    String(principal.id)
  )}&familia=${encodeURIComponent(familia)}`;

  return (
    <Link href={href} className="group">
      <div
        className="
          h-full rounded-lg
          border border-neutral-800
          bg-neutral-950
          p-6
          transition
          group-hover:border-neutral-600
        "
      >
        {/* TÍTULO */}
        <h3 className="text-lg font-semibold text-white mb-1 capitalize">
          {familia.replace(/-/g, ' ')}
        </h3>

        {/* DESCRIÇÃO */}
        <p className="text-sm text-neutral-400 mb-8">
          Modelos configuráveis em tempo real, ajustáveis às suas necessidades.
        </p>

        {/* FOOTER */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-500">
            {produtos.length} modelos
          </span>

          <span
            className="
              text-neutral-300
              group-hover:text-white
              transition
            "
          >
            Personalizar →
          </span>
        </div>
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
      <main className="p-10">
        <h2 className="text-white">Erro</h2>
        <p className="text-neutral-400">{error.message}</p>
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
    <main className="p-10 max-w-6xl mx-auto">
      {/* HEADER */}
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-white">
          Configurador 3D
        </h1>
        <h2 className="text-xl text-neutral-300 mt-1">
          Catálogo MakerPro
        </h2>
        <p className="mt-4 text-neutral-400 max-w-xl">
          Selecione a família de produtos para iniciar a configuração.
        </p>
      </header>

      {/* GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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