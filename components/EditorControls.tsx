'use client';
import { useState, useEffect } from 'react';

export default function EditorControls({ produto, perfil, onUpdate, onGerarSucesso, stlUrl }: any) {
  const [loading, setLoading] = useState(false);
  const [localValores, setLocalValores] = useState<any>({});

  // Lê os créditos disponíveis do perfil
  const saldoDisponivel = perfil?.creditos_disponiveis ?? 0;
  const temCreditos = saldoDisponivel > 0;

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
      alert("Erro ao gerar.");
      setLoading(false);
    }
  };

  if (!produto || !produto.ui_schema) return null;

  // Filtra secções, removendo "GESTÃO"
  const seccoesValidas = Array.from(new Set(
    produto.ui_schema
      .filter((c: any) => c.section && c.section.toUpperCase() !== 'GESTÃO' && c.type !== 'hidden')
      .map((c: any) => c.section)
  ));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {seccoesValidas.map((seccao: any) => (
        <div key={seccao} style={{ background: '#0f172a', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
          <label style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>{seccao.toUpperCase()}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {produto.ui_schema.filter((c: any) => c.section === seccao && c.type !== 'hidden').map((c: any) => (
              <div key={c.name}>
                <label style={{ fontSize: '10px', color: '#64748b' }}>{c.label}</label>
                {c.type === 'slider' ? (
                  <input type="range" min={c.min} max={c.max} step={0.1} value={localValores[c.name] ?? c.default} onChange={(e) => handleChange(c.name, parseFloat(e.target.value))} style={{ width: '100%' }} />
                ) : (
                  <input type="text" value={localValores[c.name] || ''} onChange={(e) => handleChange(c.name, e.target.value)} style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', color: 'white', borderRadius: '6px' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ background: '#0f172a', padding: '15px', borderRadius: '15px', border: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>SALDO:</span>
          <span style={{ fontSize: '12px', color: temCreditos ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>{saldoDisponivel} CRÉDITOS</span>
        </div>
        
        <button onClick={handleGerarSTL} disabled={loading || !temCreditos} style={{ width: '100%', padding: '15px', background: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
          {loading ? "A PROCESSAR..." : "👁️ ATUALIZAR MODELO 3D"}
        </button>

        {/* MENSAGEM DE REFORÇO */}
        <p style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', marginTop: '8px' }}>
          ✨ Podes atualizar o 3D as vezes que quiseres.
        </p>

        {stlUrl && temCreditos && (
          <a href={stlUrl} download style={{ display: 'block', textAlign: 'center', marginTop: '10px', padding: '15px', background: '#3b82f6', color: 'white', borderRadius: '10px', textDecoration: 'none', fontWeight: 'bold' }}>
            📥 DESCARREGAR STL (1 CRÉDITO)
          </a>
        )}
      </div>
    </div>
  );
}