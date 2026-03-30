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
    const baseUrl = "https://maker-pro-docker-prod.onrender.com";
    
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
    <div style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', marginBottom: '15px', border: '1px solid #334155' }}>
      <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span style={{ fontSize: '10px', color: '#64748b' }}>TAMANHO</span>
            <span style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 'bold' }}>{vals[keySize]}mm</span>
          </div>
          <input type="range" min="2" max="12" step="0.5" value={vals[keySize]} onChange={(e) => handleChange(keySize, parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#3b82f6' }} />
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '5px' }}>POS X: {vals[keyX]}</span>
            <input type="range" min="-12" max="12" step="0.5" value={vals[keyX]} onChange={(e) => handleChange(keyX, parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#3b82f6' }} />
          </div>
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: '10px', color: '#64748b', display: 'block', marginBottom: '5px' }}>POS Y: {vals[keyY]}</span>
            <input type="range" min="-12" max="12" step="0.5" value={vals[keyY]} onChange={(e) => handleChange(keyY, parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#3b82f6' }} />
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
        style={{ width: '100%', padding: '14px', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}
      />
      
      <input 
        placeholder="TELEFONE"
        value={localValores.telefone}
        onChange={(e) => handleChange('telefone', e.target.value)}
        style={{ width: '100%', padding: '14px', background: '#0f172a', border: '1px solid #334155', color: 'white', borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' }}
      />

      <select 
        value={localValores.fonte}
        onChange={(e) => handleChange('fonte', e.target.value)}
        style={{ width: '100%', padding: '12px', background: '#0f172a', color: 'white', border: '1px solid #334155', borderRadius: '8px', cursor: 'pointer' }}
      >
        <option value="OpenSans">Open Sans (Padrão)</option>
        <option value="Bebas">Bebas Neue</option>
        <option value="Playfair">Playfair Display</option>
        <option value="Eindhoven">Eindhoven</option>
        <option value="BADABB">Badabb</option>
      </select>

      <ControlGroup label="Ajustes do Nome (Frente)" keySize="fontSize" keyX="xPos" keyY="yPos" vals={localValores} />
      <ControlGroup label="Ajustes do Telefone (Verso)" keySize="fontSizeN" keyX="xPosN" keyY="yPosN" vals={localValores} />

      <button 
        onClick={handleGerarSTL}
        disabled={loading}
        style={{ 
          padding: '20px', 
          backgroundColor: loading ? '#334155' : '#2563eb', 
          color: 'white', 
          border: 'none', 
          borderRadius: '10px', 
          fontWeight: '900', 
          fontSize: '14px',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s',
          boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
        }}
      >
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            <div className="spinner"></div>
            PROCESSANDO NO SERVIDOR...
          </div>
        ) : "GERAR MODELO 3D FINAL"}
      </button>

      <style jsx>{`
        .spinner {
          width: 20px;
          height: 20px;
          border: 3px solid rgba(255,255,255,0.2);
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}