// app/customizador/page.tsx

import { supabase } from '@/lib/supabaseClient';
import CustomizadorClient from './CustomizadorClient';

type Props = {
  searchParams?: {
    id?: string;
    familia?: string;
  };
};

export default async function Page({ searchParams }: Props) {
  const id = searchParams?.id ?? null;
  const familia = searchParams?.familia ?? null;

  let produto = null;

  // ✅ CASO 1: id explícito
  if (id) {
    const { data, error } = await supabase
      .from('prod_designs')
      .select('id, nome, generation_schema')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      return <div>Produto não encontrado</div>;
    }

    produto = data;
  }

  // ✅ CASO 2: apenas família → escolher primeiro produto
  else if (familia) {
    const { data, error } = await supabase
      .from('prod_designs')
      .select('id, nome, generation_schema')
      .eq('familia', familia)
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return <div>Nenhum produto encontrado nesta família</div>;
    }

    produto = data;
  }

  // ❌ CASO 3: nem id nem família
  else {
    return <div>Produto não definido</div>;
  }

  return <CustomizadorClient produto={produto} />;
}
