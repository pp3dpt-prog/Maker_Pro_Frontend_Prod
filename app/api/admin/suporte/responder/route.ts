import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  // Verificar admin
  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdminByEmail = adminEmail && user.email?.toLowerCase() === adminEmail.toLowerCase();
  if (!isAdminByEmail) {
    const { data: perfil } = await supabase.from('prod_perfis').select('role').eq('id', user.id).maybeSingle();
    if (perfil?.role !== 'admin') return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const { ticket_id, resposta } = await request.json();
  if (!ticket_id || !resposta?.trim()) {
    return NextResponse.json({ error: 'ticket_id e resposta são obrigatórios.' }, { status: 400 });
  }

  const adminClient = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Buscar ticket
  const { data: ticket, error: fetchErr } = await adminClient
    .from('prod_tickets_suporte')
    .select('*')
    .eq('id', ticket_id)
    .maybeSingle();

  if (fetchErr || !ticket) return NextResponse.json({ error: 'Ticket não encontrado.' }, { status: 404 });

  // Guardar resposta
  const { error: updateErr } = await adminClient
    .from('prod_tickets_suporte')
    .update({ resposta: resposta.trim(), respondido_em: new Date().toISOString(), status: 'fechado' })
    .eq('id', ticket_id);

  if (updateErr) return NextResponse.json({ error: 'Erro ao guardar resposta.' }, { status: 500 });

  // Enviar email ao utilizador
  const resendKey = process.env.RESEND_API_KEY;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://maker-pro-frontend-prod.vercel.app';

  if (resendKey && ticket.user_email) {
    try {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: 'PP3D <onboarding@resend.dev>',
        to: process.env.PEDIDOS_ADMIN_EMAIL || 'pp3d.pt@gmail.com', // sandbox fallback
        replyTo: ticket.user_email,
        subject: `[Suporte PP3D] Resposta ao teu pedido: ${ticket.assunto}`,
        html: `
          <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#080c10;color:#f1f5f9;padding:32px;border-radius:16px">
            <h2 style="margin:0 0 8px;font-size:22px">Resposta ao teu pedido de suporte</h2>
            <p style="color:#64748b;margin:0 0 24px;font-size:14px">Assunto: <strong style="color:#f1f5f9">${ticket.assunto}</strong></p>

            <div style="background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:20px;margin-bottom:24px">
              <p style="margin:0 0 6px;font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.08em">A tua mensagem</p>
              <p style="margin:0;font-size:14px;color:#94a3b8;white-space:pre-wrap">${ticket.mensagem}</p>
            </div>

            <div style="background:#1e3a5f;border:1px solid #1d4ed820;border-radius:12px;padding:20px;margin-bottom:24px">
              <p style="margin:0 0 6px;font-size:11px;color:#93c5fd;text-transform:uppercase;letter-spacing:.08em">Resposta da PP3D</p>
              <p style="margin:0;font-size:15px;color:#f1f5f9;white-space:pre-wrap">${resposta.trim()}</p>
            </div>

            <a href="${siteUrl}/dashboard" style="display:inline-block;padding:14px 28px;background:#1d4ed8;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">
              Ver no Dashboard →
            </a>

            <p style="margin:24px 0 0;font-size:12px;color:#475569">Podes responder a este email ou abrir um novo pedido no dashboard.</p>
          </div>
        `,
      });
    } catch (e) {
      console.error('[suporte/responder] erro email:', e);
    }
  }

  return NextResponse.json({ ok: true });
}
