'use client';

import { useState, useEffect } from 'react';

export default function EditorControls({ produto, onUpdate, onGerarSucesso }: any) {
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
    const baseUrl = "https://maker-pro-docker-prod.onrender.com"; //
    
    try {
      const response = await fetch(`${baseUrl}/gerar-stl-pro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...localValores,
          forma: produto?.forma || 'circulo',
          userId: null, 
          designId: produto?.id
        }),
      });

      if (!response.ok) throw new Error('Erro na geração');

      const data = await response.json();
      if (data.url && onGerarSucesso) {
        onGerarSucesso(data.url);
      }
    } catch (err) {
      alert("Erro ao gerar modelo 3D.");
    } finally {
      setLoading(false);
    }
  };

  const ControlGroup = ({ label, keySize, keyX, keyY, vals }: any) => (
    <div style={{ background: '#1e293b', padding: '10px', borderRadius: '8px', marginBottom: '10px' }}>
      <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' }}>{label}</label>
      <div style={{ display: 'flex', gap: '10px', marginTop: '5px', alignItems: 'center' }}>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '9px' }}>TAM: {vals[keySize]}</span>
          <input type="range" min="2" max="12" step="0.5" value={vals[keySize]} onChange={(e) => handleChange(keySize, parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '9px' }}>POS X: {vals[keyX]}</span>
          <input type="range" min="-10" max="10" step="0.5" value={vals[keyX]} onChange={(e) => handleChange(keyX, parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: '9px' }}>POS Y: {vals[keyY]}</span>
          <input type="range" min="-10" max="10" step="0.5" value={vals[keyY]} onChange={(e) => handleChange(keyY, parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* INPUTS DE TEXTO */}
      <input 
        placeholder="NOME DO PET"
        value={localValores.nome_pet}
        onChange={(e) => handleChange('nome_pet', e.target.value)}
        style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px' }}
      />
      
      <input 
        placeholder="TELEFONE"
        value={localValores.telefone}
        onChange={(e) => handleChange('telefone', e.target.value)}
        style={{ width: '100%', padding: '12px', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '6px' }}
      />

      {/* SELEÇÃO DE FONTE */}
      <select 
        value={localValores.fonte}
        onChange={(e) => handleChange('fonte', e.target.value)}
        style={{ width: '100%', padding: '10px', background: '#0f172a', color: 'white', border: '1px solid #334155', borderRadius: '6px' }}
      >
        <option value="OpenSans">Open Sans (Padrão)</option>
        <option value="Bebas">Bebas Neue</option>
        <option value="Playfair">Playfair Display</option>
        <option value="Eindhoven">Eindhoven</option>
        <option value="BADABB">Badabb</option>
      </select>

      {/* CONTROLOS DE MOVIMENTAÇÃO */}
      <ControlGroup label="AJUSTE NOME" keySize="fontSize" keyX="xPos" keyY="yPos" vals={localValores} />
      <ControlGroup label="AJUSTE TELEFONE" keySize="fontSizeN" keyX="xPosN" keyY="yPosN" vals={localValores} />

      {/* BOTÃO COM ANIMAÇÃO DE CARREGAMENTO */}
      <button 
        onClick={handleGerarSTL}
        disabled={loading}
        style={{ 
          padding: '18px', 
          backgroundColor: loading ? '#475569' : '#2563eb', 
          color: 'white', 
          border: 'none', 
          borderRadius: '8px', 
          fontWeight: 'bold', 
          cursor: loading ? 'not-allowed' : 'pointer',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <div className="spinner"></div>
            GERANDO MODELO 3D...
          </div>
        ) : "VISUALIZAR RENDER FINAL (DOCKER)"}
      </button>

      <style jsx>{`
        .spinner {
          width: 18px;
          height: 18px;
          border: 3px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin 1s ease-in-out infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}