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

  // Sincroniza com a Base de Dados ao carregar o produto
  useEffect(() => {
    if (produto) {
      const novosValores = {
        ...localValores,
        xPos: produto.def_x_nome ?? 0,
        yPos: produto.def_y_nome ?? 0,
        fontSize: produto.def_size_nome ?? 7,
        xPosN: produto.def_x_num ?? 0,
        yPosN: produto.def_y_num ?? 0,
        fontSizeN: produto.def_size_num ?? 6.5,
      };
      setLocalValores(novosValores);
      onUpdate(novosValores);
    }
  }, [produto?.id]);

  const handleChange = (chave: string, valor: any) => {
    const novosValores = { ...localValores, [chave]: valor };
    setLocalValores(novosValores);
    onUpdate(novosValores);
  };

  const handleGerarSTL = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produto, valores: localValores }),
      });
      const data = await response.json();
      if (data.url) window.open(data.url, '_blank');
      else alert("Erro ao gerar: " + data.error);
    } catch (err) {
      alert("Erro na ligação ao servidor.");
    } finally {
      setLoading(false);
    }
  };

  const labelStyle = { fontSize: '10px', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '5px' };
  const containerStyle = { background: '#0f172a', padding: '10px', borderRadius: '6px', border: '1px solid #334155', marginBottom: '10px' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '10px' }}>
      
      {/* --- SEÇÃO NOME (FRENTE) --- */}
      <div style={containerStyle}>
        <label style={labelStyle}>NOME DO PET</label>
        <input 
          type="text" 
          placeholder="REX"
          value={localValores.nome_pet}
          onChange={(e) => handleChange('nome_pet', e.target.value)}
          style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #334155', color: 'white', borderRadius: '6px', marginBottom: '10px' }}
        />
        
        <label style={labelStyle}>TAMANHO NOME ({localValores.fontSize})</label>
        <input type="range" min="3" max="15" step="0.5" value={localValores.fontSize} onChange={(e) => handleChange('fontSize', parseFloat(e.target.value))} style={{ width: '100%' }} />
        
        <label style={labelStyle}>POSIÇÃO X (NOME) ({localValores.xPos})</label>
        <input type="range" min={produto?.min_x_nome ?? -20} max={produto?.max_x_nome ?? 20} step="0.1" value={localValores.xPos} onChange={(e) => handleChange('xPos', parseFloat(e.target.value))} style={{ width: '100%' }} />
        
        <label style={labelStyle}>POSIÇÃO Y (NOME) ({localValores.yPos})</label>
        <input type="range" min={produto?.min_y_nome ?? -15} max={produto?.max_y_nome ?? 15} step="0.1" value={localValores.yPos} onChange={(e) => handleChange('yPos', parseFloat(e.target.value))} style={{ width: '100%' }} />
      </div>

      {/* --- SEÇÃO TELEFONE (VERSO) --- */}
      <div style={containerStyle}>
        <label style={labelStyle}>TELEFONE / NÚMERO</label>
        <input 
          type="text" 
          placeholder="912..."
          value={localValores.telefone}
          onChange={(e) => handleChange('telefone', e.target.value)}
          style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #334155', color: 'white', borderRadius: '6px', marginBottom: '10px' }}
        />
        
        <label style={labelStyle}>TAMANHO NÚMERO ({localValores.fontSizeN})</label>
        <input type="range" min="3" max="15" step="0.5" value={localValores.fontSizeN} onChange={(e) => handleChange('fontSizeN', parseFloat(e.target.value))} style={{ width: '100%' }} />
        
        <label style={labelStyle}>POSIÇÃO X (NÚMERO) ({localValores.xPosN})</label>
        <input type="range" min={produto?.min_x_num ?? -20} max={produto?.max_x_num ?? 20} step="0.1" value={localValores.xPosN} onChange={(e) => handleChange('xPosN', parseFloat(e.target.value))} style={{ width: '100%' }} />
        
        <label style={labelStyle}>POSIÇÃO Y (NÚMERO) ({localValores.yPosN})</label>
        <input type="range" min={produto?.min_y_num ?? -15} max={produto?.max_y_num ?? 15} step="0.1" value={localValores.yPosN} onChange={(e) => handleChange('yPosN', parseFloat(e.target.value))} style={{ width: '100%' }} />
      </div>

      {/* --- SELETOR DE FONTE --- */}
      <div style={containerStyle}>
        <label style={labelStyle}>ESTILO DA FONTE</label>
        <select 
          value={localValores.fonte}
          onChange={(e) => handleChange('fonte', e.target.value)}
          style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #334155', color: 'white', borderRadius: '6px' }}
        >
          <option value="OpenSans">Open Sans</option>
          <option value="Bebas">Bebas Neue</option>
          <option value="Eindhoven">Eindhoven</option>
          <option value="BADABB">Badaboom</option>
          <option value="Playfair">Playfair</option>
        </select>
      </div>

      {/* BOTÃO DE RENDERIZAÇÃO */}
      <button 
        onClick={handleGerarSTL}
        disabled={loading}
        style={{ 
          padding: '15px', 
          background: loading ? '#475569' : '#3b82f6', 
          color: 'white', 
          border: 'none', 
          borderRadius: '8px', 
          fontWeight: 'bold',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'A GERAR STL FINAL...' : 'VISUALIZAR RENDER FINAL'}
      </button>
    </div>
  );
}