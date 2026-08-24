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
  const { data } = await admin
    .from('prod_galeria')
    .select('*, prod_galeria_fotos(id, url, ordem)')
    .order('ordem', { ascending: true })
    .order('ordem', { ascending: true, referencedTable: 'prod_galeria_fotos' });
  return NextResponse.json(data ?? []);
}

export async function POST(request: Request) {
  const guard = await assertAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { titulo, descricao, fotos, ordem } = await request.json();
  if (!titulo?.trim()) return NextResponse.json({ error: 'Título em falta.' }, { status: 400 });
  if (!Array.isArray(fotos) || fotos.length === 0) return NextResponse.json({ error: 'Adiciona pelo menos uma foto.' }, { status: 400 });

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data, error } = await admin.from('prod_galeria').insert({
    titulo: titulo.trim(),
    descricao: descricao?.trim() || null,
    foto_url: fotos[0],
    ordem: ordem ?? 0,
    ativo: true,
  }).select('id').single();
  if (error || !data) { console.error('[admin/galeria] erro insert:', error); return NextResponse.json({ error: 'Erro ao criar.' }, { status: 500 }); }

  const rows = fotos.map((url: string, i: number) => ({ galeria_id: data.id, url, ordem: i }));
  const { error: fotosError } = await admin.from('prod_galeria_fotos').insert(rows);
  if (fotosError) { console.error('[admin/galeria] erro insert fotos:', fotosError); return NextResponse.json({ error: 'Erro ao guardar fotos.' }, { status: 500 }); }

  return NextResponse.json({ ok: true, id: data.id });
}

export async function PATCH(request: Request) {
  const guard = await assertAdmin();
  if (!guard.ok) return NextResponse.json({ error: guard.error }, { status: guard.status });

  const { id, fotos, removedFotoIds, ...patch } = await request.json();
  if (!id) return NextResponse.json({ error: 'ID em falta.' }, { status: 400 });

  const admin = createAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  if (Array.isArray(fotos)) {
    if (fotos.length === 0) return NextResponse.json({ error: 'A peça precisa de pelo menos uma foto.' }, { status: 400 });
    patch.foto_url = fotos[0].url;
  }

  if (Object.keys(patch).length) {
    const { error } = await admin.from('prod_galeria').update(patch).eq('id', id);
    if (error) return NextResponse.json({ error: 'Erro ao atualizar.' }, { status: 500 });
  }

  if (Array.isArray(removedFotoIds) && removedFotoIds.length) {
    await admin.from('prod_galeria_fotos').delete().in('id', removedFotoIds);
  }

  if (Array.isArray(fotos)) {
    for (let i = 0; i < fotos.length; i++) {
      const f = fotos[i];
      if (f.id) await admin.from('prod_galeria_fotos').update({ ordem: i }).eq('id', f.id);
      else await admin.from('prod_galeria_fotos').insert({ galeria_id: id, url: f.url, ordem: i });
    }
  }

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
