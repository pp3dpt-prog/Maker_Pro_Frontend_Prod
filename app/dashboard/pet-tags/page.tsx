'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase'; 
import STLViewer from '@/components/STLViewer';

function STLMakerContent() {
  const searchParams = useSearchParams();
  const designId = searchParams.get('id'); // Lê o ID da URL (?id=...)

  const [config, setConfig] = useState<any>(null); 
  const [formData, setFormData] = useState<any>({}); 
  const [isGenerating, setIsGenerating] = useState(false);
  const [stlUrl, setStlUrl] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // 1. Carregar Sessão do Utilizador
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        fetchProfile(session.user.id);
      }
    });
  }, []);

  // 2. Carregar Configuração do Design da Supabase
  useEffect(() => {
    async function fetchDesignConfig() {
      if (!designId) {
        setLoadingConfig(false);
        return;
      }
      setLoadingConfig(true);
      const { data, error } = await supabase
        .from('prod_designs')
        .select('*')
        .eq('id', designId)
        .single();

      if (data) {
        setConfig(data);
        const initialData: any = {};
        // Preenche os valores iniciais (defaults) definidos no teu ui_schema
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
    const { data } = await supabase
      .from('prod_perfis')
      .select('creditos_disponiveis, acesso_comercial_ativo')
      .eq('id', userId)
      .single();
    if (data) setUserProfile(data);
  }

  const handlePreview = async () => {
    if (!config) return;
    setIsGenerating(true);
    setStlUrl(null);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    
    try {
      const response = await fetch(`${backendUrl}/gerar-stl-pro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Envia o template SCAD e os parâmetros (ex: largura, altura) para o Docker
        body: JSON.stringify({ 
          scad_template: config.scad_template, 
          parametros: formData 
        }),
      });
      const data = await response.json();
      if (data.url) setStlUrl(data.url); 
      else alert("Erro: " + (data.error || "Desconhecido"));
    } catch (err) {
      alert("Erro ao ligar ao servidor.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!user) { alert("Faz login para descarregar."); return; }
    if (!userProfile?.acesso_comercial_ativo && (userProfile?.creditos_disponiveis || 0) <= 0) {
      alert("Créditos insuficientes."); return;
    }

    if (!userProfile?.acesso_comercial_ativo) {
      const { error } = await supabase.rpc('deduct_credit', { user_id: user.id });
      if (error) { alert("Erro no processamento."); return; }
      fetchProfile(user.id); 
    }

    try {
      const response = await fetch(stlUrl!);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `modelo_3d.stl`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) { alert("Erro no download."); }
  };

  if (loadingConfig) return <div style={{padding: '20px'}}>A carregar configurações do modelo...</div>;
  if (!designId) return <div style={{padding: '20px'}}>Por favor, forneça um ID de modelo na URL (ex: ?id=...).</div>;

  return (
    <div className="container">
      <style jsx>{`
        .container { display: flex; flex-direction: row; min-height: 100vh; background-color: #0f172a; color: #f1f5f9; font-family: sans-serif; }
        .sidebar { width: 400px; background-color: #1e293b; padding: 40px; border-right: 1px solid #334155; overflow-y: auto; }
        .viewer { flex: 1; background: radial-gradient(circle, #1e293b 0%, #0f172a 100%); display: flex; align-items: center; justify-content: center; position: relative; }
        .btn-main { width: 100%; padding: 16px; background: #2563eb; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; margin-top: 20px; }
        .grid-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
        .btn-shape { padding: 12px; background: #0f172a; border: 2px solid #334155; color: #94a3b8; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
        .btn-shape.active { border-color: #3b82f6; background: #1e3a8a; color: white; }
        input { width: 100%; padding: 12px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: white; margin-bottom: 15px; }
        .label { display: block; font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; margin-bottom: 8px; font-weight: bold; }
      `}</style>

      <div className="sidebar">
        <h1>{config?.nome?.toUpperCase() || 'DESIGN'} <span>PRO</span></h1>
        
        {/* FORMULÁRIO DINÂMICO: Desenha os campos baseados no que está na Supabase */}
        {config?.ui_schema?.map((campo: any) => (
          <div key={campo.name} style={{ marginBottom: '20px' }}>
            <span className="label">{campo.label}</span>
            
            {campo.type === 'select' ? (
              <div className="grid-buttons">
                {campo.options.map((opt: string) => (
                  <button 
                    key={opt} 
                    className={`btn-shape ${formData[campo.name] === opt ? 'active' : ''}`} 
                    onClick={() => setFormData({...formData, [campo.name]: opt})}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : campo.type === 'slider' ? (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input 
                  type="range" min={campo.min} max={campo.max} 
                  value={formData[campo.name] || campo.min}
                  onChange={(e) => setFormData({...formData, [campo.name]: Number(e.target.value)})} 
                />
                <span style={{fontSize: '14px', width: '30px'}}>{formData[campo.name]}</span>
              </div>
            ) : (
              <input 
                placeholder={campo.placeholder || campo.label} 
                value={formData[campo.name] || ''} 
                onChange={(e) => setFormData({...formData, [campo.name]: e.target.value})} 
              />
            )}
          </div>
        ))}

        <button className="btn-main" onClick={handlePreview} disabled={isGenerating}>
          {isGenerating ? 'A GERAR...' : 'VISUALIZAR'}
        </button>

        {stlUrl && (
          <button className="btn-main" style={{background: '#059669'}} onClick={handleDownload}>
            DESCARREGAR STL
          </button>
        )}
      </div>

      <div className="viewer">
        {isGenerating ? <p>A processar 3D...</p> : (
          <STLViewer url={stlUrl} />
        )}
      </div>
    </div>
  );
}

export default function STLMakerPro() {
  return (
    <Suspense fallback={<div>Carregando motor dinâmico...</div>}>
      <STLMakerContent />
    </Suspense>
  );
}