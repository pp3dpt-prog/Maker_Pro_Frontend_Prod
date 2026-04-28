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

export default async function Catalogo() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('prod_designs')
    .select('*');

  if (error) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
        <h1>MakerPro Catalog</h1>
        <p style={{ color: '#ef4444' }}>
          Erro a carregar produtos: {error.message}
        </p>
      </div>
    );
  }

  const produtos = (data ?? []) as Produto[];

  const familias = produtos.reduce<Record<string, Produto[]>>((acc, obj) => {
    const key = obj.familia ?? 'Geral';
    if (!acc[key]) acc[key] = [];
    acc[key].push(obj);
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>
      <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 900, letterSpacing: 0.4 }}>
        Configurador 3D
      </div>
      <h1 style={{ marginTop: 6 }}>MakerPro Catalog</h1>

      <p style={{ color: '#cbd5e1' }}>
        Selecione a família de produtos para iniciar a configuração.
      </p>

      <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        {Object.keys(familias).map((nome) => (
          <FamilyCard key={nome} familia={nome} produtos={familias[nome]} />
        ))}
      </div>
    </div>
  );
}
``