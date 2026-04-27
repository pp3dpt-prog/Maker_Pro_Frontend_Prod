import { supabase } from '@/lib/supabaseClient';
import CustomizadorClient from './CustomizadorClient';

export const dynamic = 'force-dynamic'; // ✅ evita cache em produção

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

  // ✅ prioridade: ID explícito (teu URL atual)
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
  // ✅ fallback: apenas família
  else if (familia) {
    const { data, error } = await supabase
      .from('prod_designs')
      .select('id, nome, generation_schema')
      .eq('familia', familia)
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return <div>Nenhum produto nesta família</div>;
    }

    produto = data;
  }
  // ❌ erro real
  else {
    return <div>Produto não definido</div>;
  }

  return <CustomizadorClient produto={produto} />;
}