'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
// @ts-ignore
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey) : null;

interface EditorControlsProps {
  produto: any;
  perfil: any;
  onUpdate: (valores: any) => void;
  onGerarSucesso: (url: string) => void;
  stlUrl: string | null;
}

export default function EditorControls({ produto, perfil, onUpdate, onGerarSucesso, stlUrl }: EditorControlsProps) {
  const [loading, setLoading] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [localValores, setLocalValores] = useState<any>({});
  const [saldoAtual, setSaldoAtual] = useState(perfil?.creditos_disponiveis ?? 0);

  const custo = produto?.custo_creditos ?? 1;

  useEffect(() => {
    if (perfil) setSaldoAtual(perfil.creditos_disponiveis);
  }, [perfil]);

  useEffect(() => {
    if (produto) {
      const iniciais = { ...(produto.parametros_default || {}) };
      produto.ui_schema?.forEach((c: any) => {
        iniciais[c.name] = (c.value !== undefined) ? c.value : c.default;
      });
      setLocalValores(iniciais);
      onUpdate(iniciais);
    }
  }, [produto?.id]);

  const handleGerarSTL = async () => {
    if (!perfil?.id) return alert("Erro: Perfil de utilizador não carregado.");
    setLoading(true);
    setProgresso(30);

    try {
      const res = await fetch("https://maker-pro-docker-prod.onrender.com/gerar-stl-pro", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...localValores, id: produto.id, user_id: perfil.id }),
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setProgresso(100);
        onGerarSucesso(data.url);
      } else {
        alert("Erro no servidor: " + data.error);
      }
    } catch (e) {
      alert("Erro de conexão com o gerador 3D.");
    } finally {
      setLoading(false);
      setTimeout(() => setProgresso(0), 1500);
    }
  };

  const handleDownloadComPagamento = async () => {
    if (!supabase || !perfil?.id) return alert("Erro de autenticação.");
    if (saldoAtual < custo) return alert("Saldo insuficiente.");

    setPagando(true);
    try {
      const novoSaldo = saldoAtual - custo;

      // 1. Descontar no Supabase
      const { error: upErr } = await supabase
        .from('prod_perfis')
        .update({ creditos_disponiveis: novoSaldo })
        .eq('id', perfil.id);

      if (upErr) throw upErr;

      // 2. Registar o Asset
      await supabase.from('prod_user_assets').insert([{
        user_id: perfil.id,
        design_id: produto.id,
        stl_url: stlUrl,
        nome_personalizado: localValores.texto || localValores.nome_pet || 'meu_modelo'
      }]);

      setSaldoAtual(novoSaldo);

      // 3. Download
      const link = document.createElement('a');
      link.href = stlUrl!;
      link.download = `3d_design_${Date.now()}.stl`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e: any) {
      alert("Erro no pagamento: " + e.message);
    } finally {
      setPagando(false);
    }
  };

  const seccoes = Array.from(new Set(produto?.ui_schema?.filter((c: any) => c.section).map((c: any) => c.section))) as string[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      {seccoes.map((s) => (
        <div key={s} style={{ background: '#0f172a', padding: '15px', borderRadius: '10px', border: '1px solid #334155' }}>
          <span style={{ color: '#3b82f6', fontSize: '10px', fontWeight: 'bold' }}>{s.toUpperCase()}</span>
          {produto.ui_schema.filter((c: any) => c.section === s).map((c: any) => (
            <div key={c.name} style={{ marginTop: '10px' }}>
              <label style={{ fontSize: '11px', color: '#94a3b8', display: 'block' }}>{c.label || c.name}</label>
              
              {c.type === 'select' ? (
                <select 
                  value={localValores[c.name] ?? ''}
                  onChange={(e) => {
                    const n = { ...localValores, [c.name]: e.target.value };
                    setLocalValores(n); onUpdate(n);
                  }}
                  style={{ width: '100%', padding: '8px', background: '#1e293b', color: 'white', borderRadius: '5px', border: '1px solid #475569' }}
                >
                  {c.options?.map((o: any) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              ) : (
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
              )}
            </div>
          ))}
        </div>
      ))}

      <div style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', border: '1px solid #3b82f6' }}>
        <p style={{ color: 'white', textAlign: 'center', marginBottom: '10px' }}>Saldo: <b>{saldoAtual}</b> | Custo: <b>{custo}</b></p>
        {!stlUrl ? (
          <button onClick={handleGerarSTL} disabled={loading} style={{ width: '100%', padding: '12px', background: '#3b82f6', color: 'white', borderRadius: '8px', fontWeight: 'bold' }}>
            {loading ? `GERANDO... ${progresso}%` : 'GERAR PRÉ-VISUALIZAÇÃO'}
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button onClick={handleGerarSTL} disabled={loading} style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6', borderRadius: '8px' }}>
              RE-GERAR ALTERAÇÕES
            </button>
            <button onClick={handleDownloadComPagamento} disabled={pagando || saldoAtual < custo} style={{ width: '100%', padding: '12px', background: '#10b981', color: 'white', borderRadius: '8px', fontWeight: 'bold' }}>
              {pagando ? 'PAGANDO...' : 'PAGAR E DESCARREGAR STL'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}