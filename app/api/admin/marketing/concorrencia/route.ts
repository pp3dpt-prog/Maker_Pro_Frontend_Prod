// Aba Concorrência do /admin/marketing. Um só endpoint com várias ações:
//   { acao: 'descobrir', ramos?: string[] }            → sugestões de concorrentes (IA + confirmação na Meta)
//   { acao: 'adicionar', concorrentes: [{username, ramo?, motivo?, origem?}] } → grava e recolhe já os posts
//   { acao: 'recolher' }                                 → atualiza posts de todos os concorrentes ativos
//   { acao: 'analisar' }                                 → análise IA + sugestões (gravada no histórico)
// Remover/ativar concorrentes é feito no cliente (RLS de admin).
import { createClient as createAdmin } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { assertAdmin } from '@/lib/assertAdmin';
import { descobrirConcorrentes, recolherConcorrente, analisarConcorrencia, RAMOS_PADRAO } from '@/lib/concorrencia';

export const runtime = 'nodejs';
export const maxDuration = 300;
export const dynamic = 'force-dynamic';

async function emLotes<T, R>(itens: T[], n: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(itens.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, itens.length) }, async () => {
    while (i < itens.length) { const k = i++; out[k] = await fn(itens[k]); }
  }));
  return out;
}

export async function POST(request: Request) {
  const guard = await assertAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const body = await request.json().catch(() => ({}));

  try {
    switch (body.acao) {
      case 'descobrir': {
        const ramos: string[] = Array.isArray(body.ramos) && body.ramos.length ? body.ramos : RAMOS_PADRAO;
        const { data: existentes } = await admin.from('prod_marketing_concorrentes').select('username');
        const sugestoes = await descobrirConcorrentes(admin, ramos, (existentes ?? []).map(e => e.username));
        return NextResponse.json({ ok: true, sugestoes });
      }

      case 'adicionar': {
        const lista = (Array.isArray(body.concorrentes) ? body.concorrentes : [])
          .map((c: any) => ({
            username: String(c.username ?? '').replace(/^@/, '').trim().toLowerCase(),
            ramo: c.ramo ? String(c.ramo).slice(0, 120) : null,
            motivo: c.motivo ? String(c.motivo).slice(0, 300) : null,
            origem: c.origem === 'ia' ? 'ia' : 'manual',
          }))
          .filter((c: { username: string }) => /^[a-z0-9._]{1,30}$/.test(c.username));
        if (!lista.length) return NextResponse.json({ error: 'Nenhum nome de utilizador válido.' }, { status: 400 });

        const { data: gravados, error } = await admin.from('prod_marketing_concorrentes')
          .upsert(lista, { onConflict: 'username' }).select('id, username');
        if (error) throw new Error(error.message);
        const resultados = await emLotes(gravados ?? [], 4, async c => ({ username: c.username, ...(await recolherConcorrente(admin, c)) }));
        return NextResponse.json({ ok: true, resultados });
      }

      case 'recolher': {
        const { data: ativos } = await admin.from('prod_marketing_concorrentes').select('id, username').eq('ativo', true);
        const resultados = await emLotes(ativos ?? [], 4, c => recolherConcorrente(admin, c));
        return NextResponse.json({
          ok: true,
          contas: resultados.filter(r => r.ok).length,
          falhas: resultados.filter(r => !r.ok).length,
          posts: resultados.reduce((a, r) => a + (r.ok ? r.posts : 0), 0),
        });
      }

      case 'analisar': {
        const analise = await analisarConcorrencia(admin, guard.userId ?? null);
        return NextResponse.json({ ok: true, analise });
      }

      default:
        return NextResponse.json({ error: 'Ação desconhecida.' }, { status: 400 });
    }
  } catch (e) {
    console.error('[marketing/concorrencia]', body.acao, e);
    const msg = e instanceof Error ? e.message.slice(0, 300) : 'Erro desconhecido.';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
