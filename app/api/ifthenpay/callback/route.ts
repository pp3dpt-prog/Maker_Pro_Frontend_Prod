// Callback GET enviado pelo IfThenPay quando pagamento é confirmado
// URL a configurar no backoffice IfThenPay:
// https://maker-pro-frontend-prod.vercel.app/api/ifthenpay/callback?orderId=[orderId]&amount=[amount]&requestId=[requestId]

import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const orderId   = searchParams.get('orderId') ?? searchParams.get('id');
  const amount    = searchParams.get('amount');
  const requestId = searchParams.get('requestId');

  console.log('[ifthenpay/callback] orderId:', orderId, 'amount:', amount);

  if (!orderId) return new Response('OK', { status: 200 });

  // Buscar pagamento pendente pelo orderId
  const { data: pagamento } = await admin
    .from('prod_pagamentos')
    .select('*')
    .eq('ifthenpay_order_id', orderId)
    .maybeSingle();

  if (!pagamento) {
    console.warn('[ifthenpay/callback] pagamento não encontrado:', orderId);
    return new Response('OK', { status: 200 });
  }

  // Creditiar download se for download avulso
  if (pagamento.tipo === 'download_avulso' && pagamento.user_id) {
    const { data: perfil } = await admin
      .from('prod_perfis')
      .select('downloads_limite')
      .eq('id', pagamento.user_id)
      .single();

    if (perfil) {
      await admin
        .from('prod_perfis')
        .update({ downloads_limite: (perfil.downloads_limite ?? 0) + 1 })
        .eq('id', pagamento.user_id);
    }
  }

  // Marcar pagamento como confirmado (fatura ainda pendente de emissão manual)
  await admin
    .from('prod_pagamentos')
    .update({ ifthenpay_pago: true })
    .eq('ifthenpay_order_id', orderId);

  return new Response('OK', { status: 200 });
}
