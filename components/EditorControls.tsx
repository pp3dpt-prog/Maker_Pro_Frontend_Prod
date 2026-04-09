'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function EditorControls({ produto, perfil, onUpdate, onGerarSucesso, stlUrl }: any) {
  const [loading, setLoading] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [localValores, setLocalValores] = useState<any>({});
  const [saldoAtual, setSaldoAtual] = useState(perfil?.creditos_disponiveis ?? 0);

  const custoDinamico = produto?.custo_creditos ?? 1;

  // Sincroniza o saldo local quando o perfil é carregado
  useEffect(() => { 
    if (perfil) setSaldoAtual(perfil.creditos_disponiveis); 
  }, [perfil]);

  // Inicializa os parâmetros do design
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
    // PROTEÇÃO CRÍTICA: Verifica se o perfil existe antes de enviar ao servidor
    if (!perfil?.id) {
      return alert("Erro: Perfil de utilizador não carregado. Por favor, faz refresh à página ou verifica o login.");
    }

    if (saldoAtual < custoDinamico) {
      return alert(`Saldo insuficiente. Precisas de ${custoDinamico} créditos.`);
    }

    if (!confirm(`Confirmas o gasto de ${custoDinamico} crédito(s)?`)) return;

    setLoading(true);
    setProgresso(5);

    // Progresso visual simulado
    const interval = setInterval(() => { 
      setProgresso((prev) => (prev < 92 ? prev + 3 : prev)); 
    }, 1500);

    try {
      const petName = localValores.nome_pet ? String(localValores.nome_pet).toLowerCase().replace(/\s+/g, '_') : 'objeto';
      
      const r = await fetch("https://maker-pro-docker-prod.onrender.com/gerar-stl-pro", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...localValores, 
          id: produto.id, 
          user_id: perfil.id, // ID garantido pela verificação inicial
          nome_personalizado: `${produto.id}_${petName}`,
          custo: custoDinamico 
        }),
      });
      
      const d = await r.json();

      if (r.ok && (d.url || d.urls)) {
        setProgresso(100);
        // Atualiza o saldo com o valor retornado pelo servidor
        if (d.novoSaldo !== undefined) setSaldoAtual(d.novoSaldo);
        
        onGerarSucesso(d.urls || d.url);
      } else {
        alert("Erro: " + (d.error || "Ocorreu um erro no servidor."));
        setProgresso(0);
      }
    } catch (err) { 
      alert("Erro ao conectar com o servidor de renderização."); 
      setProgresso(0);
    } finally { 
      clearInterval(interval); 
      setLoading(false); 
      setTimeout(() => setProgresso(0), 4000); 
    }
  };

  const handleDownloadSimples = () => {
    if (!stlUrl) return;
    const petName = localValores.nome_pet ? String(localValores.nome_pet).toLowerCase() : 'design';
    const finalUrl = Array.isArray(stlUrl) ? stlUrl[0] : stlUrl;
    
    const link = document.createElement('a');
    link.href = finalUrl;
    link.setAttribute('download', `${produto.id}_${petName}.stl`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const seccoes = Array.from(new Set(produto?.ui_schema?.filter((c: any) => c.section && c.section !== 'GESTÃO').map((c: any) => c.section))) as string[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* CAMPOS DE EDIÇÃO DINÂMICOS */}
      {seccoes.map((s) => (
        <div key={s} style={{ background: '#0f172a', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
          <label style={{ color: '#3b82f6', fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>{s.toUpperCase()}</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {produto.ui_schema.filter((c: any) => c.section === s && c.type !== 'hidden').map((c: any) => (
              <div key={c.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <label style={{ fontSize: '10px', color: '#64748b' }}>{c.label || c.name}</label>
                  {/* EXIBIÇÃO EM MM */}
                  {(c.type === 'slider' || c.type === 'number') && (
                    <span style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 'bold', background: '#1e293b', padding: '2px 6px', borderRadius: '4px' }}>
                      {localValores[c.name] ?? 0} mm
                    </span>
                  )}
                </div>

                {c.name === 'fonte' ? (
                  <select 
                    value={localValores[c.name] || 'Open Sans'}
                    onChange={(e) => handleChange(c.name, e.target.value)}
                    style={{ width: '100%', padding: '10px', background: '#1e293b', color: 'white', border: '1px solid #334155', borderRadius: '8px' }}
                  >
                    <option value="Open Sans">Open Sans</option>
                    <option value="Bebas">Bebas Neue</option>
                    <option value="Playfair">Playfair Display</option>
                  </select>
                ) : (
                  <input 
                    type={c.type === 'slider' ? 'range' : (c.type === 'number' ? 'number' : 'text')}
                    min={c.min} max={c.max} step={0.1}
                    value={localValores[c.name] ?? ''}
                    onChange={(e) => handleChange(c.name, (c.type === 'slider' || c.type === 'number') ? parseFloat(e.target.value) : e.target.value)}
                    style={{ width: '100%', padding: '10px', background: '#1e293b', color: 'white', border: '1px solid #334155', borderRadius: '8px' }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* ÁREA DE STATUS, PROGRESSO E AÇÃO */}
      <div style={{ background: '#0f172a', padding: '15px', borderRadius: '15px', border: '1px solid #1e293b' }}>
        
        {/* BARRA DE PROGRESSO */}
        {loading && (
          <div style={{ marginBottom: '15px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#3b82f6', marginBottom: '5px', fontWeight: 'bold' }}>
              <span>A PROCESSAR STL...</span>
              <span>{progresso}%</span>
            </div>
            <div style={{ width: '100%', height: '8px', background: '#1e293b', borderRadius: '10px', overflow: 'hidden', border: '1px solid #334155' }}>
              <div style={{ width: `${progresso}%`, height: '100%', background: '#3b82f6', transition: 'width 0.4s ease' }}></div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>TEU SALDO:</span>
          <span style={{ fontSize: '12px', color: saldoAtual >= custoDinamico ? '#4ade80' : '#f87171', fontWeight: 'bold' }}>
            {saldoAtual} CRÉDITOS
          </span>
        </div>
        
        <button 
          onClick={handleGerarSTL} 
          disabled={loading || saldoAtual < custoDinamico} 
          style={{ 
            width: '100%', 
            padding: '15px', 
            background: loading ? '#1e293b' : '#3b82f6', 
            color: 'white', 
            borderRadius: '10px', 
            border: 'none', 
            fontWeight: 'bold', 
            cursor: loading ? 'default' : 'pointer' 
          }}
        >
          {loading ? "A RENDERIZAR..." : `🔨 GERAR DESIGN (${custoDinamico} CRÉD.)`}
        </button>

        {/* BOTÃO DE DOWNLOAD RESTAURADO */}
        {stlUrl && (
          <button 
            onClick={handleDownloadSimples}
            style={{ 
              width: '100%', 
              marginTop: '15px', 
              padding: '15px', 
              background: 'transparent', 
              border: '1px solid #4ade80', 
              color: '#4ade80', 
              borderRadius: '10px', 
              fontWeight: 'bold', 
              cursor: 'pointer' 
            }}
          >
            📥 DESCARREGAR AGORA
          </button>
        )}
      </div>
    </div>
  );
}