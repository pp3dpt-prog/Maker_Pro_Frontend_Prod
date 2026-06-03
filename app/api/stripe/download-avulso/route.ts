import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { design_id, params } = await request.json();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://maker-pro-frontend-prod.vercel.app';
  const priceId = process.env.STRIPE_PRICE_DOWNLOAD_AVULSO;

  if (!priceId) return NextResponse.json({ error: 'Download avulso não configurado.' }, { status: 500 });

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: {
      user_id:   user.id,
      design_id: design_id ?? '',
      params:    JSON.stringify(params ?? {}),
      tipo:      'download_avulso',
    },
    success_url: `${siteUrl}/checkout/download-sucesso?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${siteUrl}/customizador?id=${design_id}`,
    locale: 'pt',
  });

  return NextResponse.json({ url: session.url });
}
