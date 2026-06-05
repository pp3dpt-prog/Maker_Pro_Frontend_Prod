// Verifica o estado de um pagamento IfThenPay consultando a API directamente.
// Alternativa ao callback (que requer activação pelo suporte).
// POST { order } → consulta v2/payments/read, e se pago: credita download + fatura.

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { logInfo } from '@/lib/logger';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { order } = await request.json();
  if (!order) return NextResponse.json({ error: 'order obrigatório.' }, { status: 400 });

  const boKey = process.env.IFTHENPAY_BACKOFFICE_KEY;
  if (!boKey) return NextResponse.json({ error: 'IFTHENPAY_BACKOFFICE_KEY não configurada.' }, { status: 500 });

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // Buscar o pagamento pendente
  const { data: pag } = await admin
    .from('prod_pagamentos')
    .select('*')
    .eq('ifthenpay_order_id', order)
    .maybeSingle();

  if (!pag || pag.user_id !== user.id) {
    return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  }

  // Já confirmado anteriormente?
  if (pag.ifthenpay_pago) {
    const meta = (pag.metadata ?? {}) as { design_id?: string };
    return NextResponse.json({ pago: true, design_id: meta.design_id ?? null });
  }

  // Consultar IfThenPay (últimos 2 dias)
  const fmt = (d: Date) => {
    const p = (n: number) => String(n).padStart(2, '0');
    return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
  };
  const agora = new Date();
  const inicio = new Date(agora.getTime() - 2 * 24 * 60 * 60 * 1000);

  let pago = false;
  try {
    const res = await fetch('https://api.ifthenpay.com/v2/payments/read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boKey,
        orderId:   order,
        dateStart: fmt(inicio),
        dateEnd:   fmt(agora),
      }),
    });
    const data = await res.json();
    // A resposta é uma lista de pagamentos efectuados que correspondem ao filtro.
    const lista = Array.isArray(data) ? data : (data?.Data ?? data?.payments ?? []);
    pago = Array.isArray(lista) && lista.length > 0;
  } catch (e) {
    console.error('[ifthenpay/verificar] erro consulta:', e);
    return NextResponse.json({ pago: false, erro: 'consulta_falhou' });
  }

  if (!pago) {
    return NextResponse.json({ pago: false });
  }

  // ── Confirmado: creditar download e marcar pago ──
  if (pag.tipo === 'download_avulso') {
    const { data: perfil } = await admin.from('prod_perfis').select('downloads_limite').eq('id', pag.user_id).single();
    if (perfil) {
      await admin.from('prod_perfis')
        .update({ downloads_limite: (perfil.downloads_limite ?? 0) + 1 })
        .eq('id', pag.user_id);
    }
  }

  await admin.from('prod_pagamentos').update({ ifthenpay_pago: true }).eq('ifthenpay_order_id', order);

  await logInfo('pagamento', `IfThenPay confirmado: ${pag.descricao}`, { order, valor: pag.valor }, pag.user_email);

  const meta = (pag.metadata ?? {}) as { design_id?: string };
  return NextResponse.json({ pago: true, design_id: meta.design_id ?? null });
}
