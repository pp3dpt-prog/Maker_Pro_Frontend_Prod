'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

// Estilos para os inputs do Modal
const modalInputStyle = {
  padding: '12px',
  background: '#0f172a',
  border: '1px solid #334155',
  borderRadius: '10px',
  color: 'white',
  fontSize: '14px',
  width: '100%',
  boxSizing: 'border-box' as const
};

const DISCORD_WEBHOOK_URL = "https://discord.com/api/webhooks/1490366722060976140/OVy9c9eweYDRTrcUW-DQsdbq2BEcfHcCGIBwP427QoOvfWuRLmTzoehKuKZa5loWHScd";

export default function EditorControls({ produto, perfil, onUpdate, onGerarSucesso, stlUrl }: any) {
  const [loading, setLoading] = useState(false);
  const [isGeneratingSTL, setIsGeneratingSTL] = useState(false);
  const [localValores, setLocalValores] = useState<any>({});
  
  // Estados do Modal e Checkout
  const [showCheckout, setShowCheckout] = useState(false);
  const [termosAceitos, setTermosAceitos] = useState(false);
  const [formData, setFormData] = useState({
    nome_completo: '',
    morada_entrega: '',
    codigo_postal: '',
    cidade: '',
    nif: ''
  });

  // 1. Inicialização de parâmetros
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

  // 2. Função de Geração de STL (Reutilizável)
  const handleGerarSTL = async () => {
    if (!produto?.id) return;
    setIsGeneratingSTL(true);
    setLoading(true);

    const payload = { 
      ...localValores, 
      id: produto.id,
      nome: localValores.nome_pet || localValores.nome 
    };

    try {
      const r = await fetch("https://maker-pro-docker-prod.onrender.com/gerar-stl-pro", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      onGerarSucesso(d.urls || d.url);
    } catch (err) { 
      console.error("Erro ao gerar STL:", err);
    } finally { 
      setLoading(false); 
      setIsGeneratingSTL(false);
    }
  };

  // 3. Submissão Final com Validação Estrita e Notificação
  const finalizarEncomenda = async () => {
    // Validação de campos obrigatórios
    if (!formData.nome_completo || !formData.morada_entrega || !formData.codigo_postal || !formData.cidade) {
      return alert("Erro: Preencha todos os campos obrigatórios (*).");
    }
    if (!termosAceitos) return alert("Erro: Deve aceitar o processamento de dados.");
    
    // Se ainda estiver a gerar o STL, espera
    if (isGeneratingSTL || !stlUrl) {
      return alert("Ainda estamos a preparar o seu ficheiro 3D... Aguarde 5 segundos e tente novamente.");
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Gravar no Supabase
      const { error } = await supabase.from('prod_encomendas').insert([{
        user_id: session?.user?.id,
        projeto_id: produto.id,
        nome_completo: formData.nome_completo,
        morada_entrega: formData.morada_entrega,
        codigo_postal: formData.codigo_postal,
        cidade: formData.cidade,
        nif: formData.nif,
        stl_url: stlUrl,
        configuracao: localValores,
        status: 'pendente'
      }]);

      if (error) throw error;

      // Notificar Discord
      await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: "MakerPro Logística",
          embeds: [{
            title: "📦 NOVA ENCOMENDA DE CLIENTE!",
            color: 5763719,
            fields: [
              { name: "👤 Nome", value: formData.nome_completo, inline: true },
              { name: "📍 Localidade", value: `${formData.cidade} (${formData.codigo_postal})`, inline: true },
              { name: "🏠 Morada", value: formData.morada_entrega },
              { name: "📄 NIF", value: formData.nif || "Não fornecido", inline: true },
              { name: "🔗 Ficheiro STL", value: `[BAIXAR PARA IMPRESSÃO](${stlUrl})` }
            ],
            timestamp: new Date().toISOString()
          }]
        })
      });

      alert("Encomenda registada com sucesso! O administrador foi notificado via Discord.");
      setShowCheckout(false);
    } catch (err) {
      alert("Erro ao processar. Tente novamente ou contacte o suporte.");
    } finally {
      setLoading(false);
    }
  };

  const isMaker = perfil?.acesso_comercial_ativo === true || perfil?.role === 'admin';

  if (!produto || !produto.ui_schema) return <div style={{ color: '#94a3b8', padding: '20px' }}>Carregando configurador...</div>;

  const camposVisiveis = produto.ui_schema.filter((c: any) => c && c.type !== 'hidden');
  const seccoes = Array.from(new Set(camposVisiveis.map((c: any) => c.section || 'GERAL')));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* RENDERIZAÇÃO DINÂMICA DE CAMPOS */}
      {seccoes.map((seccaoNome: any) => {
        const camposDaSeccao = camposVisiveis.filter((c: any) => (c.section || 'GERAL') === seccaoNome);
        if (camposDaSeccao.length === 0) return null;

        return (
          <div key={seccaoNome} style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
            <label style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 'bold', display: 'block', marginBottom: '15px', borderBottom: '1px solid #334155', paddingBottom: '8px' }}>
              {String(seccaoNome).toUpperCase()}
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {camposDaSeccao.map((c: any) => (
                <div key={c.name}>
                  <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold' }}>{c.label?.toUpperCase()}</label>
                  <div style={{ marginTop: '5px' }}>
                    {c.type === 'slider' ? (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', marginBottom: '5px' }}>
                          <span>VALOR</span>
                          <span style={{ color: '#3b82f6' }}>{localValores[c.name] ?? c.default}</span>
                        </div>
                        <input type="range" min={c.min} max={c.max} step={0.1} 
                          value={localValores[c.name] ?? c.default ?? 0} 
                          onChange={(e) => handleChange(c.name, parseFloat(e.target.value))} 
                          style={{ width: '100%', accentColor: '#2563eb' }} />
                      </>
                    ) : (
                      <input type="text" value={localValores[c.name] || ''} 
                        onChange={(e) => handleChange(c.name, e.target.value)} 
                        style={{ width: '100%', padding: '10px', background: '#0f172a', border: '1px solid #475569', color: 'white', borderRadius: '8px', boxSizing: 'border-box' }} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* SELETOR DE FONTES */}
      {localValores.nome_pet !== undefined && (
        <div style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
          <label style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 'bold' }}>FONTE DO TEXTO</label>
          <select value={localValores.fonte || 'Open Sans'} onChange={(e) => handleChange('fonte', e.target.value)}
            style={{ width: '100%', marginTop: '10px', padding: '10px', background: '#0f172a', color: 'white', border: '1px solid #475569', borderRadius: '8px' }}>
            <option value="Open Sans">Open Sans</option>
            <option value="Bebas">Bebas Neue</option>
            <option value="Playfair">Playfair Display</option>
          </select>
        </div>
      )}

      {/* BOTÕES DE AÇÃO ADAPTATIVOS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
        <button onClick={handleGerarSTL} disabled={loading} style={{ padding: '16px', background: 'transparent', color: '#3b82f6', borderRadius: '12px', border: '1px solid #3b82f6', cursor: 'pointer', fontWeight: 'bold' }}>
          {loading ? "PROCESSANDO..." : "👁️ ATUALIZAR PRÉ-VISUALIZAÇÃO"}
        </button>

        {isMaker ? (
          <button 
            style={{ padding: '20px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: '900' }}
            onClick={() => alert("A descarregar ficheiro STL profissional...")}
          >
            📥 DESCARREGAR FICHEIRO STL
          </button>
        ) : (
          <button 
            onClick={() => {
              setShowCheckout(true);
              if (!stlUrl && !isGeneratingSTL) handleGerarSTL(); // Geração automática ao abrir
            }}
            style={{ padding: '20px', background: 'linear-gradient(135deg, #059669, #047857)', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: '900' }}
          >
            📦 RECEBER PEÇA EM CASA (IMPRESSÃO 3D)
          </button>
        )}
      </div>

      {/* MODAL DE CHECKOUT COM VALIDAÇÃO E RGPD */}
      {showCheckout && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: '#1e293b', width: '100%', maxWidth: '500px', borderRadius: '24px', padding: '30px', border: '1px solid #334155', position: 'relative' }}>
            <button onClick={() => setShowCheckout(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '20px' }}>✕</button>

            <h2 style={{ fontSize: '22px', marginBottom: '10px', color: 'white' }}>Finalizar Encomenda</h2>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '25px' }}>Por favor, indique onde deseja receber a sua peça.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input type="text" placeholder="Nome Completo *" required value={formData.nome_completo} onChange={e => setFormData({...formData, nome_completo: e.target.value})} style={modalInputStyle} />
              <input type="text" placeholder="Morada de Entrega *" required value={formData.morada_entrega} onChange={e => setFormData({...formData, morada_entrega: e.target.value})} style={modalInputStyle} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input type="text" placeholder="Cód. Postal *" required value={formData.codigo_postal} onChange={e => setFormData({...formData, codigo_postal: e.target.value})} style={modalInputStyle} />
                <input type="text" placeholder="Cidade *" required value={formData.cidade} onChange={e => setFormData({...formData, cidade: e.target.value})} style={modalInputStyle} />
              </div>
              <input type="text" placeholder="NIF (Para Fatura)" value={formData.nif} onChange={e => setFormData({...formData, nif: e.target.value})} style={modalInputStyle} />

              <label style={{ display: 'flex', gap: '10px', marginTop: '10px', cursor: 'pointer', alignItems: 'flex-start' }}>
                <input type="checkbox" checked={termosAceitos} onChange={e => setTermosAceitos(e.target.checked)} style={{ width: '18px', height: '18px' }} />
                <span style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
                  Aceito que a MakerPro processe os meus dados para fins de envio e faturação da peça.
                </span>
              </label>

              <button 
                onClick={finalizarEncomenda}
                disabled={loading}
                style={{ 
                  marginTop: '10px', padding: '16px', 
                  background: isGeneratingSTL ? '#334155' : '#059669', 
                  color: 'white', borderRadius: '12px', border: 'none', 
                  fontWeight: 'bold', cursor: isGeneratingSTL ? 'wait' : 'pointer' 
                }}
              >
                {isGeneratingSTL ? "A PREPARAR MODELO 3D..." : loading ? "A PROCESSAR..." : "CONFIRMAR ENCOMENDA"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}