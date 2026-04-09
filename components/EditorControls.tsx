'use client';
import { useState, useEffect } from 'react';

export default function EditorControls({ produto, perfil, onUpdate, onGerarSucesso, stlUrl }: any) {
  const [loading, setLoading] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [localValores, setLocalValores] = useState<any>({});
  const [saldoAtual, setSaldoAtual] = useState(perfil?.creditos_disponiveis ?? 0);

  const custoDinamico = produto?.custo_creditos ?? 1;

  // Sincroniza o saldo do perfil
  useEffect(() => { 
    if (perfil) setSaldoAtual(perfil.creditos_disponiveis); 
  }, [perfil]);

  // Inicializa parâmetros e fontes
  useEffect(() => {
    if (produto) {
      const iniciais: any = { ...(produto.parametros_default || {}) };
      if (produto.ui_schema) {
        produto.ui_schema.forEach((c: any) => {
          if (c.name) iniciais[c.name] = (c.value !== undefined) ? c.value : c.default;
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
    if (!perfil?.id) return alert("Erro: Perfil não identificado.");
    
    setLoading(true);
    setProgresso(10);
    const interval = setInterval(() => {
      setProgresso((prev) => (prev < 90 ? prev + 5 : prev));
    }, 2000);

    try {
      const res = await fetch("https://maker-pro-docker-prod.onrender.com/gerar-stl-pro", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...localValores, 
          id: produto.id, 
          user_id: perfil.id, // O UUID correto: 705f136f...
          custo: custoDinamico,
          nome_personalizado: `${produto.id}_${localValores.nome_pet || 'objeto'}`
        }),
      });

      const data = await res.json();

      if (res.ok && data.url) {
        setProgresso(100);
        if (data.novoSaldo !== undefined) setSaldoAtual(data.novoSaldo);
        onGerarSucesso(data.url);
      } else {
        alert(data.error || "Erro ao gerar design.");
      }
    } catch (err) {
      alert("Erro na ligação ao servidor.");
    } finally {
      clearInterval(interval);
      setLoading(false);
      setTimeout(() => setProgresso(0), 3000);
    }
  };

  // Botão de Download Restaurado
  const handleDownload = () => {
    if (!stlUrl) return;
    const url = Array.isArray(stlUrl) ? stlUrl[0] : stlUrl;
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `design_${produto.id}.stl`);
    document.body.appendChild(link);
    link.click();
    link.remove();
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
                  {(c.type === 'slider' || c.type === 'number') && (
                    <span style={{ fontSize: '11px', color: '#3b82f6' }}>{localValores[c.name]} mm</span>
                  )}
                </div>
                {c.name === 'fonte' ? (
                  <select 
                    value={localValores[c.name] || 'Open Sans'}
                    onChange={(e) => handleChange(c.name, e.target.value)}
                    style={{ width: '100%', padding: '10px', background: '#1e293b', color: 'white', borderRadius: '8px', border: '1px solid #334155' }}
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
        {loading && (
          <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#3b82f6' }}>
              <span>PROCESSANDO...</span><span>{progresso}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: '#1e293b', borderRadius: '10px', marginTop: '5px' }}>
              <div style={{ width: `${progresso}%`, height: '100%', background: '#3b82f6', transition: 'width 0.3s' }}></div>
            </div>
          </div>
        )}
        <p style={{ color: 'white', fontSize: '12px', marginBottom: '10px' }}>Saldo: <strong>{saldoAtual} Créditos</strong></p>
        <button 
          onClick={handleGerarSTL} 
          disabled={loading || saldoAtual < custoDinamico}
          style={{ width: '100%', padding: '15px', background: '#3b82f6', color: 'white', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
        >
          {loading ? "A GERAR FICHEIRO..." : `GERAR STL (${custoDinamico} CRÉD.)`}
        </button>

        {stlUrl && (
          <button 
            onClick={handleDownload}
            style={{ width: '100%', marginTop: '12px', padding: '12px', background: '#10b981', color: 'white', borderRadius: '10px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
          >
            📥 DESCARREGAR STL
          </button>
        )}
      </div>
    </div>
  );
}