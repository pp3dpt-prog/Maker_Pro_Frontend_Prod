'use client';

import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Design = {
  id: string;
  nome: string;
  familia: string;
  thumbnail_url: string | null;
};

export default function ThumbnailsTab() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    supabase.from('prod_designs')
      .select('id, nome, familia, thumbnail_url')
      .order('familia')
      .then(({ data }) => {
        setDesigns(data || []);
        setLoading(false);
      });
  }, []);

  const handleUpload = async (design: Design, file: File) => {
    if (!file) return;
    setUploading(design.id);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = e.target?.result as string;

        const res = await fetch('/api/admin/thumbnail', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ design_id: design.id, image_base64: base64 }),
        });

        const json = await res.json();
        if (!res.ok) throw new Error(json.error);

        setDesigns(prev => prev.map(d =>
          d.id === design.id ? { ...d, thumbnail_url: json.url } : d
        ));
      };
      reader.readAsDataURL(file);
    } catch (e: any) {
      alert('Erro ao carregar imagem: ' + e.message);
    } finally {
      setUploading(null);
    }
  };

  const sem = designs.filter(d => !d.thumbnail_url);
  const com = designs.filter(d => d.thumbnail_url);

  if (loading) return <p style={{ color: '#64748b' }}>A carregar designs…</p>;

  const DesignCard = ({ d }: { d: Design }) => (
    <div key={d.id} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, overflow: 'hidden' }}>
      {/* Preview da imagem */}
      <div
        onClick={() => fileRefs.current[d.id]?.click()}
        style={{
          height: 160, background: '#080c10', display: 'flex', alignItems: 'center',
          justifyContent: 'center', cursor: 'pointer', position: 'relative', overflow: 'hidden',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        {d.thumbnail_url ? (
          <img src={d.thumbnail_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={d.nome} />
        ) : (
          <div style={{ textAlign: 'center', color: '#334155' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🖼️</div>
            <p style={{ margin: 0, fontSize: 12 }}>Clica para carregar</p>
          </div>
        )}

        {/* Overlay ao hover */}
        <div style={{
          position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: 0, transition: 'opacity 0.2s',
        }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
        >
          <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>
            {uploading === d.id ? '⏳ A carregar…' : d.thumbnail_url ? '↺ Substituir' : '+ Carregar imagem'}
          </span>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 14 }}>{d.nome}</p>
          <p style={{ margin: 0, fontSize: 11, color: '#475569' }}>{d.familia}</p>
        </div>
        <button
          onClick={() => fileRefs.current[d.id]?.click()}
          disabled={uploading === d.id}
          style={{
            padding: '6px 14px', background: '#1e293b', color: '#93c5fd',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600,
            opacity: uploading === d.id ? 0.5 : 1,
          }}
        >
          {uploading === d.id ? '⏳' : d.thumbnail_url ? '↺' : '+ Imagem'}
        </button>
      </div>

      {/* Input de ficheiro oculto */}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        ref={el => { fileRefs.current[d.id] = el; }}
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleUpload(d, file);
          e.target.value = '';
        }}
      />
    </div>
  );

  return (
    <div>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>🖼️ Thumbnails</h1>
        <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
          {com.length} com thumbnail · {sem.length} sem thumbnail — clica em cada card para carregar a imagem
        </p>
      </div>

      {sem.length > 0 && (
        <>
          <h2 style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
            Sem thumbnail ({sem.length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 32 }}>
            {sem.map(d => <DesignCard key={d.id} d={d} />)}
          </div>
        </>
      )}

      {com.length > 0 && (
        <>
          <h2 style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 14 }}>
            Com thumbnail ({com.length})
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
            {com.map(d => <DesignCard key={d.id} d={d} />)}
          </div>
        </>
      )}
    </div>
  );
}
