import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { plano_id, intervalo, nome_completo, nif } = await request.json();
  if (!plano_id || !intervalo) {
    return NextResponse.json({ error: 'plano_id e intervalo obrigatórios.' }, { status: 400 });
  }

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: plano } = await admin
    .from('prod_planos')
    .select('nome, stripe_price_id_mensal, stripe_price_id_anual')
    .eq('id', plano_id)
    .single();

  if (!plano) return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });

  const priceId = intervalo === 'anual'
    ? plano.stripe_price_id_anual
    : plano.stripe_price_id_mensal;

  if (!priceId) return NextResponse.json({ error: 'Preço Stripe não configurado para este plano.' }, { status: 400 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://maker-pro-frontend-prod.vercel.app';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: { user_id: user.id, plano_id, intervalo, nome_completo: nome_completo ?? '', nif: nif ?? '' },
    success_url: `${siteUrl}/checkout/sucesso?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/pricing`,
    locale: 'pt',
  });

  return NextResponse.json({ url: session.url });
}
