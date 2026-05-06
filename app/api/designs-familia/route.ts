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
    const { data, error } = await supabase
      .from('prod_designs')
      .select('id, nome, familia')
      .eq('familia', familia)
      .order('nome', { ascending: true });

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
