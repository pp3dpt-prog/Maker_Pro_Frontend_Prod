import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient as createAdmin } from '@supabase/supabase-js';

interface Body {
  tipo_interesse: 'vender' | 'publicidade' | 'ambos';
  empresa: string;
  nome_contacto: string;
  email: string;
  telefone: string;
  cidade: string;
  mensagem: string;
  produto_slug: string | null;
  produto_nome: string | null;
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
    tipo_interesse, empresa, nome_contacto, email, telefone, cidade, mensagem,
    produto_slug, produto_nome,
  } = body || ({} as Body);

  if (!empresa?.trim() || !nome_contacto?.trim() || !email?.trim()) {
    return NextResponse.json({ error: 'Preenche empresa, nome de contacto e email.' }, { status: 400 });
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Serviço temporariamente indisponível. Por favor tenta mais tarde.' }, { status: 503 });
  }
  const admin = createAdmin(supabaseUrl, serviceKey);

  // Anti-spam simples: no máximo 3 candidaturas do mesmo email por hora.
  const umaHoraAtras = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from('prod_parceiros_candidaturas')
    .select('*', { count: 'exact', head: true })
    .eq('email', email.trim().toLowerCase())
    .gte('created_at', umaHoraAtras);
  if ((count ?? 0) >= 3) {
    return NextResponse.json({ error: 'Já recebemos vários pedidos teus recentemente. Tenta novamente mais tarde.' }, { status: 429 });
  }

  const payload = {
    tipo_interesse: ['vender', 'publicidade', 'ambos'].includes(tipo_interesse) ? tipo_interesse : 'vender',
    empresa: empresa.trim(),
    nome_contacto: nome_contacto.trim(),
    email: email.trim().toLowerCase(),
    telefone: telefone?.trim() || null,
    cidade: cidade?.trim() || null,
    mensagem: mensagem?.trim() || null,
    produto_slug: produto_slug || null,
    produto_nome: produto_nome || null,
  };

  const { data, error } = await admin
    .from('prod_parceiros_candidaturas')
    .insert(payload)
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('[parceiros/candidatar] insert falhou:', error);
    return NextResponse.json({ error: 'Não foi possível submeter. Tenta novamente.' }, { status: 500 });
  }

  // Email para admin via Resend (best-effort — falha não bloqueia a resposta)
  const resendKey = process.env.RESEND_API_KEY;
  const adminEmail = process.env.PEDIDOS_ADMIN_EMAIL || process.env.RESEND_FROM_EMAIL_REPLY || 'pp3d.pt@gmail.com';
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'PP3D <onboarding@resend.dev>';

  if (resendKey) {
    try {
      const resend = new Resend(resendKey);
      const tipoLabel = { vender: 'Vender produtos', publicidade: 'Publicidade no site', ambos: 'Vender + Publicidade' }[payload.tipo_interesse];

      const html = `
        <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;padding:24px;color:#0f172a">
          <h2 style="margin:0 0 4px">🤝 Nova candidatura de parceiro</h2>
          <p style="margin:0 0 20px;color:#64748b">ID: ${escapeHtml(data?.id ?? '')}</p>

          <h3 style="margin:16px 0 8px">Empresa</h3>
          <p style="margin:0 0 8px"><strong>${escapeHtml(payload.empresa)}</strong>${payload.cidade ? ` — ${escapeHtml(payload.cidade)}` : ''}</p>
          <p style="margin:0 0 20px;color:#64748b">Interesse: <strong>${escapeHtml(tipoLabel)}</strong></p>

          <h3 style="margin:24px 0 8px">Contacto</h3>
          <p style="margin:0;line-height:1.7">
            <strong>${escapeHtml(payload.nome_contacto)}</strong><br/>
            Email: <a href="mailto:${escapeHtml(payload.email)}">${escapeHtml(payload.email)}</a><br/>
            ${payload.telefone ? `Telefone: ${escapeHtml(payload.telefone)}<br/>` : ''}
          </p>

          <h3 style="margin:24px 0 8px">Mensagem</h3>
          <p style="margin:0;white-space:pre-wrap;line-height:1.6">${payload.mensagem ? escapeHtml(payload.mensagem) : '<em style="color:#64748b">Sem mensagem</em>'}</p>

          <h3 style="margin:24px 0 8px">Produto de origem</h3>
          <p style="margin:0;color:#64748b">${payload.produto_nome ? escapeHtml(payload.produto_nome) : 'N/D'}</p>

          <hr style="margin:24px 0;border:none;border-top:1px solid #e2e8f0"/>
          <a href="https://pp3d.pt/admin/loja/parceiros/candidaturas" style="display:inline-block;padding:10px 20px;background:#1d4ed8;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
            Ver no admin →
          </a>
        </div>
      `;

      await resend.emails.send({
        from: fromEmail,
        to: adminEmail,
        replyTo: payload.email,
        subject: `Nova candidatura de parceiro — ${payload.empresa}`,
        html,
      });
    } catch (e) {
      console.error('[parceiros/candidatar] erro Resend:', e);
    }
  }

  return NextResponse.json({ ok: true, id: data?.id ?? null });
}
