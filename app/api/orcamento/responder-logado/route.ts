import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { pedido_id, resposta } = await request.json();
  if (!pedido_id || !['aceitar', 'recusar'].includes(resposta)) {
    return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
  }

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const { data: pedido } = await admin
    .from('prod_pedidos_orcamento')
    .select('id, user_id, estado')
    .eq('id', pedido_id)
    .maybeSingle();

  if (!pedido || pedido.user_id !== user.id) {
    return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  }
  if (pedido.estado !== 'orcamento_enviado') {
    return NextResponse.json({ error: 'already_responded', estado: pedido.estado }, { status: 409 });
  }

  const novoEstado = resposta === 'aceitar' ? 'aceite' : 'recusado';
  const { error } = await admin
    .from('prod_pedidos_orcamento')
    .update({ estado: novoEstado })
    .eq('id', pedido_id);

  if (error) return NextResponse.json({ error: 'Erro ao guardar resposta.' }, { status: 500 });
  return NextResponse.json({ ok: true, estado: novoEstado });
}
