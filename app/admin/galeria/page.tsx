'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { s } from '@/app/admin/loja/_ui';

interface Item {
  id: string;
  titulo: string;
  descricao: string | null;
  foto_url: string;
  ordem: number;
  ativo: boolean;
}

export default function AdminGaleriaPage() {
  const [itens, setItens] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editTitulo, setEditTitulo] = useState('');
  const [editDescricao, setEditDescricao] = useState('');
  const [editFotoUrl, setEditFotoUrl] = useState('');
  const [editUploading, setEditUploading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/galeria');
    const data = await res.json();
    setItens(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function upload(file: File | null, onDone: (url: string) => void, setBusy: (b: boolean) => void) {
    if (!file) return;
    setBusy(true); setErro('');
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const resp = await fetch('/api/admin/loja/upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64, pasta: 'galeria' }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error ?? 'Erro no upload');
      onDone(json.url);
    } catch (e: any) {
      setErro('Foto: ' + (e.message ?? 'erro'));
    }
    setBusy(false);
  }

  async function criar() {
    if (!titulo.trim()) { setErro('Indica um título.'); return; }
    if (!fotoUrl) { setErro('Adiciona uma foto.'); return; }
    setSaving(true); setErro('');
    const res = await fetch('/api/admin/galeria', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo, descricao: descricao || null, foto_url: fotoUrl, ordem: itens.length }),
    });
    const data = await res.json();
    if (!res.ok) { setErro(data.error ?? 'Erro ao criar.'); setSaving(false); return; }
    setTitulo(''); setDescricao(''); setFotoUrl('');
    setSaving(false);
    carregar();
  }

  function iniciarEdicao(it: Item) {
    setEditandoId(it.id);
    setEditTitulo(it.titulo);
    setEditDescricao(it.descricao ?? '');
    setEditFotoUrl(it.foto_url);
    setErro('');
  }

  async function guardarEdicao(id: string) {
    if (!editTitulo.trim()) { setErro('Indica um título.'); return; }
    setEditSaving(true); setErro('');
    const res = await fetch('/api/admin/galeria', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, titulo: editTitulo, descricao: editDescricao || null, foto_url: editFotoUrl }),
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
            <label style={s.label}>Foto</label>
            {fotoUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src={fotoUrl} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, border: '1px solid #1e293b' }} />
                <button style={s.btnDanger} onClick={() => setFotoUrl('')} type="button">Remover foto</button>
              </div>
            ) : (
              <label style={{ ...s.btnGhost, cursor: 'pointer', display: 'inline-flex' }}>
                {uploading ? 'A enviar…' : '+ Adicionar foto'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => upload(e.target.files?.[0] ?? null, setFotoUrl, setUploading)} disabled={uploading} />
              </label>
            )}
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
                  <label style={s.label}>Foto</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <img src={editFotoUrl} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, border: '1px solid #1e293b' }} />
                    <label style={{ ...s.btnGhost, cursor: 'pointer', display: 'inline-flex' }}>
                      {editUploading ? 'A enviar…' : 'Trocar foto'}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => upload(e.target.files?.[0] ?? null, setEditFotoUrl, setEditUploading)} disabled={editUploading} />
                    </label>
                  </div>
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
