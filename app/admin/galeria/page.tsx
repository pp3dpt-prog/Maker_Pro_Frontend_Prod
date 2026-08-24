'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { s } from '@/app/admin/loja/_ui';
import { resizeImageToBase64 } from '@/lib/imageResize';

interface Foto {
  id?: string;
  url: string;
  ordem: number;
}

interface Item {
  id: string;
  titulo: string;
  descricao: string | null;
  foto_url: string;
  ordem: number;
  ativo: boolean;
  prod_galeria_fotos: Foto[];
}

async function uploadFoto(file: File): Promise<string> {
  const base64 = await resizeImageToBase64(file);
  const resp = await fetch('/api/admin/loja/upload', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image_base64: base64, pasta: 'galeria' }),
  });
  let json: any = null;
  try { json = await resp.json(); } catch { /* resposta não-JSON (ex: erro de servidor) */ }
  if (!resp.ok || !json) throw new Error(json?.error ?? `Erro no upload (${resp.status}). Tenta uma foto mais pequena.`);
  return json.url as string;
}

function FotosPicker({ fotos, setFotos, removedIds, uploading, setUploading, setErro }: {
  fotos: Foto[];
  setFotos: (updater: (prev: Foto[]) => Foto[]) => void;
  removedIds?: React.MutableRefObject<string[]>;
  uploading: boolean;
  setUploading: (b: boolean) => void;
  setErro: (msg: string) => void;
}) {
  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true); setErro('');
    for (const file of Array.from(files)) {
      try {
        const url = await uploadFoto(file);
        setFotos(prev => [...prev, { url, ordem: prev.length }]);
      } catch (e: any) {
        setErro('Foto: ' + (e.message ?? 'erro'));
      }
    }
    setUploading(false);
  }
  function rmFoto(i: number) {
    setFotos(prev => {
      const f = prev[i];
      if (f.id && removedIds) removedIds.current.push(f.id);
      return prev.filter((_, idx) => idx !== i).map((x, idx) => ({ ...x, ordem: idx }));
    });
  }
  function moveFoto(i: number, dir: -1 | 1) {
    setFotos(prev => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next.map((x, idx) => ({ ...x, ordem: idx }));
    });
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <label style={{ ...s.label, margin: 0 }}>Fotos</label>
        <label style={{ ...s.btnGhost, cursor: 'pointer' }}>
          {uploading ? 'A enviar…' : '+ Adicionar fotos'}
          <input type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => onFiles(e.target.files)} disabled={uploading} />
        </label>
      </div>
      {fotos.length === 0 ? (
        <p style={{ fontSize: 13, color: '#8a96aa' }}>Sem fotos. A primeira foto é a principal.</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {fotos.map((f, i) => (
            <div key={f.id ?? f.url} style={{ position: 'relative', width: 100 }}>
              <img src={f.url} alt="" style={{ width: 100, height: 100, objectFit: 'cover', borderRadius: 10, border: i === 0 ? '2px solid #3b82f6' : '1px solid #1e293b' }} />
              {i === 0 && <span style={{ position: 'absolute', top: 6, left: 6, background: '#3b82f6', color: '#fff', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 6 }}>PRINCIPAL</span>}
              <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                <button style={{ ...s.btnGhost, padding: '4px 8px', flex: 1 }} onClick={() => moveFoto(i, -1)} type="button" disabled={i === 0}>←</button>
                <button style={{ ...s.btnGhost, padding: '4px 8px', flex: 1 }} onClick={() => moveFoto(i, 1)} type="button" disabled={i === fotos.length - 1}>→</button>
                <button style={{ ...s.btnDanger, padding: '4px 8px' }} onClick={() => rmFoto(i)} type="button">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminGaleriaPage() {
  const [itens, setItens] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editTitulo, setEditTitulo] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [editFotos, setEditFotos] = useState<Foto[]>([]);
  const [editUploading, setEditUploading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const editRemovedIds = useRef<string[]>([]);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/galeria');
    const data = await res.json();
    setItens(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function criar() {
    if (!titulo.trim()) { setErro('Indica um título.'); return; }
    if (fotos.length === 0) { setErro('Adiciona pelo menos uma foto.'); return; }
    setSaving(true); setErro('');
    const res = await fetch('/api/admin/galeria', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo, descricao: descricao || null, fotos: fotos.map(f => f.url), ordem: itens.length }),
    });
    const data = await res.json();
    if (!res.ok) { setErro(data.error ?? 'Erro ao criar.'); setSaving(false); return; }
    setTitulo(''); setDescricao(''); setFotos([]);
    setSaving(false);
    carregar();
  }

  function iniciarEdicao(it: Item) {
    setEditandoId(it.id);
    setEditTitulo(it.titulo);
    setEditDescricao(it.descricao ?? '');
    const ordenadas = [...(it.prod_galeria_fotos ?? [])].sort((a, b) => a.ordem - b.ordem);
    setEditFotos(ordenadas.length ? ordenadas : [{ url: it.foto_url, ordem: 0 }]);
    editRemovedIds.current = [];
    setErro('');
  }

  async function guardarEdicao(id: string) {
    if (!editTitulo.trim()) { setErro('Indica um título.'); return; }
    if (editFotos.length === 0) { setErro('A peça precisa de pelo menos uma foto.'); return; }
    setEditSaving(true); setErro('');
    const res = await fetch('/api/admin/galeria', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id, titulo: editTitulo, descricao: editDescricao || null,
        fotos: editFotos.map(f => ({ id: f.id, url: f.url })),
        removedFotoIds: editRemovedIds.current,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setErro(data.error ?? 'Erro ao guardar.'); setEditSaving(false); return; }
    setEditSaving(false);
    setEditandoId(null);
    carregar();
  }

  async function toggleAtivo(it: Item) {
    await fetch('/api/admin/galeria', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: it.id, ativo: !it.ativo }),
    });
    carregar();
  }

  async function apagar(id: string) {
    if (!confirm('Apagar esta peça da galeria?')) return;
    await fetch('/api/admin/galeria', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    carregar();
  }

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={s.h1}>Galeria</h1>
            <p style={s.sub}>Peças feitas que não estão à venda ou foram personalizações — visível em pp3d.pt/galeria.</p>
          </div>
          <Link href="/admin" style={s.btnGhost}>← Admin</Link>
        </div>

        {erro && <p style={{ color: '#f87171', marginBottom: 16 }}>{erro}</p>}

        {/* Nova peça */}
        <div style={{ ...s.card, marginBottom: 24 }}>
          <label style={{ ...s.label, marginBottom: 12 }}>Adicionar peça</label>
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>Título</label>
            <input style={s.input} value={titulo} onChange={e => setTitulo(e.target.value)} placeholder="Ex: Miniatura personalizada pintada à mão" />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>Descrição (opcional)</label>
            <textarea style={{ ...s.input, minHeight: 70, resize: 'vertical' }} value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Conta o que é, como foi feito, ou o pedido do cliente" maxLength={400} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <FotosPicker fotos={fotos} setFotos={setFotos} uploading={uploading} setUploading={setUploading} setErro={setErro} />
          </div>
          <button style={s.btn} onClick={criar} disabled={saving || uploading}>{saving ? 'A guardar…' : '+ Adicionar à galeria'}</button>
        </div>

        {/* Lista */}
        {loading ? (
          <p style={{ color: '#8a96aa' }}>A carregar…</p>
        ) : itens.length === 0 ? (
          <p style={{ color: '#8a96aa' }}>Ainda sem peças na galeria.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {itens.map(it => editandoId === it.id ? (
              <div key={it.id} style={s.card}>
                <div style={{ marginBottom: 14 }}>
                  <label style={s.label}>Título</label>
                  <input style={s.input} value={editTitulo} onChange={e => setEditTitulo(e.target.value)} />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={s.label}>Descrição</label>
                  <textarea style={{ ...s.input, minHeight: 70, resize: 'vertical' }} value={editDescricao} onChange={e => setEditDescricao(e.target.value)} maxLength={400} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <FotosPicker fotos={editFotos} setFotos={setEditFotos} removedIds={editRemovedIds} uploading={editUploading} setUploading={setEditUploading} setErro={setErro} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={s.btn} onClick={() => guardarEdicao(it.id)} disabled={editSaving || editUploading}>{editSaving ? 'A guardar…' : 'Guardar'}</button>
                  <button style={s.btnGhost} onClick={() => setEditandoId(null)} type="button">Cancelar</button>
                </div>
              </div>
            ) : (
              <div key={it.id} style={{ ...s.card, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <img src={it.foto_url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <strong style={{ fontSize: 14 }}>{it.titulo}</strong>
                    <span style={s.badge(it.ativo ? 'rgba(52,211,153,0.18)' : 'rgba(248,113,113,0.18)', it.ativo ? '#34d399' : '#f87171')}>
                      {it.ativo ? 'Visível' : 'Oculta'}
                    </span>
                    {it.prod_galeria_fotos?.length > 1 && (
                      <span style={s.badge('rgba(148,163,184,0.15)', '#94a3b8')}>{it.prod_galeria_fotos.length} fotos</span>
                    )}
                  </div>
                  {it.descricao && <p style={{ fontSize: 13, color: '#cbd5e1', margin: 0 }}>{it.descricao}</p>}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button style={s.btnGhost} onClick={() => iniciarEdicao(it)} type="button">Editar</button>
                  <button style={s.btnGhost} onClick={() => toggleAtivo(it)} type="button">{it.ativo ? 'Ocultar' : 'Mostrar'}</button>
                  <button style={s.btnDanger} onClick={() => apagar(it.id)} type="button">Apagar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
