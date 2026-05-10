import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase service role key is missing');
  return createClient(url, key);
}

export async function GET(req: Request) {
  const supabase = getSupabase();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const familia = searchParams.get('familia');

  let produto = null;

  if (id) {
    const { data } = await supabase
      .from('prod_designs')
      .select('id, nome, familia, credit_cost, generation_schema, stl_file_path, total_likes, total_downloads')
      .eq('id', id)
      .maybeSingle();
    if (data) produto = data;
  }

  if (!produto && familia) {
    const { data } = await supabase
      .from('prod_designs')
      .select('id, nome, familia, credit_cost, generation_schema, stl_file_path, total_likes, total_downloads')
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