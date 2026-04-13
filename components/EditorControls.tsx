'use client';

import { useEffect, useState } from 'react';

export type ValoresProduto = Record<string, string | number | boolean>;

type UISchemaField = {
  name: string;
  label?: string;
  type?: 'text' | 'slider' | 'number';
  min?: number;
  max?: number;
  step?: number;
  default?: string | number | boolean;
  unit?: string;       // ex: "mm"
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

function asInputValue(v: string | number | boolean | undefined): string | number {
  if (typeof v === 'boolean') return v ? 1 : 0;
  return v ?? '';
}

function asNumber(v: any, fallback = 0): number {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export default function EditorControls({ produto, valores, onUpdate }: EditorControlsProps) {
  const [localValores, setLocalValores] = useState<ValoresProduto>({});

  // presets (BD) -> estado local
  useEffect(() => {
    if (!produto?.ui_schema) return;

    const iniciais: ValoresProduto = {
      ...(produto.parametros_default ?? {}),
    };

    produto.ui_schema.forEach((campo) => {
      iniciais[campo.name] = campo.default !== undefined ? campo.default : '';
    });

    setLocalValores(iniciais);
    onUpdate(iniciais);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produto?.id]);

  const seccoes = Array.from(
    new Set(produto.ui_schema?.map((c) => c.section).filter(Boolean))
  ) as string[];

  const updateField = (name: string, value: string | number | boolean) => {
    const novos = { ...localValores, [name]: value };
    setLocalValores(novos);
    onUpdate(novos);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {seccoes.map((sec) => (
        <div key={sec}>
          <strong>{sec}</strong>

          {produto.ui_schema
            ?.filter((c) => c.section === sec)
            .map((c) => {
              const label = `${c.label ?? c.name}${c.unit ? ` (${c.unit})` : ''}`;

              // Slider (range) com valor numérico e input de precisão
              if (c.type === 'slider') {
                const min = c.min ?? -20;
                const max = c.max ?? 20;
                const step = c.step ?? 0.5;

                const current = asNumber(localValores[c.name], asNumber(c.default, 0));

                return (
                  <div key={c.name} style={{ marginTop: 10 }}>
                    <label style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                      {label}
                    </label>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: 10, alignItems: 'center' }}>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        step={step}
                        value={current}
                        onChange={(e) => updateField(c.name, Number(e.target.value))}
                        style={{ width: '100%' }}
                      />

                      <input
                        type="number"
                        inputMode="decimal"
                        min={min}
                        max={max}
                        step={step}
                        value={current}
                        onChange={(e) => updateField(c.name, Number(e.target.value))}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: 10,
                          border: '1px solid #334155',
                          background: '#0f172a',
                          color: 'white',
                        }}
                      />
                    </div>

                    <div style={{ marginTop: 6, fontSize: 12, color: '#94a3b8' }}>
                      {current} {c.unit ?? ''}
                    </div>
                  </div>
                );
              }

              // Campo numérico (não slider)
              if (c.type === 'number') {
                const current = asNumber(localValores[c.name], asNumber(c.default, 0));
                return (
                  <div key={c.name} style={{ marginTop: 10 }}>
                    <label style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                      {label}
                    </label>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={current}
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
                );
              }

              // Texto (inclui telefone — aceita números e +)
              const currentText = String(asInputValue(localValores[c.name]) ?? '');
              return (
                <div key={c.name} style={{ marginTop: 10 }}>
                  <label style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                    {label}
                  </label>
                  <input
                    type="text"
                    inputMode={c.name.toLowerCase().includes('tel') || c.name.toLowerCase().includes('phone') ? 'tel' : 'text'}
                    value={currentText}
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