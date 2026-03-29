'use client';

import { useState, useEffect } from 'react';

export default function EditorControls({ produto, onUpdate }: any) {
  const [loading, setLoading] = useState(false);
  const [localValores, setLocalValores] = useState({ 
    fonte: 'OpenSans', 
    nome_pet: '', 
    telefone: '',
    fontSize: 7,
    yPos: 0,
    xPos: 0,
    fontSizeN: 6.5,
    yPosN: 0,
    xPosN: 0
  });

  // Sincroniza com os valores da BD
  useEffect(() => {
    if (produto) {
      setLocalValores(prev => ({
        ...prev,
        xPos: produto.def_x_nome ?? 0,
        yPos: produto.def_y_nome ?? 0,
        fontSize: produto.def_size_nome ?? 7,
        xPosN: produto.def_x_num ?? 0,
        yPosN: produto.def_y_num ?? 0,
        fontSizeN: produto.def_size_num ?? 6.5,
      }));
    }
  }, [produto?.id]);

  const handleChange = (chave: string, valor: any) => {
    const novosValores = { ...localValores, [chave]: valor };
    setLocalValores(novosValores);
    onUpdate(novosValores);
  };

  const handleGerarSTL = async () => {
    setLoading(true);
    const baseUrl = "https://maker-pro-docker.onrender.com";
    
    try {
      const response = await fetch(`${baseUrl}/api/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produto: produto,
          valores: localValores // Envia TUDO: nome, telefone, xPos, yPos, fontSize, etc.
        }),
      });

      const data = await response.json();

      if (data.success && data.url) {
        window.open(`${baseUrl}${data.url}`, '_blank');
      } else {
        alert("Erro no servidor: " + data.error);
      }
    } catch (err) {
      alert("Erro de ligação. O servidor ainda está a bloquear o CORS ou está a acordar.");
    } finally {
      setLoading(false);
    }
  };

  const labelStyle = { fontSize: '10px', color: '#888', fontWeight: 'bold', display: 'block', marginBottom: '5px' };
  const sectionStyle = { background: '#16181a', padding: '10px', borderRadius: '6px', marginBottom: '10px', border: '1px solid #333' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px' }}>
      
      {/* SEÇÃO NOME */}
      <div style={sectionStyle}>
        <label style={labelStyle}>NOME DO PET (FRENTE)</label>
        <input 
          type="text" 
          value={localValores.nome_pet}
          onChange={(e) => handleChange('nome_pet', e.target.value)}
          style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', color: 'white', borderRadius: '4px' }}
        />
        <label style={labelStyle}>TAMANHO NOME: {localValores.fontSize}</label>
        <input type="range" min="3" max="15" step="0.5" value={localValores.fontSize} onChange={(e) => handleChange('fontSize', parseFloat(e.target.value))} style={{ width: '100%' }} />
        <label style={labelStyle}>POSIÇÃO X: {localValores.xPos} | Y: {localValores.yPos}</label>
        <input type="range" min="-20" max="20" step="0.1" value={localValores.xPos} onChange={(e) => handleChange('xPos', parseFloat(e.target.value))} style={{ width: '100%' }} />
        <input type="range" min="-20" max="20" step="0.1" value={localValores.yPos} onChange={(e) => handleChange('yPos', parseFloat(e.target.value))} style={{ width: '100%' }} />
      </div>

      {/* SEÇÃO TELEFONE - REPOSTA AQUI */}
      <div style={sectionStyle}>
        <label style={labelStyle}>TELEFONE (VERSO)</label>
        <input 
          type="text" 
          value={localValores.telefone}
          onChange={(e) => handleChange('telefone', e.target.value)}
          style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', color: 'white', borderRadius: '4px' }}
        />
        <label style={labelStyle}>TAMANHO NÚMERO: {localValores.fontSizeN}</label>
        <input type="range" min="3" max="15" step="0.5" value={localValores.fontSizeN} onChange={(e) => handleChange('fontSizeN', parseFloat(e.target.value))} style={{ width: '100%' }} />
        <label style={labelStyle}>POSIÇÃO X NÚMERO: {localValores.xPosN} | Y: {localValores.yPosN}</label>
        <input type="range" min="-20" max="20" step="0.1" value={localValores.xPosN} onChange={(e) => handleChange('xPosN', parseFloat(e.target.value))} style={{ width: '100%' }} />
        <input type="range" min="-20" max="20" step="0.1" value={localValores.yPosN} onChange={(e) => handleChange('yPosN', parseFloat(e.target.value))} style={{ width: '100%' }} />
      </div>

      <button 
        onClick={handleGerarSTL}
        disabled={loading}
        style={{ padding: '15px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
      >
        {loading ? 'A PROCESSAR...' : 'VISUALIZAR RENDER FINAL'}
      </button>
    </div>
  );
}