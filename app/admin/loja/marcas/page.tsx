'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { s, slugify } from '../_ui';

interface Marca {
  id: string; nome: string; slug: string; logo_url: string | null; site_url: string | null;
  notas_autorizacao: string | null; ativo: boolean; ordem: number;
}

// Marcas de filamento com autorização de revenda (só aparecem aos makers).
export default function MarcasPage() {
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [nome, setNome] = useState('');
  const [site, setSite] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchMarcas = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('prod_loja_marcas').select('*').order('ordem');
    if (error) setErro(error.message); else setMarcas((data ?? []) as Marca[]);
    setLoading(false);
  }, []);
  useEffect(() => { fetchMarcas(); }, [fetchMarcas]);

  async function criar() {
    if (!nome.trim()) return;
    setSaving(true); setErro('');
    const { error } = await supabase.from('prod_loja_marcas').insert({
      nome: nome.trim(), slug: slugify(nome), site_url: site.trim() || null,
      notas_autorizacao: notas.trim() || null, ordem: marcas.length,
    });
    setSaving(false);
    if (error) { setErro(error.message); return; }
    setNome(''); setSite(''); setNotas('');
    fetchMarcas();
  }

  async function uploadLogo(m: Marca, file: File | undefined) {
    if (!file) return;
    const base64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });
    const resp = await fetch('/api/admin/loja/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image_base64: base64, pasta: 'marcas' }) });
    const json = await resp.json();
    if (!resp.ok) { setErro(json.error ?? 'Erro no upload'); return; }
    await supabase.from('prod_loja_marcas').update({ logo_url: json.url }).eq('id', m.id);
    fetchMarcas();
  }

  async function toggle(m: Marca) {
    const { error } = await supabase.from('prod_loja_marcas').update({ ativo: !m.ativo }).eq('id', m.id);
    if (!error) setMarcas(prev => prev.map(x => x.id === m.id ? { ...x, ativo: !x.ativo } : x));
  }

  async function apagar(m: Marca) {
    if (!confirm(`Apagar a marca "${m.nome}"? Os filamentos dessa marca ficam sem marca.`)) return;
    const { error } = await supabase.from('prod_loja_marcas').delete().eq('id', m.id);
    if (error) { alert('Erro: ' + error.message); return; }
    setMarcas(prev => prev.filter(x => x.id !== m.id));
  }

  return (
    <div style={s.page}>
      <div style={{ ...s.wrap, maxWidth: 860 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h1 style={s.h1}>Marcas de filamento</h1>
          <Link href="/admin/loja" style={s.btnGhost}>← Produtos</Link>
        </div>
        <p style={s.sub}>Empresas com autorização de revenda. Só os makers veem estas marcas e os filamentos.</p>
        {erro && <p style={{ color: '#f87171', marginBottom: 16 }}>{erro}</p>}

        <div style={{ ...s.card, marginBottom: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div><label style={s.label}>Nome *</label><input style={s.input} value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Marca X" /></div>
          <div><label style={s.label}>Site</label><input style={s.input} value={site} onChange={e => setSite(e.target.value)} placeholder="https://…" /></div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={s.label}>Notas da autorização (só tu vês no admin)</label>
            <input style={s.input} value={notas} onChange={e => setNotas(e.target.value)} placeholder="Ex: autorização por email de 20/11, pode usar logótipo, PVP mínimo 18 €" />
          </div>
          <div><button style={s.btn} onClick={criar} disabled={saving}>{saving ? 'A guardar…' : '+ Adicionar marca'}</button></div>
        </div>

        {loading ? <p style={{ color: '#8a96aa' }}>A carregar…</p> : marcas.length === 0 ? (
          <p style={{ color: '#8a96aa' }}>Ainda não há marcas.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {marcas.map(m => (
              <div key={m.id} style={{ ...s.card, padding: 18, display: 'flex', alignItems: 'center', gap: 16, opacity: m.ativo ? 1 : 0.55 }}>
                <label title="Carregar logótipo" style={{ width: 64, height: 64, borderRadius: 12, background: '#0a1120', border: '1px dashed #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', flexShrink: 0 }}>
                  {m.logo_url ? <img src={m.logo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} /> : <span style={{ fontSize: 11, color: '#8a96aa' }}>logo</span>}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => uploadLogo(m, e.target.files?.[0])} />
                </label>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{m.nome}</div>
                  {m.site_url && <a href={m.site_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: '#60a5fa' }}>{m.site_url}</a>}
                  {m.notas_autorizacao && <div style={{ fontSize: 12, color: '#8a96aa', marginTop: 4 }}>{m.notas_autorizacao}</div>}
                </div>
                <button style={s.btnGhost} onClick={() => toggle(m)}>{m.ativo ? 'Desativar' : 'Ativar'}</button>
                <button style={s.btnDanger} onClick={() => apagar(m)}>Apagar</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
