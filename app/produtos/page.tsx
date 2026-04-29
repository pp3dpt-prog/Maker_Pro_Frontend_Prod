import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type Produto = {
  id: string | number
  familia?: string
}

function FamilyCard({
  familia,
  produtos,
}: {
  familia: string
  produtos: Produto[]
}) {
  const principal = produtos[0]

  const href = `/customizador?id=${encodeURIComponent(
    String(principal.id)
  )}&familia=${encodeURIComponent(familia)}`

  return (
    <Link href={href}>
      <div
        
      style={{
        border: '1px solid #1e3a8a',
        borderRadius: 12,
        padding: 24,
        background: '#000',
        height: '100%',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      }}

        //className="transition hover:border-blue-500 hover:bg-slate-950"
        className="hover:-translate-y-1 hover:shadow-lg"
      >
      <div
        style={{
          height: 8,
          width: '100%',
          borderRadius: 4,
          background: 'linear-gradient(90deg, #2563eb, #60a5fa)',
          marginBottom: 20,
        }}
      />

        <h3
          style={{
            fontSize: 22,
            letterSpacing: '-0.01em',
            color: '#60a5fa',
            marginBottom: 8,
            textTransform: 'capitalize',
          }}
        >
          {familia}
        </h3>

        <p
          style={{
            fontSize: 14,
            color: '#94a3b8',
            marginBottom: 32,
          }}
        >
          Produtos configuráveis em tempo real com parâmetros ajustáveis.
        </p>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ fontSize: 13, color: '#64748b' }}>
            {produtos.length} modelos
          </span>

          <span
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              border: '1px solid #3b82f6',
              color: '#3b82f6',
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Personalizar →
          </span>
        </div>
      </div>
    </Link>
  )
}

export default async function Page() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('prod_designs')
    .select('id, familia')

  if (error) {
    return (
      <p style={{ color: 'white', padding: 40 }}>
        Erro ao carregar catálogo
      </p>
    )
  }

  const produtos = (data ?? []) as Produto[]

  const familias = produtos.reduce<Record<string, Produto[]>>(
    (acc, item) => {
      const key = item.familia ?? 'geral'
      acc[key] ??= []
      acc[key].push(item)
      return acc
    },
    {}
  )

  return (
    <main style={{ padding: 40, maxWidth: 1200, margin: '0 auto' }}>
      <h1 style={{ color: 'white', fontSize: 32 }}>
        Configurador 3D
      </h1>
      <h2 style={{ color: '#cbd5f5', fontSize: 20, marginTop: 4 }}>
        Catálogo MakerPro
      </h2>
      <p style={{ color: '#94a3b8', marginTop: 16 }}>
        Selecione a família de produtos para iniciar a configuração.
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 24,
          marginTop: 48,
        }}
      >
        {Object.keys(familias).map((nome) => (
          <FamilyCard
            key={nome}
            familia={nome}
            produtos={familias[nome]}
          />
        ))}
      </div>
    </main>
  )
}