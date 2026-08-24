// Gestão da galeria de trabalhos (admin): listar tudo, criar, editar, apagar.
import { createClient as createAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

async function assertAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: 'Não autenticado.' };

  const adminEmail = process.env.ADMIN_EMAIL;
  if (adminEmail && user.email?.toLowerCase().trim() === adminEmail.toLowerCase().trim()) {
    return { ok: true as const };
  }
  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: perfil } = await admin.from('prod_perfis').select('role').eq('id', user.id).maybeSingle();
  if (perfil?.role === 'admin') return { ok: true as const };
  return { ok: false as const, status: 403, error: 'Sem permissão.' };
}

export async function GET() {
  const guard = await assertAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data } = await admin.from('prod_galeria').select('*').order('ordem', { ascending: true });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const guard = await assertAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { titulo, descricao, foto_url, ordem } = await request.json();
  if (!titulo?.trim()) return NextResponse.json({ error: 'Título em falta.' }, { status: 400 });
  if (!foto_url) return NextResponse.json({ error: 'Foto em falta.' }, { status: 400 });

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { error } = await admin.from('prod_galeria').insert({
    titulo: titulo.trim(),
    descricao: descricao?.trim() || null,
    foto_url,
    ordem: ordem ?? 0,
    ativo: true,
  });
  if (error) { console.error('[admin/galeria] erro insert:', error); return NextResponse.json({ error: 'Erro ao criar.' }, { status: 500 }); }
  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const guard = await assertAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id, ...patch } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID em falta.' }, { status: 400 });

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { error } = await admin.from('prod_galeria').update(patch).eq('id', id);
  if (error) return NextResponse.json({ error: 'Erro ao atualizar.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request) {
  const guard = await assertAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID em falta.' }, { status: 400 });

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { error } = await admin.from('prod_galeria').delete().eq('id', id);
  if (error) return NextResponse.json({ error: 'Erro ao apagar.' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
