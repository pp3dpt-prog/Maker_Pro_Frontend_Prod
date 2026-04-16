'use client';

import { useEffect, useState } from 'react';

export type ValoresProduto = Record<string, string | number | boolean>;

type UISchemaField = {
  name: string;
  label?: string;
  type?: 'text' | 'slider' | 'select' | 'hidden';
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
  default?: string | number | boolean;
  value?: any;
  unit?: string;
  section?: string;
};

type ProdutoAtual = {
  id: string | number;
  ui_schema?: UISchemaField[];
  parametros_default?: Record<string, any>;
};

interface EditorControlsProps {
  produto: ProdutoAtual;
  valores: ValoresProduto;
  onUpdate: (valores: ValoresProduto) => void;
}

function asNumber(v: unknown, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default function EditorControls({ produto, valores, onUpdate }: EditorControlsProps) {
  const [localValores, setLocalValores] = useState<ValoresProduto>({});

  useEffect(() => {
    if (!produto?.ui_schema) return;

    const iniciais: ValoresProduto = {
      ...(produto.parametros_default ?? {}),
    };

    // aplica defaults por campo
    for (const c of produto.ui_schema) {
      if (c.type === 'hidden') continue;

      if (iniciais[c.name] === undefined) {
        if (c.value !== undefined) iniciais[c.name] = c.value;
        else if (c.default !== undefined) iniciais[c.name] = c.default;
        else iniciais[c.name] = '';
      }
    }

    setLocalValores(iniciais);
    onUpdate(iniciais);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produto?.id]);

  const updateField = (name: string, value: string | number | boolean) => {
    const novos = { ...localValores, [name]: value };
    setLocalValores(novos);
    onUpdate(novos);
  };

  const seccoes = Array.from(
    new Set((produto.ui_schema ?? []).map((c) => c.section).filter(Boolean))
  ) as string[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {seccoes.map((sec) => (
        <div key={sec}>
          <strong style={{ display: 'block', marginBottom: 8 }}>{sec}</strong>

          {(produto.ui_schema ?? [])
            .filter((c) => c.section === sec && c.type !== 'hidden')
            .map((c) => {
              const label = c.label ?? c.name;

              // SELECT (FONTE)
              if (c.type === 'select' && Array.isArray(c.options)) {
                const cur = String(localValores[c.name] ?? c.default ?? '');
                return (
                  <div key={c.name} style={{ marginTop: 10 }}>
                    <label style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                      {label}
                    </label>
                    <select
                      value={cur}
                      onChange={(e) => updateField(c.name, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1px solid #334155',
                        background: '#0f172a',
                        color: 'white',
                      }}
                    >
                      {c.options.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              }

              // SLIDER (numérico)
              if (c.type === 'slider') {
                const min = c.min ?? 0;
                const max = c.max ?? 100;
                const step = c.step ?? 1;
                const cur = asNumber(localValores[c.name], asNumber(c.default, 0));

                // unidade: usa unit do schema; se não existir, assume mm para x/y
                const unit =
                  c.unit ??
                  (/(^xPos$|^yPos$|^xPosN$|^yPosN$)/.test(c.name) ? 'mm' : '');

                return (
                  <div key={c.name} style={{ marginTop: 10 }}>
                    <label style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                      {label} {unit ? `(${unit})` : ''}
                    </label>

                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 60px',
                        gap: 8,
                        alignItems: 'center',
                      }}
                    >
                      <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={cur}
                        onChange={(e) => updateField(c.name, Number(e.target.value))}
                        style={{ width: '100%' }}
                      />

                      <input
                        type="number"
                        inputMode="decimal"
                        min={min}
                        max={max}
                        step={step}
                        value={cur}
                        onChange={(e) => updateField(c.name, Number(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          borderRadius: 10,
                          border: '1px solid #334155',
                          background: '#0f172a',
                          color: 'white',
                        }}
                      />
                    </div>

                    <div style={{ marginTop: 6, fontSize: 12, color: '#94a3b8' }}>
                      Valor: <b>{cur}</b> {unit}
                    </div>
                  </div>
                );
              }

              // TEXT (nome, telefone, etc.)
              const cur = String(localValores[c.name] ?? c.default ?? '');
              const isPhone = c.name === 'telefone';

              return (
                <div key={c.name} style={{ marginTop: 10 }}>
                  <label style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                    {label}
                  </label>
                  <input
                    type="text"
                    inputMode={isPhone ? 'tel' : 'text'}
                    value={cur}
                    onChange={(e) => updateField(c.name, e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 10,
                      border: '1px solid #334155',
                      background: '#0f172a',
                      color: 'white',
                    }}
                  />
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
}
