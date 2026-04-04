'use client';
import { useState, useEffect } from 'react';

// Reintroduzido o componente de grupo de controlo para as Medalhas
const ControlGroup = ({ label, keySize, keyX, keyY, vals, onChange }: any) => (
  <div style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155', marginTop: '10px' }}>
    <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>{label}</label>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '10px', marginTop: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
        <span>TAMANHO</span><span style={{ color: '#3b82f6' }}>{vals[keySize]}mm</span>
      </div>
      <input type="range" min="3" max="15" step="0.5" value={vals[keySize]} 
        onChange={(e) => onChange(keySize, parseFloat(e.target.value))} 
        style={{ width: '100%', accentColor: '#2563eb' }} />
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748b' }}>
            <span>EIXO X</span><span>{vals[keyX]}</span>
          </div>
          <input type="range" min="-20" max="20" step="0.5" value={vals[keyX]} 
            onChange={(e) => onChange(keyX, parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#64748b' }}>
            <span>EIXO Y</span><span>{vals[keyY]}</span>
          </div>
          <input type="range" min="-15" max="15" step="0.5" value={vals[keyY]} 
            onChange={(e) => onChange(keyY, parseFloat(e.target.value))} style={{ width: '100%' }} />
        </div>
      </div>
    </div>
  </div>
);

export default function EditorControls({ produto, onUpdate, onGerarSucesso }: any) {
  const [loading, setLoading] = useState(false);
  const [localValores, setLocalValores] = useState<any>({
    fonte: 'OpenSans', nome_pet: '', telefone: '',
    fontSize: 7, xPos: 0, yPos: 0,
    fontSizeN: 6.5, xPosN: 0, yPosN: 0
  });

  useEffect(() => {
    if (produto) {
      const novosValores = { ...localValores };
      if (produto.ui_schema) {
        produto.ui_schema.forEach((c: any) => {
          novosValores[c.name] = c.value !== undefined ? c.value : c.default;
        });
      } else {
        novosValores.fontSize = produto.default_size_nome ?? 7;
        novosValores.fontSizeN = produto.default_size_num ?? 6.5;
        novosValores.yPos = produto.default_y_nome ?? 0;
        novosValores.xPos = produto.default_x_nome ?? 0;
      }
      setLocalValores(novosValores);
      onUpdate(novosValores);
    }
  }, [produto?.id]);

  const handleChange = (k: string, v: any) => {
    const n = { ...localValores, [k]: v };
    setLocalValores(n);
    onUpdate(n);
  };

  const handleGerarSTL = async () => {
    setLoading(true);
    try {
      const r = await fetch("https://maker-pro-docker-prod.onrender.com/gerar-stl-pro", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...localValores, id: produto.id }),
      });
      const d = await r.json();
      onGerarSucesso(d.urls || d.url);
    } catch (err) { alert("Erro na geração"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      {produto?.ui_schema ? (
        produto.ui_schema.map((c: any) => (
          c.type !== 'hidden' && (
            <div key={c.name} style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>{c.label.toUpperCase()}</label>
                {/* Aqui está a correção: Mostra o valor atual ao lado do label */}
                {c.type === 'slider' && (
                  <span style={{ color: '#3b82f6', fontSize: '12px', fontWeight: 'bold' }}>
                    {localValores[c.name] || c.default}{c.label.includes('(MM)') ? 'mm' : ''}
                  </span>
                )}
              </div>
              
              <div style={{ marginTop: '10px' }}>
                {c.type === 'slider' ? (
                  <input type="range" min={c.min} max={c.max} step={c.step || 1} 
                    value={localValores[c.name] || c.default} 
                    onChange={(e) => handleChange(c.name, parseFloat(e.target.value))} 
                    style={{ width: '100%', accentColor: '#2563eb' }} />
                ) : c.type === 'checkbox' ? (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={localValores[c.name] || false} 
                      onChange={(e) => handleChange(c.name, e.target.checked)} />
                    <span style={{ fontSize: '12px' }}>ATIVAR COMPONENTE</span>
                  </label>
                ) : (
                  <input type="text" value={localValores[c.name] || ''} 
                    onChange={(e) => handleChange(c.name, e.target.value)} 
                    style={{ width: '100%', padding: '10px', background: '#0f172a', color: 'white', borderRadius: '8px', border: '1px solid #475569' }} />
                )}
              </div>
            </div>
          )
        ))
      ) : (
        <>
          <input placeholder="NOME DO PET" value={localValores.nome_pet} onChange={(e) => handleChange('nome_pet', e.target.value.toUpperCase())} 
            style={{ width: '100%', padding: '12px', background: '#0f172a', color: 'white', borderRadius: '8px', border: '1px solid #475569' }} />
          <input placeholder="TELEFONE" value={localValores.telefone} onChange={(e) => handleChange('telefone', e.target.value)} 
            style={{ width: '100%', padding: '12px', background: '#0f172a', color: 'white', borderRadius: '8px', border: '1px solid #475569' }} />
          <select value={localValores.fonte} onChange={(e) => handleChange('fonte', e.target.value)} 
            style={{ width: '100%', padding: '12px', background: '#0f172a', color: 'white', borderRadius: '8px', border: '1px solid #475569' }}>
            <option value="OpenSans">Open Sans</option>
            <option value="Bebas">Bebas Neue</option>
          </select>
          <ControlGroup label="AJUSTE NOME (FRENTE)" keySize="fontSize" keyX="xPos" keyY="yPos" vals={localValores} onChange={handleChange} />
          <ControlGroup label="AJUSTE TELEFONE (VERSO)" keySize="fontSizeN" keyX="xPosN" keyY="yPosN" vals={localValores} onChange={handleChange} />
        </>
      )}

      <button onClick={handleGerarSTL} disabled={loading} 
        style={{ padding: '18px', background: '#2563eb', color: 'white', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
        {loading ? "A PROCESSAR..." : "VISUALIZAR MODELO 3D FINAL"}
      </button>
    </div>
  );
}