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

  // FUNÇÃO CORRIGIDA PARA LIGAR AO RENDER
  const handleGerarSTL = async () => {
    setLoading(true);
    const baseUrl = "https://maker-pro-docker.onrender.com";
    
    try {
      // Alterado para a rota correta do teu backend funcional
      const response = await fetch(`${baseUrl}/gerar-stl-pro`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          // Mapeamento de nomes para o backend entender (nome_pet -> nome)
          nome: localValores.nome_pet,
          telefone: localValores.telefone,
          forma: produto?.forma || 'circulo',
          fonte: localValores.fonte,
          // Se tiveres autenticação, estes campos devem ser preenchidos:
          userId: null, 
          designId: produto?.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro no servidor');
      }

      const data = await response.json();

      // O servidor devolve a URL diretamente no objeto data
      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        alert("Erro: O servidor não devolveu um link válido.");
      }
    } catch (err: any) {
      console.error("Erro na ligação:", err);
      alert(`Erro: ${err.message}. Verifica se o backend no Render está ativo.`);
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
          placeholder="Ex: Bobby"
          style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', color: 'white', borderRadius: '4px' }}
        />
        <label style={labelStyle}>TAMANHO NOME: {localValores.fontSize}</label>
        <input type="range" min="3" max="15" step="0.5" value={localValores.fontSize} onChange={(e) => handleChange('fontSize', parseFloat(e.target.value))} style={{ width: '100%' }} />
      </div>

      {/* SEÇÃO TELEFONE */}
      <div style={sectionStyle}>
        <label style={labelStyle}>TELEFONE (VERSO)</label>
        <input 
          type="text" 
          value={localValores.telefone}
          onChange={(e) => handleChange('telefone', e.target.value)}
          placeholder="Ex: 912345678"
          style={{ width: '100%', padding: '8px', background: '#222', border: '1px solid #444', color: 'white', borderRadius: '4px' }}
        />
        <label style={labelStyle}>TAMANHO NÚMERO: {localValores.fontSizeN}</label>
        <input type="range" min="3" max="15" step="0.5" value={localValores.fontSizeN} onChange={(e) => handleChange('fontSizeN', parseFloat(e.target.value))} style={{ width: '100%' }} />
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
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'background 0.3s'
        }}
      >
        {loading ? 'A PROCESSAR RENDER...' : 'VISUALIZAR RENDER FINAL'}
      </button>
    </div>
  );
}