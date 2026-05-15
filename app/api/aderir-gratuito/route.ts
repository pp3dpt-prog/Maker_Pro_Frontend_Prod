import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  // Buscar o plano gratuito
  const { data: plano } = await supabase
    .from('prod_planos')
    .select('id, recarga_creditos_mensal')
    .eq('gratuito', true)
    .single();

  if (!plano) {
    return NextResponse.json({ error: 'Plano gratuito não encontrado' }, { status: 404 });
  }

  // Atribuir o plano ao utilizador com os créditos iniciais
  const { error } = await supabase
    .from('prod_perfis')
    .update({
      plano_id: plano.id,
      creditos: plano.recarga_creditos_mensal,
    })
    .eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
