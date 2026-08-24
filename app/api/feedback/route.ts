// Feedback público (homepage) — aberto a qualquer visitante, sem conta.
// Fica sempre 'pendente' até o admin rever em /admin/feedback.
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { verificarAbuso, getIP } from '@/lib/abuse';
import { logInfo, logWarn } from '@/lib/logger';

export async function POST(request: Request) {
  const ip = getIP(request);

  const { bloqueado } = await verificarAbuso(ip, 'feedback_publico', 5, 3600);
  if (bloqueado) {
    await logWarn('seguranca', 'Rate limit de feedback público atingido', { ip }, ip);
    return NextResponse.json({ error: 'Demasiados envios. Tenta novamente mais tarde.' }, { status: 429 });
  }

  const { nome, avaliacao, mensagem, contacto_metodo, contacto_valor, aceita_contacto } = await request.json();

  if (!mensagem?.trim()) return NextResponse.json({ error: 'Escreve a tua mensagem.' }, { status: 400 });
  if (mensagem.length > 1000) return NextResponse.json({ error: 'Mensagem demasiado longa.' }, { status: 400 });

  const metodo = contacto_metodo === 'email' || contacto_metodo === 'whatsapp' ? contacto_metodo : null;
  const valor = metodo && contacto_valor?.trim() ? contacto_valor.trim().slice(0, 120) : null;
  if (valor && !aceita_contacto) {
    return NextResponse.json({ error: 'Confirma que aceitas ser contactado, ou deixa o contacto em branco.' }, { status: 400 });
  }
  if (metodo === 'email' && valor && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) {
    return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
  }

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { error } = await admin.from('prod_feedback').insert({
    nome: nome?.trim().slice(0, 60) || null,
    avaliacao: avaliacao && avaliacao >= 1 && avaliacao <= 5 ? avaliacao : null,
    mensagem: mensagem.trim(),
    contacto_metodo: valor ? metodo : null,
    contacto_valor: valor,
    aceita_contacto: !!valor && !!aceita_contacto,
    estado: 'pendente',
  });

  if (error) { console.error('[feedback] erro:', error); return NextResponse.json({ error: 'Erro ao enviar.' }, { status: 500 }); }
  await logInfo('feedback_publico', 'Novo feedback público recebido', { ip }, ip);
  return NextResponse.json({ ok: true });
}
