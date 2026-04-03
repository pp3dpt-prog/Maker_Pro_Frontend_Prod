'use client';

import { useState, useEffect } from 'react';

export default function EditorControls({ produto, onUpdate, onGerarSucesso }: any) {
  const [loading, setLoading] = useState(false);
  const [localValores, setLocalValores] = useState({ 
    fonte: '', 
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
      // Carrega os valores padrão definidos na tabela prod_designs
      setLocalValores(prev => ({
        ...prev,
        fontSize: produto.default_size_nome ?? 7,
        fontSizeN: produto.default_size_num ?? 6.5,
        yPos: produto.default_y_nome ?? 0,
        xPos: produto.default_x_nome ?? 0,
      }));
    }
  }, [produto?.id]);

  const handleChange = (chave: string, valor: any) => {
    const novosValores = { ...localValores, [chave]: valor };
    setLocalValores(novosValores);
    onUpdate(novosValores);
  };

  const handleGerarSTL = async () => {
    if (!produto?.id) {
      alert("Erro: ID do produto não encontrado.");
      return;
    }

    setLoading(true);
    const baseUrl = "https://maker-pro-docker-prod.onrender.com";
    
    try {
      // Envia o ID (slug) correto para o servidor
      const response = await fetch(`${baseUrl}/gerar-stl-pro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...localValores,
          id: produto.id, // <--- Crucial: envia "tag-osso", "tag-coracao", etc.
          escala: produto.default_size_nome || 30
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro na geração');
      }

      const data = await response.json();
      if (data.url && onGerarSucesso) {
        onGerarSucesso(data.url);
      }
    } catch (err: any) {
      console.error("Erro na API:", err);
      alert(`Erro ao gerar modelo 3D: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ... (O componente ControlGroup e o resto do JSX mantêm-se iguais)
  const ControlGroup = ({ label, keySize, keyX, keyY, vals }: any) => (
    <div style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', marginBottom: '15px', border: '1px solid #334155' }}>
      <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>{label}</label>
      <div style={{ marginTop: '10px' }}>
        <div style={{ marginBottom: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontSize: '10px' }}>TAMANHO</span>
            <span style={{ fontSize: '10px', color: '#3b82f6' }}>{vals[keySize]}mm</span>
          </div>
          <input type="range" min="3" max="15" step="0.1" value={vals[keySize]} onChange={(e) => handleChange(keySize, parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <span style={{ fontSize: '10px' }}>POS X: {vals[keyX]}</span>
            <input type="range" min="-15" max="15" step="0.5" value={vals[keyX]} onChange={(e) => handleChange(keyX, parseFloat(e.target.value))} style={{ width: '100%' }} />
          </div>
          <div>
            <span style={{ fontSize: '10px' }}>POS Y: {vals[keyY]}</span>
            <input type="range" min="-15" max="15" step="0.5" value={vals[keyY]} onChange={(e) => handleChange(keyY, parseFloat(e.target.value))} style={{ width: '100%' }} />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <input 
        placeholder="NOME DO PET"
        value={localValores.nome_pet}
        onChange={(e) => handleChange('nome_pet', e.target.value.toUpperCase())}
        style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #475569', color: 'white', borderRadius: '8px', fontWeight: 'bold' }}
      />
      <input 
        placeholder="TELEFONE"
        value={localValores.telefone}
        onChange={(e) => handleChange('telefone', e.target.value)}
        style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #475569', color: 'white', borderRadius: '8px' }}
      />

      <select 
        value={localValores.fonte}
        onChange={(e) => handleChange('fonte', e.target.value)}
        style={{ width: '100%', padding: '10px', background: '#0f172a', color: 'white', border: '1px solid #475569', borderRadius: '8px' }}
      >
        <option value="OpenSans">Open Sans</option>
        <option value="Bebas">Bebas Neue</option>
        <option value="Playfair">Playfair Display</option>
        {/* <option value="Eindhoven">Eindhoven</option> */}
        {/* <option value="BADABB">Badaboom</option> */}
      </select>

      <ControlGroup label="AJUSTE NOME (FRENTE)" keySize="fontSize" keyX="xPos" keyY="yPos" vals={localValores} />
      <ControlGroup label="AJUSTE TELEFONE (VERSO)" keySize="fontSizeN" keyX="xPosN" keyY="yPosN" vals={localValores} />

      <button 
        onClick={handleGerarSTL}
        disabled={loading}
        style={{ 
          padding: '18px', 
          backgroundColor: loading ? '#334155' : '#2563eb', 
          color: 'white', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer'
        }}
      >
        {loading ? "A PROCESSAR..." : "VISUALIZAR MODELO 3D FINAL"}
      </button>

      <style jsx>{`
        input[type=range] { accent-color: #2563eb; cursor: pointer; }
      `}</style>
    </div>
  );
}