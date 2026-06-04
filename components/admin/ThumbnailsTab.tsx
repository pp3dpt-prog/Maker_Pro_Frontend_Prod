'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import ThumbnailCapture from './ThumbnailCapture';

type Design = {
  id: string;
  nome: string;
  familia: string;
  thumbnail_url: string | null;
  generation_schema: any;
  stl_file_path: string | null;
};

type DesignState = {
  stlUrl: string | null;
  status: 'idle' | 'fetching' | 'rendering' | 'done' | 'skip' | 'error';
  thumbnailUrl: string | null;
  error: string | null;
};

export default function ThumbnailsTab() {
  const [designs, setDesigns]   = useState<Design[]>([]);
  const [states, setStates]     = useState<Record<string, DesignState>>({});
  const [loading, setLoading]   = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    supabase.from('prod_designs')
      .select('id, nome, familia, thumbnail_url, generation_schema, stl_file_path')
      .order('familia')
      .then(({ data }) => {
        setDesigns(data || []);
        setLoading(false);
      });
  }, []);

  const hasImageUpload = (d: Design) =>
    Object.values(d.generation_schema?.parameters ?? {})
      .some((p: any) => p?.ui?.widget === 'image_upload');

  const getDefaultParams = (d: Design): Record<string, any> => {
    const params: Record<string, any> = {};
    for (const [k, v] of Object.entries(d.generation_schema?.parameters ?? {})) {
      const def = (v as any).default;
      if (def !== null && def !== undefined) params[k] = def;
    }
    return params;
  };

  const isLegacy = (d: Design) =>
    !!d.generation_schema?.base_geometry || d.familia === 'pet-tags' || d.familia === 'portachaves';

  const generateOne = useCallback(async (design: Design) => {
    const id = design.id;

    // Designs com image_upload não podem ser auto-gerados
    if (hasImageUpload(design)) {
      setStates(s => ({ ...s, [id]: { stlUrl: null, status: 'skip', thumbnailUrl: null, error: 'Requer imagem do utilizador' } }));
      return;
    }

    setStates(s => ({ ...s, [id]: { stlUrl: null, status: 'fetching', thumbnailUrl: null, error: null } }));

    try {
      // STL estático (sem parâmetros)
      if (design.stl_file_path && !design.generation_schema?.parameters) {
        const { data } = await supabase.storage.from('makers_pro_stl_prod').createSignedUrl(design.stl_file_path, 3600);
        if (data?.signedUrl) {
          setStates(s => ({ ...s, [id]: { stlUrl: data.signedUrl, status: 'rendering', thumbnailUrl: null, error: null } }));
          return;
        }
      }

      const params  = getDefaultParams(design);
      const system  = isLegacy(design) ? 'legacy' : 'scad';

      // Gerar STL preview com params default
      const res = await fetch('/api/gerar-stl-pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: design.id, mode: 'preview', system, ...params }),
      });

      if (!res.ok) throw new Error('Erro ao gerar STL');

      const ct = res.headers.get('content-type') ?? '';
      if (ct.includes('application/json')) {
        const json = await res.json();
        const url = json.url ?? json.stlUrl;
        if (url) {
          setStates(s => ({ ...s, [id]: { stlUrl: url, status: 'rendering', thumbnailUrl: null, error: null } }));
          return;
        }
      }

      // Resposta directa em STL binário
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      setStates(s => ({ ...s, [id]: { stlUrl: url, status: 'rendering', thumbnailUrl: null, error: null } }));

    } catch (e: any) {
      setStates(s => ({ ...s, [id]: { stlUrl: null, status: 'error', thumbnailUrl: null, error: e.message } }));
    }
  }, []);

  const generateAll = async () => {
    setGenerating(true);
    const missing = designs.filter(d => !d.thumbnail_url && !hasImageUpload(d));
    for (const d of missing) {
      await generateOne(d);
      await new Promise(r => setTimeout(r, 500)); // pequena pausa entre requests
    }
    setGenerating(false);
  };

  const sem  = designs.filter(d => !d.thumbnail_url);
  const com  = designs.filter(d => d.thumbnail_url);

  if (loading) return <p style={{ color: '#64748b' }}>A carregar designs…</p>;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>🖼️ Thumbnails</h1>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 13 }}>
            {com.length} com thumbnail · {sem.length} sem thumbnail
          </p>
        </div>
        <button
          onClick={generateAll}
          disabled={generating || sem.filter(d => !hasImageUpload(d)).length === 0}
          style={{ padding: '10px 20px', background: '#1d4ed8', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 13, opacity: generating ? 0.6 : 1 }}
        >
          {generating ? '⏳ A gerar…' : '⚡ Gerar todos automaticamente'}
        </button>
      </div>

      {/* Designs sem thumbnail */}
      {sem.length > 0 && (
        <>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Sem thumbnail</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: 16, marginBottom: 32 }}>
            {sem.map(d => {
              const st = states[d.id];
              return (
                <div key={d.id} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 14, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: 15 }}>{d.nome}</p>
                      <p style={{ margin: 0, fontSize: 12, color: '#475569' }}>{d.familia}</p>
                    </div>
                    {!st && (
                      <button
                        onClick={() => generateOne(d)}
                        style={{ padding: '6px 14px', background: '#1e293b', color: '#93c5fd', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
                      >
                        Gerar
                      </button>
                    )}
                  </div>

                  {/* Estados */}
                  {!st && (
                    <div style={{ height: 100, background: '#080c10', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontSize: 12 }}>
                      Clica em "Gerar" para criar o thumbnail
                    </div>
                  )}
                  {st?.status === 'skip' && (
                    <div style={{ padding: '12px', background: '#1e293b', borderRadius: 8, color: '#64748b', fontSize: 12 }}>
                      ⚠️ {st.error}
                    </div>
                  )}
                  {st?.status === 'error' && (
                    <div style={{ padding: '12px', background: '#7f1d1d', borderRadius: 8, color: '#fca5a5', fontSize: 12 }}>
                      ❌ {st.error}
                    </div>
                  )}
                  {st?.status === 'done' && st.thumbnailUrl && (
                    <img src={st.thumbnailUrl} style={{ width: '100%', borderRadius: 8 }} alt="thumbnail" />
                  )}
                  {(st?.status === 'fetching') && (
                    <div style={{ height: 100, background: '#080c10', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', fontSize: 12 }}>
                      ⏳ A gerar STL…
                    </div>
                  )}
                  {st?.status === 'rendering' && st.stlUrl && (
                    <ThumbnailCapture
                      stlUrl={st.stlUrl}
                      designId={d.id}
                      onCaptured={(url) => {
                        setStates(s => ({ ...s, [d.id]: { ...s[d.id], status: 'done', thumbnailUrl: url } }));
                        setDesigns(prev => prev.map(x => x.id === d.id ? { ...x, thumbnail_url: url } : x));
                      }}
                      onError={(err) => setStates(s => ({ ...s, [d.id]: { ...s[d.id], status: 'error', error: err } }))}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Designs com thumbnail */}
      {com.length > 0 && (
        <>
          <h2 style={{ fontSize: 14, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 16 }}>Com thumbnail</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
            {com.map(d => (
              <div key={d.id} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, overflow: 'hidden' }}>
                <img src={d.thumbnail_url!} style={{ width: '100%', height: 140, objectFit: 'cover', display: 'block' }} alt={d.nome} />
                <div style={{ padding: '10px 12px' }}>
                  <p style={{ margin: '0 0 2px', fontWeight: 600, fontSize: 13 }}>{d.nome}</p>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <p style={{ margin: 0, fontSize: 11, color: '#475569' }}>{d.familia}</p>
                    <button
                      onClick={() => generateOne(d)}
                      style={{ padding: '3px 10px', background: 'transparent', color: '#475569', border: '1px solid #1e293b', borderRadius: 6, cursor: 'pointer', fontSize: 10 }}
                    >
                      ↺ Regenerar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
