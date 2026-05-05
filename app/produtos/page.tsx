import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Produto = {
  id: string | number;
  familia?: string | null;
};

function FamilyCard({
  familia,
  produtos,
}: {
  familia: string;
  produtos: Produto[];
}) {
  if (produtos.length === 0) return null;

  const principal = produtos[0];

  const href = `/customizador?id=${encodeURIComponent(
    String(principal.id)
  )}&familia=${encodeURIComponent(familia)}`;

  return (
    <section style={{ marginBottom: 32 }}>
      <h3>{familia}</h3>

      <p>
        Produtos configuráveis em tempo real com parâmetros ajustáveis.
        <br />
        {produtos.length} modelos
      </p>

      {/* ✅ LINK CORRETO E DIRETO */}
      <Link href={href} className="btn-primary">
        Personalizar →
      </Link>
    </section>
  );
}

export default async function Page() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('prod_designs')
    .select('id, familia');

  if (error) {
    return (
      <main style={{ padding: 40 }}>
        <h2>Erro ao carregar catálogo</h2>
      </main>
    );
  }

  const produtos = (data ?? []) as Produto[];

  const familias = produtos.reduce<Record<string, Produto[]>>(
    (acc, item) => {
      const key = item.familia ?? 'geral';
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    },
    {}
  );

  return (
    <main style={{ padding: 40 }}>
      <h2>Configurador 3D</h2>
      <h3>Catálogo MakerPro</h3>

      <p>Selecione a família de produtos para iniciar a configuração.</p>

      {Object.entries(familias).map(([nome, items]) => (
        <FamilyCard key={nome} familia={nome} produtos={items} />
      ))}
    </main>
  );
}