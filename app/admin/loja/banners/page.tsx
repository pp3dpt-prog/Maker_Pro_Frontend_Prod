'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';
import { s } from '../_ui';

type Posicao = 'topo_loja' | 'topo_pecas' | 'topo_filamentos' | 'area_maker' | 'entre_produtos' | 'pagina_produto';
type Publico = 'todos' | 'visitantes' | 'makers';

interface Banner {
  id: string; titulo: string; subtitulo: string | null; imagem_url: string; imagem_mobile_url: string | null;
  link: string | null; texto_botao: string | null; posicao: Posicao; publico: Publico;
  ativo: boolean; prioridade: number; inicio: string | null; fim: string | null;
  impressoes: number; cliques: number;
}

const POSICOES: { v: Posicao; label: string }[] = [
  { v: 'topo_loja', label: 'Topo da loja (/loja)' },
  { v: 'topo_pecas', label: 'Topo das categorias de peças' },
  { v: 'entre_produtos', label: 'Entre produtos (depois do 8.º)' },
  { v: 'pagina_produto', label: 'Página de produto (em baixo)' },
  { v: 'area_maker', label: 'Área Maker (/makers)' },
  { v: 'topo_filamentos', label: 'Topo dos filamentos' },
];
const PUBLICOS: { v: Publico; label: string }[] = [
  { v: 'todos', label: 'Todos' },
  { v: 'visitantes', label: 'Só quem não é maker' },
  { v: 'makers', label: 'Só makers' },
];

const vazio = {
  titulo: '', subtitulo: '', imagem_url: '', imagem_mobile_url: '', link: '', texto_botao: '',
  posicao: 'topo_loja' as Posicao, publico: 'todos' as Publico, prioridade: '0', inicio: '', fim: '',
};

// datetime-local <-> ISO
const toLocal = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const toIso = (local: string) => (local ? new Date(local).toISOString() : null);

async function upload(file: File): Promise<string> {
  const base64 = await new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });
  const resp = await fetch('/api/admin/loja/upload', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ image_base64: base64, pasta: 'banners' }) });
  const json = await resp.json();
  if (!resp.ok) throw new Error(json.error ?? 'Erro no upload');
  return json.url as string;
}

export default function BannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [form, setForm] = useState(vazio);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const fetchBanners = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('prod_loja_banners').select('*').order('posicao').order('prioridade', { ascending: false });
    if (error) setErro(error.message); else setBanners((data ?? []) as Banner[]);
    setLoading(false);
  }, []);
  useEffect(() => { fetchBanners(); }, [fetchBanners]);

  const set = (patch: Partial<typeof vazio>) => setForm(f => ({ ...f, ...patch }));

  async function onImg(campo: 'imagem_url' | 'imagem_mobile_url', file: File | undefined) {
    if (!file) return;
    setUploading(true); setErro('');
    try { set({ [campo]: await upload(file) } as Partial<typeof vazio>); }
    catch (e: any) { setErro(e.message); }
    setUploading(false);
  }

  function editar(b: Banner) {
    setEditId(b.id);
    setForm({
      titulo: b.titulo, subtitulo: b.subtitulo ?? '', imagem_url: b.imagem_url, imagem_mobile_url: b.imagem_mobile_url ?? '',
      link: b.link ?? '', texto_botao: b.texto_botao ?? '', posicao: b.posicao, publico: b.publico,
      prioridade: String(b.prioridade), inicio: toLocal(b.inicio), fim: toLocal(b.fim),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function guardar() {
    if (!form.titulo.trim() || !form.imagem_url) { setErro('Título e imagem são obrigatórios.'); return; }
    setSaving(true); setErro('');
    const row = {
      titulo: form.titulo.trim(), subtitulo: form.subtitulo.trim() || null,
      imagem_url: form.imagem_url, imagem_mobile_url: form.imagem_mobile_url || null,
      link: form.link.trim() || null, texto_botao: form.texto_botao.trim() || null,
      posicao: form.posicao, publico: form.publico, prioridade: parseInt(form.prioridade, 10) || 0,
      inicio: toIso(form.inicio), fim: toIso(form.fim),
    };
    const { error } = editId
      ? await supabase.from('prod_loja_banners').update(row).eq('id', editId)
      : await supabase.from('prod_loja_banners').insert(row);
    setSaving(false);
    if (error) { setErro(error.message); return; }
    setForm(vazio); setEditId(null);
    fetchBanners();
  }

  async function toggle(b: Banner) {
    const { error } = await supabase.from('prod_loja_banners').update({ ativo: !b.ativo }).eq('id', b.id);
    if (!error) setBanners(prev => prev.map(x => x.id === b.id ? { ...x, ativo: !x.ativo } : x));
  }

  async function apagar(b: Banner) {
    if (!confirm(`Apagar o banner "${b.titulo}"?`)) return;
    const { error } = await supabase.from('prod_loja_banners').delete().eq('id', b.id);
    if (error) { alert('Erro: ' + error.message); return; }
    setBanners(prev => prev.filter(x => x.id !== b.id));
  }

  const agora = Date.now();
  const estadoDe = (b: Banner) => !b.ativo ? 'Desativado'
    : b.inicio && new Date(b.inicio).getTime() > agora ? 'Agendado'
    : b.fim && new Date(b.fim).getTime() <= agora ? 'Terminado' : 'No ar';

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h1 style={s.h1}>Banners</h1>
          <Link href="/admin/loja" style={s.btnGhost}>← Produtos</Link>
        </div>
        <p style={s.sub}>Um banner por posição de cada vez — aparece o ativo com maior prioridade para aquele público.</p>
        {erro && <p style={{ color: '#f87171', marginBottom: 16 }}>{erro}</p>}

        <div style={{ ...s.card, marginBottom: 28 }}>
          <label style={{ ...s.label, marginBottom: 14 }}>{editId ? 'Editar banner' : 'Novo banner'}</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div><label style={s.label}>Título *</label><input style={s.input} value={form.titulo} onChange={e => set({ titulo: e.target.value })} placeholder="Ex: Personaliza a tua pet tag" /></div>
            <div><label style={s.label}>Subtítulo</label><input style={s.input} value={form.subtitulo} onChange={e => set({ subtitulo: e.target.value })} placeholder="Ex: 18 formas, com o nome e o teu contacto" /></div>
            <div><label style={s.label}>Link</label><input style={s.input} value={form.link} onChange={e => set({ link: e.target.value })} placeholder="/customizador?id=… ou https://…" /></div>
            <div><label style={s.label}>Texto do botão</label><input style={s.input} value={form.texto_botao} onChange={e => set({ texto_botao: e.target.value })} placeholder="Ex: Criar a minha" /></div>
            <div>
              <label style={s.label}>Posição</label>
              <select style={s.input} value={form.posicao} onChange={e => set({ posicao: e.target.value as Posicao })}>
                {POSICOES.map(p => <option key={p.v} value={p.v}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Público</label>
              <select style={s.input} value={form.publico} onChange={e => set({ publico: e.target.value as Publico })}>
                {PUBLICOS.map(p => <option key={p.v} value={p.v}>{p.label}</option>)}
              </select>
            </div>
            <div><label style={s.label}>Início (opcional)</label><input type="datetime-local" style={s.input} value={form.inicio} onChange={e => set({ inicio: e.target.value })} /></div>
            <div><label style={s.label}>Fim (opcional)</label><input type="datetime-local" style={s.input} value={form.fim} onChange={e => set({ fim: e.target.value })} /></div>
            <div><label style={s.label}>Prioridade</label><input style={s.input} value={form.prioridade} onChange={e => set({ prioridade: e.target.value })} inputMode="numeric" /></div>
            <div />
            <div>
              <label style={s.label}>Imagem (desktop, ~1600×400) *</label>
              <label style={{ ...s.btnGhost, cursor: 'pointer' }}>
                {uploading ? 'A enviar…' : form.imagem_url ? 'Trocar imagem' : 'Carregar imagem'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onImg('imagem_url', e.target.files?.[0])} />
              </label>
              {form.imagem_url && <img src={form.imagem_url} alt="" style={{ display: 'block', marginTop: 10, width: '100%', maxHeight: 120, objectFit: 'cover', borderRadius: 10 }} />}
            </div>
            <div>
              <label style={s.label}>Imagem telemóvel (opcional, ~800×600)</label>
              <label style={{ ...s.btnGhost, cursor: 'pointer' }}>
                {form.imagem_mobile_url ? 'Trocar imagem' : 'Carregar imagem'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onImg('imagem_mobile_url', e.target.files?.[0])} />
              </label>
              {form.imagem_mobile_url && <img src={form.imagem_mobile_url} alt="" style={{ display: 'block', marginTop: 10, maxWidth: 160, maxHeight: 120, objectFit: 'cover', borderRadius: 10 }} />}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
            <button style={s.btn} onClick={guardar} disabled={saving || uploading}>{saving ? 'A guardar…' : editId ? 'Guardar alterações' : 'Criar banner'}</button>
            {editId && <button style={s.btnGhost} onClick={() => { setEditId(null); setForm(vazio); }}>Cancelar</button>}
          </div>
        </div>

        {loading ? <p style={{ color: '#8a96aa' }}>A carregar…</p> : banners.length === 0 ? (
          <p style={{ color: '#8a96aa' }}>Ainda não há banners.</p>
        ) : (
          <div style={s.tableWrap}>
            <table style={s.table}>
              <thead style={s.thead}>
                <tr><th style={s.th}>Banner</th><th style={s.th}>Posição</th><th style={s.th}>Público</th><th style={s.th}>Estado</th><th style={s.th}>Vistas / cliques</th><th style={s.th}></th></tr>
              </thead>
              <tbody>
                {banners.map(b => {
                  const est = estadoDe(b);
                  const ctr = b.impressoes > 0 ? ((b.cliques / b.impressoes) * 100).toFixed(1) + '%' : '—';
                  return (
                    <tr key={b.id}>
                      <td style={s.td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <img src={b.imagem_url} alt="" style={{ width: 96, height: 40, objectFit: 'cover', borderRadius: 6 }} />
                          <div><div style={{ fontWeight: 700, color: '#f1f5f9' }}>{b.titulo}</div><div style={{ fontSize: 12, color: '#8a96aa' }}>prioridade {b.prioridade}</div></div>
                        </div>
                      </td>
                      <td style={s.td}>{POSICOES.find(p => p.v === b.posicao)?.label ?? b.posicao}</td>
                      <td style={s.td}>{PUBLICOS.find(p => p.v === b.publico)?.label ?? b.publico}</td>
                      <td style={s.td}>
                        <span style={est === 'No ar' ? s.badge('rgba(52,211,153,0.18)', '#34d399') : est === 'Agendado' ? s.badge('rgba(96,165,250,0.18)', '#60a5fa') : s.badge('rgba(148,163,184,0.18)', '#94a3b8')}>{est}</span>
                      </td>
                      <td style={s.td}>{b.impressoes} / {b.cliques} <span style={{ color: '#8a96aa', fontSize: 12 }}>({ctr})</span></td>
                      <td style={{ ...s.td, whiteSpace: 'nowrap' }}>
                        <button style={{ ...s.btnGhost, padding: '6px 12px', marginRight: 6 }} onClick={() => editar(b)}>Editar</button>
                        <button style={{ ...s.btnGhost, padding: '6px 12px', marginRight: 6 }} onClick={() => toggle(b)}>{b.ativo ? 'Desativar' : 'Ativar'}</button>
                        <button style={s.btnDanger} onClick={() => apagar(b)}>Apagar</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
