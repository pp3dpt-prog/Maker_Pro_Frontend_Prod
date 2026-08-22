'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { s } from '../_ui';

interface Categoria {
  id: string;
  nome: string;
  slug: string;
}

interface Parceiro {
  id: string;
  nome: string;
  descricao: string | null;
  morada: string | null;
  codigo_postal: string | null;
  cidade: string | null;
  telefone: string | null;
  email: string | null;
  website_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  horario_texto: string | null;
  servicos: string[];
  ativo: boolean;
}

const FORM_VAZIO = {
  nome: '', descricao: '', morada: '', codigo_postal: '', cidade: '',
  telefone: '', email: '', website_url: '', facebook_url: '', instagram_url: '',
  horario_texto: '', servicosTexto: '',
};

export default function ParceirosPage() {
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriasPorParceiro, setCategoriasPorParceiro] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(FORM_VAZIO);
  const [categoriasSel, setCategoriasSel] = useState<string[]>([]);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [{ data: cats }, { data: ps }, { data: rels }] = await Promise.all([
      supabase.from('prod_loja_categorias').select('id, nome, slug').order('ordem', { ascending: true }),
      supabase.from('prod_parceiros').select('*').order('ordem', { ascending: true }),
      supabase.from('prod_parceiros_categorias').select('parceiro_id, categoria_id'),
    ]);
    setCategorias((cats ?? []) as Categoria[]);
    setParceiros((ps ?? []) as Parceiro[]);
    const map: Record<string, string[]> = {};
    for (const r of (rels ?? []) as { parceiro_id: string; categoria_id: string }[]) {
      (map[r.parceiro_id] ??= []).push(r.categoria_id);
    }
    setCategoriasPorParceiro(map);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function iniciarEdicao(p: Parceiro) {
    setEditingId(p.id);
    setForm({
      nome: p.nome, descricao: p.descricao ?? '', morada: p.morada ?? '', codigo_postal: p.codigo_postal ?? '',
      cidade: p.cidade ?? '', telefone: p.telefone ?? '', email: p.email ?? '', website_url: p.website_url ?? '',
      facebook_url: p.facebook_url ?? '', instagram_url: p.instagram_url ?? '', horario_texto: p.horario_texto ?? '',
      servicosTexto: p.servicos.join('\n'),
    });
    setCategoriasSel(categoriasPorParceiro[p.id] ?? []);
  }

  function cancelarEdicao() {
    setEditingId(null);
    setForm(FORM_VAZIO);
    setCategoriasSel([]);
  }

  function toggleCategoriaSel(id: string) {
    setCategoriasSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function guardar() {
    if (!form.nome.trim()) return;
    setSaving(true); setErro('');

    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim() || null,
      morada: form.morada.trim() || null,
      codigo_postal: form.codigo_postal.trim() || null,
      cidade: form.cidade.trim() || null,
      telefone: form.telefone.trim() || null,
      email: form.email.trim() || null,
      website_url: form.website_url.trim() || null,
      facebook_url: form.facebook_url.trim() || null,
      instagram_url: form.instagram_url.trim() || null,
      horario_texto: form.horario_texto.trim() || null,
      servicos: form.servicosTexto.split('\n').map(s => s.trim()).filter(Boolean),
    };

    let parceiroId = editingId;
    if (editingId) {
      const { error } = await supabase.from('prod_parceiros').update(payload).eq('id', editingId);
      if (error) { setErro(error.message); setSaving(false); return; }
    } else {
      const { data, error } = await supabase.from('prod_parceiros').insert({ ...payload, ordem: parceiros.length }).select('id').single();
      if (error) { setErro(error.message); setSaving(false); return; }
      parceiroId = data.id;
    }

    // Reconcilia categorias: apaga tudo e volta a inserir as selecionadas (simples, sem diffing).
    await supabase.from('prod_parceiros_categorias').delete().eq('parceiro_id', parceiroId);
    if (categoriasSel.length > 0) {
      await supabase.from('prod_parceiros_categorias').insert(categoriasSel.map(categoria_id => ({ parceiro_id: parceiroId, categoria_id })));
    }

    setSaving(false);
    cancelarEdicao();
    carregar();
  }

  async function toggleAtivo(p: Parceiro) {
    const { error } = await supabase.from('prod_parceiros').update({ ativo: !p.ativo }).eq('id', p.id);
    if (!error) setParceiros(prev => prev.map(x => x.id === p.id ? { ...x, ativo: !x.ativo } : x));
  }

  async function apagar(p: Parceiro) {
    if (!confirm(`Apagar o parceiro "${p.nome}"?`)) return;
    const { error } = await supabase.from('prod_parceiros').delete().eq('id', p.id);
    if (error) { alert('Erro: ' + error.message); return; }
    if (editingId === p.id) cancelarEdicao();
    setParceiros(prev => prev.filter(x => x.id !== p.id));
  }

  return (
    <div style={s.page}>
      <div style={{ ...s.wrap, maxWidth: 900 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <h1 style={s.h1}>Parceiros</h1>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/admin/loja/parceiros/candidaturas" style={s.btnGhost}>Ver candidaturas</Link>
            <Link href="/admin/loja" style={s.btnGhost}>← Produtos</Link>
          </div>
        </div>
        <p style={{ ...s.sub, margin: '-20px 0 24px' }}>
          Locais físicos onde os clientes podem ver, personalizar e levantar produtos de certas categorias.
        </p>

        <div style={{ ...s.card, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#f1f5f9' }}>
            {editingId ? 'Editar parceiro' : 'Novo parceiro'}
          </h2>

          <div>
            <label style={s.label}>Nome</label>
            <input style={s.input} value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Retiro Pet Clínica&Spa" />
          </div>
          <div>
            <label style={s.label}>Descrição</label>
            <input style={s.input} value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} placeholder="Frase curta sobre o parceiro" />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 2 }}>
              <label style={s.label}>Morada</label>
              <input style={s.input} value={form.morada} onChange={e => setForm({ ...form, morada: e.target.value })} placeholder="Rua, número" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={s.label}>Código postal</label>
              <input style={s.input} value={form.codigo_postal} onChange={e => setForm({ ...form, codigo_postal: e.target.value })} placeholder="0000-000" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={s.label}>Cidade</label>
              <input style={s.input} value={form.cidade} onChange={e => setForm({ ...form, cidade: e.target.value })} placeholder="Ex: Quarteira" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={s.label}>Telefone</label>
              <input style={s.input} value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} placeholder="+351…" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={s.label}>Email</label>
              <input style={s.input} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="contacto@…" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={s.label}>Website</label>
              <input style={s.input} value={form.website_url} onChange={e => setForm({ ...form, website_url: e.target.value })} placeholder="https://…" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={s.label}>Facebook</label>
              <input style={s.input} value={form.facebook_url} onChange={e => setForm({ ...form, facebook_url: e.target.value })} placeholder="https://facebook.com/…" />
            </div>
            <div style={{ flex: 1 }}>
              <label style={s.label}>Instagram</label>
              <input style={s.input} value={form.instagram_url} onChange={e => setForm({ ...form, instagram_url: e.target.value })} placeholder="https://instagram.com/…" />
            </div>
          </div>
          <div>
            <label style={s.label}>Horário</label>
            <textarea style={{ ...s.input, minHeight: 60, resize: 'vertical' }} value={form.horario_texto} onChange={e => setForm({ ...form, horario_texto: e.target.value })} placeholder={'Terça a Sábado: 10h-13h, 14h-18h\nDomingo e Segunda: Encerrado'} />
          </div>
          <div>
            <label style={s.label}>Serviços (um por linha)</label>
            <textarea style={{ ...s.input, minHeight: 90, resize: 'vertical' }} value={form.servicosTexto} onChange={e => setForm({ ...form, servicosTexto: e.target.value })} placeholder={'Banhos\nTosquias\nRemoção de tártaro sem anestesia'} />
          </div>

          <div>
            <label style={s.label}>Categorias onde aparece</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {categorias.map(c => (
                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#cbd5e1' }}>
                  <input type="checkbox" checked={categoriasSel.includes(c.id)} onChange={() => toggleCategoriaSel(c.id)} />
                  {c.nome}
                </label>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button style={s.btn} onClick={guardar} disabled={saving}>{saving ? 'A guardar…' : editingId ? 'Guardar alterações' : '+ Criar parceiro'}</button>
            {editingId && <button style={s.btnGhost} onClick={cancelarEdicao}>Cancelar</button>}
          </div>
        </div>

        {erro && <p style={{ color: '#f87171', marginBottom: 16 }}>Erro: {erro}</p>}

        {loading ? (
          <p style={{ color: '#8a96aa' }}>A carregar…</p>
        ) : parceiros.length === 0 ? (
          <p style={{ color: '#8a96aa' }}>Sem parceiros.</p>
        ) : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead style={s.thead}>
                <tr>
                  <th style={s.th}>Nome</th>
                  <th style={s.th}>Cidade</th>
                  <th style={s.th}>Categorias</th>
                  <th style={s.th}>Ativo</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {parceiros.map(p => (
                  <tr key={p.id}>
                    <td style={{ ...s.td, fontWeight: 600, color: '#f1f5f9' }}>{p.nome}</td>
                    <td style={{ ...s.td, color: '#8a96aa' }}>{p.cidade ?? '—'}</td>
                    <td style={{ ...s.td, color: '#8a96aa' }}>
                      {(categoriasPorParceiro[p.id] ?? [])
                        .map(id => categorias.find(c => c.id === id)?.nome)
                        .filter(Boolean)
                        .join(', ') || '—'}
                    </td>
                    <td style={s.td}>
                      <button
                        onClick={() => toggleAtivo(p)}
                        style={{ ...s.badge(p.ativo ? 'rgba(52,211,153,0.18)' : 'rgba(100,116,139,0.18)', p.ativo ? '#34d399' : '#94a3b8'), border: 'none', cursor: 'pointer' }}
                      >
                        {p.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td style={{ ...s.td, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button style={{ ...s.btnGhost, marginRight: 8 }} onClick={() => iniciarEdicao(p)}>Editar</button>
                      <button style={s.btnDanger} onClick={() => apagar(p)}>Apagar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
