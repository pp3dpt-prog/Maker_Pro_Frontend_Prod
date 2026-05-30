import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

async function checkAdmin(userId: string, userEmail: string | undefined, supabaseUrl: string, serviceKey: string): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && userEmail === adminEmail) return true;
  const adminClient = createAdmin(supabaseUrl, serviceKey);
  const { data } = await adminClient
    .from('prod_perfis')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  return data?.role === 'admin';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  const ok = await checkAdmin(user.id, user.email, supabaseUrl, serviceKey);
  if (!ok) {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  let body: { pedido_id: string; preco_estimado: number; prazo_entrega_dias: number; notas_orcamento?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  }

  const { pedido_id, preco_estimado, prazo_entrega_dias, notas_orcamento } = body;
  if (!pedido_id || preco_estimado == null || prazo_entrega_dias == null) {
    return NextResponse.json({ error: 'Campos obrigatórios em falta.' }, { status: 400 });
  }

  const adminClient = createAdmin(supabaseUrl, serviceKey);

  // 1. Fetch the order
  const { data: pedido, error: fetchError } = await adminClient
    .from('prod_pedidos_orcamento')
    .select('*')
    .eq('id', pedido_id)
    .maybeSingle();

  if (fetchError || !pedido) {
    return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  }

  // 2. Use existing token or generate (token_resposta has a default in DB)
  const token: string = pedido.token_resposta ?? crypto.randomUUID();

  // 3. token_expira_em = now + 7 days
  const expira = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  // 4. Update the order
  const { error: updateError } = await adminClient
    .from('prod_pedidos_orcamento')
    .update({
      preco_estimado,
      prazo_entrega_dias,
      notas_orcamento: notas_orcamento || null,
      estado: 'orcamento_enviado',
      token_resposta: token,
      token_expira_em: expira,
    })
    .eq('id', pedido_id);

  if (updateError) {
    console.error('[enviar-orcamento] update error:', updateError);
    return NextResponse.json({ error: 'Erro ao atualizar pedido.' }, { status: 500 });
  }

  // 5. Build URLs
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://makerpro.pt';
  const baseUrl = `${siteUrl}/orcamento/${token}`;
  const aceitarUrl = `${baseUrl}?resposta=aceitar`;
  const recusarUrl = `${baseUrl}?resposta=recusar`;

  // 6. Send email
  const resendKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.PEDIDOS_ADMIN_EMAIL || 'pp3d.pt@gmail.com';

  if (resendKey) {
    try {
      const resend = new Resend(resendKey);

      // Banner de aviso — sempre incluído no email do admin para reencaminhar ao cliente
      const adminBanner = `
        <div style="background:#713f12;border:1px solid #f59e0b40;border-radius:10px;padding:16px 20px;margin-bottom:24px">
          <p style="margin:0 0 6px;color:#fde68a;font-weight:700;font-size:13px">⚠️ REENCAMINHAR ao cliente</p>
          <p style="margin:0;color:#fde68a;font-size:13px">
            Reencaminha este email para
            <strong>${escapeHtml(pedido.contacto_email)}</strong> (${escapeHtml(pedido.contacto_nome)})
            ou copia os links de aceitar/recusar abaixo.
          </p>
        </div>
      `;

      const html = `
        <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#080c10;padding:0;border-radius:16px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#1d4ed8,#7c3aed);padding:40px 32px;text-align:center">
            <h1 style="margin:0;color:#fff;font-size:26px;font-weight:800">O teu orçamento está pronto! 🎉</h1>
          </div>
          <div style="padding:32px">
            ${adminBanner}
            <p style="color:#94a3b8;font-size:15px;margin:0 0 24px">Olá <strong style="color:#f1f5f9">${escapeHtml(pedido.contacto_nome)}</strong>,</p>
            <p style="color:#94a3b8;font-size:15px;margin:0 0 24px">Preparámos o teu orçamento para a peça <strong style="color:#f1f5f9">${escapeHtml(pedido.design_nome)}</strong>. Aqui estão os detalhes:</p>

            <div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:24px;margin-bottom:24px">
              <table style="width:100%;border-collapse:collapse">
                <tr>
                  <td style="padding:8px 0;color:#64748b;font-size:14px">Peça</td>
                  <td style="padding:8px 0;color:#f1f5f9;font-weight:700;font-size:14px;text-align:right">${escapeHtml(pedido.design_nome)}</td>
                </tr>
                <tr style="border-top:1px solid #1e293b">
                  <td style="padding:8px 0;color:#64748b;font-size:14px">Preço estimado</td>
                  <td style="padding:8px 0;color:#86efac;font-weight:800;font-size:18px;text-align:right">€${preco_estimado.toFixed(2)}</td>
                </tr>
                <tr style="border-top:1px solid #1e293b">
                  <td style="padding:8px 0;color:#64748b;font-size:14px">Prazo de entrega</td>
                  <td style="padding:8px 0;color:#f1f5f9;font-weight:700;font-size:14px;text-align:right">${prazo_entrega_dias} dias úteis</td>
                </tr>
                ${notas_orcamento ? `<tr style="border-top:1px solid #1e293b"><td style="padding:8px 0;color:#64748b;font-size:14px;vertical-align:top">Notas</td><td style="padding:8px 0;color:#f1f5f9;font-size:14px;text-align:right;white-space:pre-wrap">${escapeHtml(notas_orcamento)}</td></tr>` : ''}
              </table>
            </div>

            <p style="color:#94a3b8;font-size:14px;margin:0 0 24px">Tens 7 dias para responder. Clica num dos botões abaixo:</p>

            <div style="display:flex;gap:12px;margin-bottom:24px">
              <a href="${aceitarUrl}" style="flex:1;display:block;text-align:center;padding:16px;background:#16a34a;color:#fff;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none">
                ✅ Aceitar orçamento
              </a>
              <a href="${recusarUrl}" style="flex:1;display:block;text-align:center;padding:16px;background:#dc2626;color:#fff;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none">
                ❌ Recusar
              </a>
            </div>

            <p style="color:#475569;font-size:12px;text-align:center;margin:0">Este link expira em 7 dias. Após essa data não será possível responder.</p>
          </div>
        </div>
      `;

      // Envia sempre para o admin com onboarding@resend.dev (não precisa de domínio verificado).
      // Quando o domínio pp3d.pt estiver verificado no Resend, mudar para enviar ao cliente.
      const { error: resendError } = await resend.emails.send({
        from: 'PP3D <onboarding@resend.dev>',
        to: adminEmail,
        replyTo: pedido.contacto_email,
        subject: `[REENCAMINHAR a ${pedido.contacto_email}] Orçamento — ${pedido.design_nome}`,
        html,
      });

      if (resendError) {
        console.error('[enviar-orcamento] erro Resend:', resendError);
        return NextResponse.json({ ok: true, emailError: resendError.message, emailTo: adminEmail });
      }

    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[enviar-orcamento] erro Resend exception:', msg);
      return NextResponse.json({ ok: true, emailError: msg });
    }
  }

  return NextResponse.json({ ok: true, emailTo: adminEmail });
}
