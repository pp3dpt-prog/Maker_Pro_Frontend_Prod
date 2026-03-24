'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase'; 
import STLViewer from '@/components/STLViewer';

function STLMakerContent() {
  const searchParams = useSearchParams();
  const designId = searchParams.get('id'); // Obtém o ID da URL

  const [config, setConfig] = useState<any>(null); 
  const [formData, setFormData] = useState<any>({}); 
  const [isGenerating, setIsGenerating] = useState(false);
  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    });
  }, []);

  // Carrega a configuração do design (Caixa ou Tag) da Supabase 
  useEffect(() => {
    async function fetchDesignConfig() {
      if (!designId) {
        setLoadingConfig(false);
        return;
      }
      const { data } = await supabase.from('prod_designs').select('*').eq('id', designId).single();
      if (data) {
        setConfig(data);
        const initialData: any = {};
        // Inicializa os campos dinâmicos (ex: largura, altura para a caixa) 
        data.ui_schema?.forEach((campo: any) => {
          initialData[campo.name] = campo.default || '';
        });
        setFormData(initialData);
      }
      setLoadingConfig(false);
    }
    fetchDesignConfig();
  }, [designId]);

  async function fetchProfile(userId: string) {
    const { data } = await supabase.from('prod_perfis').select('creditos_disponiveis, acesso_comercial_ativo').eq('id', userId).single();
    if (data) setUserProfile(data);
  }

  const handlePreview = async () => {
    if (!config) return;
    setIsGenerating(true);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    try {
      const response = await fetch(`${backendUrl}/gerar-stl-pro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Envia os dados conforme esperado pelo teu novo server.js 
        body: JSON.stringify({ 
          scad_template: config.scad_template, 
          parametros: formData 
        }),
      });
      const data = await response.json();
      if (data.url) setStlUrl(data.url); 
    } catch (err) {
      alert("Erro ao ligar ao servidor.");
    } finally {
      setIsGenerating(false);
    }
  };

  if (loadingConfig) return <div style={{color: 'white', padding: '20px'}}>A carregar...</div>;
  if (!designId) return <div style={{color: 'white', padding: '20px'}}>ID do modelo não fornecido na URL (?id=...).</div>;

  return (
    <div className="container">
      <style jsx>{`
        .container { display: flex; flex-direction: row; min-height: 100vh; background-color: #0f172a; color: #f1f5f9; font-family: sans-serif; }
        .sidebar { width: 400px; background-color: #1e293b; padding: 40px; border-right: 1px solid #334155; overflow-y: auto; }
        .viewer { flex: 1; background: radial-gradient(circle, #1e293b 0%, #0f172a 100%); display: flex; align-items: center; justify-content: center; position: relative; }
        .btn-main { width: 100%; padding: 16px; background: #2563eb; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; margin-top: 20px; }
        input { width: 100%; padding: 12px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: white; margin-bottom: 15px; }
        .label { display: block; font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px; font-weight: bold; }
      `}</style>

      <div className="sidebar">
        <h1>{config?.nome?.toUpperCase() || 'PERSONALIZADOR'}</h1>
        
        {/* Renderização Dinâmica baseada no ui_schema da Supabase  */}
        {config?.ui_schema?.map((campo: any) => (
          <div key={campo.name} style={{ marginBottom: '20px' }}>
            <span className="label">{campo.label}</span>
            {campo.type === 'slider' ? (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input 
                  type="range" min={campo.min} max={campo.max} 
                  value={formData[campo.name] || campo.min}
                  onChange={(e) => setFormData({...formData, [campo.name]: Number(e.target.value)})} 
                />
                <span>{formData[campo.name]}</span>
              </div>
            ) : (
              <input 
                value={formData[campo.name] || ''} 
                onChange={(e) => setFormData({...formData, [campo.name]: e.target.value})} 
              />
            )}
          </div>
        ))}

        <button className="btn-main" onClick={handlePreview} disabled={isGenerating}>
          {isGenerating ? 'A GERAR...' : 'VISUALIZAR'}
        </button>
      </div>

      <div className="viewer">
        <STLViewer url={stlUrl} />
      </div>
    </div>
  );
}

export default function STLMakerPro() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <STLMakerContent />
    </Suspense>
  );
}