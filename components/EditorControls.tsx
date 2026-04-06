'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function EditorControls({ produto, perfil, onUpdate, onGerarSucesso, stlUrl }: any) {
  const [loading, setLoading] = useState(false);
  const [localValores, setLocalValores] = useState<any>({});

  const saldoAtual = perfil?.creditos_disponiveis ?? 0;
  const temCreditos = saldoAtual > 0;

  useEffect(() => {
    if (stlUrl) setLoading(false);
  }, [stlUrl]);

  useEffect(() => {
    if (produto) {
      // 1. Carrega parâmetros padrão e os campos específicos da BD
      const iniciais: any = { 
        ...(produto.parametros_default || {}),
        fonte: 'OpenSans', // Fonte inicial fixa
        // Mapeamento dos campos que mostraste na imagem da BD
        x_nome: produto.default_x_nome ?? 0,
        y_nome: produto.default_y_nome ?? 0,
        size_nome: produto.default_size_nome ?? 7
      };

      if (produto.ui_schema && Array.isArray(produto.ui_schema)) {
        produto.ui_schema.forEach((c: any) => {
          if (c && c.name) {
            iniciais[c.name] = c.value !== undefined ? c.value : c.default;
          }
        });
      }
      setLocalValores(iniciais);
      onUpdate(iniciais); // Envia para o STLViewer e motor de geração
    }
  }, [produto?.id]);

  const handleChange = (k: string, v: any) => {
    const n = { ...localValores, [k]: v };
    setLocalValores(n);
    onUpdate(n); // Crucial: Isto faz a fonte e medidas mudarem no preview
  };

  const handleDownloadSeguro = async () => {
    if (!temCreditos) return alert("Sem créditos!");
    const { error } = await supabase.rpc('baixar_credito', { user_id: perfil.id });
    if (error) {
      alert("Erro no crédito.");
    } else {
      const link = document.createElement('a');
      link.href = stlUrl;
      link.download = `${produto.nome}.stl`;
      link.click();
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
          <label style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 'bold', display: 'block', marginBottom: '12px' }}>{seccao.toUpperCase()}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {produto.ui_schema.filter((c: any) => c.section === seccao && c.type !== 'hidden').map((c: any) => (
              <div key={c.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '10px', color: '#94a3b8' }}>{c.label?.toUpperCase()}</label>
                  {c.type === 'slider' && <span style={{ fontSize: '10px', color: '#3b82f6' }}>{localValores[c.name]}mm</span>}
                </div>
                <div style={{ marginTop: '5px' }}>
                  {c.type === 'slider' ? (
                    <input type="range" min={c.min} max={c.max} step={0.1} value={localValores[c.name] ?? c.default} onChange={(e) => handleChange(c.name, parseFloat(e.target.value))} style={{ width: '100%' }} />
                  ) : c.type === 'select' ? (
                    <select value={localValores[c.name]} onChange={(e) => handleChange(c.name, e.target.value)} style={{ width: '100%', padding: '10px', background: '#0f172a', color: 'white', borderRadius: '8px', border: '1px solid #475569' }}>
                      {c.options?.map((o: string) => <option key={o} value={o}>{o}</option>)}
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

      {/* SALDO E DOWNLOAD */}
      <div style={{ background: '#0f172a', padding: '15px', borderRadius: '15px', border: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>SALDO:</span>
          <span style={{ fontSize: '13px', color: temCreditos ? '#4ade80' : '#f87171', fontWeight: '900' }}>{saldoAtual} CRÉDITOS</span>
        </div>
        <button onClick={handleGerarSTL} disabled={loading || !temCreditos} style={{ width: '100%', padding: '16px', background: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6', borderRadius: '12px', fontWeight: 'bold', cursor: 'pointer' }}>
          {loading ? "A PROCESSAR..." : "👁️ ATUALIZAR MODELO 3D"}
        </button>
        {stlUrl && temCreditos && (
          <button onClick={handleDownloadSeguro} style={{ width: '100%', marginTop: '10px', padding: '18px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '12px', fontWeight: '900', cursor: 'pointer' }}>
            📥 DESCARREGAR STL (1 CRÉDITO)
          </button>
        )}
      </div>
    </div>
  );
}