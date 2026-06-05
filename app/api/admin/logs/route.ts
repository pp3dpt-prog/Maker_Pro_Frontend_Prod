import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.email?.toLowerCase() === adminEmail.toLowerCase()) return true;
  const { data: perfil } = await supabase.from('prod_perfis').select('role').eq('id', user.id).maybeSingle();
  return perfil?.role === 'admin';
}

export async function GET(request: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const dia   = searchParams.get('dia');   // YYYY-MM-DD
  const level = searchParams.get('level');  // info|warn|error

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  let query = admin
    .from('prod_logs')
    .select('id, created_at, level, categoria, mensagem, contexto, user_email')
    .order('created_at', { ascending: false })
    .limit(500);

  if (dia) {
    const inicio = `${dia}T00:00:00.000Z`;
    const fim    = `${dia}T23:59:59.999Z`;
    query = query.gte('created_at', inicio).lte('created_at', fim);
  }
  if (level) query = query.eq('level', level);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Dias disponíveis (últimos 15) para o selector
  const { data: dias } = await admin
    .from('prod_logs')
    .select('created_at')
    .order('created_at', { ascending: false })
    .limit(2000);
  const diasUnicos = [...new Set((dias ?? []).map(d => (d.created_at as string).slice(0, 10)))];

  return NextResponse.json({ logs: data ?? [], dias: diasUnicos });
}
