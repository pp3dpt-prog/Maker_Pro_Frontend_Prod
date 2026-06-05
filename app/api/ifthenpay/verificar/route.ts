// Verifica o estado de um pagamento IfThenPay consultando a API directamente.
// Alternativa ao callback (que requer activação pelo suporte).
// POST { order } → consulta v2/payments/read, e se pago: credita download + fatura.

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { logInfo, logWarn } from '@/lib/logger';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { order } = await request.json();
  if (!order) return NextResponse.json({ error: 'order obrigatório.' }, { status: 400 });

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

  const meta = (pag.metadata ?? {}) as { design_id?: string; pinCode?: string };

  // Já confirmado anteriormente?
  if (pag.ifthenpay_pago) {
    return NextResponse.json({ pago: true, design_id: meta.design_id ?? null });
  }

  let pago = false;

  // ── Método 1: estado do gateway via PinCode (usa Gateway Key, sem boKey) ──
  if (meta.pinCode) {
    try {
      const r = await fetch(`https://api.ifthenpay.com/gateway/transaction/status/get?id=${encodeURIComponent(meta.pinCode)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const raw = await r.text();
      let d: any = null;
      try { d = JSON.parse(raw); } catch { /* resposta não-JSON */ }
      // Diagnóstico: registar a resposta crua para validar a deteção no 1º teste real
      await logInfo('pagamento', 'IfThenPay status gateway (resposta)', { http: r.status, raw: raw.slice(0, 500), order }, user.email ?? undefined);
      if (d) {
        const estado = (d?.Status ?? d?.status ?? '').toString().toLowerCase();
        pago = !!(d?.PaymentMethod || d?.payment_method || d?.RequestId || estado === 'paid' || estado === 'pago');
      }
    } catch (e) {
      await logWarn('pagamento', 'Erro consulta status gateway IfThenPay', { erro: String(e), order }, user.email ?? undefined);
    }
  }

  // ── Método 2 (fallback): v2/payments/read com Backoffice Key ──
  const boKey = process.env.IFTHENPAY_BACKOFFICE_KEY;
  if (!pago && boKey) {
    const fmt = (d: Date) => {
      const p = (n: number) => String(n).padStart(2, '0');
      return `${p(d.getDate())}-${p(d.getMonth() + 1)}-${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
    };
    const agora = new Date();
    const inicio = new Date(agora.getTime() - 2 * 24 * 60 * 60 * 1000);
    try {
      const res = await fetch('https://api.ifthenpay.com/v2/payments/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boKey, orderId: order, dateStart: fmt(inicio), dateEnd: fmt(agora) }),
      });
      const raw = await res.text();
      let data: any = null;
      try { data = JSON.parse(raw); } catch { /* não-JSON */ }
      await logInfo('pagamento', 'IfThenPay v2/payments/read (resposta)', { http: res.status, raw: raw.slice(0, 500), order }, user.email ?? undefined);
      const lista = Array.isArray(data) ? data : (data?.Data ?? data?.payments ?? []);
      pago = Array.isArray(lista) && lista.length > 0;
    } catch (e) {
      await logWarn('pagamento', 'Erro v2/payments/read IfThenPay', { erro: String(e), order }, user.email ?? undefined);
    }
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

  return NextResponse.json({ pago: true, design_id: meta.design_id ?? null });
}
