// Verifica uma sessão de checkout Stripe e activa o plano se pago.
// Chamado pela página de sucesso — funciona mesmo que o webhook falhe.
// Idempotente: se o pagamento já foi processado, não duplica.

import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { session_id } = await request.json();
  if (!session_id) return NextResponse.json({ error: 'session_id obrigatório.' }, { status: 400 });

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // Buscar a sessão no Stripe
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.retrieve(session_id);
  } catch (err: any) {
    return NextResponse.json({ error: 'Sessão Stripe não encontrada.', detalhe: err.message }, { status: 404 });
  }

  // Confirmar que a sessão pertence a este utilizador
  if (session.metadata?.user_id !== user.id && session.client_reference_id !== user.id) {
    return NextResponse.json({ error: 'Sessão não pertence a este utilizador.' }, { status: 403 });
  }

  // Confirmar que foi pago
  if (session.payment_status !== 'paid' && session.status !== 'complete') {
    return NextResponse.json({ ok: false, pago: false, payment_status: session.payment_status });
  }

  // Idempotência: já processado?
  const { data: existente } = await admin
    .from('prod_pagamentos')
    .select('id')
    .eq('stripe_session_id', session.id)
    .maybeSingle();

  if (existente) {
    return NextResponse.json({ ok: true, jaProcessado: true });
  }

  const planoId   = session.metadata?.plano_id ?? '';
  const intervalo = session.metadata?.intervalo ?? 'mensal';
  const valor     = (session.amount_total ?? 0) / 100;

  // Activar plano
  const { data: plano } = await admin
    .from('prod_planos')
    .select('nome, tier, limite_downloads, validade_dias, permite_venda_comercial')
    .eq('id', planoId)
    .single();

  if (!plano) return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });

  const dias = intervalo === 'anual' ? plano.validade_dias * 12 : plano.validade_dias;
  const validoAte = new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();

  // tier (texto) é a fonte de verdade lida pelo dashboard e controlo de acessos
  const tier = plano.tier || (plano.permite_venda_comercial ? 'comercial' : 'pessoal');

  // Somar downloads restantes do plano actual aos do plano novo
  const { data: perfilAtual } = await admin
    .from('prod_perfis')
    .select('downloads_limite, downloads_mes')
    .eq('id', user.id)
    .single();
  const restantes  = Math.max(0, (perfilAtual?.downloads_limite ?? 0) - (perfilAtual?.downloads_mes ?? 0));
  const novoLimite = restantes + plano.limite_downloads;

  const { error: updErr } = await admin.from('prod_perfis').update({
    plano:            tier,
    plano_id:         planoId,
    downloads_limite: novoLimite,
    downloads_mes:    0,
  }).eq('id', user.id);

  if (updErr) {
    return NextResponse.json({ error: 'Erro ao actualizar perfil.', detalhe: updErr.message }, { status: 500 });
  }

  try {
    await admin.from('prod_perfis').update({
      stripe_subscription_id: typeof session.subscription === 'string' ? session.subscription : null,
      plano_valido_ate:       validoAte,
    }).eq('id', user.id);
  } catch (_) { /* colunas opcionais */ }

  // Registar pagamento (fatura pendente)
  await admin.from('prod_pagamentos').insert({
    user_id:           user.id,
    user_email:        session.customer_email ?? user.email ?? '',
    user_name:         session.metadata?.nome_completo ?? '',
    user_nif:          session.metadata?.nif ?? '',
    descricao:         `Subscrição ${plano.nome} (${intervalo})`,
    plano_nome:        plano.nome,
    valor,
    tipo:              'subscricao',
    stripe_session_id: session.id,
  });

  return NextResponse.json({ ok: true, plano: plano.nome, downloads: plano.limite_downloads });
}
