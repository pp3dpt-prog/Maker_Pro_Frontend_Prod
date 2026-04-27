import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import CustomizadorClient from './CustomizadorClient';

export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams?: {
    id?: string;
    familia?: string;
  };
}) {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  const id = searchParams?.id ?? null;
  const familia = searchParams?.familia ?? null;

  let produto = null;

  /* =====================================================
     1. TENTAR POR ID
  ===================================================== */
  if (id) {
    const { data } = await supabase
      .from('prod_designs')
      .select('id, nome, generation_schema')
      .eq('id', id)
      .maybeSingle();

    if (data) {
      produto = data;
    }
  }

  /* =====================================================
     2. FALLBACK POR FAMÍLIA
  ===================================================== */
  if (!produto && familia) {
    const { data } = await supabase
      .from('prod_designs')
      .select('id, nome, generation_schema')
      .eq('familia', familia)
      .order('id')
      .limit(1)
      .maybeSingle();

    if (data) {
      produto = data;
    }
  }

  /* =====================================================
     3. ERRO REAL
  ===================================================== */
  if (!produto) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Produto não definido</h2>
        <p>O produto existe na base de dados,</p>
        <p>mas não é acessível com a sessão atual.</p>
        <ul>
          {id && <li><strong>ID:</strong> {id}</li>}
          {familia && <li><strong>Família:</strong> {familia}</li>}
        </ul>
      </div>
    );
  }

  /* =====================================================
     4. SUCESSO
  ===================================================== */
  return <CustomizadorClient produto={produto} />;
}