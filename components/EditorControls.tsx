'use client';

import { useState, useEffect } from 'react';

export default function EditorControls({ produto, onUpdate }: any) {
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

  // Sincroniza com os valores padrão da BD quando o produto muda
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

  const labelStyle = { fontSize: '10px', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '5px' };
  const containerStyle = { background: '#0f172a', padding: '10px', borderRadius: '6px', border: '1px solid #334155', marginBottom: '10px' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      {/* SEÇÃO NOME */}
      <div style={containerStyle}>
        <label style={labelStyle}>NOME DO PET</label>
        <input 
          type="text" 
          placeholder="Ex: REX"
          value={localValores.nome_pet}
          onChange={(e) => handleChange('nome_pet', e.target.value)}
          style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #334155', color: 'white', borderRadius: '6px', marginBottom: '10px' }}
        />
        <label style={labelStyle}>TAMANHO ({localValores.fontSize})</label>
        <input type="range" min="3" max="15" step="0.5" value={localValores.fontSize} onChange={(e) => handleChange('fontSize', parseFloat(e.target.value))} style={{ width: '100%' }} />
        
        <label style={labelStyle}>POSIÇÃO X ({localValores.xPos})</label>
        <input type="range" min={produto?.min_x_nome ?? -20} max={produto?.max_x_nome ?? 20} step="0.1" value={localValores.xPos} onChange={(e) => handleChange('xPos', parseFloat(e.target.value))} style={{ width: '100%' }} />
        
        <label style={labelStyle}>POSIÇÃO Y ({localValores.yPos})</label>
        <input type="range" min={produto?.min_y_nome ?? -15} max={produto?.max_y_nome ?? 15} step="0.1" value={localValores.yPos} onChange={(e) => handleChange('yPos', parseFloat(e.target.value))} style={{ width: '100%' }} />
      </div>

      {/* SEÇÃO TELEFONE */}
      <div style={containerStyle}>
        <label style={labelStyle}>TELEFONE (VERSO)</label>
        <input 
          type="text" 
          placeholder="912 345 678"
          value={localValores.telefone}
          onChange={(e) => handleChange('telefone', e.target.value)}
          style={{ width: '100%', padding: '10px', background: '#1e293b', border: '1px solid #334155', color: 'white', borderRadius: '6px', marginBottom: '10px' }}
        />
        <label style={labelStyle}>TAMANHO ({localValores.fontSizeN})</label>
        <input type="range" min="3" max="15" step="0.5" value={localValores.fontSizeN} onChange={(e) => handleChange('fontSizeN', parseFloat(e.target.value))} style={{ width: '100%' }} />
        
        <label style={labelStyle}>POSIÇÃO X ({localValores.xPosN})</label>
        <input type="range" min={produto?.min_x_num ?? -20} max={produto?.max_x_num ?? 20} step="0.1" value={localValores.xPosN} onChange={(e) => handleChange('xPosN', parseFloat(e.target.value))} style={{ width: '100%' }} />
        
        <label style={labelStyle}>POSIÇÃO Y ({localValores.yPosN})</label>
        <input type="range" min={produto?.min_y_num ?? -15} max={produto?.max_y_num ?? 15} step="0.1" value={localValores.yPosN} onChange={(e) => handleChange('yPosN', parseFloat(e.target.value))} style={{ width: '100%' }} />
      </div>

      {/* SELETOR DE FONTE */}
      <div style={containerStyle}>
        <label style={labelStyle}>FONTE</label>
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
    </div>
  );
}