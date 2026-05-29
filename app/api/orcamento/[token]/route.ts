import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdmin } from '@supabase/supabase-js';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Configuração do servidor em falta.' }, { status: 500 });
  }

  const admin = createAdmin(supabaseUrl, serviceKey);

  const { data, error } = await admin
    .from('prod_pedidos_orcamento')
    .select('design_nome, familia, preco_estimado, prazo_entrega_dias, notas_orcamento, estado, token_expira_em, contacto_nome')
    .eq('token_resposta', token)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'Token inválido ou não encontrado.' }, { status: 404 });
  }

  return NextResponse.json(data);
}
