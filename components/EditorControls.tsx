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
      // 1. MAPEAMENTO DE VALORES PREDEFINIDOS DA BASE DE DADOS
      const iniciais: any = {
        // Nome (Variáveis exatas do STLViewer)
        xPos: produto.default_x_nome ?? 0,
        yPos: produto.default_y_nome ?? 0,
        fontSize: produto.default_size_nome ?? 7,
        
        // Número (Variáveis exatas do STLViewer)
        xPosN: produto.default_x_num ?? 0,
        yPosN: produto.default_y_num ?? 0,
        fontSizeN: produto.default_size_num ?? 5,

        // Fonte e Textos
        fonte: produto.default_fonte || 'OpenSans',
        nome_pet: "NOME",
        telefone: "123 456 789",

        // Outros parâmetros do JSONB
        ...(produto.parametros_default || {}),
      };

      // 2. SINCRONIZAÇÃO DO UI_SCHEMA COM A BD
      if (produto.ui_schema) {
        produto.ui_schema.forEach((c: any) => {
          if (c.name && iniciais[c.name] !== undefined) {
            iniciais[c.name] = iniciais[c.name]; 
          } else if (c.name) {
            iniciais[c.name] = c.value ?? c.default;
          }
        });
      }

      setLocalValores(iniciais);
      onUpdate(iniciais);
    }
  }, [produto?.id]);

  const handleChange = (k: string, v: any) => {
    const novos = { ...localValores, [k]: v };
    setLocalValores(novos);
    onUpdate(novos);
  };

  const handleDownload = async () => {
    if (!temCreditos) return alert("Sem créditos!");
    const { error } = await supabase.rpc('baixar_credito', { user_id: perfil.id });
    if (error) return alert("Erro no débito de créditos.");
    
    const link = document.createElement('a');
    link.href = stlUrl;
    link.download = `${produto.nome}.stl`;
    link.click();
    setTimeout(() => window.location.reload(), 1000);
  };

  if (!localValores) return null;

  // ORGANIZAÇÃO POR BLOCOS/SECÇÕES
  const seccoes = Array.from(new Set(
    produto.ui_schema?.filter((c: any) => c.section && c.type !== 'hidden').map((c: any) => c.section)
  ));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* RENDERIZAÇÃO DOS BLOCOS DINÂMICOS */}
      {seccoes.map((seccao: any) => (
        <div key={seccao} style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
          <label style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 'bold', display: 'block', marginBottom: '12px' }}>
            {seccao.toUpperCase()}
          </label>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {produto.ui_schema.filter((c: any) => c.section === seccao && c.type !== 'hidden').map((c: any) => (
              <div key={c.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '9px', color: '#94a3b8' }}>{c.label?.toUpperCase()}</label>
                  {c.type === 'slider' && <span style={{ fontSize: '9px', color: '#3b82f6' }}>{localValores[c.name]}mm</span>}
                </div>

                {c.type === 'select' ? (
                  <select value={localValores[c.name]} onChange={(e) => handleChange(c.name, e.target.value)}
                    style={{ width: '100%', padding: '10px', background: '#0f172a', color: 'white', borderRadius: '8px', border: '1px solid #475569', marginTop: '5px' }}>
                    {c.options?.map((o: any) => (
                      <option key={o.value || o} value={o.value || o}>{o.label || o}</option>
                    ))}
                  </select>
                ) : c.type === 'slider' ? (
                  <input type="range" min={c.min} max={c.max} step={0.1} value={localValores[c.name]} 
                    onChange={(e) => handleChange(c.name, parseFloat(e.target.value))} style={{ width: '100%', marginTop: '8px' }} />
                ) : (
                  <input type="text" value={localValores[c.name]} onChange={(e) => handleChange(c.name, e.target.value)}
                    style={{ width: '100%', padding: '10px', background: '#0f172a', color: 'white', borderRadius: '8px', border: '1px solid #475569', marginTop: '5px' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* PAINEL DE SALDO E DOWNLOAD (REPOSTO) */}
      <div style={{ background: '#0f172a', padding: '20px', borderRadius: '15px', border: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>SALDO DISPONÍVEL:</span>
          <span style={{ fontSize: '13px', color: temCreditos ? '#4ade80' : '#f87171', fontWeight: '900' }}>{saldoAtual} CRÉDITOS</span>
        </div>
        
        <button onClick={() => onGerarSucesso(null)} disabled={loading || !temCreditos} 
          style={{ width: '100%', padding: '15px', background: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
          {loading ? "A PROCESSAR..." : "ATUALIZAR PREVIEW 3D"}
        </button>

        {stlUrl && temCreditos && (
          <button onClick={handleDownload} 
            style={{ width: '100%', marginTop: '10px', padding: '15px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}>
            DESCARREGAR STL (-1 CRÉDITO)
          </button>
        )}
      </div>
    </div>
  );
}