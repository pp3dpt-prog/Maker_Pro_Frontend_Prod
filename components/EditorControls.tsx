'use client';
import { useState, useEffect } from 'react';
// Mudamos para o cliente padrão do Supabase que é mais fiável em Client Components
import { createClient } from '@supabase/supabase-js';

// Inicializa fora do componente ou usa variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function EditorControls({ produto, perfil, onUpdate, onGerarSucesso, stlUrl }: any) {
  // O resto do código permanece igual, usando 'supabase' para descontar os créditos...
  const [loading, setLoading] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [localValores, setLocalValores] = useState<any>({});
  const [saldoAtual, setSaldoAtual] = useState(perfil?.creditos_disponiveis ?? 0);
  
  // ... resto das funções (handleGerarSTL, handleDownloadComPagamento)

  const custo = produto?.custo_creditos ?? 1;

  useEffect(() => { if (perfil) setSaldoAtual(perfil.creditos_disponiveis); }, [perfil]);

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
    setLoading(true);
    setProgresso(20);
    try {
      const res = await fetch("https://maker-pro-docker-prod.onrender.com/gerar-stl-pro", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...localValores, id: produto.id, user_id: perfil.id }),
      });
      const data = await res.json();
      if (res.ok) {
        setProgresso(100);
        onGerarSucesso(data.url);
      } else { alert(data.error); }
    } catch (e) { alert("Erro de rede."); }
    finally { setLoading(false); setTimeout(() => setProgresso(0), 2000); }
  };

  const handleDownloadComPagamento = async () => {
    if (saldoAtual < custo) return alert("Saldo insuficiente.");
    setPagando(true);

    try {
      // 1. Abater créditos via RLS (O Frontend consegue fazer isto!)
      const novoSaldo = saldoAtual - custo;
      const { error } = await supabase
        .from('prod_perfis')
        .update({ creditos_disponiveis: novoSaldo })
        .eq('id', perfil.id);

      if (error) throw error;

      // 2. Registar o Asset
      await supabase.from('prod_user_assets').insert([{
        user_id: perfil.id,
        design_id: produto.id,
        stl_url: stlUrl,
        nome_personalizado: localValores.nome_pet || 'meu_design'
      }]);

      setSaldoAtual(novoSaldo);

      // 3. Trigger do Download Real
      const link = document.createElement('a');
      link.href = stlUrl;
      link.download = `design_${Date.now()}.stl`;
      document.body.appendChild(link);
      link.click();
      link.remove();

    } catch (e) {
      alert("Erro no pagamento. Tente novamente.");
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
            <div key={c.name} style={{ marginBottom: '10px' }}>
              <label style={{ fontSize: '10px', color: '#64748b', display: 'block' }}>{c.label || c.name}</label>
              <input 
                type={c.type === 'slider' ? 'range' : 'text'}
                min={c.min} max={c.max} step={0.1}
                value={localValores[c.name] ?? ''}
                onChange={(e) => {
                  const val = c.type === 'slider' ? parseFloat(e.target.value) : e.target.value;
                  const n = { ...localValores, [c.name]: val };
                  setLocalValores(n); onUpdate(n);
                }}
                style={{ width: '100%' }}
              />
            </div>
          ))}
        </div>
      ))}

      <div style={{ background: '#0f172a', padding: '15px', borderRadius: '15px', border: '1px solid #1e293b' }}>
        <p style={{ color: 'white', fontSize: '12px', marginBottom: '10px' }}>Saldo: <b>{saldoAtual} Créditos</b></p>
        
        {!stlUrl ? (
          <button 
            onClick={handleGerarSTL} 
            disabled={loading}
            style={{ width: '100%', padding: '15px', background: '#3b82f6', color: 'white', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {loading ? `A GERAR... ${progresso}%` : 'VISUALIZAR E GERAR'}
          </button>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button 
              onClick={handleGerarSTL} 
              style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid #3b82f6', color: '#3b82f6', borderRadius: '10px' }}
            >
              RE-GERAR (ALTERAÇÕES)
            </button>
            <button 
              onClick={handleDownloadComPagamento} 
              disabled={pagando || saldoAtual < custo}
              style={{ width: '100%', padding: '15px', background: '#10b981', color: 'white', borderRadius: '10px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {pagando ? 'A PROCESSAR...' : `DESCARREGAR AGORA (-${custo} CRÉD.)`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}