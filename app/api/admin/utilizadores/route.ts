// Admin: procurar utilizadores por email e alterar o tipo_utilizador (persona).
// Única forma de atribuir 'revendedor' — não é escolhível em /bem-vindo.
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

const TIPOS_VALIDOS = ['consumidor', 'maker', 'ambos', 'revendedor', null] as const;

async function getAdminOrResponse() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ error: 'Não autenticado.' }, { status: 401 }) };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createAdmin(supabaseUrl, serviceKey);

  const adminEmail = process.env.ADMIN_EMAIL;
  const emailMatch = adminEmail && user.email === adminEmail;
  if (!emailMatch) {
    const { data } = await admin.from('prod_perfis').select('role').eq('id', user.id).maybeSingle();
    if (data?.role !== 'admin') return { error: NextResponse.json({ error: 'Acesso negado.' }, { status: 403 }) };
  }
  return { admin };
}

export async function GET(req: NextRequest) {
  const { admin, error } = await getAdminOrResponse();
  if (error) return error;

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? '';
  let query = admin!
    .from('prod_perfis')
    .select('id, email, role, tipo_utilizador, plano, created_at')
    .order('created_at', { ascending: false })
    .limit(50);
  if (q) query = query.ilike('email', `%${q}%`);

  const { data, error: dbError } = await query;
  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ utilizadores: data ?? [] });
}

export async function PATCH(req: NextRequest) {
  const { admin, error } = await getAdminOrResponse();
  if (error) return error;

  let body: { user_id?: string; tipo_utilizador?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
  }

  const { user_id, tipo_utilizador } = body;
  if (!user_id) return NextResponse.json({ error: 'user_id em falta.' }, { status: 400 });
  if (!TIPOS_VALIDOS.includes(tipo_utilizador as any)) {
    return NextResponse.json({ error: 'tipo_utilizador inválido.' }, { status: 400 });
  }

  const { error: dbError } = await admin!
    .from('prod_perfis')
    .update({ tipo_utilizador })
    .eq('id', user_id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
