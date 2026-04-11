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

  const href = `/customizador?id=${encodeURIComponent(String(principal.id))}&familia=${encodeURIComponent(
    familia
  )}`;

  return (
    <Link
      href={href}
      style={{
        display: 'block',
        padding: 18,
        borderRadius: 14,
        border: '1px solid #1f2937',
        background: 'linear-gradient(135deg, #0b1220 0%, #0b2a4a 100%)',
        color: 'white',
        textDecoration: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, color: '#93c5fd', fontWeight: 900 }}>
            ✨ Coleção Premium
          </div>
          <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 4 }}>
            {produtos.length} Opções
          </div>
        </div>

        <div
          style={{
            height: 36,
            width: 36,
            borderRadius: 12,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(59, 130, 246, 0.18)',
            border: '1px solid rgba(59, 130, 246, 0.35)',
            fontSize: 18,
          }}
        >
          ✨
        </div>
      </div>

      <h4 style={{ marginTop: 14, marginBottom: 6 }}>
        {familia.replace(/-/g, ' ')}
      </h4>

      <p style={{ margin: 0, color: '#cbd5e1', fontSize: 13, lineHeight: 1.5 }}>
        Modelos de {familia.toLowerCase()} configuráveis em tempo real.
      </p>

      <div
        style={{
          marginTop: 14,
          fontWeight: 900,
          color: '#93c5fd',
          letterSpacing: 0.5,
        }}
      >
        PERSONALIZAR →
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