import { createClient } from '@supabase/supabase-js';
import PageInner from './PageInner';

export default async function Page({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const designId = searchParams.id;

  if (!designId) {
    throw new Error('DESIGN_ID_MISSING');
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: produto, error } = await supabase
    .from('prod_designs')
    .select('id, parametros_default')
    .eq('id', designId)
    .single();

  if (error || !produto) {
    throw new Error('DESIGN_NOT_FOUND');
  }

  return <PageInner produto={produto} />;
}