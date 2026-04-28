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

  // Ícone simples por família (placeholder visual)
  const icon =
    familia.toLowerCase().includes('caixa') ? '🧰'
    : familia.toLowerCase().includes('pet') ? '🐾'
    : '🔧';

  return (
    <Link href={href} className="group">
      <div
        className="
          h-full rounded-xl border border-neutral-800
          bg-neutral-900 p-6
          transition-all duration-200
          hover:-translate-y-1
          hover:border-indigo-500
          hover:bg-neutral-800
          hover:shadow-lg
        "
      >
        {/* ÍCONE */}
        <div className="text-3xl mb-4">{icon}</div>

        {/* TÍTULO */}
        <h3 className="text-lg font-semibold text-white mb-1 capitalize">
          {familia.replace(/-/g, ' ')}
        </h3>

        {/* DESCRIÇÃO CURTA */}
        <p className="text-sm text-neutral-400 mb-4">
          {familia.toLowerCase().includes('caixa')
            ? 'Caixas paramétricas com dimensões ajustáveis.'
            : familia.toLowerCase().includes('pet')
            ? 'Placas personalizáveis para identificação.'
            : 'Modelos configuráveis em tempo real.'}
        </p>

        {/* META INFO */}
        <div className="text-xs text-neutral-500 mb-6">
          {produtos.length} modelos disponíveis
        </div>

        {/* CTA */}
        <div
          className="
            inline-flex items-center gap-2
            font-medium text-indigo-400
            group-hover:text-indigo-300
          "
        >
          Personalizar
          <span className="transition-transform group-hover:translate-x-1">
            →
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
      <main className="p-10 max-w-7xl mx-auto">
        <h2 className="text-xl font-semibold text-white mb-2">
          MakerPro Catalog
        </h2>
        <p className="text-red-400">
          Erro ao carregar produtos: {error.message}
        </p>
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
    <main className="p-10 max-w-7xl mx-auto">
      {/* HEADER */}
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-white">
          Configurador 3D MakerPro
        </h1>
        <p className="mt-2 text-neutral-400 max-w-2xl">
          Crie produtos personalizados ajustando dimensões e opções em tempo real.
        </p>
      </header>

      {/* GRID DE FAMÍLIAS */}
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