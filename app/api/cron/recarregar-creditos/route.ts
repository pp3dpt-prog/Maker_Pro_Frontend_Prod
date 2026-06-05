// Cron mensal — renova os downloads de cada utilizador para a quota do seu plano.
// Modelo: renovar a zero (downloads não usados perdem-se).
// Configurado em vercel.json: "0 9 1 * *" (dia 1 de cada mês às 9h).

import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  // Vercel cron envia Authorization: Bearer <CRON_SECRET>
  const authHeader = req.headers.get('authorization');
  const okSecret = secret === process.env.CRON_SECRET
    || authHeader === `Bearer ${process.env.CRON_SECRET}`;
  if (!okSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Buscar todos os planos e respectivas quotas
  const { data: planos } = await admin
    .from('prod_planos')
    .select('id, nome, limite_downloads');

  if (!planos?.length) {
    return NextResponse.json({ ok: true, mensagem: 'Sem planos.' });
  }

  let totalAtualizados = 0;
  const detalhes: Record<string, number> = {};

  // Para cada plano, renovar todos os perfis com esse plano à quota base
  for (const plano of planos) {
    const { data, error } = await admin
      .from('prod_perfis')
      .update({ downloads_limite: plano.limite_downloads, downloads_mes: 0 })
      .eq('plano_id', plano.id)
      .select('id');

    if (!error && data) {
      totalAtualizados += data.length;
      detalhes[plano.nome] = data.length;
    }
  }

  return NextResponse.json({ ok: true, totalAtualizados, detalhes });
}
