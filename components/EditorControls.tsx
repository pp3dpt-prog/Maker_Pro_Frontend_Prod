'use client';
import { useState, useEffect } from 'react';

// Estilo para os inputs do Modal de Checkout (RGPD)
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

export default function EditorControls({ produto, perfil, onUpdate, onGerarSucesso }: any) {
  const [loading, setLoading] = useState(false);
  const [localValores, setLocalValores] = useState<any>({});
  
  // Estados para o Modal de Checkout e RGPD
  const [showCheckout, setShowCheckout] = useState(false);
  const [termosAceitos, setTermosAceitos] = useState(false);

  // 1. MANTIDO: Lógica original de inicialização de valores
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

  // 2. MANTIDO: Lógica de atualização de campos
  const handleChange = (k: string, v: any) => {
    const n = { ...localValores, [k]: v };
    setLocalValores(n);
    onUpdate(n);
  };

  // 3. ATUALIZADO: handleGerarSTL com correção da chave "nome"
  const handleGerarSTL = async () => {
    if (!produto?.id) return;
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
      alert("Erro ao gerar modelo 3D."); 
    } finally { setLoading(false); }
  };

  if (!produto || !produto.ui_schema) return <div style={{ color: '#94a3b8', padding: '20px' }}>Carregando...</div>;

  const camposVisiveis = produto.ui_schema.filter((c: any) => c && c.type !== 'hidden');
  const seccoes = Array.from(new Set(camposVisiveis.map((c: any) => c.section || 'GERAL')));

  const isMaker = perfil?.acesso_comercial_ativo === true || perfil?.role === 'admin';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* RENDERIZAÇÃO DAS SECÇÕES */}
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

      {/* SELETOR DE FONTE */}
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

      {/* BOTÕES ADAPTATIVOS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '10px' }}>
        <button onClick={handleGerarSTL} disabled={loading} style={{ padding: '16px', background: 'transparent', color: '#3b82f6', borderRadius: '12px', border: '1px solid #3b82f6', cursor: 'pointer', fontWeight: 'bold' }}>
          {loading ? "PROCESSANDO..." : "👁️ ATUALIZAR PRÉ-VISUALIZAÇÃO"}
        </button>

        {isMaker ? (
          <button 
            style={{ padding: '20px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: '900', fontSize: '14px' }}
            onClick={() => alert("Iniciando download do STL...")}
          >
            📥 DESCARREGAR FICHEIRO STL
          </button>
        ) : (
          <button 
            style={{ padding: '20px', background: 'linear-gradient(135deg, #059669, #047857)', color: 'white', borderRadius: '12px', border: 'none', cursor: 'pointer', fontWeight: '900', fontSize: '14px' }}
            onClick={() => setShowCheckout(true)} // Abre o Modal de Checkout
          >
            📦 RECEBER PEÇA EM CASA (IMPRESSÃO 3D)
          </button>
        )}
      </div>

      {/* MODAL DE CHECKOUT (RGPD) */}
      {showCheckout && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#1e293b', width: '100%', maxWidth: '500px',
            borderRadius: '24px', padding: '30px', border: '1px solid #334155',
            position: 'relative', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
          }}>
            <button 
              onClick={() => setShowCheckout(false)}
              style={{ position: 'absolute', top: '20px', right: '20px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '20px' }}
            >✕</button>

            <h2 style={{ fontSize: '22px', marginBottom: '10px', color: 'white' }}>Finalizar Encomenda</h2>
            <p style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '25px' }}>
              Preencha os seus dados para receber a peça personalizada.
            </p>

            <form style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <input type="text" placeholder="Nome Completo" required style={modalInputStyle} />
              <input type="text" placeholder="Morada de Entrega" required style={modalInputStyle} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <input type="text" placeholder="Cód. Postal" required style={modalInputStyle} />
                <input type="text" placeholder="Cidade" required style={modalInputStyle} />
              </div>
              <input type="text" placeholder="NIF (Para Faturação)" style={modalInputStyle} />

              <label style={{ display: 'flex', gap: '10px', marginTop: '10px', cursor: 'pointer', alignItems: 'flex-start' }}>
                <input type="checkbox" required checked={termosAceitos} onChange={(e) => setTermosAceitos(e.target.checked)} style={{ width: '18px', height: '18px', marginTop: '2px' }} />
                <span style={{ fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
                  Aceito que a MakerPro processe os meus dados para fins de envio e faturação, conforme a Política de Privacidade.
                </span>
              </label>

              <button 
                type="button"
                disabled={!termosAceitos}
                onClick={() => alert("Encomenda Registada! Verifique o separador de encomendas no seu Dashboard.")}
                style={{ 
                  marginTop: '10px', padding: '16px', background: termosAceitos ? '#059669' : '#334155', 
                  color: 'white', borderRadius: '12px', border: 'none', 
                  fontWeight: 'bold', cursor: termosAceitos ? 'pointer' : 'not-allowed' 
                }}
              >
                CONFIRMAR E PEDIR PEÇA
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}