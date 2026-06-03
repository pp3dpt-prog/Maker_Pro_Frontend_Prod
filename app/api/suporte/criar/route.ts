import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { assunto, mensagem, prioridade } = await request.json();
  if (!assunto?.trim() || !mensagem?.trim()) {
    return NextResponse.json({ error: 'Assunto e mensagem são obrigatórios.' }, { status: 400 });
  }

  const { data, error } = await supabase
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
    console.error('[suporte/criar]', error);
    return NextResponse.json({ error: 'Erro ao criar ticket.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, id: data.id });
}
