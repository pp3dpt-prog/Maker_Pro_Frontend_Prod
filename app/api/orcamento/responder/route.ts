import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient as createAdmin } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  let body: { token: string; resposta: 'aceitar' | 'recusar' };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  }

  const { token, resposta } = body;
  if (!token || !['aceitar', 'recusar'].includes(resposta)) {
    return NextResponse.json({ error: 'Parâmetros inválidos.' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Configuração do servidor em falta.' }, { status: 500 });
  }

  const admin = createAdmin(supabaseUrl, serviceKey);

  // 1. Fetch order by token
  const { data: pedido, error: fetchError } = await admin
    .from('prod_pedidos_orcamento')
    .select('id, contacto_nome, contacto_email, design_nome, preco_estimado, estado, token_expira_em')
    .eq('token_resposta', token)
    .maybeSingle();

  if (fetchError || !pedido) {
    return NextResponse.json({ error: 'Token inválido ou não encontrado.' }, { status: 404 });
  }

  // 2. Validate
  if (pedido.estado !== 'orcamento_enviado') {
    return NextResponse.json({ error: 'already_responded', estado: pedido.estado }, { status: 409 });
  }
  if (!pedido.token_expira_em || new Date(pedido.token_expira_em) < new Date()) {
    return NextResponse.json({ error: 'token_expired' }, { status: 410 });
  }

  // 3. Update estado
  const novoEstado = resposta === 'aceitar' ? 'aceite' : 'recusado';
  const { error: updateError } = await admin
    .from('prod_pedidos_orcamento')
    .update({ estado: novoEstado })
    .eq('token_resposta', token);

  if (updateError) {
    console.error('[orcamento/responder] update error:', updateError);
    return NextResponse.json({ error: 'Erro ao guardar resposta.' }, { status: 500 });
  }

  // 4. Notify admin
  const resendKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.PEDIDOS_ADMIN_EMAIL || process.env.RESEND_FROM_EMAIL_REPLY || 'pp3d.pt@gmail.com';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'PP3D <onboarding@resend.dev>';

  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      const acao = novoEstado === 'aceite' ? 'aceitou' : 'recusou';
      const precoStr = pedido.preco_estimado != null ? `€${Number(pedido.preco_estimado).toFixed(2)}` : 'N/D';

      await resend.emails.send({
        from: fromEmail,
        to: adminEmail,
        subject: `Cliente ${acao} o orçamento — ${pedido.design_nome}`,
        html: `
          <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0f172a">
            <h2 style="margin:0 0 16px">Resposta ao orçamento</h2>
            <p style="margin:0 0 8px">
              O cliente <strong>${pedido.contacto_nome}</strong> (${pedido.contacto_email})
              <strong style="color:${novoEstado === 'aceite' ? '#16a34a' : '#dc2626'}">${acao}</strong>
              o orçamento para <strong>${pedido.design_nome}</strong> — ${precoStr}.
            </p>
            <p style="margin:16px 0 0;font-size:12px;color:#94a3b8">Estado atualizado: <strong>${novoEstado}</strong></p>
          </div>
        `,
      });
    } catch (e) {
      console.error('[orcamento/responder] erro Resend admin:', e);
    }
  }

  return NextResponse.json({ ok: true, estado: novoEstado });
}
