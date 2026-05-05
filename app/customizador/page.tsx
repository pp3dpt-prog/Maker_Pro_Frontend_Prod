import { createClient } from '@supabase/supabase-js';
import { redirect, notFound } from 'next/navigation';
import PageInner from './PageInner';

export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const designId = searchParams.id;

  if (!designId) {
    redirect('/produtos');
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
    notFound();
  }

  return <PageInner produto={produto} />;
}