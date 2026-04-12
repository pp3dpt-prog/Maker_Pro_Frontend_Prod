'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type ValoresProduto = Record<string, string | number | boolean>;

type ProdutoAtual = {
  id: string | number;
  ui_schema?: any[];
  parametros_default?: Record<string, any>;
};

type Perfil = {
  id: string;
  creditos_disponiveis: number;
};

interface Props {
  produto: ProdutoAtual;
  perfil: Perfil | null;
  valores: ValoresProduto;
  onUpdate: (v: ValoresProduto) => void;
  onGerarSucesso: (path: string) => void;
  stlUrl: string | null;
  textoAplicado: boolean;
}

/* ✅ NORMALIZADOR CRÍTICO */
function inputValue(
  v: string | number | boolean | undefined
): string | number {
  if (typeof v === 'boolean') return v ? '1' : '0';
  return v ?? '';
}

export default function EditorControls({
  produto,
  valores,
  onUpdate,
  onGerarSucesso,
  textoAplicado,
}: Props) {
  const [localValores, setLocalValores] = useState<ValoresProduto>({});

  /* ✅ Inicialização a partir das presets da BD */
  useEffect(() => {
    if (!produto?.ui_schema) return;

    const iniciais: ValoresProduto = {
      ...(produto.parametros_default ?? {}),
    };

    produto.ui_schema.forEach((c: any) => {
      iniciais[c.name] =
        c.value !== undefined ? c.value : c.default ?? '';
    });

    setLocalValores(iniciais);
    onUpdate(iniciais);
  }, [produto?.id]);

  /* ✅ Gerar preview exacto */
  const handleGerarSTL = async () => {
    if (!textoAplicado) {
      alert('Ativa primeiro "Mostrar texto na peça".');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;

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

    const data = await res.json();
    if (res.ok && data.storagePath) {
      onGerarSucesso(data.storagePath);
    }
  };

  /* ✅ Secções do UI */
  const seccoes = Array.from(
    new Set(
      produto.ui_schema
        ?.map((c: any) => c.section)
        .filter(Boolean)
    )
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {seccoes.map((sec) => (
        <div key={sec}>
          <strong>{sec}</strong>

          {produto.ui_schema
            ?.filter((c: any) => c.section === sec)
            .map((c: any) => (
              <div key={c.name} style={{ marginTop: 8 }}>
                <label style={{ fontSize: 12 }}>
                  {c.label ?? c.name}
                </label>

                <input
                  type={c.type === 'slider' ? 'range' : 'text'}
                  min={c.min}
                  max={c.max}
                  step={c.step ?? 1}
                  value={inputValue(localValores[c.name])}
                  onChange={(e) => {
                    const v =
                      c.type === 'slider'
                        ? Number(e.target.value)
                        : e.target.value;

                    const n = { ...localValores, [c.name]: v };
                    setLocalValores(n);
                    onUpdate(n);
                  }}
                  style={{ width: '100%' }}
                />
              </div>
            ))}
        </div>
      ))}

      <button onClick={handleGerarSTL}>
        GERAR PRÉ‑VISUALIZAÇÃO EXACTA
      </button>
    </div>
  );
}