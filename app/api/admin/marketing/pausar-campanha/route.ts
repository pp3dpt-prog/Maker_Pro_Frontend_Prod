// Pausa uma campanha ativa (para de gastar). Sem confirmação extra — pausar é
// sempre seguro, ao contrário de ativar.
import { createClient as createAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { pausarCampanha, MetaApiError } from '@/lib/meta';

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: 'Não autenticado.' };

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.email?.toLowerCase().trim() === adminEmail.toLowerCase().trim()) {
    return { ok: true as const };
  }
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: perfil } = await admin.from('prod_perfis').select('role').eq('id', user.id).maybeSingle();
  if (perfil?.role === 'admin') return { ok: true as const };
  return { ok: false as const, status: 403, error: 'Sem permissão.' };
}

export async function POST(request: Request) {
  const guard = await assertAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { ad_id } = await request.json();
  if (!ad_id) return NextResponse.json({ error: 'ad_id em falta.' }, { status: 400 });

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: ad } = await admin.from('prod_marketing_ads').select('*').eq('id', ad_id).maybeSingle();
  if (!ad) return NextResponse.json({ error: 'Campanha não encontrada.' }, { status: 404 });
  if (!ad.meta_campaign_id) return NextResponse.json({ error: 'Campanha sem id da Meta.' }, { status: 400 });

  try {
    await pausarCampanha(ad.meta_campaign_id);
  } catch (e) {
    const msg = e instanceof MetaApiError ? e.message : 'Erro ao pausar campanha.';
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const { data: atualizado } = await admin
    .from('prod_marketing_ads')
    .update({ estado: 'pausada', updated_at: new Date().toISOString() })
    .eq('id', ad_id)
    .select()
    .single();

  return NextResponse.json({ ok: true, ad: atualizado });
}
