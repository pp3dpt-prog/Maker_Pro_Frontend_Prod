
console.log('SUPABASE URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('SUPABASE ANON:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0, 10));

import { createClient } from '@supabase/supabase-js';
import CustomizadorClient from './CustomizadorClient';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function Page({
  searchParams,
}: {
  searchParams?: {
    id?: string;
    familia?: string;
  };
}) {
  const id = searchParams?.id ?? null;
  const familia = searchParams?.familia ?? null;

  let produto = null;

  // 1️⃣ tentar por ID
  if (id) {
    const { data, error } = await supabase
      .from('prod_designs')
      .select('id, nome, generation_schema')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('Erro Supabase:', error);
    }

    if (data) {
      produto = data;
    }
  }

  // 2️⃣ fallback por família
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

  // 3️⃣ erro real
  if (!produto) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Produto não definido</h2>
        <p>Não foi possível carregar o produto solicitado.</p>
        <ul>
          {id && <li>ID: {id}</li>}
          {familia && <li>Família: {familia}</li>}
        </ul>
      </div>
    );
  }

  // 4️⃣ sucesso
  return <CustomizadorClient produto={produto} />;
}