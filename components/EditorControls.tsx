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
        fontSize: produto.def_size_nome ?? 7,
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
    // URL exato do teu backend no Render
    const baseUrl = "https://maker-pro-docker-prod.onrender.com";
    
    try {
      const response = await fetch(`${baseUrl}/gerar-stl-pro`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          nome: localValores.nome_pet, // Enviamos como 'nome' para o servidor
          telefone: localValores.telefone,
          forma: produto?.forma || 'circulo',
          fonte: localValores.fonte,
          userId: null, // Aqui deves passar o ID real se o user estiver logado
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
      } else {
        alert("O link do ficheiro não foi gerado.");
      }
    } catch (err: any) {
      console.error("Erro detalhado:", err);
      alert(`Falha: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const sectionStyle = { background: '#16181a', padding: '10px', borderRadius: '6px', marginBottom: '10px', border: '1px solid #333' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px' }}>
      <div style={sectionStyle}>
        <label style={{ fontSize: '10px', color: '#888' }}>NOME DO PET</label>
        <input 
          type="text" 
          value={localValores.nome_pet}
          onChange={(e) => handleChange('nome_pet', e.target.value)}
          style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', color: 'white' }}
        />
      </div>

      <div style={sectionStyle}>
        <label style={{ fontSize: '10px', color: '#888' }}>TELEFONE</label>
        <input 
          type="text" 
          value={localValores.telefone}
          onChange={(e) => handleChange('telefone', e.target.value)}
          style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', color: 'white' }}
        />
      </div>

      <button 
        onClick={handleGerarSTL}
        disabled={loading}
        style={{ 
          padding: '15px', 
          background: loading ? '#555' : '#3b82f6', 
          color: 'white', 
          border: 'none', 
          borderRadius: '8px', 
          fontWeight: 'bold',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'A GERAR FICHEIRO...' : 'VISUALIZAR RENDER FINAL'}
      </button>
    </div>
  );
}