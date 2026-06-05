import { createClient } from '@supabase/supabase-js';

// Detector de abuso simples baseado em contagem de logs recentes.
// Conta acções de um identificador (email ou IP) numa janela de tempo.

let _admin: ReturnType<typeof createClient> | null = null;
function getAdmin() {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _admin = createClient(url, key);
  return _admin;
}

/**
 * Conta quantas vezes um identificador fez uma acção (categoria) na janela.
 * Devolve { bloqueado, total }.
 */
export async function verificarAbuso(
  identificador: string,
  categoria: string,
  max: number,
  janelaSegundos: number
): Promise<{ bloqueado: boolean; total: number }> {
  try {
    const admin = getAdmin();
    if (!admin) return { bloqueado: false, total: 0 };

    const desde = new Date(Date.now() - janelaSegundos * 1000).toISOString();
    const { count } = await admin
      .from('prod_logs')
      .select('id', { count: 'exact', head: true })
      .eq('categoria', categoria)
      .eq('user_email', identificador)
      .gte('created_at', desde);

    const total = count ?? 0;
    return { bloqueado: total >= max, total };
  } catch {
    return { bloqueado: false, total: 0 };
  }
}

/** Extrai um identificador do request: IP do header x-forwarded-for. */
export function getIP(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'desconhecido';
}

/**
 * Envia alerta por email ao admin quando há abuso grave.
 * Só dispara se houver > 20 bloqueios/min deste identificador,
 * e no máximo 1 email por hora por identificador (anti-spam).
 */
export async function alertarSeguranca(identificador: string, tipo: string): Promise<void> {
  try {
    const admin = getAdmin();
    if (!admin) return;

    // Quantos bloqueios este identificador teve no último minuto?
    const desde1min = new Date(Date.now() - 60 * 1000).toISOString();
    const { count: bloqueios } = await admin
      .from('prod_logs')
      .select('id', { count: 'exact', head: true })
      .eq('categoria', 'seguranca')
      .eq('user_email', identificador)
      .gte('created_at', desde1min);

    if ((bloqueios ?? 0) <= 20) return; // ainda não é grave o suficiente

    // Já enviámos alerta para este identificador na última hora?
    const desde1h = new Date(Date.now() - 3600 * 1000).toISOString();
    const { count: alertas } = await admin
      .from('prod_logs')
      .select('id', { count: 'exact', head: true })
      .eq('categoria', 'alerta_enviado')
      .eq('user_email', identificador)
      .gte('created_at', desde1h);

    if ((alertas ?? 0) > 0) return; // já avisado nesta hora

    // Enviar email
    const resendKey = process.env.RESEND_API_KEY;
    const adminEmail = process.env.PEDIDOS_ADMIN_EMAIL || 'pp3d.pt@gmail.com';
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://pp3d.pt';

    if (resendKey) {
      const { Resend } = await import('resend');
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: 'PP3D Segurança <onboarding@resend.dev>',
        to: adminEmail,
        subject: `🛡️ Alerta de abuso — ${identificador}`,
        html: `
          <div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;background:#080c10;color:#f1f5f9;padding:28px;border-radius:14px">
            <div style="font-size:40px;margin-bottom:8px">🛡️</div>
            <h2 style="margin:0 0 12px;font-size:20px">Possível abuso detectado</h2>
            <p style="margin:0 0 16px;color:#94a3b8;font-size:14px">
              Foram detectados <strong style="color:#fca5a5">${bloqueios} bloqueios no último minuto</strong>
              do tipo <strong>${tipo}</strong>.
            </p>
            <div style="background:#0f172a;border:1px solid #1e293b;border-radius:10px;padding:14px 18px;margin-bottom:20px">
              <p style="margin:0;font-size:13px;color:#cbd5e1">Origem: <strong style="color:#f1f5f9">${identificador}</strong></p>
            </div>
            <a href="${siteUrl}/admin" style="display:inline-block;padding:12px 24px;background:#1d4ed8;color:#fff;border-radius:10px;text-decoration:none;font-weight:700;font-size:14px">
              Ver logs no Admin →
            </a>
            <p style="margin:16px 0 0;font-size:11px;color:#475569">Não receberás novo alerta sobre esta origem na próxima hora.</p>
          </div>
        `,
      });
    }

    // Registar que o alerta foi enviado (para o anti-spam)
    await admin.from('prod_logs').insert({
      level: 'warn',
      categoria: 'alerta_enviado',
      mensagem: `Alerta de abuso enviado (${bloqueios} bloqueios/min, ${tipo})`,
      user_email: identificador,
      contexto: { bloqueios, tipo },
    });
  } catch {
    /* nunca quebra o fluxo */
  }
}
