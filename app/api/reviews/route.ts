import { createClient } from '@/lib/supabase/server';
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// GET — reviews aprovadas (para homepage)
export async function GET() {
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data } = await admin
    .from('prod_reviews')
    .select('id, user_name, avaliacao, comentario, created_at')
    .eq('aprovado', true)
    .order('created_at', { ascending: false })
    .limit(12);

  return NextResponse.json(data ?? []);
}

// POST — criar review (utilizador autenticado)
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const { avaliacao, comentario, user_name } = await request.json();
  if (!avaliacao || avaliacao < 1 || avaliacao > 5) {
    return NextResponse.json({ error: 'Avaliação inválida.' }, { status: 400 });
  }

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // Auto-aprovar se ≥ 4 estrelas
  const aprovado = avaliacao >= 4;

  const { error } = await admin.from('prod_reviews').insert({
    user_id:   user.id,
    user_name: (user_name?.trim() || 'Utilizador'),
    avaliacao,
    comentario: comentario?.trim().slice(0, 300) || null,
    aprovado,
  });

  if (error) return NextResponse.json({ error: 'Erro ao guardar review.' }, { status: 500 });
  return NextResponse.json({ ok: true, aprovado });
}
