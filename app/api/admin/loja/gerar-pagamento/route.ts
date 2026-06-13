// Admin gera link de pagamento Stripe para uma encomenda (ex.: orçamento com valor final definido).
import Stripe from 'stripe';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: 'Não autenticado.' };
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.email?.toLowerCase().trim() === adminEmail.toLowerCase().trim()) return { ok: true as const };
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: perfil } = await admin.from('prod_perfis').select('role').eq('id', user.id).maybeSingle();
  if (perfil?.role === 'admin') return { ok: true as const };
  return { ok: false as const, status: 403, error: 'Sem permissão.' };
}

export async function POST(request: Request) {
  const guard = await assertAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { encomenda_id } = await request.json();
  if (!encomenda_id) return NextResponse.json({ error: 'encomenda_id em falta.' }, { status: 400 });

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: enc } = await admin
    .from('prod_loja_encomendas')
    .select('id, numero, total_cents, user_id, estado')
    .eq('id', encomenda_id)
    .single();

  if (!enc) return NextResponse.json({ error: 'Encomenda não encontrada.' }, { status: 404 });
  if (!enc.total_cents || enc.total_cents <= 0) {
    return NextResponse.json({ error: 'Define primeiro o valor final (> 0).' }, { status: 400 });
  }

  // Email do cliente (para pré-preencher o checkout)
  const { data: perfil } = await admin.from('prod_perfis').select('email').eq('id', enc.user_id).maybeSingle();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pp3d.pt';
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      price_data: { currency: 'eur', unit_amount: enc.total_cents, product_data: { name: `Encomenda nº ${enc.numero}` } },
      quantity: 1,
    }],
    customer_email: perfil?.email ?? undefined,
    client_reference_id: enc.user_id ?? undefined,
    metadata: { tipo: 'loja', encomenda_id: enc.id, user_id: enc.user_id ?? '' },
    success_url: `${siteUrl}/checkout-loja/sucesso?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/dashboard`,
    locale: 'pt',
  });

  await admin.from('prod_loja_encomendas')
    .update({ payment_ref: session.id, estado: 'aguarda_pagamento', metodo_pagamento: 'stripe' })
    .eq('id', enc.id);

  return NextResponse.json({ ok: true, url: session.url });
}
