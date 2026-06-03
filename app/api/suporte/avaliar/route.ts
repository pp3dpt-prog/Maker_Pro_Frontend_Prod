import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { ticket_id, avaliacao } = await request.json();
  if (!ticket_id || !avaliacao || avaliacao < 1 || avaliacao > 5) {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
  }

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // Verificar que o ticket pertence ao utilizador
  const { data: ticket } = await admin
    .from('prod_tickets_suporte')
    .select('user_id, status')
    .eq('id', ticket_id)
    .maybeSingle();

  if (!ticket || ticket.user_id !== user.id) {
    return NextResponse.json({ error: 'Ticket não encontrado.' }, { status: 404 });
  }

  const { error } = await admin
    .from('prod_tickets_suporte')
    .update({ avaliacao })
    .eq('id', ticket_id);

  if (error) return NextResponse.json({ error: 'Erro ao guardar avaliação.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
