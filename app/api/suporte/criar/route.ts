import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { assunto, mensagem, prioridade } = await request.json();
  if (!assunto?.trim() || !mensagem?.trim()) {
    return NextResponse.json({ error: 'Assunto e mensagem são obrigatórios.' }, { status: 400 });
  }

  // Usar service role para bypass de RLS
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await admin
    .from('prod_tickets_suporte')
    .insert({
      user_id:    user.id,
      user_email: user.email,
      assunto:    assunto.trim(),
      mensagem:   mensagem.trim(),
      prioridade: prioridade ?? 'media',
      status:     'aberto',
    })
    .select('id')
    .single();

  if (error) {
    console.error('[suporte/criar]', error.message, error.details);
    return NextResponse.json({ error: `Erro ao criar ticket: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
