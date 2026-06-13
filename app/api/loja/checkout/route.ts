// Checkout da loja. Exige login. Recalcula preços server-side (nunca confia no cliente).
// Ramifica: se algum item requer orçamento -> encomenda fica 'orcamento' (paga depois);
// caso contrário -> cria sessão Stripe (mode 'payment').
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

interface ItemReq {
  produto_id: string;
  variante_id?: string | null;
  quantidade?: number;
  personalizacao?: Record<string, unknown> | null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Tens de iniciar sessão para finalizar.' }, { status: 401 });

  const body = await request.json();
  const itens: ItemReq[] = Array.isArray(body.itens) ? body.itens : [];
  const morada = body.morada ?? null;
  const nif: string = body.nif ?? '';
  const nomeCompleto: string = body.nome_completo ?? '';
  if (itens.length === 0) return NextResponse.json({ error: 'Carrinho vazio.' }, { status: 400 });

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const ids = [...new Set(itens.map(i => i.produto_id))];
  const [{ data: produtos }, { data: variantes }, { data: cfg }] = await Promise.all([
    admin.from('prod_loja_produtos').select('id, slug, nome, preco_cents, preco_promo_cents, requer_orcamento, portes_cents, estado').in('id', ids),
    admin.from('prod_loja_variantes').select('id, produto_id, cor, cor_secundaria, tamanho, preco_cents').in('produto_id', ids),
    admin.from('prod_loja_config').select('portes_cents, portes_gratis_acima_cents').eq('id', 1).maybeSingle(),
  ]);

  // Construir linhas com preços do servidor
  const linhas = [];
  for (const it of itens) {
    const p = (produtos ?? []).find(x => x.id === it.produto_id);
    if (!p || p.estado !== 'ativo') continue;
    const v = it.variante_id ? (variantes ?? []).find(x => x.id === it.variante_id) : null;
    const unit = v?.preco_cents ?? p.preco_promo_cents ?? p.preco_cents;
    const qtd = Math.max(1, Math.floor(Number(it.quantidade) || 1));
    const label = v ? [v.cor, v.cor_secundaria, v.tamanho].filter(Boolean).join(' / ') : null;
    linhas.push({ p, v, unit, qtd, label, requer_orcamento: !!p.requer_orcamento, personalizacao: it.personalizacao ?? null });
  }
  if (linhas.length === 0) return NextResponse.json({ error: 'Sem itens válidos.' }, { status: 400 });

  const temOrcamento = linhas.some(l => l.requer_orcamento);
  const subtotal = linhas.reduce((a, l) => a + (l.requer_orcamento ? 0 : l.unit * l.qtd), 0);

  // Portes: global, com override por produto (máximo), grátis acima do limiar
  let portes = cfg?.portes_cents ?? 0;
  const overrides = linhas.map(l => l.p.portes_cents).filter((x): x is number => x != null);
  if (overrides.length) portes = Math.max(portes, ...overrides);
  if (cfg?.portes_gratis_acima_cents != null && subtotal >= cfg.portes_gratis_acima_cents) portes = 0;

  const estado = temOrcamento ? 'orcamento' : 'pendente';
  const totalCents = temOrcamento ? subtotal : subtotal + portes;

  const { data: enc, error: encErr } = await admin.from('prod_loja_encomendas').insert({
    user_id: user.id,
    estado,
    total_cents: totalCents,
    portes_cents: temOrcamento ? 0 : portes,
    metodo_pagamento: temOrcamento ? null : 'stripe',
    morada_envio: morada,
    nif: nif || null,
  }).select('id, numero').single();
  if (encErr || !enc) {
    console.error('[loja/checkout] erro encomenda:', encErr);
    return NextResponse.json({ error: 'Erro ao criar encomenda.' }, { status: 500 });
  }

  await admin.from('prod_loja_encomenda_itens').insert(linhas.map(l => ({
    encomenda_id: enc.id,
    produto_id: l.p.id,
    variante_id: l.v?.id ?? null,
    nome: l.p.nome,
    cor: l.v?.cor ?? null,
    tamanho: l.v?.tamanho ?? null,
    preco_cents: l.requer_orcamento ? null : l.unit,
    quantidade: l.qtd,
    personalizacao: l.personalizacao,
  })));

  // ── Orçamento: sem pagamento agora ──
  if (temOrcamento) {
    return NextResponse.json({ ok: true, tipo: 'orcamento', numero: enc.numero });
  }

  // ── Pagamento Stripe ──
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pp3d.pt';
  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = linhas.map(l => ({
    price_data: {
      currency: 'eur',
      unit_amount: l.unit,
      product_data: { name: l.label ? `${l.p.nome} (${l.label})` : l.p.nome },
    },
    quantity: l.qtd,
  }));
  if (portes > 0) {
    line_items.push({ price_data: { currency: 'eur', unit_amount: portes, product_data: { name: 'Portes de envio' } }, quantity: 1 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items,
    customer_email: user.email,
    client_reference_id: user.id,
    metadata: { tipo: 'loja', encomenda_id: enc.id, user_id: user.id, nome_completo: nomeCompleto, nif: nif || '' },
    success_url: `${siteUrl}/checkout-loja/sucesso?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/carrinho`,
    locale: 'pt',
  });

  await admin.from('prod_loja_encomendas').update({ payment_ref: session.id }).eq('id', enc.id);
  return NextResponse.json({ ok: true, tipo: 'pagamento', url: session.url });
}
