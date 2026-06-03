// Callback GET enviado pelo IfThenPay após pagamento confirmado
// Formato: ?key=[ANTI_PHISHING_KEY]&id=[ID]&amount=[AMOUNT]&payment_datetime=[DATETIME]&payment_method=[METHOD]
//
// Configurar no backoffice IfThenPay (Pagamentos → Multibanco/MBWAY → Callback):
// https://maker-pro-frontend-prod.vercel.app/api/ifthenpay/callback?key=[ANTI_PHISHING_KEY]&id=[ID]&amount=[AMOUNT]&payment_datetime=[DATETIME]&payment_method=[METHOD]

import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const orderId        = searchParams.get('id');
  const amount         = searchParams.get('amount');
  const paymentMethod  = searchParams.get('payment_method') ?? 'unknown';

  console.log('[ifthenpay/callback] id:', orderId, 'amount:', amount, 'method:', paymentMethod);

  if (!orderId) return new Response('OK', { status: 200 });

  // Buscar pagamento pelo orderId
  const { data: pagamento } = await admin
    .from('prod_pagamentos')
    .select('*')
    .eq('ifthenpay_order_id', orderId)
    .maybeSingle();

  if (!pagamento) {
    console.warn('[ifthenpay/callback] pagamento não encontrado:', orderId);
    return new Response('OK', { status: 200 });
  }

  // Creditar download avulso
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

  // Activar plano anual se aplicável
  if (pagamento.tipo === 'subscricao_anual' && pagamento.user_id && pagamento.plano_id) {
    const { data: plano } = await admin
      .from('prod_planos')
      .select('limite_downloads, validade_dias')
      .eq('id', pagamento.plano_id)
      .single();

    if (plano) {
      const validoAte = new Date(Date.now() + plano.validade_dias * 365 * 24 * 60 * 60 * 1000).toISOString();
      await admin.from('prod_perfis').update({
        plano_id:         pagamento.plano_id,
        downloads_limite: plano.limite_downloads,
        downloads_mes:    0,
        plano_valido_ate: validoAte,
      }).eq('id', pagamento.user_id);
    }
  }

  // Marcar pagamento confirmado
  await admin
    .from('prod_pagamentos')
    .update({ ifthenpay_pago: true, ifthenpay_metodo: paymentMethod })
    .eq('ifthenpay_order_id', orderId);

  return new Response('OK', { status: 200 });
}
