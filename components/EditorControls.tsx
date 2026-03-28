'use client';

import { useState } from 'react';

export default function EditorControls({ produto, onUpdate }: any) {
  const [localValores, setLocalValores] = useState({ 
    fonte: 'OpenSans', 
    nome_pet: '', 
    telefone: '',
    fontSize: 7,
    yPos: 0,
    xPos: 0, // Valor inicial que já tinhas no STLViewer
    fontSizeN: 6.5,
    yPosN: 0,
    xPosN: 0
  });

  const handleChange = (chave: string, valor: any) => {
    const novosValores = { ...localValores, [chave]: valor };
    setLocalValores(novosValores);
    onUpdate(novosValores);
  };

  const labelStyle = { fontSize: '10px', color: '#64748b', fontWeight: 'bold', display: 'block', marginBottom: '5px' };
  const containerStyle = { background: '#0f172a', padding: '10px', borderRadius: '6px', border: '1px solid #334155' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      {/* INPUT NOME */}
<input 
  placeholder="NOME DO PET"
  type="text" 
  value={localValores.nome_pet}
  onChange={(e) => handleChange('nome_pet', e.target.value)}
  style={{ /* teus estilos */ }}
/>


      {/* SELETOR DE FONTE */}
      <div>
        <label style={labelStyle}>ESTILO DA FONTE:</label>
        <select 
          onChange={(e) => handleChange('fonte', e.target.value)}
          style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px' }}
        >
          <option value="OpenSans">Open Sans</option>
          <option value="Bebas">Bebas Neue</option>
          <option value="Eindhoven">Eindhoven</option>
          <option value="BADABB">BADABB</option>
          <option value="Playfair">Playfair Display</option>
        </select>
      </div>

      {/* SLIDER: TAMANHO */}
      <div style={containerStyle}>
        <label style={labelStyle}>TAMANHO DO TEXTO ({localValores.fontSize})</label>
        <input 
          type="range" min="3" max="15" step="0.5"
          value={localValores.fontSize}
          onChange={(e) => handleChange('fontSize', parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {/* SLIDER: POSIÇÃO VERTICAL (y) */}
      <div style={containerStyle}>
        <label style={labelStyle}>POSIÇÃO VERTICAL ({localValores.yPos})</label>
        <input 
          type="range" min="-20" max="20" step="0.1"
          value={localValores.yPos}
          onChange={(e) => handleChange('yPos', parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {/* SLIDER: POSIÇÃO HORIZONTAL (X) */}
      <div style={containerStyle}>
        <label style={labelStyle}>POSIÇÃO HORIZONTAL ({localValores.xPos})</label>
        <input 
          type="range" min="-20" max="20" step="0.1"
          value={localValores.xPos}
          onChange={(e) => handleChange('xPos', parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

{/* INPUT TELEFONE - O QUE TINHA DESAPARECIDO */}
<input 
  placeholder="NÚMERO DE TELEFONE"
  type="text" 
  value={localValores.telefone}
  onChange={(e) => handleChange('telefone', e.target.value)}
  style={{ /* teus estilos */ }}
/>

        {/* SLIDER: TAMANHO Numero*/}
      <div style={containerStyle}>
        <label style={labelStyle}>TAMANHO DO NÚMERO ({localValores.fontSize})</label>
        <input 
          type="range" min="3" max="15" step="0.5"
          value={localValores.fontSizeN}
          onChange={(e) => handleChange('fontSizeN', parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {/* SLIDER: POSIÇÃO VERTICAL numero (y) */}
      <div style={containerStyle}>
        <label style={labelStyle}>POSIÇÃO VERTICAL DO NÚMERO ({localValores.yPos})</label>
        <input 
          type="range" min="-20" max="20" step="0.1"
          value={localValores.yPosN}
          onChange={(e) => handleChange('yPosN', parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>

      {/* SLIDER: POSIÇÃO HORIZONTAL numero (X) */}
      <div style={containerStyle}>
        <label style={labelStyle}>POSIÇÃO HORIZONTAL ({localValores.xPos})</label>
        <input 
          type="range" min="-20" max="20" step="0.1"
          value={localValores.xPosN}
          onChange={(e) => handleChange('xPosN', parseFloat(e.target.value))}
          style={{ width: '100%' }}
        />
      </div>
      
      <div style={{ padding: '15px', background: '#0f172a', borderRadius: '8px', textAlign: 'center', fontWeight: 'bold', fontSize: '18px' }}>
        {produto?.preco || '0.00'} €
      </div>
    </div>
  );
}