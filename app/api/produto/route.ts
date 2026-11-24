import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { aplicarCores } from '@/lib/cores';

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

  const fields = 'id, nome, familia, descricao, generation_schema, cores_config, stl_file_path, thumbnail_url, imagem_montagem_url, total_likes, total_downloads, estado, acesso_maker';

  let produto = null;

  if (id) {
    const { data } = await supabase
      .from('prod_designs')
      .select(fields)
      .eq('id', id)
      .maybeSingle();
    if (data) produto = data;
  }

  if (!produto && familia) {
    const { data } = await supabase
      .from('prod_designs')
      .select(fields)
      .eq('familia', familia)
      .order('id')
      .limit(1)
      .maybeSingle();
    if (data) produto = data;
  }

  if (!produto) {
    return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
  }

  // Cores geridas no admin (paleta global + configuração por design)
  const [{ data: cores }, { data: cfg }] = await Promise.all([
    supabase.from('prod_cores').select('nome, hex, ativo, ordem'),
    supabase.from('prod_loja_config').select('cores_livres').eq('id', 1).maybeSingle(),
  ]);
  const p: any = produto;
  p.generation_schema = aplicarCores(p.generation_schema, cores ?? [], p.cores_config, cfg?.cores_livres ?? true);
  delete p.cores_config;

  return NextResponse.json(p);
}