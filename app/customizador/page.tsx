import { supabase } from '@/lib/supabaseClient';
import CustomizadorClient from './CustomizadorClient';

export default async function Page({
  searchParams,
}: {
  searchParams?: {
    id?: string;
    familia?: string;
  };
}) {
  const id = searchParams?.id;
  const familia = searchParams?.familia;

  let produto = null;

  // ✅ 1. Se vier ID explícito (caso normal do teu URL)
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

  // ✅ 2. Fallback: só família (se no futuro acontecer)
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

  // ❌ 3. Nem id nem família
  else {
    return <div>Produto não definido</div>;
  }

  return <CustomizadorClient produto={produto} />;
}