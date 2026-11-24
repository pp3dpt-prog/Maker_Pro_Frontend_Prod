// Cores por design (prod_designs.cores_config) para /admin/cores. Só admin.
//   GET → designs com parâmetros de cor: id, nome, familia, parâmetros de cor (label, default, paleta própria), cores_config
//   PUT { ids: string[], config: CoresConfig | null } → grava a mesma configuração num ou vários designs
import { createClient as createAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { parametrosDeCor } from '@/lib/cores';

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: 'Não autenticado.' };
  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.email?.toLowerCase().trim() === adminEmail.toLowerCase().trim()) return { ok: true as const };
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: perfil } = await admin.from('prod_perfis').select('role').eq('id', user.id).maybeSingle();
  if (perfil?.role === 'admin') return { ok: true as const };
  return { ok: false as const, status: 403, error: 'Sem permissão.' };
}

const admin = () => createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET() {
  const guard = await assertAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const { data, error } = await admin()
    .from('prod_designs')
    .select('id, nome, familia, estado, generation_schema, cores_config')
    .order('familia').order('nome');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const lista = (data ?? []).map((d: any) => ({
    id: d.id, nome: d.nome, familia: d.familia, estado: d.estado, cores_config: d.cores_config ?? null,
    params: parametrosDeCor(d.generation_schema).map(([nome, def]: [string, any]) => ({
      nome, label: def?.ui?.label ?? nome, default: def?.default ?? '',
      paleta: Array.isArray(def?.ui?.paleta) ? def.ui.paleta.map((c: any) => String(c.hex).toUpperCase()) : [],
    })),
  })).filter(d => d.params.length > 0);
  return NextResponse.json(lista);
}

export async function PUT(request: Request) {
  const guard = await assertAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });
  const body = await request.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === 'string') : [];
  if (!ids.length) return NextResponse.json({ error: 'Sem designs.' }, { status: 400 });

  // Sanitizar: só #RRGGBB
  const hex = (v: unknown) => typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v.toUpperCase() : null;
  let config: Record<string, { default?: string; permitidas?: string[] }> | null = null;
  if (body.config && typeof body.config === 'object') {
    config = {};
    for (const [param, c] of Object.entries(body.config as Record<string, any>)) {
      const def = hex(c?.default);
      const perm = Array.isArray(c?.permitidas) ? c.permitidas.map(hex).filter(Boolean) as string[] : [];
      if (def || perm.length) config[param] = { ...(def && { default: def }), ...(perm.length && { permitidas: perm }) };
    }
    if (!Object.keys(config).length) config = null;
  }

  const { error } = await admin().from('prod_designs').update({ cores_config: config }).in('id', ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, atualizados: ids.length });
}
