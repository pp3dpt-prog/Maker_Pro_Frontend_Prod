'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { s, estadoBadge } from '@/app/admin/loja/_ui';
import { resizeImageToBase64 } from '@/lib/imageResize';

type Design = {
  id: string;
  nome: string;
  familia: string | null;
  thumbnail_url: string | null;
  estado: string;
  capa_familia: boolean;
};

async function uploadFoto(designId: string, file: File): Promise<string> {
  const base64 = await resizeImageToBase64(file);
  const resp = await fetch('/api/admin/designs/upload-foto', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ design_id: designId, image_base64: base64 }),
  });
  let json: any = null;
  try { json = await resp.json(); } catch { /* resposta não-JSON */ }
  if (!resp.ok || !json) throw new Error(json?.error ?? `Erro no upload (${resp.status}). Tenta uma foto mais pequena.`);
  return json.url as string;
}

function DesignCard({ d, onChanged, erro }: { d: Design; onChanged: () => void; erro: (msg: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [settingCapa, setSettingCapa] = useState(false);

  async function onFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      await uploadFoto(d.id, file);
      onChanged();
    } catch (e: any) {
      erro(e.message ?? 'Erro no upload.');
    } finally {
      setUploading(false);
    }
  }

  async function marcarCapa() {
    setSettingCapa(true);
    try {
      const resp = await fetch('/api/admin/designs/set-capa', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ design_id: d.id }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(json?.error ?? 'Erro ao marcar capa.');
      onChanged();
    } catch (e: any) {
      erro(e.message ?? 'Erro ao marcar capa.');
    } finally {
      setSettingCapa(false);
    }
  }

  return (
    <div style={{ width: 160, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ position: 'relative' }}>
        {d.thumbnail_url ? (
          <img src={d.thumbnail_url} alt={d.nome} style={{ width: 160, height: 160, objectFit: 'cover', borderRadius: 10, border: d.capa_familia ? '2px solid #fbbf24' : '1px solid #1e293b', display: 'block' }} />
        ) : (
          <div style={{ width: 160, height: 160, borderRadius: 10, border: '1px dashed #334155', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 11, textAlign: 'center', padding: 8 }}>
            Sem foto
          </div>
        )}
        {d.capa_familia && (
          <span style={{ position: 'absolute', top: 6, left: 6, background: '#fbbf24', color: '#1a1300', fontSize: 9, fontWeight: 800, padding: '2px 6px', borderRadius: 6 }}>
            ★ CAPA
          </span>
        )}
        {uploading && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#93c5fd' }}>
            A enviar…
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <strong style={{ fontSize: 12, lineHeight: 1.3, flex: 1 }}>{d.nome}</strong>
      </div>
      <span style={{ ...estadoBadge[d.estado], width: 'fit-content' }}>{d.estado}</span>

      <label style={{ ...s.btnGhost, padding: '6px 10px', fontSize: 11, cursor: uploading ? 'wait' : 'pointer', textAlign: 'center', justifyContent: 'center' }}>
        {d.thumbnail_url ? 'Substituir foto' : '+ Foto'}
        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => onFile(e.target.files)} disabled={uploading} />
      </label>
      <button
        type="button"
        onClick={marcarCapa}
        disabled={settingCapa || d.capa_familia}
        style={{ ...s.btnGhost, padding: '6px 10px', fontSize: 11, cursor: d.capa_familia ? 'default' : 'pointer', opacity: d.capa_familia ? 0.5 : 1 }}
      >
        {d.capa_familia ? '★ É a capa' : settingCapa ? 'A marcar…' : '☆ Marcar como capa'}
      </button>
    </div>
  );
}

export default function AdminProdutosPage() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    const res = await fetch('/api/admin/designs');
    const data = await res.json();
    if (!res.ok) { setErro(data?.error ?? 'Erro ao carregar.'); setLoading(false); return; }
    setDesigns(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const familias = useMemo(() => {
    const map = new Map<string, Design[]>();
    for (const d of designs) {
      const fam = d.familia ?? 'Sem família';
      if (!map.has(fam)) map.set(fam, []);
      map.get(fam)!.push(d);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [designs]);

  return (
    <div style={s.page}>
      <div style={s.wrap}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={s.h1}>Fotos dos Designs</h1>
            <p style={s.sub}>
              Uma foto por modelo do customizador (iluminárias, litofânias, porta-chaves, etc.) —
              substitui a imagem usada no customizador e no catálogo. A foto marcada como{' '}
              <strong style={{ color: '#fbbf24' }}>★ capa</strong> é a que aparece no cartão da
              família em /produtos. Fotos da loja (prod_loja_produtos) ficam em Fotos de Loja.
            </p>
          </div>
          <Link href="/admin" style={s.btnGhost}>← Admin</Link>
        </div>

        {erro && <p style={{ color: '#f87171', marginBottom: 16 }}>{erro}</p>}

        {loading ? (
          <p style={{ color: '#8a96aa' }}>A carregar…</p>
        ) : familias.length === 0 ? (
          <p style={{ color: '#8a96aa' }}>Sem designs.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            {familias.map(([familia, items]) => (
              <div key={familia} style={s.card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, textTransform: 'capitalize' }}>{familia}</h2>
                  <span style={s.badge('rgba(148,163,184,0.15)', '#94a3b8')}>{items.length} modelo{items.length === 1 ? '' : 's'}</span>
                  {!items.some(d => d.capa_familia) && (
                    <span style={s.badge('rgba(251,191,36,0.15)', '#fbbf24')}>sem capa escolhida</span>
                  )}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                  {items.map(d => (
                    <DesignCard key={d.id} d={d} onChanged={carregar} erro={setErro} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
