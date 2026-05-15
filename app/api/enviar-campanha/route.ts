import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  const { campanha_id } = await request.json();

  if (!campanha_id) {
    return NextResponse.json({ error: 'campanha_id obrigatório' }, { status: 400 });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY não configurado' }, { status: 500 });
  }

  const supabase = await createClient();

  // Verificar que quem chama é admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  const { data: perfil } = await supabase.from('prod_perfis').select('role').eq('id', user.id).maybeSingle();
  if (perfil?.role !== 'admin') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  // Buscar dados da campanha
  const { data: campanha, error: campErr } = await supabase
    .from('prod_campanhas')
    .select('*')
    .eq('id', campanha_id)
    .single();

  if (campErr || !campanha) {
    return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 });
  }

  // Buscar todos os emails dos utilizadores via admin API (service role)
  const adminClient = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: { users }, error: usersErr } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
  if (usersErr) {
    return NextResponse.json({ error: 'Erro ao buscar utilizadores' }, { status: 500 });
  }

  const emails = users.map(u => u.email).filter((e): e is string => Boolean(e));
  if (emails.length === 0) {
    return NextResponse.json({ error: 'Nenhum destinatário encontrado' }, { status: 400 });
  }

  const resend = new Resend(resendKey);
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'MakerPro <onboarding@resend.dev>';

  const html = `
    <!DOCTYPE html>
    <html>
    <body style="margin:0;padding:0;background:#0f0f1e;font-family:sans-serif;color:#f1f5f9;">
      <div style="max-width:600px;margin:40px auto;background:#16162d;border-radius:16px;padding:40px;border:1px solid rgba(255,255,255,0.08);">
        <div style="margin-bottom:24px;">
          <span style="color:#6366f1;font-weight:900;font-size:20px;font-style:italic;letter-spacing:-0.03em;">MAKERPRO</span>
        </div>
        <h1 style="color:#f1f5f9;font-size:24px;font-weight:900;margin:0 0 16px;letter-spacing:-0.03em;">${campanha.titulo}</h1>
        <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 32px;">${(campanha.conteudo ?? '').replace(/\n/g, '<br>')}</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? 'https://makerpro.pt'}" style="display:inline-block;background:#6366f1;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px;">Ver na plataforma</a>
        <p style="color:#334155;font-size:12px;margin-top:32px;">Recebeste este email porque tens conta no MakerPro.</p>
      </div>
    </body>
    </html>
  `;

  // Enviar em lotes de 50 para não exceder rate limits
  const batchSize = 50;
  let enviados = 0;

  for (let i = 0; i < emails.length; i += batchSize) {
    const lote = emails.slice(i, i + batchSize);
    await Promise.all(
      lote.map(email =>
        resend.emails.send({
          from: fromEmail,
          to: email,
          subject: campanha.titulo,
          html,
        })
      )
    );
    enviados += lote.length;
  }

  return NextResponse.json({ success: true, enviados });
}
