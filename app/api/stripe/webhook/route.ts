import Stripe from 'stripe';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function activatePlan(userId: string, planoId: string, subscriptionId: string, intervalo: string) {
  const { data: plano } = await admin
    .from('prod_planos')
    .select('limite_downloads, validade_dias')
    .eq('id', planoId)
    .single();

  if (!plano) return;

  const dias = intervalo === 'anual' ? plano.validade_dias * 12 : plano.validade_dias;
  const validoAte = new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();

  await admin.from('prod_perfis').update({
    plano_id:          planoId,
    downloads_limite:  plano.limite_downloads,
    downloads_mes:     0,
    stripe_subscription_id: subscriptionId,
    plano_valido_ate:  validoAte,
  }).eq('id', userId);
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get('stripe-signature')!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('Webhook signature failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {

      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId  = session.metadata?.user_id;
        const tipo    = session.metadata?.tipo;

        if (!userId) break;

        // ── Download avulso: créditar 1 download ──────────────────────
        if (tipo === 'download_avulso') {
          await admin.from('prod_perfis')
            .update({ downloads_limite: admin.rpc('increment', { x: 1 }) as any })
            .eq('id', userId);

          // Incrementar de forma segura
          const { data: p } = await admin.from('prod_perfis').select('downloads_limite').eq('id', userId).single();
          if (p) await admin.from('prod_perfis').update({ downloads_limite: (p.downloads_limite ?? 0) + 1 }).eq('id', userId);
          break;
        }

        // ── Subscrição: activar plano ──────────────────────────────────
        if (session.mode === 'subscription') {
          const planoId  = session.metadata?.plano_id ?? '';
          const intervalo = session.metadata?.intervalo ?? 'mensal';
          const subId    = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? '';
          await activatePlan(userId, planoId, subId, intervalo);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub    = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        if (userId) {
          // Reverter para plano gratuito
          const { data: free } = await admin.from('prod_planos').select('id, limite_downloads').eq('gratuito', true).single();
          if (free) {
            await admin.from('prod_perfis').update({
              plano_id: free.id,
              downloads_limite: free.limite_downloads,
              stripe_subscription_id: null,
              plano_valido_ate: null,
            }).eq('id', userId);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        console.warn('Pagamento falhou para customer:', invoice.customer);
        // TODO: notificar utilizador por email
        break;
      }
    }
  } catch (err) {
    console.error('Webhook handler error:', err);
  }

  return NextResponse.json({ received: true });
}
