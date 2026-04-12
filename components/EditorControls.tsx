'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type ValoresProduto = Record<string, string | number | boolean>;

type ProdutoAtual = {
  id: string | number;
  ui_schema?: any[];
  parametros_default?: Record<string, string | number | boolean>;
  custo_creditos?: number;
};

type Perfil = {
  id: string;
  creditos_disponiveis: number;
};

interface EditorControlsProps {
  produto: ProdutoAtual;
  perfil: Perfil | null;
  valores: ValoresProduto;
  onUpdate: (valores: ValoresProduto) => void;
  onGerarSucesso: (storagePath: string) => void;
  stlUrl: string | null; // neste novo fluxo: guarda storagePath
}

function inputValue(v: string | number | boolean | undefined): string | number {
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return v ?? '';
}

export default function EditorControls({
  produto,
  perfil,
  valores,
  onUpdate,
  onGerarSucesso,
  stlUrl,
}: EditorControlsProps) {
  const [loading, setLoading] = useState(false);
  const [pagando, setPagando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [localValores, setLocalValores] = useState<ValoresProduto>({});
  const [saldoAtual, setSaldoAtual] = useState(perfil?.creditos_disponiveis ?? 0);

  const custo = produto?.custo_creditos ?? 1;

  useEffect(() => {
    if (perfil) setSaldoAtual(perfil.creditos_disponiveis);
  }, [perfil]);

  useEffect(() => {
    if (!produto) return;

    const iniciais: ValoresProduto = { ...(produto.parametros_default ?? {}) };
    produto.ui_schema?.forEach((c: any) => {
      iniciais[c.name] = c.value !== undefined ? c.value : c.default;
    });

    setLocalValores(iniciais);
    onUpdate(iniciais);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produto?.id]);

  const handleGerarSTL = async () => {
    setLoading(true);
    setProgresso(25);

    try {
      const { data: { session }, error: sessErr } = await supabase.auth.getSession();
      if (sessErr || !session?.access_token) {
        alert('Sem sessão válida. Faz login novamente.');
        return;
      }

      setProgresso(40);

      const res = await fetch('/api/gerar-stl-pro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          id: produto.id,
          mode: 'preview',
          ...localValores,
        }),
      });

      setProgresso(70);

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        alert(data?.error ?? 'Erro ao gerar STL');
        return;
      }

      if (data.storagePath) {
        setProgresso(100);
        onGerarSucesso(data.storagePath);
      } else {
        alert('Servidor não devolveu storagePath.');
      }
    } catch {
      alert('Erro de ligação ao gerador 3D.');
    } finally {
      setLoading(false);
      setTimeout(() => setProgresso(0), 1200);
    }
  };

  const handleDownloadComPagamento = async () => {
    if (!perfil?.id) return alert('Perfil não carregado.');
    if (saldoAtual < custo) return alert('Saldo insuficiente.');
    if (!stlUrl) return alert('Sem STL para descarregar.');

    setPagando(true);

    try {
      const novoSaldo = saldoAtual - custo;

      const { error: upErr } = await supabase
        .from('prod_perfis')
        .update({ creditos_disponiveis: novoSaldo })
        .eq('id', perfil.id);

      if (upErr) throw upErr;

      setSaldoAtual(novoSaldo);

      // registo do asset (mantém o campo stl_url, mas agora guarda storagePath)
      await supabase.from('prod_user_assets').insert([{
        user_id: perfil.id,
        design_id: produto.id,
        stl_url: stlUrl,
        nome_personalizado: (localValores as any).nome ?? (localValores as any).texto ?? 'meu_modelo',
      }]);

      // download via storage (porque stlUrl agora é storagePath)
      const { data, error } = await supabase.storage.from('designs-vault').download(stlUrl);
      if (error) throw error;
      if (!data) throw new Error('Download vazio.');

      const objectUrl = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = `design_${Date.now()}.stl`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (e: any) {
      alert('Erro no pagamento/download: ' + e.message);
    } finally {
      setPagando(false);
    }
  };

  const seccoes = Array.from(
    new Set(
      produto?.ui_schema?.filter((c: any) => c.section).map((c: any) => c.section)
    )
  ) as string[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
      {seccoes.map((s) => (
        <div
          key={s}
          style={{
            background: '#0f172a',
            padding: 15,
            borderRadius: 10,
            border: '1px solid #334155',
          }}
        >
          <span style={{ color: '#3b82f6', fontSize: 10, fontWeight: 'bold' }}>
            {s.toUpperCase()}
          </span>

          {produto.ui_schema
            ?.filter((c: any) => c.section === s)
            .map((c: any) => (
              <div key={c.name} style={{ marginTop: 10 }}>
                <label style={{ fontSize: 11, color: '#94a3b8', display: 'block' }}>
                  {c.label ?? c.name}
                </label>

                <input
                  type={c.type === 'slider' ? 'range' : 'text'}
                  min={c.min}
                  max={c.max}
                  step={c.step ?? 1}
                  value={inputValue(localValores[c.name])}
                  onChange={(e) => {
                    const val = c.type === 'slider' ? Number(e.target.value) : e.target.value;
                    const n: ValoresProduto = { ...localValores, [c.name]: val };
                    setLocalValores(n);
                    onUpdate(n);
                  }}
                  style={{ width: '100%', marginTop: 5 }}
                />
              </div>
            ))}
        </div>
      ))}

      {!stlUrl ? (
        <button
          onClick={handleGerarSTL}
          disabled={loading}
          style={{
            padding: 12,
            borderRadius: 10,
            border: 'none',
            background: '#3b82f6',
            color: 'white',
            fontWeight: 900,
            cursor: 'pointer',
            minHeight: 44,
          }}
        >
          {loading ? `GERANDO… ${progresso}%` : 'GERAR PRÉ‑VISUALIZAÇÃO EXACTA'}
        </button>
      ) : (
        <button
          onClick={handleDownloadComPagamento}
          disabled={pagando || saldoAtual < custo}
          style={{
            padding: 12,
            borderRadius: 10,
            border: 'none',
            background: '#10b981',
            color: 'white',
            fontWeight: 900,
            cursor: 'pointer',
            minHeight: 44,
          }}
        >
          {pagando ? 'PAGANDO…' : 'PAGAR E DESCARREGAR STL'}
        </button>
      )}
    </div>
  );
}