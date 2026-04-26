// app/customizador/page.tsx

import { supabase } from '@/lib/supabaseClient';
import CustomizadorClient from 'app/customizador/CustomizadorClient';

export default async function Page({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  if (!searchParams?.id) {
    return <div>Produto não definido</div>;
  }

  const { data: produto, error } = await supabase
    .from('prod_designs')
    .select('id, nome, generation_schema')
    .eq('id', searchParams.id)
    .maybeSingle();

  if (error || !produto) {
    return <div>Produto não encontrado</div>;
  }

  return <CustomizadorClient produto={produto} />;
}