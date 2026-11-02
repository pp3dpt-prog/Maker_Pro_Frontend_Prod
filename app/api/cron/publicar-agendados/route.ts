// Publica posts de marketing agendados cuja hora já passou.
// Chamado SÓ pelo cron-job.org de 30 em 30 min, com o cabeçalho 'x-cron-secret: <CRON_SECRET>'
// (também aceita 'Authorization: Bearer <CRON_SECRET>'). Não está no vercel.json de propósito:
// no plano Hobby esse cron dispara a qualquer minuto da hora e podia coincidir com o externo
// e publicar o mesmo post duas vezes. Não correr com intervalo inferior a ~30 min.
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { publicarPostMarketing } from '@/lib/marketing-publish';

export const runtime = 'nodejs';
// O Instagram pode demorar alguns segundos a processar cada imagem.
export const maxDuration = 60;

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
