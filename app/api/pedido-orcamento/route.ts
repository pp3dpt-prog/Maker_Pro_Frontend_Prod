import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

type Contacto = { nome: string; email: string; telefone: string };
type ParamRow = { key: string; label: string; value: string };

interface Body {
  design_id: string;
  design_nome: string;
  familia: string;
  params: Record<string, any>;
  params_resumo: ParamRow[];
  user_id: string | null;
  contacto: Contacto;
  morada_faturacao: string;
  morada_envio: string;
  mesma_morada: boolean;
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

  const {
    design_id, design_nome, familia, params, params_resumo,
    user_id, contacto, morada_faturacao, morada_envio, mesma_morada, notas,
  } = body || ({} as Body);

  if (!design_id || !contacto?.nome || !contacto?.email || !contacto?.telefone || !morada_faturacao) {
    return NextResponse.json({ error: 'Campos obrigatórios em falta.' }, { status: 400 });
  }
  if (!/\S+@\S+\.\S+/.test(contacto.email)) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
  }

  // Autenticação obrigatória + perfil cliente final
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Tens de iniciar sessão para pedir orçamento.' }, { status: 401 });
  }

  const { data: perfil } = await supabase
    .from('prod_perfis')
    .select('tipo_utilizador')
    .eq('id', user.id)
    .maybeSingle();

  const tipo = perfil?.tipo_utilizador ?? null;
  if (tipo !== 'consumidor' && tipo !== 'ambos') {
    return NextResponse.json(
      { error: 'Apenas utilizadores registados como cliente final podem pedir orçamento.' },
      { status: 403 }
    );
  }

  // Inserir em Supabase (best-effort: se a tabela ainda não existir, segue para o email)
  let pedidoId: string | null = null;
  try {
    const insertPayload = {
      user_id: user.id,
      design_id,
      design_nome,
      familia,
      params,
      contacto_nome: contacto.nome,
      contacto_email: contacto.email,
      contacto_telefone: contacto.telefone,
      morada_faturacao,
      morada_envio,
      mesma_morada,
      notas: notas || null,
      estado: 'pendente_orcamento',
    };

    const { data, error } = await supabase
      .from('prod_pedidos_orcamento')
      .insert(insertPayload)
      .select('id')
      .maybeSingle();

    if (!error && data?.id) {
      pedidoId = data.id;
    } else if (error) {
      // Fallback: tentar com service role (caso RLS bloqueie utilizador não-autenticado)
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (url && serviceKey) {
        const admin = createAdmin(url, serviceKey);
        const { data: data2, error: error2 } = await admin
          .from('prod_pedidos_orcamento')
          .insert(insertPayload)
          .select('id')
          .maybeSingle();
        if (!error2 && data2?.id) pedidoId = data2.id;
        else console.error('[pedido-orcamento] insert falhou:', error2 || error);
      } else {
        console.error('[pedido-orcamento] insert falhou:', error);
      }
    }
  } catch (e) {
    console.error('[pedido-orcamento] erro DB:', e);
  }

  // Enviar email para admin via Resend
  const resendKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.PEDIDOS_ADMIN_EMAIL || process.env.RESEND_FROM_EMAIL_REPLY || 'pp3d.pt@gmail.com';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'PP3D <onboarding@resend.dev>';

  if (resendKey) {
    try {
      const resend = new Resend(resendKey);

      const paramsRowsHtml = (params_resumo || [])
        .map(r => `<tr><td style="padding:4px 12px;color:#64748b">${escapeHtml(r.label)}</td><td style="padding:4px 12px;color:#0f172a;font-weight:600">${escapeHtml(r.value)}</td></tr>`)
        .join('');

      const html = `
        <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a">
          <h2 style="margin:0 0 4px">Novo pedido de orçamento</h2>
          <p style="margin:0 0 20px;color:#64748b">${pedidoId ? `ID: ${escapeHtml(pedidoId)}` : '(sem ID — falhou gravação na BD)'}</p>

          <h3 style="margin:16px 0 8px">Peça</h3>
          <p style="margin:0 0 8px"><strong>${escapeHtml(design_nome)}</strong> <span style="color:#64748b">(${escapeHtml(familia)})</span></p>
          <table style="border-collapse:collapse;font-size:13px;width:100%;background:#f8fafc;border-radius:8px">
            ${paramsRowsHtml || '<tr><td style="padding:8px 12px;color:#64748b">Sem parâmetros</td></tr>'}
          </table>

          <h3 style="margin:24px 0 8px">Contacto</h3>
          <p style="margin:0;line-height:1.7">
            <strong>${escapeHtml(contacto.nome)}</strong><br/>
            Email: <a href="mailto:${escapeHtml(contacto.email)}">${escapeHtml(contacto.email)}</a><br/>
            Telefone: ${escapeHtml(contacto.telefone)}
          </p>

          <h3 style="margin:24px 0 8px">Morada de faturação</h3>
          <p style="margin:0;white-space:pre-wrap;line-height:1.6">${escapeHtml(morada_faturacao)}</p>

          <h3 style="margin:24px 0 8px">Morada de envio</h3>
          <p style="margin:0;white-space:pre-wrap;line-height:1.6">${mesma_morada ? '<em style="color:#64748b">Igual à de faturação</em>' : escapeHtml(morada_envio)}</p>

          <h3 style="margin:24px 0 8px">Notas</h3>
          <p style="margin:0;white-space:pre-wrap;line-height:1.6">${notas ? escapeHtml(notas) : '<em style="color:#64748b">Sem notas</em>'}</p>

          <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0"/>
          <p style="margin:0;font-size:12px;color:#94a3b8">design_id: ${escapeHtml(design_id)} • user_id: ${escapeHtml(user_id || 'anónimo')}</p>
        </div>
      `;

      await resend.emails.send({
        from: fromEmail,
        to: adminEmail,
        replyTo: contacto.email,
        subject: `Novo orçamento — ${design_nome} (${contacto.nome})`,
        html,
      });
    } catch (e) {
      console.error('[pedido-orcamento] erro Resend:', e);
    }
  }

  // Se o insert falhou E não há chave Resend (email também não foi enviado), falhar explicitamente
  if (!pedidoId && !resendKey) {
    return NextResponse.json(
      { error: 'Serviço temporariamente indisponível. Por favor tenta mais tarde.' },
      { status: 503 }
    );
  }

  return NextResponse.json({ ok: true, id: pedidoId });
}
