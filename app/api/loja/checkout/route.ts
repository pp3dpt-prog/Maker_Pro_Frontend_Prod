// Checkout da loja. Aceita convidados (sem login) ou utilizadores autenticados.
// Recalcula preços server-side (nunca confia no cliente).
// Ramifica: se algum item requer orçamento -> encomenda fica 'orcamento' (paga depois);
// caso contrário -> cria sessão Stripe (mode 'payment').
// Código opcional (prod_cupons): 'desconto' aplica % antes do pagamento;
// 'sem_pagamento' regista a encomenda e envia o email, sem passar pelo pagamento.
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { notificarAdminEncomenda, confirmarClienteEncomenda } from '@/lib/loja-email';

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

  const body = await request.json();
  const itens: ItemReq[] = Array.isArray(body.itens) ? body.itens : [];
  const morada = body.morada ?? null;
  const nif: string = body.nif ?? '';
  const nomeCompleto: string = body.nome_completo ?? '';
  const entrega: 'envio' | 'maos' = body.entrega === 'maos' ? 'maos' : 'envio';
  const codigoReq: string = typeof body.codigo === 'string' ? body.codigo.trim().toUpperCase() : '';
  if (itens.length === 0) return NextResponse.json({ error: 'Carrinho vazio.' }, { status: 400 });

  const emailConvidado: string = typeof body.email === 'string' ? body.email.trim() : '';
  if (!user && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailConvidado)) {
    return NextResponse.json({ error: 'Indica um email válido.' }, { status: 400 });
  }
  const clienteEmail = user?.email ?? emailConvidado;

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  const ids = [...new Set(itens.map(i => i.produto_id))];
  const [{ data: produtos }, { data: variantes }, { data: cfg }] = await Promise.all([
    admin.from('prod_loja_produtos').select('id, slug, nome, preco_cents, preco_promo_cents, requer_orcamento, portes_cents, estado').in('id', ids),
    admin.from('prod_loja_variantes').select('id, produto_id, cor, cor_secundaria, cor_terciaria, tamanho, preco_cents').in('produto_id', ids),
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
    const label = v ? [v.cor, v.cor_secundaria, v.cor_terciaria, v.tamanho].filter(Boolean).join(' / ') : null;
    linhas.push({ p, v, unit, qtd, label, requer_orcamento: !!p.requer_orcamento, personalizacao: it.personalizacao ?? null });
  }
  if (linhas.length === 0) return NextResponse.json({ error: 'Sem itens válidos.' }, { status: 400 });

  // ── Código (opcional): valida e consome um uso de forma atómica ──
  let cupao: { id: number; codigo: string; tipo: string; desconto_percent: number | null; valor_cents: number | null } | null = null;
  if (codigoReq) {
    const { data: usados, error: cupErr } = await admin.rpc('usar_cupao_loja', { p_codigo: codigoReq });
    const c = Array.isArray(usados) ? usados[0] : null;
    if (cupErr || !c) {
      if (cupErr) console.error('[loja/checkout] erro código:', cupErr);
      return NextResponse.json({ error: 'Código inválido, expirado ou já esgotado.' }, { status: 400 });
    }
    cupao = { id: c.id, codigo: c.codigo, tipo: c.tipo ?? 'desconto', desconto_percent: c.desconto_percent ?? 0, valor_cents: c.valor_cents ?? null };
  }
  const semPagamento = cupao?.tipo === 'sem_pagamento';
  const subtotalBruto = linhas.reduce((a, l) => a + (l.requer_orcamento ? 0 : l.unit * l.qtd), 0);
  // Desconto: valor fixo (valor_cents) ou percentagem; repartido pelas linhas com preço
  let descontoAlvo = 0;
  if (cupao && !semPagamento) {
    descontoAlvo = cupao.valor_cents && cupao.valor_cents > 0
      ? Math.min(subtotalBruto, cupao.valor_cents)
      : Math.round(subtotalBruto * Math.min(100, Math.max(0, cupao.desconto_percent ?? 0)) / 100);
  }
  if (descontoAlvo > 0 && subtotalBruto > 0) {
    const fator = (subtotalBruto - descontoAlvo) / subtotalBruto;
    for (const l of linhas) if (!l.requer_orcamento) l.unit = Math.max(0, Math.round(l.unit * fator));
  }

  const temOrcamento = linhas.some(l => l.requer_orcamento);
  // Entrega em mãos é coordenada com o admin e paga depois -> segue sempre como orçamento.
  // Com código "sem pagamento" a encomenda fica logo confirmada (não há orçamento nem pagamento).
  const viaOrcamento = !semPagamento && (temOrcamento || entrega === 'maos');
  const subtotal = linhas.reduce((a, l) => a + (l.requer_orcamento ? 0 : l.unit * l.qtd), 0);
  const descontoCents = semPagamento ? subtotalBruto : subtotalBruto - subtotal;

  // Portes: 0 se entrega em mãos; senão global + override por produto (máximo), grátis acima do limiar
  let portes = 0;
  if (entrega !== 'maos' && !semPagamento) {
    portes = cfg?.portes_cents ?? 0;
    const overrides = linhas.map(l => l.p.portes_cents).filter((x): x is number => x != null);
    if (overrides.length) portes = Math.max(portes, ...overrides);
    if (cfg?.portes_gratis_acima_cents != null && subtotal >= cfg.portes_gratis_acima_cents) portes = 0;
  }

  const estado = semPagamento ? 'confirmado' : viaOrcamento ? 'orcamento' : 'pendente';
  const totalCents = semPagamento ? 0 : viaOrcamento ? subtotal : subtotal + portes;

  const { data: enc, error: encErr } = await admin.from('prod_loja_encomendas').insert({
    user_id: user?.id ?? null,
    estado,
    entrega,
    total_cents: totalCents,
    portes_cents: viaOrcamento || semPagamento ? 0 : portes,
    metodo_pagamento: semPagamento ? 'codigo' : viaOrcamento ? null : 'stripe',
    morada_envio: morada,
    nif: nif || null,
    codigo_usado: cupao?.codigo ?? null,
    desconto_cents: descontoCents,
  }).select('id, numero').single();
  if (encErr || !enc) {
    console.error('[loja/checkout] erro encomenda:', encErr);
    return NextResponse.json({ error: 'Erro ao criar encomenda.' }, { status: 500 });
  }

  if (cupao) {
    await admin.from('prod_cupoes_resgates').insert({
      cupao_id: cupao.id, user_id: user?.id ?? null, email: clienteEmail, encomenda_id: enc.id,
      detalhe: semPagamento ? 'Encomenda sem pagamento' : `Desconto de ${(descontoCents / 100).toFixed(2)} €`,
    });
  }

  await admin.from('prod_loja_encomenda_itens').insert(linhas.map(l => ({
    encomenda_id: enc.id,
    produto_id: l.p.id,
    variante_id: l.v?.id ?? null,
    nome: l.p.nome,
    cor: l.v?.cor ?? null,
    cor_secundaria: l.v?.cor_secundaria ?? null,
    cor_terciaria: l.v?.cor_terciaria ?? null,
    tamanho: l.v?.tamanho ?? null,
    preco_cents: l.requer_orcamento ? null : l.unit,
    quantidade: l.qtd,
    personalizacao: l.personalizacao,
  })));

  const itensEmail = linhas.map(l => ({
    nome: l.p.nome, quantidade: l.qtd, label: l.label,
    preco_cents: l.requer_orcamento ? null : l.unit,
    personalizacao: l.personalizacao,
  }));

  // ── Código "sem pagamento": encomenda confirmada, só email ──
  if (semPagamento) {
    await notificarAdminEncomenda({
      numero: enc.numero, tipo: 'codigo', entrega,
      clienteEmail, clienteNome: morada?.nome ?? nomeCompleto,
      telefone: morada?.telefone ?? null, morada, codigo: cupao?.codigo ?? null,
      totalCents: 0, descontoCents,
      itens: itensEmail,
    });
    await confirmarClienteEncomenda({ numero: enc.numero, tipo: 'codigo', clienteEmail, clienteNome: morada?.nome ?? nomeCompleto, totalCents: 0, itens: itensEmail });
    return NextResponse.json({ ok: true, tipo: 'codigo', numero: enc.numero });
  }

  // ── Orçamento: sem pagamento agora (itens a orçamentar ou entrega em mãos) ──
  if (viaOrcamento) {
    await notificarAdminEncomenda({
      numero: enc.numero, tipo: 'orcamento', entrega,
      clienteEmail, clienteNome: morada?.nome ?? nomeCompleto,
      telefone: morada?.telefone ?? null, morada, codigo: cupao?.codigo ?? null,
      totalCents: subtotal, descontoCents,
      itens: itensEmail,
    });
    await confirmarClienteEncomenda({ numero: enc.numero, tipo: 'orcamento', clienteEmail, clienteNome: morada?.nome ?? nomeCompleto, totalCents: subtotal, itens: itensEmail });
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
    customer_email: clienteEmail,
    client_reference_id: user?.id ?? undefined,
    metadata: { tipo: 'loja', encomenda_id: enc.id, user_id: user?.id ?? '', nome_completo: nomeCompleto, nif: nif || '', codigo: cupao?.codigo ?? '' },
    success_url: `${siteUrl}/checkout-loja/sucesso?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/carrinho`,
    locale: 'pt',
  });

  await admin.from('prod_loja_encomendas').update({ payment_ref: session.id }).eq('id', enc.id);
  return NextResponse.json({ ok: true, tipo: 'pagamento', url: session.url });
}
