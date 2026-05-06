import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Design = {
  id: string;
  nome: string;
  descricao: string;
  familia: string;
};

type Props = {
  params: {
    familia: string;
  };
};

export default async function FamilyPage({ params }: Props) {
  const familyName = decodeURIComponent(params.familia);
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('prod_designs')
    .select('id, nome, descricao, familia')
    .eq('familia', familyName)
    .order('nome', { ascending: true });

  const designs = (error ? [] : data || []) as Design[];

  // Se não houver designs, redireciona para catálogo
  if (designs.length === 0) {
    redirect('/produtos');
  }

  // Redireciona para o customizador com o primeiro design e passa a família
  redirect(`/customizador?id=${designs[0].id}&familia=${encodeURIComponent(familyName)}`);
