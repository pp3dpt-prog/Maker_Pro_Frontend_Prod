// Resgata um código na conta do utilizador (downloads gratuitos, plano por N dias…).
// Os códigos de loja (desconto / sem pagamento) usam-se no checkout, não aqui.
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, erro: 'Inicia sessão para usar o código.' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const codigo = typeof body.codigo === 'string' ? body.codigo.trim().toUpperCase() : '';
  if (!codigo || codigo.length > 40) return NextResponse.json({ ok: false, erro: 'Indica um código.' }, { status: 400 });

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await admin.rpc('resgatar_codigo', { p_codigo: codigo, p_user: user.id });
  if (error) {
    console.error('[codigos/resgatar]', error);
    return NextResponse.json({ ok: false, erro: 'Não foi possível usar o código.' }, { status: 500 });
  }
  const r = data as { ok: boolean; erro?: string; mensagem?: string };
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
