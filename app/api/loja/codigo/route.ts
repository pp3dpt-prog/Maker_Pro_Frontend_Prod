// Valida um código da loja (sem o consumir) para o checkout mostrar o efeito antes de finalizar.
// O uso só é contado em /api/loja/checkout, de forma atómica.
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const codigo = typeof body.codigo === 'string' ? body.codigo.trim().toUpperCase() : '';
  if (!codigo || codigo.length > 40) return NextResponse.json({ valido: false }, { status: 400 });

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await admin
    .from('prod_cupons')
    .select('codigo, tipo, desconto_percent, valor_cents, ativo, validade, max_usos, usos_atuais')
    .ilike('codigo', codigo.replace(/[%_\\]/g, '\\$&'))
    .maybeSingle();

  const valido = !error && !!data && data.ativo
    && (!data.validade || new Date(data.validade) > new Date())
    && (data.max_usos == null || (data.usos_atuais ?? 0) < data.max_usos);

  if (!valido) return NextResponse.json({ valido: false });
  if (data!.tipo !== 'desconto' && data!.tipo !== 'sem_pagamento') {
    return NextResponse.json({ valido: false, mensagem: 'Este código resgata-se na tua conta (Dashboard → Tens um código?).' });
  }
  return NextResponse.json({
    valido: true,
    codigo: data!.codigo,
    tipo: data!.tipo === 'sem_pagamento' ? 'sem_pagamento' : 'desconto',
    desconto_percent: data!.desconto_percent ?? 0,
    valor_cents: data!.valor_cents ?? null,
  });
}
