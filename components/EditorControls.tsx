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
      const response = await fetch(`${baseUrl}/gerar-stl-pro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: localValores.nome_pet,
          telefone: localValores.telefone,
          forma: produto?.forma || 'circulo',
          fonte: localValores.fonte,
          userId: null, // Alterar para o ID real do utilizador se necessário
          designId: produto?.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro no servidor');
      }

      const data = await response.json();
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (err: any) {
      console.error("Erro na ligação:", err);
      alert(`Erro: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px' }}>
      <div style={{ background: '#16181a', padding: '10px', borderRadius: '6px', border: '1px solid #333' }}>
        <label style={{ fontSize: '10px', color: '#888', fontWeight: 'bold' }}>NOME DO PET</label>
        <input 
          type="text" 
          value={localValores.nome_pet}
          onChange={(e) => handleChange('nome_pet', e.target.value)}
          style={{ width: '100%', padding: '8px', background: '#222', color: 'white', border: '1px solid #444' }}
        />
      </div>
      <button 
        onClick={handleGerarSTL}
        disabled={loading}
        style={{ padding: '15px', background: loading ? '#555' : '#3b82f6', color: 'white', borderRadius: '8px', cursor: 'pointer' }}
      >
        {loading ? 'A PROCESSAR...' : 'VISUALIZAR RENDER FINAL'}
      </button>
    </div>
  );
}