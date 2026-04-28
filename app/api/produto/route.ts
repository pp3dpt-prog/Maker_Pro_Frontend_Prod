import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // ✅ SERVER ONLY
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const familia = searchParams.get('familia');

  let produto = null;

  if (id) {
    const { data } = await supabase
      .from('prod_designs')
      .select('id, nome, generation_schema')
      .eq('id', id)
      .maybeSingle();

    if (data) produto = data;
  }

  if (!produto && familia) {
    const { data } = await supabase
      .from('prod_designs')
      .select('id, nome, generation_schema')
      .eq('familia', familia)
      .order('id')
      .limit(1)
      .maybeSingle();

    if (data) produto = data;
  }

  if (!produto) {
    return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
  }

  return NextResponse.json(produto);
}