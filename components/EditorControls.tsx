'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function EditorControls({ produto, perfil, onUpdate, onGerarSucesso, stlUrl }: any) {
  const [loading, setLoading] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [localValores, setLocalValores] = useState<any>({});
  const [saldoAtual, setSaldoAtual] = useState(perfil?.creditos_disponiveis ?? 0);

  const custoDinamico = produto?.custo_creditos ?? 1;

  useEffect(() => {
    setSaldoAtual(perfil?.creditos_disponiveis ?? 0);
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
    if (saldoAtual < custoDinamico) return alert(`Saldo insuficiente.`);
    if (!confirm(`Consumir ${custoDinamico} crédito(s) para gerar este design?`)) return;

    setLoading(true);
    setProgresso(10); // Começou o processo

    // Simulação de progresso enquanto o servidor trabalha
    const interval = setInterval(() => {
      setProgresso((prev) => (prev < 90 ? prev + 5 : prev));
    }, 2000);

    try {
      const petName = localValores.nome_pet ? String(localValores.nome_pet).toLowerCase().replace(/\s+/g, '_') : 'objeto';
      const nomeGerado = `${produto.id}_${petName}`;

      const r = await fetch("https://maker-pro-docker-prod.onrender.com/gerar-stl-pro", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...localValores, 
          id: produto.id, 
          user_id: perfil?.id, 
          nome_personalizado: nomeGerado 
        }),
      });
      const d = await r.json();

      if (d.url || d.urls) {
        setProgresso(100); // Finalizado
        clearInterval(interval);
        
        if (custoDinamico > 0) {
          await supabase.from('prod_perfis').update({ creditos_disponiveis: saldoAtual - custoDinamico }).eq('id', perfil.id);
          setSaldoAtual(prev => prev - custoDinamico);
        }
        onGerarSucesso(d.urls || d.url);
      }
    } catch (err) {
      alert("Erro ao processar.");
      setProgresso(0);
    } finally {
      clearInterval(interval);
      setLoading(false);
      setTimeout(() => setProgresso(0), 3000); // Esconde a barra após 3s
    }
  };

  const handleDownloadSimples = () => {
    if (!stlUrl) return;
    const link = document.createElement('a');
    link.href = Array.isArray(stlUrl) ? stlUrl[0] : stlUrl;
    link.setAttribute('download', `design_${produto.id}.stl`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const seccoes = Array.from(new Set(produto?.ui_schema?.filter((c: any) => c.section && c.section !== 'GESTÃO').map((c: any) => c.section))) as string[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* CAMPOS DE EDIÇÃO */}
      {seccoes.map((s) => (
        <div key={s} style={{ background: '#0f172a', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
          <label style={{ color: '#3b82f6', fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>{s.toUpperCase()}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {produto.ui_schema.filter((c: any) => c.section === s && c.type !== 'hidden').map((c: any) => (
              <div key={c.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '10px', color: '#64748b' }}>{c.label || c.name}</label>
                  {(c.type === 'slider' || c.type === 'number') && (
                    <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 'bold', background: '#1e293b', padding: '2px 6px', borderRadius: '4px' }}>
                      {localValores[c.name] ?? 0} mm
                    </span>
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

      {/* ÁREA DE STATUS E GERAÇÃO */}
      <div style={{ background: '#0f172a', padding: '15px', borderRadius: '15px', border: '1px solid #1e293b' }}>
        
        {/* BARRA DE PROGRESSO */}
        {loading && (
          <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#3b82f6', marginBottom: '5px', fontWeight: 'bold' }}>
              <span>A RENDERIZAR PEÇA...</span>
              <span>{progresso}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: '#1e293b', borderRadius: '10px', overflow: 'hidden', border: '1px solid #334155' }}>
              <div style={{ width: `${progresso}%`, height: '100%', background: '#3b82f6', transition: 'width 0.3s ease' }}></div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>SALDO:</span>
          <span style={{ fontSize: '12px', color: saldoAtual >= custoDinamico ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>{saldoAtual} CRÉDITOS</span>
        </div>
        
        <button 
          onClick={handleGerarSTL} 
          disabled={loading || saldoAtual < custoDinamico} 
          style={{ width: '100%', padding: '15px', background: loading ? '#1e293b' : '#3b82f6', color: 'white', borderRadius: '10px', border: 'none', cursor: loading ? 'default' : 'pointer', fontWeight: 'bold' }}
        >
          {loading ? "A PROCESSAR..." : `🔨 GERAR DESIGN (${custoDinamico} CRÉD.)`}
        </button>

        {stlUrl && (
          <button 
            onClick={handleDownloadSimples}
            style={{ width: '100%', marginTop: '15px', padding: '15px', background: 'transparent', border: '1px solid #4ade80', color: '#4ade80', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            📥 DESCARREGAR AGORA
          </button>
        )}
      </div>
    </div>
  );
}