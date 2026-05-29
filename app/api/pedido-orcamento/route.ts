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
  stl_url?: string | null;
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
    user_id, stl_url, contacto, morada_faturacao, morada_envio, mesma_morada, notas,
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

  // Inserir em Supabase usando sempre service role para contornar RLS
  let pedidoId: string | null = null;
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      console.error('[pedido-orcamento] variáveis SUPABASE em falta');
    } else {
      const admin = createAdmin(supabaseUrl, serviceKey);

      const basePayload = {
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

      // Tenta com stl_url (requer migração SQL). Se a coluna não existir ainda, tenta sem ela.
      let result = await admin
        .from('prod_pedidos_orcamento')
        .insert({ ...basePayload, stl_url: stl_url || null })
        .select('id')
        .maybeSingle();

      if (result.error?.message?.includes('stl_url')) {
        // Coluna stl_url ainda não existe — inserir sem ela
        console.warn('[pedido-orcamento] stl_url column missing, retrying without it');
        result = await admin
          .from('prod_pedidos_orcamento')
          .insert(basePayload)
          .select('id')
          .maybeSingle();
      }

      if (!result.error && result.data?.id) {
        pedidoId = result.data.id;
      } else if (result.error) {
        console.error('[pedido-orcamento] insert falhou:', result.error);
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

          <h3 style="margin:24px 0 8px">Ficheiro STL</h3>
          ${stl_url
            ? `<p style="margin:0;color:#16a34a;font-weight:600">&#128206; Ficheiro STL anexado.</p>`
            : `<p style="margin:0;color:#b45309;font-weight:600">&#9888;&#65039; Nenhum ficheiro STL foi gerado antes de submeter o pedido.</p>`
          }

          <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0"/>
          <p style="margin:0;font-size:12px;color:#94a3b8">design_id: ${escapeHtml(design_id)} • user_id: ${escapeHtml(user_id || 'anónimo')}</p>
        </div>
      `;

      // Tentar buscar e anexar o STL (best-effort — não bloqueia o envio se falhar)
      type Attachment = { filename: string; content: Buffer };
      const attachments: Attachment[] = [];
      if (stl_url && stl_url.startsWith('https://')) {
        try {
          const stlRes = await fetch(stl_url);
          if (stlRes.ok) {
            const buf = await stlRes.arrayBuffer();
            // Resend tem limite de 40 MB por email
            if (buf.byteLength < 40 * 1024 * 1024) {
              const safeName = design_nome.replace(/[^a-zA-Z0-9_-]/g, '_');
              attachments.push({ filename: `${safeName}.stl`, content: Buffer.from(buf) });
            }
          }
        } catch (e) {
          console.error('[pedido-orcamento] erro ao buscar STL para anexo:', e);
        }
      }

      await resend.emails.send({
        from: fromEmail,
        to: adminEmail,
        replyTo: contacto.email,
        subject: `Novo orçamento — ${design_nome} (${contacto.nome})`,
        html,
        ...(attachments.length > 0 && { attachments }),
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
