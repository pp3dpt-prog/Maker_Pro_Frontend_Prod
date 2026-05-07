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
  params: Promise<{ familia: string }>; // ← Promise no Next.js 15
};

export default async function FamilyPage({ params }: Props) {
  const { familia } = await params; // ← await obrigatório
  const familyName = decodeURIComponent(familia);
  
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from('prod_designs')
    .select('id, nome, descricao, familia')
    .eq('familia', familyName)
    .order('nome', { ascending: true });

  const designs = (error ? [] : data || []) as Design[];

  if (designs.length === 0) {
    redirect('/produtos');
  }

  redirect(`/customizador?id=${designs[0].id}&familia=${encodeURIComponent(familyName)}`);
}