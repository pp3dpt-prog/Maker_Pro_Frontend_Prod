import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key);
}

export async function POST(req: NextRequest) {
  try {
    const { design_id } = await req.json();

    if (!design_id || typeof design_id !== 'string') {
      return NextResponse.json({ error: 'design_id inválido' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Incremento atómico via RPC (criada no migration.sql)
    const { error } = await supabase.rpc('increment_likes', { design_id });

    if (error) {
      console.error('Erro ao incrementar likes:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Devolver o novo valor
    const { data } = await supabase
      .from('prod_designs')
      .select('total_likes')
      .eq('id', design_id)
      .single();

    return NextResponse.json({ total_likes: data?.total_likes ?? 0 });
  } catch (err) {
    console.error('Erro inesperado:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
