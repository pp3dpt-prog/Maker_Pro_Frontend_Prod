// Cron horário — publica posts de marketing agendados cuja hora já passou.
// Configurado em vercel.json.
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { publicarPostMarketing } from '@/lib/marketing-publish';

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

  const { data: pendentes } = await admin
    .from('prod_marketing_posts')
    .select('id')
    .eq('estado', 'agendado')
    .lte('agendado_para', new Date().toISOString());

  const resultados = [];
  for (const p of pendentes ?? []) {
    const r = await publicarPostMarketing(admin, p.id);
    resultados.push({ id: p.id, ok: r.ok, error: r.ok ? undefined : r.error });
  }

  return NextResponse.json({ ok: true, processados: resultados.length, resultados });
}
