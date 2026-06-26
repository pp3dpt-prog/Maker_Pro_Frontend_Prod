'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { s, slugify } from '../_ui';

interface Categoria {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  ordem: number;
  ativo: boolean;
}

export default function CategoriasPage() {
  const [cats, setCats] = useState<Categoria[]>([]);
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  const fetchCats = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('prod_loja_categorias')
      .select('*')
      .order('ordem', { ascending: true });
    if (error) setErro(error.message);
    else setCats((data ?? []) as Categoria[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCats(); }, [fetchCats]);

  async function criar() {
    if (!nome.trim()) return;
    setSaving(true); setErro('');
    const { error } = await supabase.from('prod_loja_categorias').insert({
      nome: nome.trim(),
      slug: slugify(nome),
      ordem: cats.length,
    });
    setSaving(false);
    if (error) { setErro(error.message); return; }
    setNome('');
    fetchCats();
  }

  async function toggleAtivo(c: Categoria) {
    const { error } = await supabase.from('prod_loja_categorias').update({ ativo: !c.ativo }).eq('id', c.id);
    if (!error) setCats(prev => prev.map(x => x.id === c.id ? { ...x, ativo: !x.ativo } : x));
  }

  async function apagar(c: Categoria) {
    if (!confirm(`Apagar a categoria "${c.nome}"? Os produtos ficam sem categoria.`)) return;
    const { error } = await supabase.from('prod_loja_categorias').delete().eq('id', c.id);
    if (error) { alert('Erro: ' + error.message); return; }
    setCats(prev => prev.filter(x => x.id !== c.id));
  }

  return (
    <div style={s.page}>
      <div style={{ ...s.wrap, maxWidth: 760 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <h1 style={s.h1}>Categorias da loja</h1>
          <Link href="/admin/loja" style={s.btnGhost}>← Produtos</Link>
        </div>

        <div style={{ ...s.card, marginBottom: 24, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={s.label}>Nova categoria</label>
            <input
              style={s.input}
              value={nome}
              onChange={e => setNome(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') criar(); }}
              placeholder="Ex: Ferramentas"
            />
          </div>
          <button style={s.btn} onClick={criar} disabled={saving}>{saving ? 'A criar…' : '+ Criar'}</button>
        </div>

        {erro && <p style={{ color: '#f87171', marginBottom: 16 }}>Erro: {erro}</p>}

        {loading ? (
          <p style={{ color: '#8a96aa' }}>A carregar…</p>
        ) : cats.length === 0 ? (
          <p style={{ color: '#8a96aa' }}>Sem categorias.</p>
        ) : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead style={s.thead}>
                <tr>
                  <th style={s.th}>Nome</th>
                  <th style={s.th}>Slug</th>
                  <th style={s.th}>Ativo</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {cats.map(c => (
                  <tr key={c.id}>
                    <td style={{ ...s.td, fontWeight: 600, color: '#f1f5f9' }}>{c.nome}</td>
                    <td style={{ ...s.td, color: '#8a96aa' }}>/{c.slug}</td>
                    <td style={s.td}>
                      <button
                        onClick={() => toggleAtivo(c)}
                        style={{ ...s.badge(c.ativo ? 'rgba(52,211,153,0.18)' : 'rgba(100,116,139,0.18)', c.ativo ? '#34d399' : '#94a3b8'), border: 'none', cursor: 'pointer' }}
                      >
                        {c.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td style={{ ...s.td, textAlign: 'right' }}>
                      <button style={s.btnDanger} onClick={() => apagar(c)}>Apagar</button>
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
