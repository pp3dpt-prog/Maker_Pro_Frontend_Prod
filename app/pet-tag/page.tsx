'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; 
import STLViewer from '@/components/STLViewer';

export default function STLMakerPro() {
  const [shape, setShape] = useState('Osso');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [stlUrl, setStlUrl] = useState(null);
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [mostrarPreview, setMostrarPreview] = useState(false); // Novo estado

  // 1. useEffect para carregar o perfil do utilizador (apenas uma vez ao montar)
useEffect(() => {
  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      setUser(session.user);
      fetchProfile(session.user.id);
    }
  });
}, []); // O array vazio [] diz ao React: "só corre uma vez, ao carregar"

// 2. useEffect para a lógica da forma (se existir)
useEffect(() => {
  // A tua lógica de visualizador aqui
  setStlUrl(`/models/blank_${shape.toLowerCase()}.stl`);
}, [shape]); // Este só corre quando a variável 'shape' muda

  async function fetchProfile(userId) {
    const { data, error } = await supabase.from('prod_perfis').select('creditos_disponiveis, acesso_comercial_ativo').eq('id', userId).single();
    if (data) {
      setUserProfile(data);
    } else if (error) {
      console.error("Erro ao carregar perfil:", error);
    }
  }

  const handlePreview = async () => {
    setIsGenerating(true);
    setStlUrl(null);
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    try {
      const response = await fetch(`${backendUrl}/gerar-stl-pro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: name, telefone: phone, forma: shape }),
      });
      const data = await response.json();
      if (data.url) setStlUrl(data.url); 
      else alert("Erro no motor: " + (data.error || "Desconhecido"));
    } catch (err) {
      alert("Erro ao ligar ao servidor.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = async () => {
    if (!user) {
      alert("Precisas de estar logado para descarregar.");
      return;
    }

    // Verificar créditos ou plano
    if (!userProfile?.acesso_comercial_ativo && (userProfile?.creditos_disponiveis || 0) <= 0) {
      alert("Créditos insuficientes.");
      return;
    }

    // Deduzir crédito se não for premium
    if (!userProfile?.plan_active) {
      const { error } = await supabase.rpc('deduct_credit', { user_id: user.id });
      if (error) { alert("Erro ao processar."); return; }
      fetchProfile(user.id); 
    }

    // Realizar download
    try {
      const response = await fetch(stlUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${name || 'modelo'}.stl`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Erro ao descarregar.");
    }
  };

  return (
    <div className="container">
      <style jsx>{`
        .container { display: flex; flex-direction: row; min-height: 100vh; background-color: #0f172a; color: #f1f5f9; font-family: sans-serif; }
        .sidebar { width: 400px; background-color: #1e293b; padding: 40px; border-right: 1px solid #334155; }
        .viewer { flex: 1; background: radial-gradient(circle, #1e293b 0%, #0f172a 100%); display: flex; align-items: center; justify-content: center; position: relative; }
        .btn-main { width: 100%; padding: 16px; background: #2563eb; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; margin-top: 20px; }
        .grid-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
        .btn-shape { padding: 12px; background: #0f172a; border: 2px solid #334155; color: #94a3b8; border-radius: 8px; cursor: pointer; }
        .btn-shape.active { border-color: #3b82f6; background: #1e3a8a; color: white; }
        input { width: 100%; padding: 12px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: white; margin-bottom: 15px; }
      `}</style>

      <div className="sidebar">
        <h1>PET <span>TAG</span></h1>
        
        <span className="label">1. Escolha a Forma</span>
        <div className="grid-buttons">
          {['Osso', 'Redondo', 'Hexagono', 'Coração'].map(s => (
            <button key={s} className={`btn-shape ${shape === s ? 'active' : ''}`} onClick={() => setShape(s)}>{s}</button>
          ))}
        </div>

        <span className="label">2. Dados da Peça</span>
        <input placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Telemóvel" value={phone} onChange={(e) => setPhone(e.target.value)} />
        
        <button 
          className="btn-main" 
          onClick={() => setMostrarPreview(!mostrarPreview)}
        >
          {mostrarPreview ? "VER PEÇA ORIGINAL" : "VISUALIZAR PERSONALIZAÇÃO"}
        </button>

        {stlUrl && (
          <button className="btn-main" style={{background: '#059669'}} onClick={handleDownload}>
            DESCARREGAR STL
          </button>
        )}
      </div>

      <div className="viewer">
        {isGenerating ? <p>Gerando...</p> : (
          <STLViewer url={stlUrl} 
            valores={{ nome_pet: name, telefone: phone }} />
        )}
      </div>
    </div>
  );
}