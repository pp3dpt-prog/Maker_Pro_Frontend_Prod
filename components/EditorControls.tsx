'use client';

import { useState } from 'react';

export default function EditorControls({ produto, onUpdate }: any) {
  const [loading, setLoading] = useState(false);
  const [localValores, setLocalValores] = useState({ 
    nome_pet: '', 
    telefone: '',
    fonte: 'OpenSans'
  });

  const handleGerarSTL = async () => {
    setLoading(true);
    const baseUrl = "https://maker-pro-docker.onrender.com";
    
    try {
      const response = await fetch(`${baseUrl}/gerar-stl-pro`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nome: localValores.nome_pet,
          telefone: localValores.telefone,
          forma: produto?.forma || 'circulo',
          fonte: localValores.fonte,
          userId: null, // Se usas créditos, precisas de passar um ID real aqui
          designId: produto?.id
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro no servidor');
      }

      const data = await response.json();
      if (data.url) window.open(data.url, '_blank');

    } catch (err: any) {
      console.error("Erro na ligação:", err);
      alert(`Erro: ${err.message}. Verifica se o backend está ativo.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <input 
        type="text" 
        placeholder="Nome do Pet"
        value={localValores.nome_pet}
        onChange={(e) => setLocalValores({...localValores, nome_pet: e.target.value})}
        style={{ padding: '8px', background: '#222', color: 'white', border: '1px solid #444' }}
      />
      <button 
        onClick={handleGerarSTL}
        disabled={loading}
        style={{ padding: '15px', background: loading ? '#555' : '#3b82f6', color: 'white', cursor: 'pointer' }}
      >
        {loading ? 'A PROCESSAR...' : 'VISUALIZAR RENDER FINAL'}
      </button>
    </div>
  );
}