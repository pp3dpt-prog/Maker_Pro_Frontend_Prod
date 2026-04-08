'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function EditorControls({ produto, perfil, onUpdate, onGerarSucesso, stlUrl }: any) {
  const [loading, setLoading] = useState(false);
  const [baixando, setBaixando] = useState(false);
  const [localValores, setLocalValores] = useState<any>({});
  const [nomeProjeto, setNomeProjeto] = useState('');
  
  const [saldoAtual, setSaldoAtual] = useState(perfil?.creditos_disponiveis ?? 0);

  useEffect(() => {
    setSaldoAtual(perfil?.creditos_disponiveis ?? 0);
  }, [perfil]);

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

  // --- LOGICA ATUALIZADA: GERAR E DESCONTAR ---
  const handleGerarSTL = async () => {
    if (saldoAtual <= 0) return alert("Não tens créditos suficientes.");
    
    const confirmar = confirm(`Isto irá consumir 1 crédito para gerar e guardar este design na tua conta. Continuar?`);
    if (!confirmar) return;

    setLoading(true);
    try {
      // 1. Chamar o servidor enviando user_id e nome_personalizado
      const r = await fetch("https://maker-pro-docker-prod.onrender.com/gerar-stl-pro", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...localValores, 
          id: produto.id,
          user_id: perfil.id, // Enviando o ID do utilizador para o Vault
          nome_personalizado: nomeProjeto || `Design ${produto.nome}`
        }),
      });
      
      const d = await r.json();

      if (d.url || d.urls) {
        // 2. Se o servidor teve sucesso, descontamos o crédito no Supabase
        const { error } = await supabase
          .from('prod_perfis')
          .update({ creditos_disponiveis: saldoAtual - 1 })
          .eq('id', perfil.id);

        if (error) throw error;

        setSaldoAtual(prev => prev - 1);
        onGerarSucesso(d.urls || d.url);
        alert("Design gerado e guardado na tua Área de Cliente!");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao processar o modelo.");
    } finally {
      setLoading(false);
    }
  };

  // --- DOWNLOAD SIMPLES (Já está pago e no cofre) ---
  const handleDownloadSimples = () => {
    if (!stlUrl) return;
    const link = document.createElement('a');
    link.href = stlUrl;
    link.setAttribute('download', `${nomeProjeto || 'modelo'}.stl`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const seccoes = Array.from(new Set(produto?.ui_schema?.filter((c: any) => c.section && c.section !== 'GESTÃO').map((c: any) => c.section)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* NOVO CAMPO: NOME DO PROJETO */}
      <div style={{ background: '#0f172a', padding: '15px', borderRadius: '12px', border: '1px solid #3b82f6' }}>
        <label style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 'bold' }}>NOME DO PROJETO (PARA A TUA ÁREA DE CLIENTE)</label>
        <input 
          type="text" 
          placeholder="Ex: Chaveiro do Rex"
          value={nomeProjeto}
          onChange={(e) => setNomeProjeto(e.target.value)}
          style={{ width: '100%', padding: '10px', background: '#1e293b', color: 'white', border: '1px solid #334155', borderRadius: '8px', marginTop: '5px' }}
        />
      </div>

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
                    <option value="Beaver Punch">Beaver Punch</option>
                    <option value="GABRWFER">Gabriel Weiss' Friends</option>
                    <option value="Megadeth">Megadeth</option>
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
        
        <button 
          onClick={handleGerarSTL} 
          disabled={loading || saldoAtual <= 0} 
          style={{ width: '100%', padding: '15px', background: '#3b82f6', color: 'white', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {loading ? "A PROCESSAR..." : "🔨 GERAR E GUARDAR DESIGN (1 CRÉDITO)"}
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