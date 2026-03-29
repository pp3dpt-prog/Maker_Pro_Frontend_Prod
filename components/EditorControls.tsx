'use client';

import { useState, useEffect } from 'react';

export default function EditorControls({ produto, onUpdate }: any) {
  const [loading, setLoading] = useState(false);
  const [localValores, setLocalValores] = useState({ 
    fonte: 'OpenSans', nome_pet: '', telefone: '',
    fontSize: 7, yPos: 0, xPos: 0,
    fontSizeN: 6.5, yPosN: 0, xPosN: 0
  });

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
    // FORÇAR O URL DIRETO PARA TESTE
    const URL_FINAL = "https://maker-pro-docker.onrender.com/api/render";
    
    try {
      console.log("A enviar pedido para:", URL_FINAL);
      
      const response = await fetch(URL_FINAL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ produto, valores: localValores }),
      });

      const data = await response.json();

      if (data.success && data.url) {
        window.open(`https://maker-pro-docker.onrender.com${data.url}`, '_blank');
      } else {
        alert("Erro no Servidor: " + (data.error || "Desconhecido"));
      }
    } catch (err) {
      alert("ERRO DE LIGAÇÃO: O servidor do Render.com não respondeu. Verifica se ele está online.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px', color: 'white' }}>
      <div style={{ background: '#1e293b', padding: '10px', borderRadius: '8px' }}>
        <label style={{ fontSize: '12px' }}>NOME DO PET</label>
        <input 
          style={{ width: '100%', padding: '8px', marginTop: '5px', borderRadius: '4px', border: '1px solid #334155', background: '#0f172a', color: 'white' }}
          type="text" value={localValores.nome_pet} onChange={(e) => handleChange('nome_pet', e.target.value)} 
        />
        <label style={{ fontSize: '10px', marginTop: '10px', display: 'block' }}>POSIÇÃO X: {localValores.xPos}</label>
        <input type="range" min="-20" max="20" step="0.1" value={localValores.xPos} onChange={(e) => handleChange('xPos', parseFloat(e.target.value))} style={{ width: '100%' }} />
        <label style={{ fontSize: '10px', display: 'block' }}>POSIÇÃO Y: {localValores.yPos}</label>
        <input type="range" min="-20" max="20" step="0.1" value={localValores.yPos} onChange={(e) => handleChange('yPos', parseFloat(e.target.value))} style={{ width: '100%' }} />
      </div>

      <button 
        onClick={handleGerarSTL}
        disabled={loading}
        style={{ padding: '15px', background: loading ? '#475569' : '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
      >
        {loading ? 'A PROCESSAR...' : 'VISUALIZAR RENDER FINAL'}
      </button>
    </div>
  );
}