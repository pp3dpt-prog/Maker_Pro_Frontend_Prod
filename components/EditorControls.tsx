'use client';
import { useState, useEffect } from 'react';

export default function EditorControls({ produto, perfil, onUpdate, onGerarSucesso, stlUrl }: any) {
  const [loading, setLoading] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [localValores, setLocalValores] = useState<any>({});
  const [saldoAtual, setSaldoAtual] = useState(perfil?.creditos_disponiveis ?? 0);

  useEffect(() => { if (perfil) setSaldoAtual(perfil.creditos_disponiveis); }, [perfil]);

  useEffect(() => {
    if (produto) {
      const iniciais: any = { ...(produto.parametros_default || {}) };
      if (produto.ui_schema) {
        produto.ui_schema.forEach((c: any) => {
          if (c.name) iniciais[c.name] = (c.value !== undefined) ? c.value : c.default;
        });
      }
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
    setProgresso(10);
    try {
      const res = await fetch("https://maker-pro-docker-prod.onrender.com/gerar-stl-pro", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...localValores, 
          id: produto.id, 
          user_id: perfil.id, 
          custo: produto.custo_creditos || 1 
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSaldoAtual(data.novoSaldo);
        onGerarSucesso(data.url);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Erro na ligação.");
    } finally {
      setLoading(false);
    }
  };

  const seccoes = Array.from(new Set(produto?.ui_schema?.filter((c: any) => c.section).map((c: any) => c.section))) as string[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {seccoes.map((s) => (
        <div key={s} style={{ background: '#0f172a', padding: '15px', borderRadius: '12px' }}>
          <label style={{ color: '#3b82f6', fontSize: '10px', fontWeight: 'bold' }}>{s.toUpperCase()}</label>
          {produto.ui_schema.filter((c: any) => c.section === s).map((c: any) => (
            <div key={c.name} style={{ marginTop: '10px' }}>
              <label style={{ fontSize: '10px', color: '#64748b' }}>{c.label || c.name}</label>
              <input 
                type={c.type === 'slider' ? 'range' : 'text'}
                min={c.min} max={c.max} step={0.1}
                value={localValores[c.name] ?? ''}
                onChange={(e) => handleChange(c.name, c.type === 'slider' ? parseFloat(e.target.value) : e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          ))}
        </div>
      ))}
      <div style={{ background: '#0f172a', padding: '15px', borderRadius: '15px' }}>
        <p style={{ color: 'white' }}>Saldo: {saldoAtual} Créditos</p>
        <button onClick={handleGerarSTL} disabled={loading} style={{ width: '100%', padding: '15px', background: '#3b82f6', color: 'white', borderRadius: '10px' }}>
          {loading ? "A PROCESSAR..." : "GERAR STL"}
        </button>
      </div>
    </div>
  );
}