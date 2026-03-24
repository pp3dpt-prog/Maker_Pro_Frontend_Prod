'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase'; 
import STLViewer from '@/components/STLViewer';

function CustomizadorContent() {
  const searchParams = useSearchParams();
  const designId = searchParams.get('id');

  const [config, setConfig] = useState<any>(null); 
  const [formData, setFormData] = useState<any>({}); 
  const [isGenerating, setIsGenerating] = useState(false);
  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDesign() {
      if (!designId) { setLoading(false); return; }
      const { data } = await supabase.from('prod_designs').select('*').eq('id', designId).single();
      if (data) {
        setConfig(data);
        const initial: any = {};
        data.ui_schema?.forEach((c: any) => initial[c.name] = c.default || '');
        setFormData(initial);
      }
      setLoading(false);
    }
    loadDesign();
  }, [designId]);

  const handlePreview = async () => {
    if (!config) return;
    setIsGenerating(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/gerar-stl-pro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scad_template: config.scad_template, parametros: formData }),
      });
      const data = await response.json();
      if (data.url) setStlUrl(data.url);
    } catch (e) { alert("Erro ao ligar ao Docker."); }
    finally { setIsGenerating(false); }
  };

  if (loading) return <div style={{color: 'white', padding: '20px'}}>A carregar...</div>;
  if (!designId) return <div style={{color: 'white', padding: '20px'}}>ID em falta.</div>;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a', color: 'white' }}>
      <div style={{ width: '350px', padding: '30px', background: '#1e293b', borderRight: '1px solid #334155' }}>
        <h1>{config?.nome || 'Customizador'}</h1>
        {config?.ui_schema?.map((field: any) => (
          <div key={field.name} style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>{field.label}</label>
            {field.type === 'slider' ? (
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="range" min={field.min} max={field.max} value={formData[field.name]}
                  onChange={(e) => setFormData({...formData, [field.name]: Number(e.target.value)})} />
                <span>{formData[field.name]}</span>
              </div>
            ) : (
              <input style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', color: 'white' }}
                value={formData[field.name]} onChange={(e) => setFormData({...formData, [field.name]: e.target.value})} />
            )}
          </div>
        ))}
        <button onClick={handlePreview} disabled={isGenerating}
          style={{ width: '100%', padding: '15px', background: '#2563eb', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          {isGenerating ? 'A PROCESSAR...' : 'VISUALIZAR 3D'}
        </button>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#020617' }}>
        {isGenerating ? <div style={{ color: '#3b82f6' }}>A gerar geometria...</div> : <STLViewer url={stlUrl} />}
      </div>
    </div>
  );
}

export default function Page() {
  return <Suspense fallback={<div>A carregar...</div>}><CustomizadorContent /></Suspense>;
}