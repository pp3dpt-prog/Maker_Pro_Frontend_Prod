'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function EditorControls({ produto, perfil, onUpdate, onGerarSucesso, stlUrl }: any) {
  const [loading, setLoading] = useState(false);
  const [localValores, setLocalValores] = useState<any>(null);

  const saldoAtual = perfil?.creditos_disponiveis ?? 0;
  const temCreditos = saldoAtual > 0;

  useEffect(() => {
    if (produto) {
      // 1. MAPEAMENTO TOTAL DOS CAMPOS DA BASE DE DADOS
      const valoresIniciais: any = {
        ...(produto.parametros_default || {}),
        // Nome
        x_nome: produto.default_x_nome ?? 0,
        y_nome: produto.default_y_nome ?? 0,
        size_nome: produto.default_size_nome ?? 7,
        // Número
        x_numero: produto.default_x_numero ?? 0,
        y_numero: produto.default_y_numero ?? 0,
        size_numero: produto.default_size_numero ?? 7,
        // Fonte e Textos Padrão
        fonte: produto.fonte_default || 'OpenSans',
        texto_linha_1: "NOME",
        texto_linha_2: "123 456 789"
      };

      // 2. Injetar configurações do ui_schema (se existirem)
      if (produto.ui_schema) {
        produto.ui_schema.forEach((c: any) => {
          if (c.name) valoresIniciais[c.name] = c.value ?? c.default;
        });
      }

      setLocalValores(valoresIniciais);
      onUpdate(valoresIniciais); // Notifica o Viewer imediatamente
    }
  }, [produto?.id]);

  const handleChange = (k: string, v: any) => {
    const novos = { ...localValores, [k]: v };
    setLocalValores(novos);
    onUpdate(novos);
  };

  const handleDownloadSeguro = async () => {
    if (!temCreditos) return alert("Sem créditos!");
    const { error } = await supabase.rpc('baixar_credito', { user_id: perfil.id });
    if (error) return alert("Erro no crédito");
    const link = document.createElement('a');
    link.href = stlUrl;
    link.download = `${produto.nome}.stl`;
    link.click();
    setTimeout(() => window.location.reload(), 1000);
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
    } catch (e) { alert("Erro ao gerar"); }
    setLoading(false);
  };

  if (!localValores) return null;

  // ORGANIZAÇÃO POR SEÇÕES
  const seccoes = Array.from(new Set(
    produto.ui_schema
      ?.filter((c: any) => c.section && c.section.toUpperCase() !== 'GESTÃO' && c.type !== 'hidden')
      .map((c: any) => c.section)
  ));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      
      {/* BLOCO DE FONTE (Sempre Visível se houver texto) */}
      <div style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #3b82f6' }}>
        <label style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 'bold' }}>TIPOGRAFIA</label>
        <select value={localValores.fonte} onChange={(e) => handleChange('fonte', e.target.value)}
          style={{ width: '100%', marginTop: '8px', padding: '10px', background: '#0f172a', color: 'white', borderRadius: '8px', border: '1px solid #475569' }}>
          <option value="OpenSans">Open Sans</option>
          <option value="BebasNeue">Bebas Neue</option>
          <option value="Roboto">Roboto</option>
          <option value="Lobster">Lobster</option>
        </select>
      </div>

      {/* BLOCOS DINÂMICOS POR SEÇÃO */}
      {seccoes.map((seccao: any) => (
        <div key={seccao} style={{ background: '#1e293b', padding: '15px', borderRadius: '12px' }}>
          <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>{seccao.toUpperCase()}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {produto.ui_schema.filter((c: any) => c.section === seccao && c.type !== 'hidden').map((c: any) => (
              <div key={c.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label style={{ fontSize: '9px', color: '#64748b' }}>{c.label?.toUpperCase()}</label>
                  {c.type === 'slider' && <span style={{ fontSize: '9px', color: '#3b82f6' }}>{localValores[c.name]}mm</span>}
                </div>
                <input 
                  type={c.type === 'slider' ? 'range' : 'text'}
                  min={c.min} max={c.max} step={0.1}
                  value={localValores[c.name] ?? ''}
                  onChange={(e) => handleChange(c.name, c.type === 'slider' ? parseFloat(e.target.value) : e.target.value)}
                  style={{ width: '100%', marginTop: '5px' }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* PAINEL FINANCEIRO */}
      <div style={{ background: '#0f172a', padding: '20px', borderRadius: '15px', border: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>SALDO:</span>
          <span style={{ fontSize: '13px', color: temCreditos ? '#4ade80' : '#f87171', fontWeight: '900' }}>{saldoAtual} CRÉDITOS</span>
        </div>
        <button onClick={handleGerarSTL} disabled={loading || !temCreditos} style={{ width: '100%', padding: '15px', background: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
          {loading ? "A GERAR..." : "ATUALIZAR PREVIEW 3D"}
        </button>
        {stlUrl && temCreditos && (
          <button onClick={handleDownloadSeguro} style={{ width: '100%', marginTop: '10px', padding: '15px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}>
            DESCARREGAR STL (-1 CRÉDITO)
          </button>
        )}
      </div>
    </div>
  );
}