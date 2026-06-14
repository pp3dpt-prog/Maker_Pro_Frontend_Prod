import Stripe from 'stripe';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { notificarAdminEncomenda } from '@/lib/loja-email';

export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function activatePlan(userId: string, planoId: string, subscriptionId: string, intervalo: string) {
  const { data: plano } = await admin
    .from('prod_planos')
    .select('tier, limite_downloads, validade_dias, permite_venda_comercial')
    .eq('id', planoId)
    .single();

  if (!plano) return;

  const dias = intervalo === 'anual' ? plano.validade_dias * 12 : plano.validade_dias;
  const validoAte = new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();
  const tier = plano.tier || (plano.permite_venda_comercial ? 'comercial' : 'pessoal');

  // Somar downloads restantes do plano actual aos do plano novo
  const { data: perfilAtual } = await admin
    .from('prod_perfis')
    .select('downloads_limite, downloads_mes')
    .eq('id', userId)
    .single();
  const restantes  = Math.max(0, (perfilAtual?.downloads_limite ?? 0) - (perfilAtual?.downloads_mes ?? 0));
  const novoLimite = restantes + plano.limite_downloads;

  // Actualizar campos base (sempre existem) — plano (texto) é o que o dashboard lê
  await admin.from('prod_perfis').update({
    plano:            tier,
    plano_id:         planoId,
    downloads_limite: novoLimite,
    downloads_mes:    0,
  }).eq('id', userId);

  // Actualizar campos opcionais (só se as colunas existirem)
  try {
    await admin.from('prod_perfis').update({
      stripe_subscription_id: subscriptionId,
      plano_valido_ate:       validoAte,
    }).eq('id', userId);
  } catch (_) { /* colunas ainda não existem — ignorar */ }
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

        const valor     = (session.amount_total ?? 0) / 100;
        const email     = session.customer_email ?? '';
        const userName  = session.metadata?.nome_completo ?? '';
        const userNif   = session.metadata?.nif ?? '';

        // ── Download avulso: créditar 1 download ──────────────────────
        if (tipo === 'download_avulso') {
          const { data: p } = await admin.from('prod_perfis').select('downloads_limite').eq('id', userId).single();
          if (p) await admin.from('prod_perfis').update({ downloads_limite: (p.downloads_limite ?? 0) + 1 }).eq('id', userId);

          await admin.from('prod_pagamentos').insert({
            user_id:          userId,
            user_email:       email,
            user_name:        userName,
            user_nif:         userNif,
            descricao:        'Download avulso STL',
            plano_nome:       'Download Avulso',
            valor,
            tipo:             'download_avulso',
            stripe_session_id: session.id,
          });
          break;
        }

        // ── Loja: marcar encomenda paga + decrementar stock ───────────
        if (tipo === 'loja') {
          const encomendaId = session.metadata?.encomenda_id;
          if (encomendaId) {
            await admin.from('prod_loja_encomendas')
              .update({ estado: 'pago', payment_ref: session.id })
              .eq('id', encomendaId);

            const { data: itens } = await admin
              .from('prod_loja_encomenda_itens')
              .select('produto_id, variante_id, quantidade, nome, cor, tamanho, preco_cents')
              .eq('encomenda_id', encomendaId);

            for (const it of itens ?? []) {
              if (it.variante_id) {
                const { data: v } = await admin.from('prod_loja_variantes').select('stock').eq('id', it.variante_id).single();
                if (v) await admin.from('prod_loja_variantes').update({ stock: Math.max(0, (v.stock ?? 0) - it.quantidade) }).eq('id', it.variante_id);
              } else {
                const { data: p } = await admin.from('prod_loja_produtos').select('stock').eq('id', it.produto_id).single();
                if (p) await admin.from('prod_loja_produtos').update({ stock: Math.max(0, (p.stock ?? 0) - it.quantidade) }).eq('id', it.produto_id);
              }
            }

            try {
              await admin.from('prod_pagamentos').insert({
                user_id: userId, user_email: email, user_name: userName, user_nif: userNif,
                descricao: 'Compra na loja', plano_nome: 'Loja', valor, tipo: 'loja',
                stripe_session_id: session.id,
              });
            } catch (_) { /* tipo 'loja' pode não ser aceite por constraint — ignorar */ }

            // Notificar admin
            const { data: encInfo } = await admin
              .from('prod_loja_encomendas').select('numero, total_cents, entrega').eq('id', encomendaId).maybeSingle();
            await notificarAdminEncomenda({
              numero: encInfo?.numero ?? 0, tipo: 'pago', entrega: encInfo?.entrega,
              clienteEmail: email, clienteNome: userName,
              totalCents: encInfo?.total_cents ?? Math.round(valor * 100),
              itens: (itens ?? []).map((i: any) => ({ nome: i.nome, quantidade: i.quantidade, label: [i.cor, i.tamanho].filter(Boolean).join(' / ') || null, preco_cents: i.preco_cents })),
            });
          }
          break;
        }

        // ── Subscrição: activar plano ──────────────────────────────────
        if (session.mode === 'subscription') {
          const planoId   = session.metadata?.plano_id ?? '';
          const intervalo = session.metadata?.intervalo ?? 'mensal';
          const subId     = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id ?? '';
          await activatePlan(userId, planoId, subId, intervalo);

          const { data: plano } = await admin.from('prod_planos').select('nome').eq('id', planoId).single();
          await admin.from('prod_pagamentos').insert({
            user_id:          userId,
            user_email:       email,
            user_name:        userName,
            user_nif:         userNif,
            descricao:        `Subscrição ${plano?.nome ?? ''} (${intervalo})`,
            plano_nome:       plano?.nome ?? '',
            valor,
            tipo:             'subscricao',
            stripe_session_id: session.id,
          });
        }
        break;
      }

      case 'invoice.paid': {
        // Renovação automática mensal — repõe downloads e estende validade.
        const invoice = event.data.object as Stripe.Invoice;
        // Só tratar renovações (a 1ª fatura é tratada por checkout.session.completed)
        if (invoice.billing_reason !== 'subscription_cycle') break;

        // A localização de "subscription" mudou entre versões da API Stripe.
        const inv = invoice as any;
        const subRaw =
          inv.subscription ??
          inv.parent?.subscription_details?.subscription ??
          inv.lines?.data?.[0]?.subscription ??
          null;
        const subId = typeof subRaw === 'string' ? subRaw : subRaw?.id;
        if (!subId) break;

        // Encontrar o perfil por subscrição
        const { data: perfil } = await admin
          .from('prod_perfis')
          .select('id, email, plano_id')
          .eq('stripe_subscription_id', subId)
          .maybeSingle();
        if (!perfil?.plano_id) break;

        const { data: plano } = await admin
          .from('prod_planos')
          .select('nome, limite_downloads, validade_dias')
          .eq('id', perfil.plano_id)
          .single();
        if (!plano) break;

        const validoAte = new Date(Date.now() + (plano.validade_dias || 30) * 24 * 60 * 60 * 1000).toISOString();

        // Renovar a zero: quota do plano, mês a zero (downloads comprados mantêm-se)
        await admin.from('prod_perfis').update({
          downloads_limite: plano.limite_downloads,
          downloads_mes:    0,
          plano_valido_ate: validoAte,
        }).eq('id', perfil.id);

        await admin.from('prod_pagamentos').insert({
          user_id:    perfil.id,
          user_email: perfil.email ?? '',
          descricao:  `Renovação ${plano.nome}`,
          plano_nome: plano.nome,
          valor:      (invoice.amount_paid ?? 0) / 100,
          tipo:       'subscricao',
          stripe_session_id: invoice.id,
        });
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
