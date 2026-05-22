import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type Design = {
  id: string;
  nome: string;
  descricao: string;
  familia: string;
  generation_schema?: { parameters?: Record<string, any> } | null;
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
    .select('id, nome, descricao, familia, generation_schema')
    .eq('familia', familyName)
    .eq('estado', 'ativo')
    .order('nome', { ascending: true });

  const designs = (error ? [] : data || []) as Design[];

  if (designs.length === 0) {
    redirect('/produtos');
  }

  // Preferir produtos sem image_upload (texto/paramétrico) como default da família
  const hasImageUpload = (d: Design) =>
    Object.values(d.generation_schema?.parameters ?? {})
      .some((p: any) => p?.ui?.widget === 'image_upload');

  const defaultDesign = designs.find(d => !hasImageUpload(d)) ?? designs[0];

  redirect(`/customizador?id=${defaultDesign.id}&familia=${encodeURIComponent(familyName)}`);
}