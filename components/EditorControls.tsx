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
      // MAPEAMENTO RIGOROSO COM A BASE DE DADOS
      const iniciais: any = {
        ...(produto.parametros_default || {}),
        // Nome
        x_nome: produto.default_x_nome ?? 0,
        y_nome: produto.default_y_nome ?? 0,
        size_nome: produto.default_size_nome ?? 7,
        // Número
        x_num: produto.default_x_num ?? 0,
        y_num: produto.default_y_num ?? 0,
        size_num: produto.default_size_num ?? 7,
        // Fonte e Textos
        fonte: produto.default_fonte || 'OpenSans-Bold',
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

  if (!localValores) return null;

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
                {/* Lógica de Campos: Select para fontes, Slider para medidas */}
                {c.type === 'select' ? (
                  <select value={localValores[c.name]} onChange={(e) => handleChange(c.name, e.target.value)} style={{ width: '100%', padding: '10px', background: '#0f172a', color: 'white', borderRadius: '8px', border: '1px solid #475569', marginTop: '5px' }}>
                    <option value="OpenSans-Bold">Open Sans Bold</option>
                    <option value="BebasNeue-Regular">Bebas Neue</option>
                    <option value="PlayfairDisplay-Bold">Playfair Display</option>
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

      <button onClick={handleGerarSTL} disabled={loading || !temCreditos} style={{ width: '100%', padding: '15px', background: '#3b82f6', color: 'white', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer', border: 'none' }}>
        {loading ? "A PROCESSAR..." : "ATUALIZAR MODELO 3D"}
      </button>
    </div>
  );
}