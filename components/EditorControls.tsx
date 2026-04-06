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
      // MAPEAMENTO EXATO DA BASE DE DADOS
      const iniciais: any = {
        ...(produto.parametros_default || {}),
        // Coordenadas Nome
        x_nome: produto.default_x_nome,
        y_nome: produto.default_y_nome,
        size_nome: produto.default_size_nome,
        // Coordenadas Número
        x_num: produto.default_x_num,
        y_num: produto.default_y_num,
        size_num: produto.default_size_num,
        // Fonte (Vem da coluna default_fonte)
        fonte: produto.default_fonte || 'OpenSans',
        texto_linha_1: "NOME",
        texto_linha_2: "123 456 789"
      };

      if (produto.ui_schema) {
        produto.ui_schema.forEach((c: any) => {
          if (c.name) iniciais[c.name] = c.value ?? c.default;
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

  const handleGerarSTL = async () => {
    if (!temCreditos) return alert("Saldo insuficiente.");
    setLoading(true);
    try {
      const r = await fetch("https://maker-pro-docker-prod.onrender.com/gerar-stl-pro", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...localValores, id: produto.id }),
      });
      const d = await r.json();
      if (d.urls || d.url) onGerarSucesso(d.urls || d.url);
    } catch (e) { alert("Erro na geração."); }
    setLoading(false);
  };

  const handleDownloadSeguro = async () => {
    if (!temCreditos) return alert("Sem créditos!");
    const { error } = await supabase.rpc('baixar_credito', { user_id: perfil.id });
    if (error) return alert("Erro ao processar crédito.");
    const link = document.createElement('a');
    link.href = stlUrl;
    link.download = `${produto.nome}.stl`;
    link.click();
  };

  if (!localValores) return null;

  // ORGANIZAÇÃO EM BLOCOS POR SECÇÃO
  const seccoes = Array.from(new Set(
    produto.ui_schema?.filter((c: any) => c.section && c.type !== 'hidden').map((c: any) => c.section)
  ));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {seccoes.map((seccao: any) => (
        <div key={seccao} style={{ background: '#1e293b', padding: '18px', borderRadius: '12px', border: '1px solid #334155' }}>
          <label style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 'bold', display: 'block', marginBottom: '15px' }}>
            {seccao.toUpperCase()}
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            {produto.ui_schema.filter((c: any) => c.section === seccao && c.type !== 'hidden').map((c: any) => (
              <div key={c.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '10px', color: '#94a3b8' }}>{c.label?.toUpperCase()}</label>
                  {c.type === 'slider' && <span style={{ fontSize: '10px', color: '#3b82f6' }}>{localValores[c.name]}mm</span>}
                </div>
                {c.type === 'select' ? (
                  <select value={localValores[c.name]} onChange={(e) => handleChange(c.name, e.target.value)} style={{ width: '100%', padding: '10px', background: '#0f172a', color: 'white', borderRadius: '8px', border: '1px solid #475569', marginTop: '5px' }}>
                    {c.options?.map((o: string) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : c.type === 'slider' ? (
                  <input type="range" min={c.min} max={c.max} step={0.1} value={localValores[c.name]} onChange={(e) => handleChange(c.name, parseFloat(e.target.value))} style={{ width: '100%', marginTop: '8px' }} />
                ) : (
                  <input type="text" value={localValores[c.name]} onChange={(e) => handleChange(c.name, e.target.value)} style={{ width: '100%', padding: '10px', background: '#0f172a', color: 'white', borderRadius: '8px', border: '1px solid #475569', marginTop: '5px' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div style={{ background: '#0f172a', padding: '20px', borderRadius: '15px', border: '1px solid #1e293b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span style={{ fontSize: '11px', color: '#64748b' }}>CRÉDITOS:</span>
          <span style={{ fontSize: '13px', color: temCreditos ? '#4ade80' : '#f87171', fontWeight: '900' }}>{saldoAtual}</span>
        </div>
        <button onClick={handleGerarSTL} disabled={loading || !temCreditos} style={{ width: '100%', padding: '15px', background: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}>
          {loading ? "GERANDO..." : "ATUALIZAR PREVIEW"}
        </button>
        {stlUrl && temCreditos && (
          <button onClick={handleDownloadSeguro} style={{ width: '100%', marginTop: '10px', padding: '15px', background: '#3b82f6', color: 'white', borderRadius: '10px', fontWeight: '900', cursor: 'pointer', border: 'none' }}>
            DESCARREGAR STL
          </button>
        )}
      </div>
    </div>
  );
}