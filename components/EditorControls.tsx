'use client';

import { useEffect, useState } from 'react';

export type ValoresProduto = Record<string, string | number | boolean>;

type UISchemaField = {
  name: string;
  label?: string;
  type?: 'text' | 'slider';
  min?: number;
  max?: number;
  step?: number;
  default?: string | number | boolean;
  unit?: string;     // ex: "mm"
  section?: string;
};

type ProdutoAtual = {
  id: string | number;
  ui_schema?: UISchemaField[];
  parametros_default?: Record<string, any>;
};

interface Props {
  produto: ProdutoAtual;
  valores: ValoresProduto;
  onUpdate: (valores: ValoresProduto) => void;
}

function inputValue(v: string | number | boolean | undefined): string | number {
  if (typeof v === 'boolean') return v ? 1 : 0;
  return v ?? '';
}

export default function EditorControls({ produto, valores, onUpdate }: Props) {
  const [localValores, setLocalValores] = useState<ValoresProduto>({});

  useEffect(() => {
    if (!produto?.ui_schema) return;

    const iniciais: ValoresProduto = {
      ...(produto.parametros_default ?? {}),
    };

    produto.ui_schema.forEach((c) => {
      iniciais[c.name] =
        c.default !== undefined ? c.default : '';
    });

    setLocalValores(iniciais);
    onUpdate(iniciais);
  }, [produto?.id]);

  const seccoes = Array.from(
    new Set((produto.ui_schema ?? []).map((c) => c.section).filter(Boolean))
  ) as string[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {seccoes.map((sec) => (
        <div key={sec} style={{ padding: 12, border: '1px solid #334155', borderRadius: 10, background: '#0b1220' }}>
          <strong style={{ color: 'white' }}>{sec}</strong>

          {(produto.ui_schema ?? [])
            .filter((c) => c.section === sec)
            .map((c) => {
              const val = localValores[c.name];
              const unit = c.unit ? ` (${c.unit})` : '';
              const showVal =
                c.type === 'slider' ? ` — ${Number(val ?? 0).toFixed(1)}${c.unit ?? ''}` : '';

              return (
                <div key={c.name} style={{ marginTop: 10 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#cbd5e1' }}>
                    {(c.label ?? c.name) + unit}{showVal}
                  </label>

                  <input
                    type={c.type === 'slider' ? 'range' : 'text'}
                    min={c.min}
                    max={c.max}
                    step={c.step ?? 1}
                    value={inputValue(localValores[c.name])}
                    onChange={(e) => {
                      const novo =
                        c.type === 'slider'
                          ? Number(e.target.value)
                          : e.target.value;

                      const novos = { ...localValores, [c.name]: novo };
                      setLocalValores(novos);
                      onUpdate(novos);
                    }}
                    style={{ width: '100%', marginTop: 6 }}
                  />
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
}