import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Chamado automaticamente pelo Vercel Cron no 1º dia de cada mês.
// Protegido por CRON_SECRET para evitar chamadas externas.
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Buscar todos os planos gratuitos com recarga
  const { data: planos } = await supabase
    .from('prod_planos')
    .select('id, recarga_creditos_mensal')
    .eq('gratuito', true)
    .gt('recarga_creditos_mensal', 0);

  if (!planos || planos.length === 0) {
    return NextResponse.json({ message: 'Nenhum plano gratuito com recarga.', atualizados: 0 });
  }

  const planoIds = planos.map(p => p.id);

  // Para cada utilizador no plano gratuito, adicionar os créditos
  let totalAtualizados = 0;
  for (const plano of planos) {
    const { data: perfis } = await supabase
      .from('prod_perfis')
      .select('id, creditos')
      .eq('plano_id', plano.id);

    if (!perfis || perfis.length === 0) continue;

    for (const perfil of perfis) {
      await supabase
        .from('prod_perfis')
        .update({ creditos: (perfil.creditos ?? 0) + plano.recarga_creditos_mensal })
        .eq('id', perfil.id);
      totalAtualizados++;
    }
  }

  console.log(`Recarga mensal: ${totalAtualizados} utilizadores atualizados.`);
  return NextResponse.json({ success: true, atualizados: totalAtualizados, planos: planoIds });
}
