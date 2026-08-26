// Cria um post de marketing (rascunho ou agendado). Não publica nada — só grava.
// Publicar é sempre uma ação separada (publicar-agora, ou o cron de agendados).
import { createClient as createAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: 'Não autenticado.' };

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.email?.toLowerCase().trim() === adminEmail.toLowerCase().trim()) {
    return { ok: true as const, userId: user.id };
  }
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: perfil } = await admin.from('prod_perfis').select('role').eq('id', user.id).maybeSingle();
  if (perfil?.role === 'admin') return { ok: true as const, userId: user.id };
  return { ok: false as const, status: 403, error: 'Sem permissão.' };
}

export async function POST(request: Request) {
  const guard = await assertAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { produto_id, legenda, imagens, canal, agendado_para } = await request.json();

  if (!legenda || !Array.isArray(imagens) || imagens.length === 0 || !canal) {
    return NextResponse.json({ error: 'legenda, imagens e canal são obrigatórios.' }, { status: 400 });
  }
  if (!['instagram', 'facebook', 'ambos'].includes(canal)) {
    return NextResponse.json({ error: 'canal inválido.' }, { status: 400 });
  }

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await admin
    .from('prod_marketing_posts')
    .insert([{
      produto_id: produto_id ?? null,
      legenda,
      imagens,
      canal,
      estado: agendado_para ? 'agendado' : 'rascunho',
      agendado_para: agendado_para ?? null,
      criado_por: guard.userId,
    }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, post: data });
}
