'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function EditorControls({ produto, perfil, onUpdate, onGerarSucesso, stlUrl }: any) {
  const [loading, setLoading] = useState(false);
  const [localValores, setLocalValores] = useState<any>({});

  // Monitoriza o saldo de créditos do perfil
  const saldoAtual = perfil?.creditos_disponiveis ?? 0;
  const temCreditos = saldoAtual > 0;

  // Para o loading quando o URL do STL é gerado
  useEffect(() => {
    if (stlUrl) setLoading(false);
  }, [stlUrl]);

  useEffect(() => {
    if (produto) {
      // 1. Mapeamento dos campos técnicos da BD (Nome e Número)
      const camposBD: any = {
        // Campos para o "Nome"
        x_nome: produto.default_x_nome ?? 0,
        y_nome: produto.default_y_nome ?? 0,
        size_nome: produto.default_size_nome ?? 7,
        // Campos para o "Número" (Assumindo nomes de colunas similares na tua BD)
        x_numero: produto.default_x_numero ?? 0,
        y_numero: produto.default_y_numero ?? 0,
        size_numero: produto.default_size_numero ?? 7,
        // Configuração inicial de fonte
        fonte: 'OpenSans'
      };

      // 2. Injeção do ui_schema e parâmetros default
      const iniciais = { 
        ...(produto.parametros_default || {}), 
        ...camposBD 
      };

      if (produto.ui_schema && Array.isArray(produto.ui_schema)) {
        produto.ui_schema.forEach((c: any) => {
          if (c && c.name) {
            iniciais[c.name] = c.value !== undefined ? c.value : c.default;
          }
        });
      }

      setLocalValores(iniciais);
      onUpdate(iniciais); // Sincroniza com o STLViewer no carregamento
    }
  }, [produto?.id]);

  const handleChange = (k: string, v: any) => {
    const novosValores = { ...localValores, [k]: v };
    setLocalValores(novosValores);
    onUpdate(novosValores); // Atualiza o preview 3D em tempo real
  };

  // Função para abater crédito e disparar download
  const handleDownloadSeguro = async () => {
    if (!temCreditos) return alert("Saldo de créditos insuficiente.");
    
    setLoading(true);
    // Chama a função RPC 'baixar_credito' que criaste no Supabase
    const { error } = await supabase.rpc('baixar_credito', { user_id: perfil.id });
    
    if (error) {
      alert("Erro ao processar crédito: " + error.message);
      setLoading(false);
    } else {
      const link = document.createElement('a');
      link.href = stlUrl;
      link.download = `${produto.nome || 'modelo_customizado'}.stl`;
      link.click();
      
      // Pequeno delay antes de recarregar para garantir o download
      setTimeout(() => window.location.reload(), 1000);
    }
  };

  const handleGerarSTL = async () => {
    if (!temCreditos) return alert("Precisas de créditos para gerar o ficheiro final.");
    setLoading(true);
    try {
      const response = await fetch("https://maker-pro-docker-prod.onrender.com/gerar-stl-pro", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...localValores, id: produto.id }),
      });
      const data = await response.json();
      if (data.urls || data.url) {
        onGerarSucesso(data.urls || data.url);
      }
    } catch (err) {
      console.error("Erro na geração:", err);
      alert("Erro ao comunicar com o motor de geração.");
      setLoading(false);
    }
  };

  if (!produto?.ui_schema) return null;

  // Organização por secções (excluindo campos técnicos/escondidos)
  const seccoes = Array.from(new Set(
    produto.ui_schema
      .filter((c: any) => c.section && c.section.toUpperCase() !== 'GESTÃO' && c.type !== 'hidden')
      .map((c: any) => c.section)
  ));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      
      {seccoes.map((seccao: any) => (
        <div key={seccao} style={{ background: '#1e293b', padding: '18px', borderRadius: '15px', border: '1px solid #334155' }}>
          <label style={{ fontSize: '10px', color: '#3b82f6', fontWeight: '900', display: 'block', marginBottom: '15px', letterSpacing: '1px' }}>
            {seccao.toUpperCase()}
          </label>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {produto.ui_schema.filter((c: any) => c.section === seccao && c.type !== 'hidden').map((c: any) => (
              <div key={c.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' }}>{c.label?.toUpperCase()}</label>
                  {/* REPOSIÇÃO DE MEDIDAS */}
                  {c.type === 'slider' && (
                    <span style={{ fontSize: '10px', color: '#3b82f6', fontWeight: 'bold' }}>
                      {localValores[c.name] ?? c.default}mm
                    </span>
                  )}
                </div>

                {c.type === 'slider' ? (
                  <input 
                    type="range" 
                    min={c.min} 
                    max={c.max} 
                    step={0.1} 
                    value={localValores[c.name] ?? c.default} 
                    onChange={(e) => handleChange(c.name, parseFloat(e.target.value))} 
                    style={{ width: '100%', accentColor: '#3b82f6', cursor: 'pointer' }} 
                  />
                ) : c.type === 'select' ? (
                  <select 
                    value={localValores[c.name] ?? c.default} 
                    onChange={(e) => handleChange(c.name, e.target.value)}
                    style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', color: 'white', borderRadius: '8px', fontSize: '12px' }}
                  >
                    {c.options?.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                ) : (
                  <input 
                    type="text" 
                    value={localValores[c.name] || ''} 
                    onChange={(e) => handleChange(c.name, e.target.value)} 
                    style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', color: 'white', borderRadius: '8px', fontSize: '13px' }} 
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* PAINEL DE CRÉDITOS E DOWNLOAD */}
      <div style={{ background: '#0f172a', padding: '20px', borderRadius: '18px', border: '1px solid #1e293b', marginTop: '10px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>O TEU SALDO:</span>
          <span style={{ fontSize: '14px', color: temCreditos ? '#4ade80' : '#f87171', fontWeight: '900' }}>
            {saldoAtual} CRÉDITOS
          </span>
        </div>

        <button 
          onClick={handleGerarSTL} 
          disabled={loading || !temCreditos}
          style={{ 
            width: '100%', 
            padding: '16px', 
            background: 'transparent', 
            color: temCreditos ? '#3b82f6' : '#475569', 
            border: `1px solid ${temCreditos ? '#3b82f6' : '#334155'}`, 
            borderRadius: '12px', 
            fontWeight: 'bold', 
            cursor: temCreditos ? 'pointer' : 'not-allowed',
            transition: '0.2s'
          }}
        >
          {loading ? "A PROCESSAR..." : "👁️ ATUALIZAR MODELO 3D"}
        </button>

        {stlUrl && temCreditos && (
          <button 
            onClick={handleDownloadSeguro}
            style={{ 
              width: '100%', 
              marginTop: '12px', 
              padding: '18px', 
              background: '#3b82f6', 
              color: 'white', 
              borderRadius: '12px', 
              fontWeight: '900', 
              border: 'none', 
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
            }}
          >
            📥 DESCARREGAR STL (1 CRÉDITO)
          </button>
        )}
        
        {!temCreditos && (
          <p style={{ fontSize: '10px', color: '#f87171', textAlign: 'center', marginTop: '15px', fontWeight: 'bold' }}>
            AVISO: Carrega a tua conta para baixar ficheiros STL.
          </p>
        )}
      </div>
    </div>
  );
}