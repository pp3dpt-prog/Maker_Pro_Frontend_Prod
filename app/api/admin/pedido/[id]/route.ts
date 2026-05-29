import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

async function isAdmin(supabaseUrl: string, serviceKey: string, userId: string): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL;
  // Check ADMIN_EMAIL env shortcut first (resolved via session user)
  // We'll check role in DB
  const admin = createAdmin(supabaseUrl, serviceKey);
  const { data } = await admin
    .from('prod_perfis')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  return data?.role === 'admin';
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  // Allow if ADMIN_EMAIL matches or role = 'admin'
  const adminEmail = process.env.ADMIN_EMAIL;
  const emailMatch = adminEmail && user.email === adminEmail;
  if (!emailMatch) {
    const ok = await isAdmin(supabaseUrl, serviceKey, user.id);
    if (!ok) return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  const adminClient = createAdmin(supabaseUrl, serviceKey);
  const { data: pedido, error } = await adminClient
    .from('prod_pedidos_orcamento')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !pedido) {
    return NextResponse.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  }

  return NextResponse.json({ pedido });
}
