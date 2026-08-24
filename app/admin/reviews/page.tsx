'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { s } from '@/app/admin/loja/_ui';

interface Review {
  id: string;
  user_name: string;
  avaliacao: number;
  comentario: string | null;
  foto_url: string | null;
  aprovado: boolean;
  created_at: string;
}

function Stars({ n }: { n: number }) {
  return <span style={{ color: '#f59e0b' }}>{'★'.repeat(n)}{'☆'.repeat(5 - n)}</span>;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const [nome, setNome] = useState('');
  const [estrelas, setEstrelas] = useState(5);
  const [comentario, setComentario] = useState('');
  const [fotoUrl, setFotoUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editNome, setEditNome] = useState('');
  const [editEstrelas, setEditEstrelas] = useState(5);
  const [editComentario, setEditComentario] = useState('');
  const [editFotoUrl, setEditFotoUrl] = useState('');
  const [editUploading, setEditUploading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/reviews');
    const data = await res.json();
    setReviews(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  async function onFoto(file: File | null) {
    if (!file) return;
    setUploading(true); setErro('');
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const resp = await fetch('/api/admin/loja/upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64, pasta: 'reviews' }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error ?? 'Erro no upload');
      setFotoUrl(json.url);
    } catch (e: any) {
      setErro('Foto: ' + (e.message ?? 'erro'));
    }
    setUploading(false);
  }

  async function criar() {
    if (!nome.trim()) { setErro('Indica o nome (pode ser só o primeiro nome ou inicial).'); return; }
    setSaving(true); setErro('');
    const res = await fetch('/api/admin/reviews', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_name: nome, avaliacao: estrelas, comentario: comentario || null, foto_url: fotoUrl || null }),
    });
    const data = await res.json();
    if (!res.ok) { setErro(data.error ?? 'Erro ao criar.'); setSaving(false); return; }
    setNome(''); setEstrelas(5); setComentario(''); setFotoUrl('');
    setSaving(false);
    carregar();
  }

  function iniciarEdicao(r: Review) {
    setEditandoId(r.id);
    setEditNome(r.user_name);
    setEditEstrelas(r.avaliacao);
    setEditComentario(r.comentario ?? '');
    setEditFotoUrl(r.foto_url ?? '');
    setErro('');
  }

  async function onFotoEdicao(file: File | null) {
    if (!file) return;
    setEditUploading(true); setErro('');
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(file);
      });
      const resp = await fetch('/api/admin/loja/upload', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_base64: base64, pasta: 'reviews' }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json.error ?? 'Erro no upload');
      setEditFotoUrl(json.url);
    } catch (e: any) {
      setErro('Foto: ' + (e.message ?? 'erro'));
    }
    setEditUploading(false);
  }

  async function guardarEdicao(id: string) {
    if (!editNome.trim()) { setErro('Indica o nome.'); return; }
    setEditSaving(true); setErro('');
    const res = await fetch('/api/admin/reviews', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, user_name: editNome, avaliacao: editEstrelas, comentario: editComentario || null, foto_url: editFotoUrl || null }),
    });
    const data = await res.json();
    if (!res.ok) { setErro(data.error ?? 'Erro ao guardar.'); setEditSaving(false); return; }
    setEditSaving(false);
    setEditandoId(null);
    carregar();
  }

  async function toggleAprovado(r: Review) {
    await fetch('/api/admin/reviews', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: r.id, aprovado: !r.aprovado }),
    });
    carregar();
  }

  async function apagar(id: string) {
    if (!confirm('Apagar esta review?')) return;
    await fetch('/api/admin/reviews', {
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
            <h1 style={s.h1}>Reviews</h1>
            <p style={s.sub}>Reviews de clientes reais mostradas na homepage. Aprovadas aparecem no site; as outras ficam guardadas mas invisíveis.</p>
          </div>
          <Link href="/admin" style={s.btnGhost}>← Admin</Link>
        </div>

        {erro && <p style={{ color: '#f87171', marginBottom: 16 }}>{erro}</p>}

        {/* Nova review curada */}
        <div style={{ ...s.card, marginBottom: 24 }}>
          <label style={{ ...s.label, marginBottom: 12 }}>Adicionar review (ex.: de uma conversa/foto que recebeste)</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 16, marginBottom: 14 }}>
            <div>
              <label style={s.label}>Nome (usa só primeiro nome/inicial se não tiveres autorização para o apelido)</label>
              <input style={s.input} value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Paula, ou C." />
            </div>
            <div>
              <label style={s.label}>Estrelas</label>
              <select style={s.input} value={estrelas} onChange={e => setEstrelas(Number(e.target.value))}>
                {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} ★</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={s.label}>Comentário (opcional — deixa vazio para review só com foto/estrelas)</label>
            <textarea style={{ ...s.input, minHeight: 70, resize: 'vertical' }} value={comentario} onChange={e => setComentario(e.target.value)} placeholder="Ex: São muito giros e leves!" maxLength={300} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={s.label}>Foto (produto recebido)</label>
            {fotoUrl ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src={fotoUrl} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, border: '1px solid #1e293b' }} />
                <button style={s.btnDanger} onClick={() => setFotoUrl('')} type="button">Remover foto</button>
              </div>
            ) : (
              <label style={{ ...s.btnGhost, cursor: 'pointer', display: 'inline-flex' }}>
                {uploading ? 'A enviar…' : '+ Adicionar foto'}
                <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onFoto(e.target.files?.[0] ?? null)} disabled={uploading} />
              </label>
            )}
          </div>
          <button style={s.btn} onClick={criar} disabled={saving || uploading}>{saving ? 'A guardar…' : '+ Criar review'}</button>
        </div>

        {/* Lista */}
        {loading ? (
          <p style={{ color: '#8a96aa' }}>A carregar…</p>
        ) : reviews.length === 0 ? (
          <p style={{ color: '#8a96aa' }}>Ainda sem reviews.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reviews.map(r => editandoId === r.id ? (
              <div key={r.id} style={s.card}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 16, marginBottom: 14 }}>
                  <div>
                    <label style={s.label}>Nome</label>
                    <input style={s.input} value={editNome} onChange={e => setEditNome(e.target.value)} />
                  </div>
                  <div>
                    <label style={s.label}>Estrelas</label>
                    <select style={s.input} value={editEstrelas} onChange={e => setEditEstrelas(Number(e.target.value))}>
                      {[5, 4, 3, 2, 1].map(n => <option key={n} value={n}>{n} ★</option>)}
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label style={s.label}>Comentário</label>
                  <textarea style={{ ...s.input, minHeight: 70, resize: 'vertical' }} value={editComentario} onChange={e => setEditComentario(e.target.value)} maxLength={300} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={s.label}>Foto</label>
                  {editFotoUrl ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <img src={editFotoUrl} alt="" style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 10, border: '1px solid #1e293b' }} />
                      <button style={s.btnDanger} onClick={() => setEditFotoUrl('')} type="button">Remover foto</button>
                    </div>
                  ) : (
                    <label style={{ ...s.btnGhost, cursor: 'pointer', display: 'inline-flex' }}>
                      {editUploading ? 'A enviar…' : '+ Adicionar foto'}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onFotoEdicao(e.target.files?.[0] ?? null)} disabled={editUploading} />
                    </label>
                  )}
                </div>
                {erro && <p style={{ color: '#f87171', marginBottom: 12, fontSize: 13 }}>{erro}</p>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button style={s.btn} onClick={() => guardarEdicao(r.id)} disabled={editSaving || editUploading}>{editSaving ? 'A guardar…' : 'Guardar'}</button>
                  <button style={s.btnGhost} onClick={() => setEditandoId(null)} type="button">Cancelar</button>
                </div>
              </div>
            ) : (
              <div key={r.id} style={{ ...s.card, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                {r.foto_url ? (
                  <img src={r.foto_url} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10, flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 64, height: 64, borderRadius: 10, background: '#0a1120', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, opacity: 0.3 }}>📦</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <strong style={{ fontSize: 14 }}>{r.user_name}</strong>
                    <Stars n={r.avaliacao} />
                    <span style={s.badge(r.aprovado ? 'rgba(52,211,153,0.18)' : 'rgba(251,191,36,0.18)', r.aprovado ? '#34d399' : '#fbbf24')}>
                      {r.aprovado ? 'Aprovada · visível' : 'Pendente'}
                    </span>
                  </div>
                  {r.comentario && <p style={{ fontSize: 13, color: '#cbd5e1', margin: '0 0 4px', fontStyle: 'italic' }}>"{r.comentario}"</p>}
                  <p style={{ fontSize: 11, color: '#8a96aa', margin: 0 }}>{new Date(r.created_at).toLocaleDateString('pt-PT')}</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button style={s.btnGhost} onClick={() => iniciarEdicao(r)} type="button">Editar</button>
                  <button style={s.btnGhost} onClick={() => toggleAprovado(r)} type="button">{r.aprovado ? 'Ocultar' : 'Aprovar'}</button>
                  <button style={s.btnDanger} onClick={() => apagar(r.id)} type="button">Apagar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
