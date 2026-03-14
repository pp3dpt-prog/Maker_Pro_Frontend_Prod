'use client';

import { useState, useEffect } from 'react';
// Use APENAS esta linha para o supabase
import { supabase } from '@/lib/supabase'; 
import { Ticket, Users, CreditCard, Activity, Plus } from 'lucide-react';
import CreateCouponForm from '@/components/admin/CreateCouponForm';
import STLViewer from '@/components/STLViewer';
// import RegisterModal from '@/components/RegisterModal'; // COMENTADO: Login desabilitado

// APAGUE as linhas que usam createClient, supabaseUrl e supabaseKey aqui!


export default function STLMakerPro() {
  const [shape, setShape] = useState('Osso');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [rating, setRating] = useState(0);
  const [suggestions, setSuggestions] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [stlUrl, setStlUrl] = useState(null);
  const [showDownload, setShowDownload] = useState(false);
  const [showThankYou, setShowThankYou] = useState(false);
  const [wantNotifications, setWantNotifications] = useState(false);
  const [notificationEmail, setNotificationEmail] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  // const [selectedFormat, setSelectedFormat] = useState('stl'); // COMENTADO: Escolha de formato desativada

  // Efeito para carregar a forma "em branco" inicial
  useEffect(() => {
    setStlUrl(`/models/blank_${shape.toLowerCase()}.stl`);
  }, [shape]);

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
      alert("Erro ao ligar ao servidor. Reporta o erro para o suporte.");
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Submissão Final (Sem verificação de login)
  const handleFinalSubmit = async (e) => {
    e.preventDefault();
    
    // Validação: rating obrigatório
    if (rating === 0) {
      alert("Por favor, dá uma avaliação (clica numa estrela)");
      return;
    }
    
    // Validação: email obrigatório se quer notificações
    if (wantNotifications && !notificationEmail) {
      alert("Por favor, insira um email válido para receber notificações.");
      return;
    }

    console.log("Dados a enviar:", {
      email: wantNotifications ? notificationEmail : null, 
      rating,
      feedback: suggestions || null,
      shape_type: shape, 
      custom_name: name, 
      file_url: stlUrl,
      wants_notifications: wantNotifications
    });

    // Grava no Supabase com rating, sugestões e notificações
    const { data, error } = await supabase.from('downloads_log').insert([{ 
      email: wantNotifications ? notificationEmail : null, 
      rating,
      feedback: suggestions || null, // Campo de sugestões
      shape_type: shape, 
      custom_name: name, 
      file_url: stlUrl,
      wants_notifications: wantNotifications
    }]);

    console.log("Resposta Supabase:", { data, error });

    if (!error) {
      setShowThankYou(true);
      setShowDownload(true);
    } else {
      console.error("Erro Supabase completo:", error);
      const errorMsg = error?.message || error?.details || JSON.stringify(error);
      setErrorMessage("Erro: " + errorMsg);
      setTimeout(() => setErrorMessage(''), 8000);
    }
  };

  return (
    <div className="container">
      {/* COMENTADO: Modal de Registo removido (login desabilitado) */}

      {/* Modal de Agradecimento */}
      {showThankYou && (
        <div style={{position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
          <div style={{background: '#1e293b', padding: '40px', borderRadius: '16px', textAlign: 'center', maxWidth: '400px', border: '1px solid #3b82f6'}}>
            <h2 style={{fontSize: '28px', marginBottom: '10px', color: '#3b82f6'}}>Obrigado! 🎉</h2>
            <p style={{color: '#94a3b8', marginBottom: '20px', lineHeight: '1.6'}}>A tua avaliação foi gravada com sucesso. Aprecia muito o teu feedback!</p>
            {wantNotifications && (
              <p style={{color: '#64748b', fontSize: '13px', marginBottom: '20px'}}>Vamos enviar novidades para: <strong>{notificationEmail}</strong></p>
            )}
            <a href={stlUrl} download={`${name || 'modelo'}.stl`} onClick={async (e) => {
              e.preventDefault();
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
                console.error("Erro ao descarregar:", err);
                alert("Erro ao descarregar o ficheiro. Tenta novamente.");
              }
              setShowThankYou(false);
            }} style={{display: 'inline-block', padding: '12px 28px', background: '#3b82f6', color: 'white', borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', cursor: 'pointer', border: 'none'}}>
              Descarregar STL
            </a>
          </div>
        </div>
      )}

      {/* Mensagem de Erro */}
      {errorMessage && (
        <div style={{position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: '#dc2626', color: 'white', padding: '15px 20px', borderRadius: '8px', zIndex: 999, maxWidth: '80%'}}>
          {errorMessage}
        </div>
      )}

      <style jsx>{`
        .container { display: flex; flex-direction: row; min-height: 100vh; background-color: #0f172a; color: #f1f5f9; font-family: sans-serif; }
        .sidebar { width: 400px; background-color: #1e293b; padding: 40px; border-right: 1px solid #334155; display: flex; flex-direction: column; gap: 30px; }
        .viewer { flex: 1; display: flex; align-items: center; justify-content: center; background: radial-gradient(circle, #1e293b 0%, #0f172a 100%); position: relative; }
        h1 { font-size: 2rem; font-weight: 900; margin: 0; letter-spacing: -1px; }
        h1 span { color: #3b82f6; }
        .label { font-size: 11px; text-transform: uppercase; font-weight: bold; color: #64748b; margin-bottom: 10px; display: block; }
        .grid-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .btn-shape { padding: 12px; background: #0f172a; border: 2px solid #334155; color: #94a3b8; border-radius: 8px; cursor: pointer; font-weight: bold; transition: 0.3s; }
        .btn-shape.active { border-color: #3b82f6; background: #1e3a8a; color: white; }
        input, textarea { width: 100%; padding: 12px; background: #0f172a; border: 1px solid #334155; border-radius: 8px; color: white; margin-bottom: 15px; box-sizing: border-box; }
        .btn-main { width: 100%; padding: 16px; background: #2563eb; color: white; border: none; border-radius: 12px; font-weight: bold; cursor: pointer; transition: 0.3s; }
        .btn-main:hover { background: #3b82f6; transform: translateY(-2px); }
        .feedback-box { background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); padding: 20px; border-radius: 16px; margin-top: 20px; }
        .stars { display: flex; gap: 5px; justify-content: center; margin-bottom: 15px; }
        .star { font-size: 24px; cursor: pointer; background: none; border: none; color: #334155; }
        .star.active { color: #facc15; }
        .loading-overlay { position: absolute; inset: 0; background: rgba(15, 23, 42, 0.8); display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 10; }
        .spinner { width: 40px; height: 40px; border: 4px solid #3b82f6; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 15px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .model-placeholder { width: 80%; height: 60%; background: #0f172a; border: 1px dashed #334155; border-radius: 40px; display: flex; align-items: center; justify-content: center; font-style: italic; color: #475569; }
        @media (max-width: 768px) { .container { flex-direction: column; } .sidebar { width: 100%; } }
      `}</style>

      {/* PAINEL LATERAL */}
      <div className="sidebar">
        <div>
          <h1>STL MAKER <span>PRO</span></h1>
          <p style={{color: '#64748b', fontSize: '14px'}}>Customização 3D Industrial</p>
        </div>

        <div className="section">
          <span className="label">1. Escolha a Forma</span>
          <div className="grid-buttons">
            {['Osso', 'Redondo', 'Hexagono', 'Coração'].map(s => (
              <button key={s} className={`btn-shape ${shape === s ? 'active' : ''}`} onClick={() => setShape(s)}>{s}</button>
            ))}
          </div>
        </div>

        <div className="section">
          <span className="label">2. Dados da Peça</span>
          
          <input 
            type="text" 
            placeholder="Nome (Frente)" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
          />
          
          <input 
            type="text" 
            placeholder="Telemóvel (Verso)" 
            value={phone} 
            onChange={(e) => setPhone(e.target.value)} 
          />
          
          <button className="btn-main" onClick={handlePreview}>VISUALIZAR AGORA</button>
        </div>

        {stlUrl && (
          <div className="feedback-box">
            <span className="label" style={{color: '#3b82f6'}}>3. Avaliação & Download</span>
            
            {/* Campo de Estrelas */}
            <div className="stars">
              {[1,2,3,4,5].map(s => (
                <button key={s} className={`star ${rating >= s ? 'active' : ''}`} onClick={() => setRating(s)}>★</button>
              ))}
            </div>
            
            {/* Campo de Sugestões */}
            <div style={{marginBottom: '15px'}}>
              <label style={{fontSize: '12px', color: '#64748b', marginBottom: '8px', display: 'block'}}>Sugestões</label>
              <textarea 
                placeholder="Deixa uma sugestão ou comentário (opcional)" 
                value={suggestions}
                
                onChange={(e) => setSuggestions(e.target.value)}
                style={{height: '70px', resize: 'none', width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: '#f1f5f9', boxSizing: 'border-box', marginBottom: '15px', fontFamily: 'inherit'}}
              />
            </div>
            
            {/* Pergunta de Notificações */}
            <div style={{marginBottom: '15px', padding: '12px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '10px'}}>
                <input 
                  type="checkbox" 
                  checked={wantNotifications}
                  onChange={(e) => setWantNotifications(e.target.checked)}
                  style={{width: '18px', height: '18px', cursor: 'pointer'}}
                />
                <span style={{fontSize: '14px'}}>Queres ser informado de novas novidades?</span>
              </label>
              {wantNotifications && (
                <input 
                  type="email" 
                  placeholder="teu@email.com"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  required={wantNotifications}
                  style={{width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', borderRadius: '6px', color: 'white', boxSizing: 'border-box', marginBottom: '0'}}
                />
              )}
            </div>
            
            {!showDownload ? (
              <button className="btn-main" style={{background: '#059669'}} onClick={handleFinalSubmit}>LIBERTAR FICHEIRO</button>
            ) : (
              <div style={{display: 'flex', gap: '10px'}}>
                <button className="btn-main" style={{background: 'linear-gradient(to right, #f59e0b, #d97706)', flex: 1}} onClick={async () => {
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
                    console.error("Erro ao descarregar:", err);
                    alert("Erro ao descarregar o ficheiro. Tenta novamente.");
                  }
                }}>
                  DESCARREGAR STL
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* VISUALIZADOR */}
      <div className="viewer">
        {isGenerating && (
          <div className="loading-overlay">
            <div className="spinner"></div>
            <p style={{color: '#ecedee', letterSpacing: '2px', fontSize: '12px'}}>GERANDO...</p>
          </div>
        )}
      
        {/* Usamos o componente STLViewer se houver stlUrl */}
        {stlUrl ? (
          <STLViewer url={stlUrl} 
          name={name}      // Passa a variável de estado 'name'
          phone={phone}    // Passa a variável de estado 'phone'
          />
        ) : (
          <div className="model-placeholder">
            <span>A carregar visualizador...</span>
          </div>
        )}
      </div>

      {/* Nota de rodapé */}
      <footer style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        background: 'rgba(15, 23, 42, 0.95)',
        color: '#cbd5e1',
        fontSize: '15px',
        padding: '8px 12px',
        textAlign: 'center',
        borderTop: '1px solid rgba(148, 163, 184, 0.2)',
        zIndex: 50,
      }}>
        🔔 <strong>Versão de teste:</strong> melhorias diárias. Para receber novidades, adiciona o teu email no formulário acima ou entra no Discord: <a href="https://discord.gg/PNWMa9xF" style={{color: '#3b82f6', textDecoration: 'underline'}} target="_blank" rel="noreferrer">discord.gg/PNWMa9xF</a>. Uso pessoal apenas; para licença comercial, fala com o proprietário no Discord.
      </footer>
    </div>
  );
}