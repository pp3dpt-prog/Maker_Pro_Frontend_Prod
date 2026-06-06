import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { descricao, valor, nome_completo, nif, tipo, design_id, params } = await request.json();
  if (!valor) return NextResponse.json({ error: 'Valor obrigatório.' }, { status: 400 });

  const gatewayKey = process.env.IFTHENPAY_GATEWAY_KEY;
  if (!gatewayKey) return NextResponse.json({ error: 'IfThenPay Gateway não configurado.' }, { status: 500 });

  // ID numérico até 15 dígitos (timestamp ms = 13 dígitos)
  const orderId = Date.now().toString();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pp3d.pt';

  // Registar pagamento pendente (guarda design_id + params para download após pagamento)
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  await admin.from('prod_pagamentos').insert({
    user_id:            user.id,
    user_email:         user.email,
    user_name:          nome_completo ?? '',
    user_nif:           nif ?? '',
    descricao:          descricao ?? 'Pagamento PP3D',
    plano_nome:         descricao ?? '',
    valor,
    tipo:               tipo ?? 'download_avulso',
    ifthenpay_order_id: orderId,
    fatura_emitida:     false,
    metadata:           design_id ? { design_id, params: params ?? {} } : null,
  });

  // success_url leva de volta ao produto certo após pagamento
  const successUrl = design_id
    ? `${siteUrl}/checkout/download-sucesso?order=${orderId}`
    : `${siteUrl}/checkout/download-sucesso`;

  // Chamar API Gateway IfThenPay
  const res = await fetch(`https://api.ifthenpay.com/gateway/pinpay/${gatewayKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id:          orderId,
      amount:      Number(valor).toFixed(2),
      description: descricao ?? 'PP3D.pt',
      lang:        'pt',
      // Métodos a oferecer (MB WAY + Multibanco). Configurável via env var.
      accounts:    process.env.IFTHENPAY_ACCOUNTS || 'MBWAY|UTX-466289;MB|CFW-591434',
      success_url: successUrl,
      error_url:   `${siteUrl}/checkout/erro`,
      cancel_url:  design_id ? `${siteUrl}/customizador?id=${design_id}` : `${siteUrl}/pricing`,
    }),
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error('[ifthenpay/gateway] erro:', txt);
    return NextResponse.json({ error: 'Erro ao criar pagamento IfThenPay.' }, { status: 500 });
  }

  const data = await res.json();
  // Resposta: { PinCode: '...', RedirectUrl: 'https://gateway.ifthenpay.com/...' }

  // Guardar o PinCode para consulta de estado posterior
  if (data.PinCode) {
    await admin.from('prod_pagamentos')
      .update({ metadata: { design_id: design_id ?? null, params: params ?? {}, pinCode: data.PinCode } })
      .eq('ifthenpay_order_id', orderId);
  }

  return NextResponse.json({ ok: true, redirectUrl: data.RedirectUrl, orderId });
}
