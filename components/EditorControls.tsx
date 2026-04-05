'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
  const [showCheckout, setShowCheckout] = useState(false);
  const [termosAceitos, setTermosAceitos] = useState(false);
  
  const [formData, setFormData] = useState({
    nome_completo: '',
    morada_entrega: '',
    codigo_postal: '',
    cidade: '',
    nif: '' 
  });

  // Garante que se o ficheiro chegar, o estado de loading morre
  useEffect(() => {
    if (stlUrl) {
      setIsGeneratingSTL(false);
      setLoading(false);
    }
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

  const handleGerarSTL = async () => {
    if (isGeneratingSTL) return;
    setIsGeneratingSTL(true);
    setLoading(true);
    try {
      const r = await fetch("https://maker-pro-docker-prod.onrender.com/gerar-stl-pro", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...localValores, id: produto.id }),
      });
      const d = await r.json();
      onGerarSucesso(d.urls || d.url);
    } catch (err) {
      setLoading(false);
      setIsGeneratingSTL(false);
    }
  };

  const finalizarEncomenda = async () => {
    if (!formData.nome_completo || !formData.morada_entrega || !termosAceitos) {
      return alert("Por favor, preencha os dados obrigatórios e aceite os termos.");
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase.from('prod_encomendas').insert([{
        user_id: session?.user?.id,
        projeto_id: produto.id,
        nome_completo: formData.nome_completo,
        morada_entrega: formData.morada_entrega,
        codigo_postal: formData.codigo_postal,
        cidade: formData.cidade,
        nif: formData.nif,
        stl_url: stlUrl || "URL_PENDENTE",
        configuracao: localValores,
        status: 'pendente'
      }]);

      if (error) throw error;

      await fetch(DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: `📦 **NOVA ENCOMENDA**\n**Cliente:** ${formData.nome_completo}\n**NIF:** ${formData.nif || 'N/A'}\n**Ficheiro:** ${stlUrl || 'Erro no Link'}`
        })
      });

      alert("Encomenda realizada com sucesso!");
      setShowCheckout(false);
    } catch (err) {
      alert("Erro ao processar pedido.");
    } finally {
      setLoading(false);
    }
  };

  const isMaker = perfil?.acesso_comercial_ativo === true || perfil?.role === 'admin';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* SEÇÃO DE SLIDERS - RECUPERADA COM VALORES */}
      {produto?.ui_schema?.filter((c: any) => c.type !== 'hidden').map((c: any) => (
        <div key={c.name} style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
          <label style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
            {c.label?.toUpperCase()}
          </label>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#3b82f6', marginBottom: '8px' }}>
            <span>MEDIDA</span>
            <span style={{ fontWeight: 'bold' }}>{localValores[c.name] ?? c.default}</span>
          </div>
          <input 
            type="range" 
            min={c.min} max={c.max} step={0.1} 
            value={localValores[c.name] ?? c.default ?? 0} 
            onChange={(e) => handleChange(c.name, parseFloat(e.target.value))} 
            style={{ width: '100%', accentColor: '#3b82f6' }} 
          />
        </div>
      ))}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button onClick={handleGerarSTL} style={{ padding: '14px', border: '1px solid #3b82f6', color: '#3b82f6', background: 'transparent', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
          {loading ? "A PROCESSAR MODELO..." : "👁️ ATUALIZAR PRÉ-VISUALIZAÇÃO"}
        </button>

        <button 
          onClick={() => {
            setShowCheckout(true);
            setLoading(false); // Mata o loading para garantir que o botão no modal funcione
          }}
          style={{ padding: '18px', background: 'linear-gradient(to right, #059669, #10b981)', color: 'white', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}
        >
          📦 RECEBER PEÇA EM CASA (IMPRESSÃO 3D)
        </button>
      </div>

      {/* MODAL DE CHECKOUT - COM NIF E SEM BLOQUEIO */}
      {showCheckout && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <div style={{ background: '#1e293b', padding: '30px', borderRadius: '24px', width: '100%', maxWidth: '450px', border: '1px solid #334155' }}>
            <h2 style={{ color: 'white', marginBottom: '20px', fontSize: '20px' }}>Finalizar Encomenda</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input placeholder="Nome Completo *" value={formData.nome_completo} onChange={e => setFormData({...formData, nome_completo: e.target.value})} style={modalInputStyle} />
              <input placeholder="Morada de Entrega *" value={formData.morada_entrega} onChange={e => setFormData({...formData, morada_entrega: e.target.value})} style={modalInputStyle} />
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input placeholder="Cód. Postal *" value={formData.codigo_postal} onChange={e => setFormData({...formData, codigo_postal: e.target.value})} style={modalInputStyle} />
                <input placeholder="Cidade *" value={formData.cidade} onChange={e => setFormData({...formData, cidade: e.target.value})} style={modalInputStyle} />
              </div>

              {/* CAMPO NIF RECUPERADO */}
              <input placeholder="NIF (Para fatura)" value={formData.nif} onChange={e => setFormData({...formData, nif: e.target.value})} style={modalInputStyle} />

              <label style={{ color: '#94a3b8', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginTop: '5px' }}>
                <input type="checkbox" checked={termosAceitos} onChange={e => setTermosAceitos(e.target.checked)} />
                Aceito o processamento dos meus dados para envio.
              </label>

              <button 
                onClick={finalizarEncomenda}
                // O botão agora só bloqueia se o loading de GRAVAÇÃO estiver ativo
                style={{ padding: '16px', background: '#059669', color: 'white', borderRadius: '12px', fontWeight: 'bold', border: 'none', marginTop: '10px', cursor: 'pointer' }}
              >
                {loading ? "A GRAVAR PEDIDO..." : "CONFIRMAR ENCOMENDA"}
              </button>

              <button onClick={() => setShowCheckout(false)} style={{ color: '#ef4444', background: 'none', border: 'none', fontSize: '13px', cursor: 'pointer', marginTop: '5px' }}>
                Cancelar e voltar ao editor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}