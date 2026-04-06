'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function EditorControls({ produto, perfil, onUpdate, onGerarSucesso, stlUrl }: any) {
  const [loading, setLoading] = useState(false);
  const [localValores, setLocalValores] = useState<any>({});

  // Usa creditos_disponiveis do perfil
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

  const handleDownloadSeguro = async () => {
    if (!temCreditos) return alert("Saldo insuficiente.");
    
    // Chama a função RPC que criámos no Supabase
    const { error } = await supabase.rpc('baixar_credito', { user_id: perfil.id });
    
    if (error) {
      alert("Erro ao processar crédito: " + error.message);
    } else {
      const link = document.createElement('a');
      link.href = stlUrl;
      link.download = `${produto.nome || 'modelo'}.stl`;
      link.click();
      // Recarrega para atualizar o saldo na UI
      window.location.reload();
    }
  };

  const handleGerarSTL = async () => {
    if (!temCreditos) return alert("Saldo insuficiente.");
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

  if (!produto?.ui_schema) return null;

  const seccoesValidas = Array.from(new Set(
    produto.ui_schema
      .filter((c: any) => c.section && c.section.toUpperCase() !== 'GESTÃO' && c.type !== 'hidden')
      .map((c: any) => c.section)
  ));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {seccoesValidas.map((seccao: any) => (
        <div key={seccao} style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
          <label style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 'bold', display: 'block', marginBottom: '12px', borderBottom: '1px solid #334155', paddingBottom: '5px' }}>
            {seccao.toUpperCase()}
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {produto.ui_schema.filter((c: any) => c.section === seccao && c.type !== 'hidden').map((c: any) => (
              <div key={c.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' }}>{c.label?.toUpperCase()}</label>
                  {/* Exibição da Medida */}
                  {c.type === 'slider' && (
                    <span style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 'bold' }}>{localValores[c.name]}mm</span>
                  )}
                </div>

                <div style={{ marginTop: '5px' }}>
                  {c.type === 'slider' ? (
                    <input type="range" min={c.min} max={c.max} step={0.1} value={localValores[c.name] ?? c.default ?? 0} onChange={(e) => handleChange(c.name, parseFloat(e.target.value))} style={{ width: '100%', accentColor: '#3b82f6' }} />
                  ) : c.type === 'select' ? (
                    <select 
                      value={localValores[c.name] ?? c.default} 
                      onChange={(e) => handleChange(c.name, e.target.value)}
                      style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', color: 'white', borderRadius: '8px' }}
                    >
                      {c.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <input type="text" value={localValores[c.name] || ''} onChange={(e) => handleChange(c.name, e.target.value)} style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', color: 'white', borderRadius: '8px' }} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* PAINEL DE SALDO E DOWNLOAD */}
      <div style={{ background: '#0f172a', padding: '15px', borderRadius: '15px', border: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>SALDO:</span>
          <span style={{ fontSize: '13px', color: temCreditos ? '#4ade80' : '#f87171', fontWeight: '900' }}>
            {saldoAtual} CRÉDITOS
          </span>
        </div>

        <button 
          onClick={handleGerarSTL} 
          disabled={loading || !temCreditos}
          style={{ width: '100%', padding: '16px', background: 'transparent', color: temCreditos ? '#3b82f6' : '#475569', border: `1px solid ${temCreditos ? '#3b82f6' : '#334155'}`, borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}
        >
          {loading ? "A PROCESSAR..." : "👁️ ATUALIZAR MODELO 3D"}
        </button>

        {stlUrl && temCreditos && (
          <button 
            onClick={handleDownloadSeguro}
            style={{ width: '100%', marginTop: '10px', padding: '18px', background: '#3b82f6', color: 'white', borderRadius: '12px', fontWeight: '900', border: 'none', cursor: 'pointer' }}
          >
            📥 DESCARREGAR STL (1 CRÉDITO)
          </button>
        )}
      </div>
    </div>
  );
}