import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ isAdmin: false });

  // Verificação 1: ADMIN_EMAIL env var
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.email?.toLowerCase().trim() === adminEmail.toLowerCase().trim()) {
    return NextResponse.json({ isAdmin: true });
  }

  // Verificação 2: role na BD via service role (bypassa RLS)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceKey) {
    const adminClient = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey);
    const { data: perfil } = await adminClient
      .from('prod_perfis')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (perfil?.role === 'admin') return NextResponse.json({ isAdmin: true });
  }

  return NextResponse.json({ isAdmin: false });
}
