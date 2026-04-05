'use client';
import { useState, useEffect } from 'react';

export default function EditorControls({ produto, perfil, onUpdate, onGerarSucesso, stlUrl }: any) {
  const [loading, setLoading] = useState(false);
  const [localValores, setLocalValores] = useState<any>({});

  // MAPEAMENTO CORRETO: Na tua DB o saldo chama-se 'creditos_disponiveis'
  const saldoAtual = perfil?.creditos_disponiveis ?? 0;
  const temCreditos = saldoAtual > 0;

  useEffect(() => {
    if (stlUrl) setLoading(false);
  }, [stlUrl]);

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
    // Verificação baseada no campo correto da base de dados
    if (saldoAtual <= 0) {
      alert("Saldo insuficiente. Por favor, carregue a sua conta na área de Faturação.");
      return;
    }

    setLoading(true);
    try {
      const r = await fetch("https://maker-pro-docker-prod.onrender.com/gerar-stl-pro", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...localValores, id: produto.id }),
      });
      const d = await r.json();
      onGerarSucesso(d.urls || d.url);
    } catch (err) {
      alert("Erro ao processar o modelo.");
      setLoading(false);
    }
  };

  if (!produto || !produto.ui_schema) return null;

  const seccoesValidas = Array.from(new Set(
    produto.ui_schema
      .filter((c: any) => c.section && c.section.toUpperCase() !== 'GESTÃO' && c.type !== 'hidden')
      .map((c: any) => c.section)
  ));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Grupos de Parâmetros (NOME, CONTACTO, etc.) */}
      {seccoesValidas.map((seccao: any) => (
        <div key={seccao} style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
          <label style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 'bold', display: 'block', marginBottom: '12px', borderBottom: '1px solid #334155', paddingBottom: '5px' }}>
            {seccao.toUpperCase()}
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {produto.ui_schema.filter((c: any) => c.section === seccao && c.type !== 'hidden').map((c: any) => (
              <div key={c.name}>
                <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' }}>{c.label?.toUpperCase()}</label>
                <div style={{ marginTop: '5px' }}>
                  {c.type === 'slider' ? (
                    <input type="range" min={c.min} max={c.max} step={0.1} value={localValores[c.name] ?? c.default ?? 0} onChange={(e) => handleChange(c.name, parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#3b82f6' }} />
                  ) : (
                    <input type="text" value={localValores[c.name] || ''} onChange={(e) => handleChange(c.name, e.target.value)} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', color: 'white', borderRadius: '8px' }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* ÁREA DE ACÇÃO COM SALDO REAL */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#0f172a', padding: '15px', borderRadius: '15px', border: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', padding: '0 5px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>O TEU SALDO:</span>
          <span style={{ fontSize: '11px', color: temCreditos ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
            {saldoAtual} CRÉDITOS
          </span>
        </div>

        <button 
          onClick={handleGerarSTL} 
          disabled={loading || !temCreditos}
          style={{ padding: '16px', background: 'transparent', color: temCreditos ? '#3b82f6' : '#475569', border: `1px solid ${temCreditos ? '#3b82f6' : '#334155'}`, borderRadius: '12px', fontWeight: 'bold', cursor: temCreditos ? 'pointer' : 'not-allowed' }}
        >
          {loading ? "A PROCESSAR..." : "👁️ ATUALIZAR PRÉ-VISUALIZAÇÃO"}
        </button>

        {stlUrl && temCreditos && (
          <a href={stlUrl} download style={{ padding: '18px', background: '#3b82f6', color: 'white', borderRadius: '12px', fontWeight: '900', textAlign: 'center', textDecoration: 'none' }}>
            📥 DESCARREGAR STL (1 CRÉDITO)
          </a>
        )}
      </div>
    </div>
  );
}