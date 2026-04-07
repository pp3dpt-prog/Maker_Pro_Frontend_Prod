'use client';
import { useState, useEffect } from 'react';

export default function EditorControls({ produto, perfil, onUpdate, onGerarSucesso, stlUrl }: any) {
  const [loading, setLoading] = useState(false);
  const [localValores, setLocalValores] = useState<any>({});
  const saldoDisponivel = perfil?.creditos_disponiveis ?? 0;

  useEffect(() => {
    if (stlUrl) setLoading(false);
  }, [stlUrl]);

  useEffect(() => {
    if (produto) {
      const iniciais: any = { ...(produto.parametros_default || {}) };
      if (produto.ui_schema) {
        produto.ui_schema.forEach((c: any) => {
          if (c.name) iniciais[c.name] = c.value !== undefined ? c.value : c.default;
        });
      }
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
    if (saldoDisponivel <= 0) return alert("Saldo insuficiente.");
    setLoading(true);
    try {
      const r = await fetch("https://maker-pro-docker-prod.onrender.com/gerar-stl-pro", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...localValores, id: produto.id }),
      });
      const d = await r.json();
      if (d.urls || d.url) onGerarSucesso(d.urls || d.url);
    } catch (err) {
      alert("Erro na conexão.");
    } finally {
      setLoading(false);
    }
  };

  const seccoes = Array.from(new Set(produto?.ui_schema?.filter((c: any) => c.section && c.section !== 'GESTÃO').map((c: any) => c.section)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      {seccoes.map((s: any) => (
        <div key={s} style={{ background: '#0f172a', padding: '15px', borderRadius: '10px' }}>
          <label style={{ color: '#3b82f6', fontSize: '10px', fontWeight: 'bold' }}>{String(s).toUpperCase()}</label>
          {produto.ui_schema.filter((c: any) => c.section === s).map((c: any) => (
            <div key={c.name} style={{ marginTop: '10px' }}>
              <label style={{ fontSize: '10px', color: '#94a3b8' }}>{c.label}</label>
              {c.name === 'fonte' ? (
                <select 
                  value={localValores[c.name] || 'Open Sans'}
                  onChange={(e) => handleChange(c.name, e.target.value)}
                  style={{ width: '100%', padding: '8px', background: '#1e293b', color: 'white', border: '1px solid #334155', borderRadius: '5px' }}
                >
                  <option value="Open Sans">Open Sans</option>
                  <option value="Bebas">Bebas Neue</option>
                  <option value="Playfair">Playfair Display</option>
                  <option value="BADABB">Badaboom</option>
                </select>
              ) : (
                <input 
                  type={c.type === 'slider' ? 'range' : 'text'}
                  min={c.min} max={c.max} step={0.1}
                  value={localValores[c.name] ?? ''}
                  onChange={(e) => handleChange(c.name, c.type === 'slider' ? parseFloat(e.target.value) : e.target.value)}
                  style={{ width: '100%', padding: '8px', background: '#1e293b', color: 'white', border: '1px solid #334155', borderRadius: '5px' }}
                />
              )}
            </div>
          ))}
        </div>
      ))}
      <button onClick={handleGerarSTL} disabled={loading} style={{ padding: '15px', background: '#3b82f6', color: 'white', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
        {loading ? "A GERAR..." : "ATUALIZAR MODELO 3D"}
      </button>
    </div>
  );
}