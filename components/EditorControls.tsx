'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

/* ──────────────────────────────────────────────
   TIPOS PARTILHADOS
────────────────────────────────────────────── */

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

/* ──────────────────────────────────────────────
   SUPABASE (CLIENTE)
────────────────────────────────────────────── */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/* ──────────────────────────────────────────────
   PROPS
────────────────────────────────────────────── */

interface EditorControlsProps {
  produto: ProdutoAtual;
  perfil: Perfil | null;
  valores: ValoresProduto;
  onUpdate: (valores: ValoresProduto) => void;
  onGerarSucesso: (storagePath: string) => void;
  stlUrl: string | null;
}

/* ──────────────────────────────────────────────
   UTILITÁRIO CRÍTICO (resolve o erro do input)
────────────────────────────────────────────── */

function inputValue(
  v: string | number | boolean | undefined
): string | number {
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return v ?? '';
}

/* ──────────────────────────────────────────────
   COMPONENTE
────────────────────────────────────────────── */

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
  const [saldoAtual, setSaldoAtual] = useState(
    perfil?.creditos_disponiveis ?? 0
  );

  const custo = produto?.custo_creditos ?? 1;

  /* ──────────────────────────────────────────────
     SYNC PERFIL
  ────────────────────────────────────────────── */

  useEffect(() => {
    if (perfil) setSaldoAtual(perfil.creditos_disponiveis);
  }, [perfil]);

  /* ──────────────────────────────────────────────
     INIT VALORES (a partir do produto)
  ────────────────────────────────────────────── */

  useEffect(() => {
    if (!produto) return;

    const iniciais: ValoresProduto = {
      ...(produto.parametros_default ?? {}),
    };

    produto.ui_schema?.forEach((c: any) => {
      iniciais[c.name] =
        c.value !== undefined ? c.value : c.default;
    });

    setLocalValores(iniciais);
    onUpdate(iniciais);
  }, [produto?.id]);

  /* ──────────────────────────────────────────────
     GERAR STL (PRÉ‑VISUALIZAÇÃO)
  ────────────────────────────────────────────── */

  const handleGerarSTL = async () => {
    if (!perfil?.id) return alert('Perfil não carregado.');

    setLoading(true);
    setProgresso(30);

    try {
      const res = await fetch(
        'https://maker-pro-docker-prod.onrender.com/gerar-stl-pro',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...localValores,
            id: produto.id,
            user_id: perfil.id,
          }),
        }
      );

      const data = await res.json();

      if (res.ok && data.storagePath) {
        setProgresso(100);
        onGerarSucesso(data.storagePath);
      } else {
        alert(data.error ?? 'Erro ao gerar STL');
      }
    } catch {
      alert('Erro de ligação ao gerador 3D.');
    } finally {
      setLoading(false);
      setTimeout(() => setProgresso(0), 1500);
    }
  };

  /* ──────────────────────────────────────────────
     PAGAMENTO + DOWNLOAD
  ────────────────────────────────────────────── */

  const handleDownloadComPagamento = async () => {
    if (!supabase || !perfil?.id) return alert('Erro de autenticação.');
    if (saldoAtual < custo) return alert('Saldo insuficiente.');

    setPagando(true);

    try {
      const novoSaldo = saldoAtual - custo;

      await supabase
        .from('prod_perfis')
        .update({ creditos_disponiveis: novoSaldo })
        .eq('id', perfil.id);

      setSaldoAtual(novoSaldo);

      const link = document.createElement('a');
      link.href = stlUrl!;
      link.download = `design_${Date.now()}.stl`;
      link.click();
    } catch (e: any) {
      alert('Erro no pagamento: ' + e.message);
    } finally {
      setPagando(false);
    }
  };

  /* ──────────────────────────────────────────────
     RENDER
  ────────────────────────────────────────────── */

  const seccoes = Array.from(
    new Set(
      produto?.ui_schema
        ?.filter((c: any) => c.section)
        .map((c: any) => c.section)
    )
  ) as string[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      {seccoes.map((s) => (
        <div
          key={s}
          style={{
            background: '#0f172a',
            padding: '15px',
            borderRadius: '10px',
            border: '1px solid #334155',
          }}
        >
          <span
            style={{
              color: '#3b82f6',
              fontSize: '10px',
              fontWeight: 'bold',
            }}
          >
            {s.toUpperCase()}
          </span>

          {produto.ui_schema
            ?.filter((c: any) => c.section === s)
            .map((c: any) => (
              <div key={c.name} style={{ marginTop: '10px' }}>
                <label
                  style={{
                    fontSize: '11px',
                    color: '#94a3b8',
                    display: 'block',
                  }}
                >
                  {c.label ?? c.name}
                </label>

                <input
                  type={c.type === 'slider' ? 'range' : 'text'}
                  min={c.min}
                  max={c.max}
                  step={c.step ?? 1}
                  value={inputValue(localValores[c.name])}
                  onChange={(e) => {
                    const val =
                      c.type === 'slider'
                        ? Number(e.target.value)
                        : e.target.value;

                    const n: ValoresProduto = {
                      ...localValores,
                      [c.name]: val,
                    };

                    setLocalValores(n);
                    onUpdate(n);
                  }}
                  style={{ width: '100%', marginTop: '5px' }}
                />
              </div>
            ))}
        </div>
      ))}

      {!stlUrl ? (
        <button onClick={handleGerarSTL} disabled={loading}>
          {loading ? `GERANDO… ${progresso}%` : 'GERAR PRÉ‑VISUALIZAÇÃO'}
        </button>
      ) : (
        <button
          onClick={handleDownloadComPagamento}
          disabled={pagando || saldoAtual < custo}
        >
          {pagando ? 'PAGANDO…' : 'PAGAR E DESCARREGAR STL'}
        </button>
      )}
    </div>
  );
}