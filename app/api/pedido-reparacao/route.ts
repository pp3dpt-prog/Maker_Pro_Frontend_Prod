import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

type Contacto = { nome: string; email: string; telefone: string };

interface Body {
  equipamento: string;
  problema_descricao: string;
  contacto: Contacto;
  morada: string;
  notas: string;
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
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  }

  const { equipamento, problema_descricao, contacto, morada, notas } = body || ({} as Body);

  if (!equipamento?.trim() || !problema_descricao?.trim() || !contacto?.nome || !contacto?.email || !contacto?.telefone) {
    return NextResponse.json({ error: 'Campos obrigatórios em falta.' }, { status: 400 });
  }
  if (!/\S+@\S+\.\S+/.test(contacto.email)) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Tens de iniciar sessão para pedir uma reparação.' }, { status: 401 });
  }

  let pedidoId: string | null = null;
  let dbError: string | null = null;
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      dbError = 'Variáveis SUPABASE_URL / SERVICE_ROLE_KEY em falta no ambiente.';
      console.error('[pedido-reparacao]', dbError);
    } else {
      const admin = createAdmin(supabaseUrl, serviceKey);
      const result = await admin
        .from('prod_pedidos_orcamento')
        .insert({
          user_id: user.id,
          tipo_pedido: 'reparacao',
          equipamento: equipamento.trim(),
          problema_descricao: problema_descricao.trim(),
          contacto_nome: contacto.nome,
          contacto_email: contacto.email,
          contacto_telefone: contacto.telefone,
          morada_envio: morada?.trim() || null,
          notas: notas?.trim() || null,
          estado: 'pendente_orcamento',
        })
        .select('id')
        .maybeSingle();

      if (!result.error && result.data?.id) {
        pedidoId = result.data.id;
      } else if (result.error) {
        dbError = result.error.message || JSON.stringify(result.error);
        console.error('[pedido-reparacao] insert falhou:', result.error);
      }
    }
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
    console.error('[pedido-reparacao] erro DB:', e);
  }

  if (!pedidoId) {
    return NextResponse.json(
      { error: dbError || 'Serviço temporariamente indisponível. Por favor tenta mais tarde.' },
      { status: 503 }
    );
  }

  const resendKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.PEDIDOS_ADMIN_EMAIL || process.env.RESEND_FROM_EMAIL_REPLY || 'pp3d.pt@gmail.com';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'PPtronica <onboarding@resend.dev>';

  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      const html = `
        <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a">
          <h2 style="margin:0 0 4px">Novo pedido de reparação — PPtronica</h2>
          <p style="margin:0 0 20px;color:#64748b">ID: ${escapeHtml(pedidoId)}</p>

          <h3 style="margin:16px 0 8px">Equipamento</h3>
          <p style="margin:0 0 8px"><strong>${escapeHtml(equipamento)}</strong></p>

          <h3 style="margin:24px 0 8px">Descrição do problema</h3>
          <p style="margin:0;white-space:pre-wrap;line-height:1.6">${escapeHtml(problema_descricao)}</p>

          <h3 style="margin:24px 0 8px">Contacto</h3>
          <p style="margin:0;line-height:1.7">
            <strong>${escapeHtml(contacto.nome)}</strong><br/>
            Email: <a href="mailto:${escapeHtml(contacto.email)}">${escapeHtml(contacto.email)}</a><br/>
            Telefone: ${escapeHtml(contacto.telefone)}
          </p>

          ${morada ? `<h3 style="margin:24px 0 8px">Morada (deslocação)</h3><p style="margin:0;white-space:pre-wrap;line-height:1.6">${escapeHtml(morada)}</p>` : ''}

          <h3 style="margin:24px 0 8px">Notas</h3>
          <p style="margin:0;white-space:pre-wrap;line-height:1.6">${notas ? escapeHtml(notas) : '<em style="color:#64748b">Sem notas</em>'}</p>

          <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0"/>
          <p style="margin:0;font-size:12px;color:#94a3b8">user_id: ${escapeHtml(user.id)}</p>
        </div>
      `;

      await resend.emails.send({
        from: fromEmail,
        to: adminEmail,
        replyTo: contacto.email,
        subject: `Novo pedido de reparação — ${equipamento} (${contacto.nome})`,
        html,
      });
    } catch (e) {
      console.error('[pedido-reparacao] erro Resend:', e);
    }
  }

  return NextResponse.json({ ok: true, id: pedidoId });
}
