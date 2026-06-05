import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

export async function POST() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Buscar o plano gratuito para obter id, tier e quota
  const { data: planoFree } = await admin
    .from('prod_planos')
    .select('id, tier, limite_downloads')
    .eq('gratuito', true)
    .maybeSingle();

  const tier   = planoFree?.tier ?? 'gratuito';
  const limite = planoFree?.limite_downloads ?? 3;

  const { error } = await admin
    .from('prod_perfis')
    .update({
      plano:            tier,
      plano_id:         planoFree?.id ?? null,
      downloads_mes:    0,
      downloads_limite: limite,
    })
    .eq('id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
