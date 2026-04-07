'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // Certifica-te que o caminho está correto

export default function EditorControls({ produto, perfil, onUpdate, onGerarSucesso, stlUrl }: any) {
  const [loading, setLoading] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [localValores, setLocalValores] = useState<any>({});
  
  const [saldoAtual, setSaldoAtual] = useState(perfil?.creditos_disponiveis ?? 0);

  useEffect(() => {
    setSaldoAtual(perfil?.creditos_disponiveis ?? 0);
  }, [perfil]);

  useEffect(() => {
    if (stlUrl) setLoading(false);
  }, [stlUrl]);

  useEffect(() => {
    if (produto) {
      const iniciais: any = { ...(produto.parametros_default || {}) };
      if (produto.ui_schema) {
        produto.ui_schema.forEach((c: any) => {
          if (c.name) iniciais[c.name] = c.value !== undefined ? c.value : c.default;
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
    if (saldoAtual <= 0) return alert("Não tens créditos suficientes para gerar modelos.");
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
      alert("Erro na conexão com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  // --- NOVA FUNÇÃO PARA DOWNLOAD COM DESCONTO ---
  const handleDownloadComDesconto = async () => {
    if (saldoAtual <= 0) return alert("Saldo insuficiente para download.");
    if (!stlUrl) return;

    const confirmar = confirm("Será descontado 1 crédito do teu saldo. Desejas continuar?");
    if (!confirmar) return;

    setBaixando(true);
    try {
      // 1. Descontar no Supabase
      const { data, error } = await supabase
        .from('prod_perfis') // Ajusta para o nome real da tua tabela de perfis
        .update({ creditos_disponiveis: saldoAtual - 1 })
        .eq('id', perfil.id)
        .select();

      if (error) throw error;

      // 2. Atualizar estado local
      setSaldoAtual(prev => prev - 1);

      // 3. Forçar o download do ficheiro
      const link = document.createElement('a');
      link.href = stlUrl;
      link.setAttribute('download', `modelo_${Date.now()}.stl`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      alert("Download iniciado! 1 crédito descontado.");
    } catch (err) {
      console.error(err);
      alert("Erro ao processar o desconto de créditos.");
    } finally {
      setBaixando(false);
    }
  };

  const seccoes = Array.from(new Set(produto?.ui_schema?.filter((c: any) => c.section && c.section !== 'GESTÃO').map((c: any) => c.section)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {seccoes.map((s: any) => (
        <div key={s} style={{ background: '#0f172a', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
          <label style={{ color: '#3b82f6', fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>{String(s).toUpperCase()}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {produto.ui_schema.filter((c: any) => c.section === s && c.type !== 'hidden').map((c: any) => (
              <div key={c.name}>
                <label style={{ fontSize: '10px', color: '#64748b' }}>{c.label || c.name}</label>
                {c.name === 'fonte' ? (
                  <select 
                    value={localValores[c.name] || 'Open Sans'}
                    onChange={(e) => handleChange(c.name, e.target.value)}
                    style={{ width: '100%', padding: '10px', background: '#1e293b', color: 'white', border: '1px solid #334155', borderRadius: '8px', marginTop: '5px' }}
                  >
                    <option value="Open Sans">Open Sans</option>
                    <option value="Bebas">Bebas Neue</option>
                    <option value="Playfair">Playfair Display</option>
                    <option value="BADABB">Badaboom</option>
                  </select>
                ) : (
                  <input 
                    type={c.type === 'slider' ? 'range' : (c.type === 'number' ? 'number' : 'text')}
                    min={c.min} max={c.max} step={0.1}
                    value={localValores[c.name] ?? ''}
                    onChange={(e) => handleChange(c.name, (c.type === 'slider' || c.type === 'number') ? parseFloat(e.target.value) : e.target.value)}
                    style={{ width: '100%', padding: '10px', background: '#1e293b', color: 'white', border: '1px solid #334155', borderRadius: '8px', marginTop: '5px' }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ background: '#0f172a', padding: '15px', borderRadius: '15px', border: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>SALDO:</span>
          <span style={{ fontSize: '12px', color: saldoAtual > 0 ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>{saldoAtual} CRÉDITOS</span>
        </div>
        
        <button onClick={handleGerarSTL} disabled={loading || saldoAtual <= 0} style={{ width: '100%', padding: '15px', background: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6', borderRadius: '10px', cursor: 'pointer', fontWeight: 'bold' }}>
          {loading ? "A PROCESSAR..." : "👁️ ATUALIZAR MODELO 3D"}
        </button>

        <p style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', marginTop: '12px', lineHeight: '1.4' }}>
          ✨ Podes atualizar a pré-visualização as vezes que desejares.<br/>
          <span style={{ color: '#94a3b8' }}>O crédito apenas será descontado quando fizeres o download do ficheiro final.</span>
        </p>

        {stlUrl && (
          <button 
            onClick={handleDownloadComDesconto}
            disabled={baixando || saldoAtual <= 0}
            style={{ width: '100%', marginTop: '15px', padding: '15px', background: '#3b82f6', color: 'white', borderRadius: '10px', border: 'none', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {baixando ? "A DESCONTAR..." : "📥 DESCARREGAR STL (1 CRÉDITO)"}
          </button>
        )}
      </div>
    </div>
  );
}