'use client';
import { useState, useEffect } from 'react';

export default function EditorControls({ produto, onUpdate, onGerarSucesso }: any) {
  const [loading, setLoading] = useState(false);
  const [localValores, setLocalValores] = useState<any>({});

  useEffect(() => {
    if (produto?.ui_schema) {
      const iniciais: any = {};
      produto.ui_schema.forEach((c: any) => {
        iniciais[c.name] = c.value !== undefined ? c.value : c.default;
      });
      if (!iniciais.fonte) iniciais.fonte = 'Open Sans';
      setLocalValores(iniciais);
      onUpdate(iniciais);
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
      // Suporta resposta de URL única ou array de URLs
      onGerarSucesso(d.urls || d.url);
    } catch (err) { alert("Erro na geração"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      {produto?.ui_schema?.map((c: any) => {
        if (c.type === 'hidden') return null;

        return (
          <div key={c.name} style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
            <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>{c.label.toUpperCase()}</label>
            <div style={{ marginTop: '10px' }}>
              {c.type === 'slider' ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '5px' }}>
                    <span>VALOR</span>
                    <span style={{ color: '#3b82f6' }}>
                      {localValores[c.name]}{c.label.includes('(MM)') ? 'mm' : ''}
                    </span>
                  </div>
                  <input type="range" min={c.min} max={c.max} step={c.step || 1} 
                    value={localValores[c.name] || c.default} 
                    onChange={(e) => handleChange(c.name, parseFloat(e.target.value))} 
                    style={{ width: '100%', accentColor: '#2563eb' }} />
                </>
              ) : c.type === 'checkbox' ? (
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={localValores[c.name] || false} onChange={(e) => handleChange(c.name, e.target.checked)} />
                  <span style={{ fontSize: '12px', color: 'white' }}>ATIVAR COMPONENTE</span>
                </label>
              ) : (
                <input type="text" value={localValores[c.name] || ''} 
                  onChange={(e) => handleChange(c.name, e.target.value)} 
                  style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', color: 'white', borderRadius: '8px' }} />
              )}
            </div>
          </div>
        );
      })}

      {produto?.ui_schema?.some((c: any) => c.name === 'nome_pet') && (
        <select value={localValores.fonte} onChange={(e) => handleChange('fonte', e.target.value)}
          style={{ width: '100%', padding: '12px', background: '#0f172a', color: 'white', border: '1px solid #475569', borderRadius: '8px' }}>
          <option value="Open Sans">Open Sans</option>
          <option value="Bebas">Bebas Neue</option>
          <option value="Playfair">Playfair Display</option>
        </select>
      )}

      <button onClick={handleGerarSTL} disabled={loading} style={{ padding: '18px', background: '#2563eb', color: 'white', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
        {loading ? "A PROCESSAR..." : "VISUALIZAR MODELO 3D FINAL"}
      </button>
    </div>
  );
}