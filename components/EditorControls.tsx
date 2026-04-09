'use client';
import { useState, useEffect } from 'react';

export default function EditorControls({ produto, perfil, onUpdate, onGerarSucesso, stlUrl }: any) {
  const [loading, setLoading] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [localValores, setLocalValores] = useState<any>({});
  const [saldoAtual, setSaldoAtual] = useState(perfil?.creditos_disponiveis ?? 0);

  const custoDinamico = produto?.custo_creditos ?? 1;

  useEffect(() => { 
    if (perfil) setSaldoAtual(perfil.creditos_disponiveis); 
  }, [perfil]);

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
    if (!perfil?.id) return alert("Erro: ID de perfil ausente.");
    if (saldoAtual < custoDinamico) return alert("Saldo insuficiente.");
    
    setLoading(true);
    setProgresso(10);

    try {
      const res = await fetch("https://maker-pro-docker-prod.onrender.com/gerar-stl-pro", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...localValores, 
          id: produto.id, 
          user_id: perfil.id, // O UUID da tua imagem
          custo: custoDinamico,
          nome_personalizado: `${produto.id}_${localValores.nome_pet || 'design'}`
        }),
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setProgresso(100);
        if (data.novoSaldo !== undefined) setSaldoAtual(data.novoSaldo);
        onGerarSucesso(data.url);
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (err) {
      alert("Erro na ligação ao servidor.");
    } finally {
      setLoading(false);
      setTimeout(() => setProgresso(0), 3000);
    }
  };

  const seccoes = Array.from(new Set(produto?.ui_schema?.filter((c: any) => c.section).map((c: any) => c.section))) as string[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {seccoes.map((s) => (
        <div key={s} style={{ background: '#0f172a', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
          <label style={{ color: '#3b82f6', fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>{s.toUpperCase()}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {produto.ui_schema.filter((c: any) => c.section === s).map((c: any) => (
              <div key={c.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <label style={{ fontSize: '10px', color: '#64748b' }}>{c.label || c.name}</label>
                  <span style={{ fontSize: '11px', color: '#3b82f6' }}>{localValores[c.name]}</span>
                </div>
                {c.name === 'fonte' ? (
                  <select 
                    value={localValores[c.name] || 'Open Sans'}
                    onChange={(e) => handleChange(c.name, e.target.value)}
                    style={{ width: '100%', padding: '8px', background: '#1e293b', color: 'white', borderRadius: '6px' }}
                  >
                    <option value="Open Sans">Open Sans</option>
                    <option value="Bebas">Bebas Neue</option>
                    <option value="Megadeth">Megadeth</option>
                  </select>
                ) : (
                  <input 
                    type={c.type === 'slider' ? 'range' : (c.type === 'number' ? 'number' : 'text')}
                    min={c.min} max={c.max} step={0.1}
                    value={localValores[c.name] ?? ''}
                    onChange={(e) => handleChange(c.name, (c.type === 'slider' || c.type === 'number') ? parseFloat(e.target.value) : e.target.value)}
                    style={{ width: '100%' }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ background: '#0f172a', padding: '15px', borderRadius: '15px', border: '1px solid #1e293b' }}>
        <p style={{ color: 'white', fontSize: '12px', marginBottom: '10px' }}>Saldo: {saldoAtual} Créditos</p>
        <button 
          onClick={handleGerarSTL} 
          disabled={loading || saldoAtual < custoDinamico}
          style={{ width: '100%', padding: '15px', background: '#3b82f6', color: 'white', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
        >
          {loading ? `PROCESSANDO...` : `GERAR STL (${custoDinamico} CRÉD.)`}
        </button>
        {stlUrl && (
          <a href={Array.isArray(stlUrl) ? stlUrl[0] : stlUrl} download style={{ display: 'block', textAlign: 'center', marginTop: '10px', padding: '10px', background: '#4ade80', color: 'black', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold' }}>
            DESCARREGAR STL
          </a>
        )}
      </div>
    </div>
  );
}