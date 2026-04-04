'use client';
import { useState, useEffect } from 'react';

export default function EditorControls({ produto, onUpdate, onGerarSucesso }: any) {
  const [loading, setLoading] = useState(false);
  const [localValores, setLocalValores] = useState<any>({});

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

  const handleGerarSTL = async () => {
  if (!produto?.id) return;
  setLoading(true);

  // Criamos o objeto base com todos os valores locais (incluindo nome_pet)
  const payload: any = { 
    ...localValores, 
    id: produto.id 
  };

  // LÓGICA DE CORREÇÃO:
  // Se o teu motor 3D espera a chave "nome", mas o formulário usa "nome_pet",
  // forçamos a atribuição do valor correto aqui.
  if (localValores.nome_pet) {
    payload.nome = localValores.nome_pet;
  }

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
  } finally { 
    setLoading(false); 
  }
};

  if (!produto || !produto.ui_schema) return <div style={{ color: '#94a3b8', padding: '20px' }}>Carregando...</div>;

  // 1. Filtramos apenas campos visíveis
  const camposVisiveis = produto.ui_schema.filter((c: any) => c && c.type !== 'hidden');

  // 2. Criamos a lista de secções apenas se tiverem campos visíveis nela
  const seccoes = Array.from(new Set(camposVisiveis.map((c: any) => c.section || 'GERAL')));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {seccoes.map((seccaoNome: any) => {
        // 3. Verificamos se esta secção específica tem campos para renderizar
        const camposDaSeccao = camposVisiveis.filter((c: any) => (c.section || 'GERAL') === seccaoNome);
        
        // Se a secção não tiver campos (como o teu bloco GERAL vazio), não renderizamos nada
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

      {/* Seletor de Fonte */}
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

      <button onClick={handleGerarSTL} disabled={loading} style={{ padding: '18px', background: '#2563eb', color: 'white', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: 'bold', opacity: loading ? 0.7 : 1 }}>
        {loading ? "GERANDO..." : "VISUALIZAR MODELO 3D FINAL"}
      </button>
    </div>
  );
}