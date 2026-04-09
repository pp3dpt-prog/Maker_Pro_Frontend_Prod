'use client';
import { useState, useEffect } from 'react';

export default function EditorControls({ produto, perfil, onUpdate, onGerarSucesso, stlUrl }: any) {
  const [loading, setLoading] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [localValores, setLocalValores] = useState<any>({});
  // Usa a coluna exata da tua imagem: creditos_disponiveis
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
    if (!perfil?.id) return alert("Erro: Perfil não identificado. Tenta sair e entrar novamente.");
    if (saldoAtual < custoDinamico) return alert(`Saldo insuficiente (${saldoAtual} créditos).`);
    
    if (!confirm(`Confirmas o gasto de ${custoDinamico} créditos para gerar este ficheiro?`)) return;

    setLoading(true);
    setProgresso(5);

    try {
      const res = await fetch("https://maker-pro-docker-prod.onrender.com/gerar-stl-pro", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...localValores, 
          id: produto.id, 
          user_id: perfil.id, // O teu UUID do auth_uid()
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
        alert(`Erro do Servidor: ${data.error}`);
      }
    } catch (err) {
      alert("Erro na ligação ao servidor de renderização.");
    } finally {
      setLoading(false);
      setTimeout(() => setProgresso(0), 3000);
    }
  };

  const handleDownload = () => {
    if (!stlUrl) return;
    const link = document.createElement('a');
    link.href = Array.isArray(stlUrl) ? stlUrl[0] : stlUrl;
    link.download = `meu_design_${Date.now()}.stl`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const seccoes = Array.from(new Set(produto?.ui_schema?.filter((c: any) => c.section && c.section !== 'GESTÃO').map((c: any) => c.section))) as string[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {seccoes.map((s) => (
        <div key={s} style={{ background: '#0f172a', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
          <label style={{ color: '#3b82f6', fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>{s.toUpperCase()}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {produto.ui_schema.filter((c: any) => c.section === s && c.type !== 'hidden').map((c: any) => (
              <div key={c.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '10px', color: '#64748b' }}>{c.label || c.name}</label>
                  {(c.type === 'slider' || c.type === 'number') && (
                    <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 'bold' }}>{localValores[c.name] ?? 0} mm</span>
                  )}
                </div>
                <input 
                  type={c.type === 'slider' ? 'range' : (c.type === 'number' ? 'number' : 'text')}
                  min={c.min} max={c.max} step={0.1}
                  value={localValores[c.name] ?? ''}
                  onChange={(e) => handleChange(c.name, (c.type === 'slider' || c.type === 'number') ? parseFloat(e.target.value) : e.target.value)}
                  style={{ width: '100%', padding: '10px', background: '#1e293b', color: 'white', border: '1px solid #334155', borderRadius: '8px' }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ background: '#0f172a', padding: '15px', borderRadius: '15px', border: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>SALDO DISPONÍVEL:</span>
          <span style={{ fontSize: '12px', color: saldoAtual >= custoDinamico ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>{saldoAtual} CRÉDITOS</span>
        </div>
        
        <button 
          onClick={handleGerarSTL} 
          disabled={loading || saldoAtual < custoDinamico} 
          style={{ width: '100%', padding: '15px', background: loading ? '#1e293b' : '#3b82f6', color: 'white', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {loading ? `A PROCESSAR (${progresso}%)...` : `🔨 GERAR STL (${custoDinamico} CRÉDITOS)`}
        </button>

        {stlUrl && (
          <button 
            onClick={handleDownload}
            style={{ width: '100%', marginTop: '10px', padding: '12px', background: '#4ade80', color: 'black', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
          >
            📥 DESCARREGAR AGORA
          </button>
        )}
      </div>
    </div>
  );
}