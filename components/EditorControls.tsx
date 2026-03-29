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

  // 1. Sincroniza com os valores padrão da BD quando o produto muda
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

  // 2. FUNÇÃO DE RENDERIZAÇÃO (Ligação ao Render.com)
  const handleGerarSTL = async () => {
    setLoading(true);
    try {
      // URL do teu projeto no Render.com
      const backendUrl = "https://maker-pro-docker.onrender.com";
      const endpoint = "/api/render"; 

      const response = await fetch(`${backendUrl}${endpoint}`, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          produto: produto,
          valores: localValores
        }),
      });

      if (!response.ok) throw new Error("Erro na ligação ao servidor");

      const data = await response.json();

      if (data.success && data.url) {
        // Abre o ficheiro STL gerado no servidor do Render.com
        window.open(`${backendUrl}${data.url}`, '_blank');
      } else {
        alert("Erro no motor de render: " + (data.error || "Erro desconhecido"));
      }
    } catch (err) {
      console.error(err);
      alert("O servidor está a acordar ou offline. Tenta novamente em 30 segundos.");
    } finally {
      setLoading(false);
    }
  };

  const labelStyle = { fontSize: '10px', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '5px' };
  const containerStyle = { background: '#0f172a', padding: '10px', borderRadius: '6px', border: '1px solid #334155', marginBottom: '10px' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', padding: '10px' }}>
      
      {/* SEÇÃO NOME (FRENTE) */}
      <div style={containerStyle}>
        <label style={labelStyle}>NOME DO PET (FRENTE)</label>
        <input 
          type="text" 
          placeholder="REX"
          value={localValores.nome_pet}
          onChange={(e) => handleChange('nome_pet', e.target.value)}
          style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #334155', color: 'white', borderRadius: '6px', marginBottom: '10px' }}
        />
        <label style={labelStyle}>TAMANHO NOME ({localValores.fontSize})</label>
        <input type="range" min="3" max="15" step="0.5" value={localValores.fontSize} onChange={(e) => handleChange('fontSize', parseFloat(e.target.value))} style={{ width: '100%' }} />
        
        <label style={labelStyle}>POSIÇÃO X ({localValores.xPos})</label>
        <input type="range" min={produto?.min_x_nome ?? -20} max={produto?.max_x_nome ?? 20} step="0.1" value={localValores.xPos} onChange={(e) => handleChange('xPos', parseFloat(e.target.value))} style={{ width: '100%' }} />
        
        <label style={labelStyle}>POSIÇÃO Y ({localValores.yPos})</label>
        <input type="range" min={produto?.min_y_nome ?? -15} max={produto?.max_y_nome ?? 15} step="0.1" value={localValores.yPos} onChange={(e) => handleChange('yPos', parseFloat(e.target.value))} style={{ width: '100%' }} />
      </div>

      {/* SEÇÃO TELEFONE (VERSO) */}
      <div style={containerStyle}>
        <label style={labelStyle}>TELEFONE (VERSO)</label>
        <input 
          type="text" 
          placeholder="912..."
          value={localValores.telefone}
          onChange={(e) => handleChange('telefone', e.target.value)}
          style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #334155', color: 'white', borderRadius: '6px', marginBottom: '10px' }}
        />
        <label style={labelStyle}>TAMANHO NÚMERO ({localValores.fontSizeN})</label>
        <input type="range" min="3" max="15" step="0.5" value={localValores.fontSizeN} onChange={(e) => handleChange('fontSizeN', parseFloat(e.target.value))} style={{ width: '100%' }} />
        
        <label style={labelStyle}>POSIÇÃO X NÚMERO ({localValores.xPosN})</label>
        <input type="range" min={produto?.min_x_num ?? -20} max={produto?.max_x_num ?? 20} step="0.1" value={localValores.xPosN} onChange={(e) => handleChange('xPosN', parseFloat(e.target.value))} style={{ width: '100%' }} />
        
        <label style={labelStyle}>POSIÇÃO Y NÚMERO ({localValores.yPosN})</label>
        <input type="range" min={produto?.min_y_num ?? -15} max={produto?.max_y_num ?? 15} step="0.1" value={localValores.yPosN} onChange={(e) => handleChange('yPosN', parseFloat(e.target.value))} style={{ width: '100%' }} />
      </div>

      {/* SELETOR DE FONTE */}
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

      {/* BOTÃO DE RENDERIZAÇÃO FINAL */}
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
        {loading ? 'A GERAR FICHEIRO 3D...' : 'VISUALIZAR RENDER FINAL'}
      </button>

      {/* PREÇO */}
      <div style={{ padding: '15px', background: '#0f172a', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '18px', color: 'white' }}>
        {produto?.preco || '0.00'} €
      </div>
    </div>
  );
}