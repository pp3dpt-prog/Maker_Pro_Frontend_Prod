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

  const { descricao, valor, design_id, params, tipo, plano_id } = await request.json();

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const orderId = `TESTE_${Date.now()}`;
  const ehAnual = tipo === 'subscricao_anual' && plano_id;

  // Registar pagamento já confirmado
  await admin.from('prod_pagamentos').insert({
    user_id:            user.id,
    user_email:         user.email,
    descricao:          `[TESTE] ${descricao ?? (ehAnual ? 'Subscrição anual' : 'Download avulso')}`,
    plano_nome:         ehAnual ? (descricao ?? 'Subscrição anual') : 'Download Avulso (teste)',
    valor:              valor ?? 0.99,
    tipo:               ehAnual ? 'subscricao_anual' : 'download_avulso',
    ifthenpay_order_id: orderId,
    ifthenpay_pago:     true,
    fatura_emitida:     false,
    metadata:           { design_id: design_id ?? null, params: params ?? {}, plano_id: plano_id ?? null, teste: true },
  });

  if (ehAnual) {
    // Activar plano anual (igual ao verificar)
    const { data: plano } = await admin.from('prod_planos')
      .select('nome, tier, limite_downloads, validade_dias, permite_venda_comercial')
      .eq('id', plano_id).single();
    if (plano) {
      const tier = plano.tier || (plano.permite_venda_comercial ? 'comercial' : 'pessoal');
      const validoAte = new Date(Date.now() + (plano.validade_dias || 30) * 12 * 24 * 60 * 60 * 1000).toISOString();
      const { data: perfilAtual } = await admin.from('prod_perfis')
        .select('downloads_limite, downloads_mes').eq('id', user.id).single();
      const restantes = Math.max(0, (perfilAtual?.downloads_limite ?? 0) - (perfilAtual?.downloads_mes ?? 0));
      await admin.from('prod_perfis').update({
        plano: tier, plano_id,
        downloads_limite: restantes + plano.limite_downloads,
        downloads_mes: 0,
        plano_valido_ate: validoAte,
        stripe_subscription_id: null,
      }).eq('id', user.id);
    }
  } else {
    // Creditar +1 download comprado
    const { data: perfil } = await admin.from('prod_perfis').select('downloads_comprados').eq('id', user.id).single();
    if (perfil) {
      await admin.from('prod_perfis')
        .update({ downloads_comprados: (perfil.downloads_comprados ?? 0) + 1 })
        .eq('id', user.id);
    }
  }

  await logInfo('pagamento', `[TESTE] Pagamento simulado: ${descricao ?? (ehAnual ? 'anual' : 'download')}`, { order: orderId, valor: valor ?? 0.99, tipo: ehAnual ? 'subscricao_anual' : 'download_avulso', teste: true }, user.email ?? undefined);

  return NextResponse.json({ ok: true, order: orderId, design_id: design_id ?? null });
}
