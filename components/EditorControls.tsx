'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; // Garante que este caminho está correto

export default function EditorControls({ produto, onUpdate, onGerarSucesso, stlUrl }: any) {
  const [loading, setLoading] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [localValores, setLocalValores] = useState<any>({});
  const [perfilAtivo, setPerfilAtivo] = useState<any>(null);

  // 1. CARREGAR PERFIL REAL DO SUPABASE AO MONTAR
  useEffect(() => {
    async function getPerfil() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('prod_perfis')
          .select('*')
          .eq('id', user.id)
          .single();
        setPerfilAtivo(data);
      }
    }
    getPerfil();
  }, []);

  useEffect(() => {
    if (produto) {
      const iniciais: any = { ...(produto.parametros_default || {}) };
      if (produto.ui_schema) {
        produto.ui_schema.forEach((c: any) => {
          if (c.name) iniciais[c.name] = (c.value !== undefined) ? c.value : c.default;
        });
      }
      if (!iniciais.fonte) iniciais.fonte = 'Open Sans';
      setLocalValores(iniciais);
      onUpdate(iniciais);
    }
  }, [produto?.id]);

  const handleGerarSTL = async () => {
    if (!perfilAtivo?.id) return alert("Erro: Perfil não carregado. Faz login novamente.");
    if (perfilAtivo.creditos_disponiveis < (produto?.custo_creditos || 1)) return alert("Saldo insuficiente.");

    setLoading(true);
    setProgresso(10);

    try {
      const res = await fetch("https://maker-pro-docker-prod.onrender.com/gerar-stl-pro", {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...localValores, 
          id: produto.id, 
          user_id: perfilAtivo.id, // UUID REAL DO SUPABASE
          custo: produto?.custo_creditos || 1,
          nome_personalizado: `${produto.id}_${localValores.nome_pet || 'objeto'}`
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setProgresso(100);
        setPerfilAtivo({ ...perfilAtivo, creditos_disponiveis: data.novoSaldo });
        onGerarSucesso(data.url);
      } else {
        alert(data.error);
      }
    } catch (err) {
      alert("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = Array.isArray(stlUrl) ? stlUrl[0] : stlUrl;
    link.download = "projeto.stl";
    link.click();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', color: 'white' }}>
      <div style={{ padding: '10px', background: '#1e293b', borderRadius: '8px' }}>
        <p style={{ fontSize: '12px' }}>SALDO: <strong>{perfilAtivo?.creditos_disponiveis || 0} CRÉDITOS</strong></p>
      </div>

      {produto?.ui_schema?.filter((c: any) => c.type !== 'hidden').map((c: any) => (
        <div key={c.name}>
          <label style={{ fontSize: '10px' }}>{c.label || c.name}</label>
          <input 
            type={c.type === 'slider' ? 'range' : 'text'}
            value={localValores[c.name] ?? ''}
            onChange={(e) => {
              const val = c.type === 'slider' ? parseFloat(e.target.value) : e.target.value;
              const n = { ...localValores, [c.name]: val };
              setLocalValores(n);
              onUpdate(n);
            }}
            style={{ width: '100%', padding: '8px', background: '#0f172a', border: '1px solid #334155', borderRadius: '5px', color: 'white' }}
          />
        </div>
      ))}

      <button 
        onClick={handleGerarSTL} 
        disabled={loading}
        style={{ width: '100%', padding: '15px', background: '#3b82f6', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
      >
        {loading ? `A PROCESSAR...` : `GERAR STL`}
      </button>

      {stlUrl && (
        <button onClick={handleDownload} style={{ width: '100%', padding: '10px', background: '#10b981', borderRadius: '8px', marginTop: '10px' }}>
          DESCARREGAR STL
        </button>
      )}
    </div>
  );
}