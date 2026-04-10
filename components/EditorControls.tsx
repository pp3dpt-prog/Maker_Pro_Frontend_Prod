'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Inicialização segura do cliente Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

interface EditorControlsProps {
  produto: any;
  perfil: any;
  onUpdate: (valores: any) => void;
  onGerarSucesso: (url: string) => void;
  stlUrl: string | null;
}

export default function EditorControls({ 
  produto, 
  perfil, 
  onUpdate, 
  onGerarSucesso, 
  stlUrl 
}: EditorControlsProps) {
  
  const [loading, setLoading] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [localValores, setLocalValores] = useState<any>({});
  const [saldoAtual, setSaldoAtual] = useState(perfil?.creditos_disponiveis ?? 0);

  const custo = produto?.custo_creditos ?? 1;

  useEffect(() => {
    if (perfil?.creditos_disponiveis !== undefined) {
      setSaldoAtual(perfil.creditos_disponiveis);
    }
  }, [perfil]);

  useEffect(() => {
    if (produto) {
      const iniciais = { ...(produto.parametros_default || {}) };
      if (produto.ui_schema) {
        produto.ui_schema.forEach((c: any) => {
          iniciais[c.name] = (c.value !== undefined) ? c.value : c.default;
        });
      }
      setLocalValores(iniciais);
      onUpdate(iniciais);
    }
  }, [produto?.id]);

  const handleGerarSTL = async () => {
    if (!perfil?.id) return alert("Utilizador não identificado.");
    setLoading(true);
    setProgresso(20);

    try {
      const res = await fetch("https://maker-pro-docker-prod.onrender.com/gerar-stl-pro", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...localValores, 
          id: produto.id, 
          user_id: perfil.id 
        }),
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setProgresso(100);
        onGerarSucesso(data.url);
      } else {
        alert(data.error || "Erro ao gerar ficheiro.");
      }
    } catch (e) {
      alert("Erro de ligação ao servidor.");
    } finally {
      setLoading(false);
      setTimeout(() => setProgresso(0), 2000);
    }
  };

  const handleDownloadComPagamento = async () => {
    if (!supabase) return alert("Configuração do Supabase em falta.");
    if (saldoAtual < custo) return alert("Saldo insuficiente.");
    if (!stlUrl) return alert("Gere o ficheiro primeiro.");

    setPagando(true);
    try {
      const novoSaldo = saldoAtual - custo;

      const { error: upErr } = await supabase
        .from('prod_perfis')
        .update({ creditos_disponiveis: novoSaldo })
        .eq('id', perfil.id);

      if (upErr) throw upErr;

      await supabase.from('prod_user_assets').insert([{
        user_id: perfil.id,
        design_id: produto.id,
        stl_url: stlUrl,
        nome_personalizado: localValores.nome_pet || localValores.texto || 'meu_design_3d'
      }]);

      setSaldoAtual(novoSaldo);
      const link = document.createElement('a');
      link.href = stlUrl;
      link.setAttribute('download', `design_${Date.now()}.stl`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e: any) {
      alert("Erro no pagamento: " + (e.message || "Tente novamente."));
    } finally {
      setPagando(false);
    }
  };

  const seccoes = Array.from(new Set(produto?.ui_schema?.filter((c: any) => c.section).map((c: any) => c.section))) as string[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {seccoes.map((s) => (
        <div key={s} style={{ background: '#0f172a', padding: '15px', borderRadius: '12px', border: '1px solid #334155' }}>
          <label style={{ color: '#3b82f6', fontSize: '10px', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>{s.toUpperCase()}</label>
          {produto.ui_schema.filter((c: any) => c.section === s).map((c: any) => (
            <div key={c.name} style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label style={{ fontSize: '11px', color: '#94a3b8' }}>{c.label || c.name}</label>
                <span style={{ fontSize: '11px', color: '#3b82f6' }}>{localValores[c.name]}</span>
              </div>
              <input 
                type={c.type === 'slider' ? 'range' : 'text'}
                min={c.min} max={c.max} step={c.step || 0.1}
                value={localValores[c.name] ?? ''}
                onChange={(e) => {
                  const val = c.type === 'slider' ? parseFloat(e.target.value) : e.target.value;
                  const n = { ...localValores, [c.name]: val };
                  setLocalValores(n); onUpdate(n);
                }}
                style={{ width: '100%', marginTop: '5px' }}
              />
            </div>
          ))}
        </div>
      ))}

      <div style={{ background: '#1e293b', padding: '20px', borderRadius: '15px', border: '1px solid #334155' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '15px' }}>
          <span style={{ color: '#94a3b8', fontSize: '13px' }}>Saldo:</span>
          <span style={{ color: 'white', fontWeight: 'bold' }}>{saldoAtual} Créditos</span>
        </div>
        
        {!stlUrl ? (
          <button onClick={handleGerarSTL} disabled={loading} style={{ width: '100%', padding: '16px', background: '#3b82f6', color: 'white', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
            {loading ? `A GERAR... ${progresso}%` : 'GERAR PRÉ-VISUALIZAÇÃO'}
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <button onClick={handleGerarSTL} disabled={loading} style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid #475569', color: '#94a3b8', borderRadius: '10px' }}>
              ATUALIZAR MODELO
            </button>
            <button onClick={handleDownloadComPagamento} disabled={pagando || saldoAtual < custo} style={{ width: '100%', padding: '16px', background: saldoAtual >= custo ? '#10b981' : '#475569', color: 'white', borderRadius: '12px', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
              {pagando ? 'A PROCESSAR...' : `DESCARREGAR STL (-${custo} CRÉD.)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}