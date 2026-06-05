// Diagnóstico de configuração Stripe — só acessível a admin.
// GET /api/stripe/diagnostico

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdminByEmail = adminEmail && user.email?.toLowerCase() === adminEmail.toLowerCase();
  if (!isAdminByEmail) {
    const { data: perfil } = await supabase.from('prod_perfis').select('role').eq('id', user.id).maybeSingle();
    if (perfil?.role !== 'admin') return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const mask = (v?: string) => v ? `${v.slice(0, 7)}…${v.slice(-4)} (${v.length} chars)` : '❌ EM FALTA';

  // Verificar price IDs nos planos
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: planos } = await admin
    .from('prod_planos')
    .select('nome, gratuito, stripe_price_id_mensal, stripe_price_id_anual');

  // Verificar colunas necessárias em prod_perfis
  let colunasPerfis = '✅';
  try {
    await admin.from('prod_perfis').select('stripe_subscription_id, plano_valido_ate').limit(1);
  } catch (e: any) {
    colunasPerfis = `❌ ${e.message}`;
  }

  // Verificar tabela prod_pagamentos
  let tabelaPagamentos = '✅';
  try {
    await admin.from('prod_pagamentos').select('id').limit(1);
  } catch (e: any) {
    tabelaPagamentos = `❌ ${e.message}`;
  }

  return NextResponse.json({
    env: {
      STRIPE_SECRET_KEY:     mask(process.env.STRIPE_SECRET_KEY),
      STRIPE_WEBHOOK_SECRET: mask(process.env.STRIPE_WEBHOOK_SECRET),
      NEXT_PUBLIC_SITE_URL:  process.env.NEXT_PUBLIC_SITE_URL ?? '❌ EM FALTA',
    },
    bd: {
      colunas_perfis_stripe: colunasPerfis,
      tabela_pagamentos:     tabelaPagamentos,
    },
    planos: (planos ?? []).map(p => ({
      nome: p.nome,
      gratuito: p.gratuito,
      price_mensal: p.stripe_price_id_mensal ?? '❌ EM FALTA',
      price_anual:  p.stripe_price_id_anual  ?? '❌ EM FALTA',
    })),
  });
}
