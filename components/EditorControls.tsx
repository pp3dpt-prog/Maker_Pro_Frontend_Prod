'use client';
import { useState, useEffect } from 'react';

export default function EditorControls({ produto, onUpdate, onGerarSucesso, stlUrl }: any) {
  const [loading, setLoading] = useState(false);
  const [localValores, setLocalValores] = useState<any>({});

  // Sincroniza o loading com a chegada do link
  useEffect(() => {
    if (stlUrl) setLoading(false);
  }, [stlUrl]);

  // Carrega os parâmetros do produto e organiza os campos
  useEffect(() => {
    if (produto) {
      const iniciais: any = { ...(produto.parametros_default || {}) };
      if (produto.ui_schema && Array.isArray(produto.ui_schema)) {
        produto.ui_schema.forEach((c: any) => {
          if (c && c.name) {
            iniciais[c.name] = c.value !== undefined ? c.value : c.default;
          }
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
    try {
      const r = await fetch("https://maker-pro-docker-prod.onrender.com/gerar-stl-pro", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...localValores, id: produto.id }),
      });
      const d = await r.json();
      // Envia o link para o Pai (para o visualizador 3D e para o botão de baixar)
      onGerarSucesso(d.urls || d.url);
    } catch (err) {
      alert("Erro ao gerar modelo.");
      setLoading(false);
    }
  };

  if (!produto || !produto.ui_schema) return null;

  // Agrupamento por Secções (NOME, NÚMERO, etc.)
  const seccoesUnicas = Array.from(new Set(produto.ui_schema.map((c: any) => c.section || 'GERAL')));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* MAPEAR GRUPOS DE PARÂMETROS */}
      {seccoesUnicas.map((seccao: any) => (
        <div key={seccao} style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
          <label style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 'bold', display: 'block', marginBottom: '12px', borderBottom: '1px solid #334155', paddingBottom: '5px' }}>
            {seccao.toUpperCase()}
          </label>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {produto.ui_schema.filter((c: any) => (c.section || 'GERAL') === seccao && c.type !== 'hidden').map((c: any) => (
              <div key={c.name}>
                <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' }}>{c.label?.toUpperCase()}</label>
                
                <div style={{ marginTop: '5px' }}>
                  {c.type === 'slider' ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#3b82f6', marginBottom: '4px' }}>
                        <span>MEDIDA</span>
                        <span>{localValores[c.name] ?? c.default}</span>
                      </div>
                      <input 
                        type="range" 
                        min={c.min} max={c.max} step={0.1} 
                        value={localValores[c.name] ?? c.default ?? 0} 
                        onChange={(e) => handleChange(c.name, parseFloat(e.target.value))} 
                        style={{ width: '100%', accentColor: '#3b82f6' }} 
                      />
                    </>
                  ) : (
                    <input 
                      type="text" 
                      value={localValores[c.name] || ''} 
                      onChange={(e) => handleChange(c.name, e.target.value)} 
                      style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', color: 'white', borderRadius: '8px' }} 
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* BOTÕES DE AÇÃO DO MAKER */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
        <button 
          onClick={handleGerarSTL} 
          disabled={loading}
          style={{ padding: '16px', background: loading ? '#334155' : 'transparent', color: '#3b82f6', border: '1px solid #3b82f6', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {loading ? "A PROCESSAR..." : "👁️ ATUALIZAR MODELO 3D"}
        </button>

        {stlUrl && (
          <a 
            href={stlUrl} 
            download 
            style={{ 
              padding: '16px', background: '#3b82f6', color: 'white', borderRadius: '12px', 
              fontWeight: 'bold', textAlign: 'center', textDecoration: 'none', display: 'block' 
            }}
          >
            📥 BAIXAR FICHEIRO STL
          </a>
        )}
      </div>
    </div>
  );
}