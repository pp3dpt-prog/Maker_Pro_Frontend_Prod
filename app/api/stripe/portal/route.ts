// Cria uma sessão do Stripe Customer Portal — o utilizador gere/cancela
// a subscrição, muda cartão e vê faturas. Tudo alojado pelo Stripe.

import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  // Encontrar o customer Stripe pelo email
  const customers = await stripe.customers.list({ email: user.email, limit: 1 });
  const customer = customers.data[0];
  if (!customer) {
    return NextResponse.json({ error: 'Sem subscrição activa.' }, { status: 404 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pp3d.pt';

  const session = await stripe.billingPortal.sessions.create({
    customer: customer.id,
    return_url: `${siteUrl}/dashboard`,
  });

  return NextResponse.json({ url: session.url });
}
