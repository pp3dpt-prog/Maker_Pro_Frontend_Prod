// Cron diário — elimina logs com mais de 15 dias.
// Configurado em vercel.json: "0 4 * * *" (4h todos os dias).

import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const admin = createAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') ?? req.nextUrl.searchParams.get('secret');
  const authHeader = req.headers.get('authorization');
  const ok = secret === process.env.CRON_SECRET || authHeader === `Bearer ${process.env.CRON_SECRET}`;
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limite = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await admin
    .from('prod_logs')
    .delete()
    .lt('created_at', limite)
    .select('id');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, eliminados: data?.length ?? 0 });
}
