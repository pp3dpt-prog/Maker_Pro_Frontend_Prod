// SÓ ADMIN — simula um pagamento IfThenPay confirmado, sem dinheiro real.
// Testa todo o fluxo: crédito de download, registo de pagamento, fatura, logs.

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { logInfo } from '@/lib/logger';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  // Verificar admin
  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdminByEmail = adminEmail && user.email?.toLowerCase() === adminEmail.toLowerCase();
  if (!isAdminByEmail) {
    const { data: perfil } = await supabase.from('prod_perfis').select('role').eq('id', user.id).maybeSingle();
    if (perfil?.role !== 'admin') return NextResponse.json({ error: 'Apenas admin pode simular.' }, { status: 403 });
  }

  const { descricao, valor, design_id, params } = await request.json();

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const orderId = `TESTE_${Date.now()}`;

  // Registar pagamento já confirmado
  await admin.from('prod_pagamentos').insert({
    user_id:            user.id,
    user_email:         user.email,
    descricao:          `[TESTE] ${descricao ?? 'Download avulso'}`,
    plano_nome:         'Download Avulso (teste)',
    valor:              valor ?? 0.99,
    tipo:               'download_avulso',
    ifthenpay_order_id: orderId,
    ifthenpay_pago:     true,
    fatura_emitida:     false,
    metadata:           { design_id: design_id ?? null, params: params ?? {}, teste: true },
  });

  // Creditar +1 download
  const { data: perfil } = await admin.from('prod_perfis').select('downloads_limite').eq('id', user.id).single();
  if (perfil) {
    await admin.from('prod_perfis')
      .update({ downloads_limite: (perfil.downloads_limite ?? 0) + 1 })
      .eq('id', user.id);
  }

  await logInfo('pagamento', `[TESTE] Pagamento simulado: ${descricao ?? 'download'}`, { order: orderId, valor: valor ?? 0.99, teste: true }, user.email ?? undefined);

  return NextResponse.json({ ok: true, order: orderId, design_id: design_id ?? null });
}
