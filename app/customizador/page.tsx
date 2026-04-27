import { supabase } from '@/lib/supabaseClient';
import CustomizadorClient from './CustomizadorClient';

export const dynamic = 'force-dynamic';

type SearchParams = {
  id?: string;
  familia?: string;
};

export default async function Page({
  searchParams,
}: {
  searchParams?: SearchParams;
}) {
  const id = searchParams?.id ?? null;
  const familia = searchParams?.familia ?? null;

  let produto = null;

  /* =====================================================
     1. TENTAR POR ID (prioritário)
  ===================================================== */
  if (id) {
    const { data, error } = await supabase
      .from('prod_designs')
      .select('id, nome, generation_schema')
      .eq('id', id)
      .maybeSingle();

    if (!error && data) {
      produto = data;
    }
  }

  /* =====================================================
     2. FALLBACK: PRIMEIRO PRODUTO DA FAMÍLIA
        (caso id falhe ou não exista)
  ===================================================== */
  if (!produto && familia) {
    const { data, error } = await supabase
      .from('prod_designs')
      .select('id, nome, generation_schema')
      .eq('familia', familia)
      .order('id', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!error && data) {
      produto = data;
    }
  }

  /* =====================================================
     3. ERRO REAL (não existe mesmo produto)
  ===================================================== */
  if (!produto) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Produto não definido</h2>
        <p>
          Não foi possível encontrar um produto com:
        </p>
        <ul>
          {id && <li><strong>id:</strong> {id}</li>}
          {familia && <li><strong>família:</strong> {familia}</li>}
        </ul>
      </div>
    );
  }

  /* =====================================================
     4. SUCESSO
  ===================================================== */
  return <CustomizadorClient produto={produto} />;
}