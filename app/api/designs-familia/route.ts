import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const familia = searchParams.get('familia');

    if (!familia) {
      return Response.json(
        { error: 'Família não especificada' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verificar se é admin (DB role ou ADMIN_EMAIL env var)
    const { data: { user } } = await supabase.auth.getUser();
    let isAdmin = false;
    if (user) {
      const adminEmail = process.env.ADMIN_EMAIL;
      if (adminEmail && user.email?.toLowerCase().trim() === adminEmail.toLowerCase().trim()) {
        isAdmin = true;
      } else {
        const { data: perfil } = await supabase
          .from('prod_perfis').select('role').eq('id', user.id).maybeSingle();
        isAdmin = perfil?.role === 'admin';
      }
    }

    let query = supabase
      .from('prod_designs')
      .select('id, nome, familia')
      .eq('familia', familia)
      .order('nome', { ascending: true });

    // Admin vê todos os estados — utilizadores normais só veem activos
    if (!isAdmin) {
      query = query.eq('estado', 'ativo');
    }

    const { data, error } = await query;

    if (error) {
      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return Response.json(data || []);
  } catch (err) {
    console.error('Erro ao buscar designs da família:', err);
    return Response.json(
      { error: 'Erro ao buscar designs' },
      { status: 500 }
    );
  }
}
