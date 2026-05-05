import { createClient } from '@supabase/supabase-js';
import PageInner from './PageInner';

export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  const designId = searchParams.id;

  // ✅ SEM id → mostrar erro explícito
  if (!designId) {
    return (
      <main style={{ padding: 40, color: '#94a3b8' }}>
        Produto inválido.
      </main>
    );
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

  // ✅ ID existe mas produto não foi encontrado
  if (error || !produto) {
    return (
      <main style={{ padding: 40, color: '#94a3b8' }}>
        Produto não encontrado.
      </main>
    );
  }

  // ✅ CASO NORMAL
  return <PageInner produto={produto} />;
}
