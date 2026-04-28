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

  // ✅ URL CORRETO, COM id E familia
  const href = `/customizador?id=${encodeURIComponent(
    String(principal.id)
  )}&familia=${encodeURIComponent(familia)}`;

  return (
    <Link href={href} className="block">
      <div className="rounded-xl border p-6 hover:bg-neutral-900 transition">
        <div className="text-sm opacity-80">✨ Coleção Premium</div>
        <div className="text-xs opacity-60">{produtos.length} Opções</div>

        <h5 className="mt-2 font-semibold">
          {familia.replace(/-/g, ' ')}
        </h5>

        <p className="text-sm opacity-70 mt-1">
          Modelos de {familia.toLowerCase()} configuráveis em tempo real.
        </p>

        <span className="mt-4 inline-block text-blue-400 font-medium">
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