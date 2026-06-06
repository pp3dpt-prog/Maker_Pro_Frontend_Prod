// Cron job diário — alertas de expiração de planos
// Configurado em vercel.json para correr às 9h todos os dias
// Protegido por CRON_SECRET para evitar chamadas não autorizadas

import { createClient as createAdmin } from '@supabase/supabase-js';
import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const admin  = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const resend = new Resend(process.env.RESEND_API_KEY!);
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://maker-pro-frontend-prod.vercel.app';

function emailAlerta(nome: string, plano: string, diasRestantes: number, expiresAt: string): string {
  const urgente  = diasRestantes <= 7;
  const cor      = urgente ? '#ef4444' : '#f59e0b';
  const emoji    = urgente ? '🚨' : '⏰';
  const dataFmt  = new Date(expiresAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' });

  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;background:#080c10;color:#f1f5f9;padding:0;border-radius:16px;overflow:hidden">
      <div style="background:linear-gradient(135deg,${urgente ? '#7f1d1d,#991b1b' : '#713f12,#92400e'});padding:40px 32px;text-align:center">
        <div style="font-size:48px;margin-bottom:12px">${emoji}</div>
        <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800">
          ${urgente ? 'O teu plano expira em breve!' : 'Lembrete: plano a expirar'}
        </h1>
      </div>
      <div style="padding:32px">
        <p style="color:#94a3b8;font-size:15px;margin:0 0 20px">
          Olá <strong style="color:#f1f5f9">${nome}</strong>,
        </p>
        <div style="background:#0f172a;border:1px solid ${cor}40;border-left:3px solid ${cor};border-radius:10px;padding:20px;margin-bottom:24px">
          <p style="margin:0 0 8px;font-size:13px;color:#94a3b8">Plano activo</p>
          <p style="margin:0;font-size:20px;font-weight:800;color:#f1f5f9">${plano}</p>
          <p style="margin:8px 0 0;font-size:13px;color:${cor};font-weight:600">
            Expira a ${dataFmt} — faltam <strong>${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}</strong>
          </p>
        </div>
        <p style="color:#94a3b8;font-size:14px;margin:0 0 28px;line-height:1.6">
          ${urgente
            ? 'Se não renovares, o teu acesso será reduzido ao plano gratuito e perderás os downloads disponíveis.'
            : 'Renova o teu plano para continuar a ter acesso ilimitado e não perderes os teus downloads.'
          }
        </p>
        <a href="${siteUrl}/pricing" style="display:block;text-align:center;padding:16px 32px;background:${urgente ? '#dc2626' : '#d97706'};color:#fff;border-radius:12px;text-decoration:none;font-weight:800;font-size:15px;margin-bottom:24px">
          Renovar plano agora →
        </a>
        <p style="text-align:center;font-size:12px;color:#475569;margin:0">
          Tens dúvidas? Responde a este email ou abre um ticket de suporte em <a href="${siteUrl}/dashboard" style="color:#3b82f6">PP3D.pt</a>
        </p>
      </div>
    </div>
  `;
}

export async function GET(req: NextRequest) {
  // Verificar secret para proteger o endpoint
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const hoje     = new Date();
  const em7dias  = new Date(hoje); em7dias.setDate(hoje.getDate() + 7);
  const em30dias = new Date(hoje); em30dias.setDate(hoje.getDate() + 30);

  // Buscar utilizadores com plano a expirar em 30 dias (aviso antecipado)
  // e em 7 dias (aviso urgente)
  // Excluir subscrições Stripe (renovam automaticamente — o Stripe gere).
  // Só avisa planos manuais (anual IfThenPay).
  const { data: perfis } = await admin
    .from('prod_perfis')
    .select('id, email, nome_completo, plano_valido_ate, prod_planos(nome)')
    .not('plano_valido_ate', 'is', null)
    .is('stripe_subscription_id', null)
    .eq('prod_planos.gratuito', false)
    .lte('plano_valido_ate', em30dias.toISOString())
    .gte('plano_valido_ate', hoje.toISOString());

  if (!perfis?.length) {
    return NextResponse.json({ ok: true, enviados: 0, mensagem: 'Nenhum plano a expirar hoje.' });
  }

  let enviados = 0;
  const adminEmail = process.env.PEDIDOS_ADMIN_EMAIL || 'pp3d.pt@gmail.com';

  for (const perfil of perfis) {
    const expiry       = new Date(perfil.plano_valido_ate);
    const diasRestantes = Math.ceil((expiry.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
    const planoNome    = (perfil.prod_planos as any)?.nome ?? 'Plano PP3D';
    const nome         = perfil.nome_completo || perfil.email?.split('@')[0] || 'utilizador';

    // Enviar apenas nos marcos: 30, 7 e 1 dia(s)
    if (![30, 7, 1].includes(diasRestantes)) continue;

    const destinatario = process.env.RESEND_FROM_EMAIL && !process.env.RESEND_FROM_EMAIL.includes('resend.dev')
      ? perfil.email
      : adminEmail; // sandbox: envia para admin

    try {
      await resend.emails.send({
        from:    'PP3D <onboarding@resend.dev>',
        to:      destinatario,
        replyTo: perfil.email,
        subject: diasRestantes <= 7
          ? `🚨 O teu plano ${planoNome} expira em ${diasRestantes} dia${diasRestantes !== 1 ? 's' : ''}!`
          : `⏰ Lembrete: o teu plano ${planoNome} expira em ${diasRestantes} dias`,
        html: emailAlerta(nome, planoNome, diasRestantes, perfil.plano_valido_ate),
      });
      enviados++;
    } catch (e) {
      console.error('[cron/planos-expiry] erro email para', perfil.email, e);
    }
  }

  // Expirar planos vencidos → downgrade para gratuito
  const { data: free } = await admin
    .from('prod_planos')
    .select('id, limite_downloads')
    .eq('gratuito', true)
    .single();

  if (free) {
    await admin
      .from('prod_perfis')
      .update({
        plano_id:              free.id,
        downloads_limite:      free.limite_downloads,
        stripe_subscription_id: null,
        plano_valido_ate:      null,
      })
      .lt('plano_valido_ate', hoje.toISOString())
      .is('stripe_subscription_id', null)  // não fazer downgrade a subscrições Stripe activas
      .not('plano_id', 'eq', free.id);
  }

  return NextResponse.json({ ok: true, enviados, total: perfis.length });
}
