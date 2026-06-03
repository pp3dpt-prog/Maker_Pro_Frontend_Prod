import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { telefone, descricao, valor, nome_completo, nif, tipo } = await request.json();

  if (!telefone || !valor) {
    return NextResponse.json({ error: 'Telefone e valor são obrigatórios.' }, { status: 400 });
  }

  const authToken = process.env.IFTHENPAY_API_TOKEN;
  if (!authToken) return NextResponse.json({ error: 'IfThenPay não configurado.' }, { status: 500 });

  const orderId = `pp3d_${Date.now()}_${user.id.slice(0, 8)}`;

  // Registar pagamento pendente
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  await admin.from('prod_pagamentos').insert({
    user_id:    user.id,
    user_email: user.email,
    user_name:  nome_completo ?? '',
    user_nif:   nif ?? '',
    descricao:  descricao ?? 'Pagamento PP3D',
    plano_nome: descricao ?? '',
    valor,
    tipo:       tipo ?? 'download_avulso',
    ifthenpay_order_id: orderId,
    fatura_emitida: false,
  });

  try {
    // @ts-ignore
    const { createClient: ifthenpayClient } = await import('@ifthenpay/js-sdk');
    const client = ifthenpayClient({ authToken });

    const payment = await client.mbway.createPayment({
      orderId,
      amount: String(Number(valor).toFixed(2)),
      mobileNumber: `351#${telefone.replace(/\D/g, '')}`,
      email: user.email ?? '',
    });

    return NextResponse.json({ ok: true, transactionId: payment.transactionId, orderId });
  } catch (err: any) {
    console.error('[ifthenpay/mbway]', err.message);
    return NextResponse.json({ error: err.message || 'Erro ao criar pagamento MB WAY.' }, { status: 500 });
  }
}
