import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const order = searchParams.get('order');
  if (!order) return NextResponse.json({ error: 'order obrigatório.' }, { status: 400 });

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: pag } = await admin
    .from('prod_pagamentos')
    .select('user_id, ifthenpay_pago, metadata, descricao')
    .eq('ifthenpay_order_id', order)
    .maybeSingle();

  if (!pag || pag.user_id !== user.id) {
    return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  }

  const meta = (pag.metadata ?? {}) as { design_id?: string };
  return NextResponse.json({
    pago: !!pag.ifthenpay_pago,
    design_id: meta.design_id ?? null,
    descricao: pag.descricao,
  });
}
