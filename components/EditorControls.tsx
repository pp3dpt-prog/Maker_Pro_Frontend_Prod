'use client';
import { useState, useEffect } from 'react';

export default function EditorControls({ produto, onUpdate, onGerarSucesso }: any) {
  const [loading, setLoading] = useState(false);
  const [localValores, setLocalValores] = useState<any>({});

  // Inicializa os valores baseados no ui_schema da base de dados
  useEffect(() => {
    if (produto?.ui_schema) {
      const iniciais: any = {};
      produto.ui_schema.forEach((campo: any) => {
        iniciais[campo.name] = campo.default;
      });
      // Mantém a fonte se existir no objeto anterior ou define padrão
      iniciais.fonte = localValores.fonte || 'OpenSans';
      setLocalValores(iniciais);
      onUpdate(iniciais);
    }
  }, [produto?.id]);

  const handleChange = (chave: string, valor: any) => {
    const novosValores = { ...localValores, [chave]: valor };
    setLocalValores(novosValores);
    onUpdate(novosValores);
  };

  const handleGerarSTL = async () => {
    setLoading(true);
    try {
      const response = await fetch("https://maker-pro-docker-prod.onrender.com/gerar-stl-pro", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...localValores, id: produto.id }),
      });
      const data = await response.json();
      if (data.url) onGerarSucesso(data.url);
    } catch (err) {
      alert("Erro na geração 3D");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      {/* RENDERIZAÇÃO DINÂMICA DOS CAMPOS DO UI_SCHEMA */}
      {produto?.ui_schema?.map((campo: any) => (
        <div key={campo.name} style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
          <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>{campo.label.toUpperCase()}</label>
          
          {campo.type === 'slider' ? (
            <div style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '5px' }}>
                <span>VALOR</span>
                <span style={{ color: '#3b82f6' }}>{localValores[campo.name]}</span>
              </div>
              <input 
                type="range" 
                min={campo.min} 
                max={campo.max} 
                step={campo.step || 1}
                value={localValores[campo.name] || campo.default}
                onChange={(e) => handleChange(campo.name, parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#2563eb' }}
              />
            </div>
          ) : (
            <input 
              type="text"
              value={localValores[campo.name] || ''}
              onChange={(e) => handleChange(campo.name, e.target.value)}
              style={{ width: '100%', marginTop: '10px', padding: '10px', background: '#0f172a', border: '1px solid #475569', color: 'white', borderRadius: '8px' }}
            />
          )}
        </div>
      ))}

      <button onClick={handleGerarSTL} disabled={loading} style={{ padding: '18px', backgroundColor: '#2563eb', color: 'white', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
        {loading ? "A PROCESSAR..." : "GERAR MODELO 3D"}
      </button>
    </div>
  );
}