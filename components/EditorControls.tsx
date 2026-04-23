'use client';

import { useEffect, useMemo, useState } from 'react';

export type ValoresProduto = Record<string, string | number | boolean>;

type UISchemaField = {
  name: string;
  label?: string;
  type?: 'text' | 'slider' | 'select' | 'hidden' | 'checkbox';
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

  // inicializa quando muda o produto
  useEffect(() => {
    const schema = produto?.ui_schema ?? [];
    const iniciais: ValoresProduto = { ...(produto.parametros_default ?? {}) };

    for (const c of schema) {
      if (!c?.name) continue;
      if (c.type === 'hidden') continue;

      if (iniciais[c.name] === undefined) {
        if (c.value !== undefined && (typeof c.value === 'string' || typeof c.value === 'number' || typeof c.value === 'boolean')) {
          iniciais[c.name] = c.value;
        } else if (c.default !== undefined && (typeof c.default === 'string' || typeof c.default === 'number' || typeof c.default === 'boolean')) {
          iniciais[c.name] = c.default;
        } else {
          iniciais[c.name] = c.type === 'slider' ? 0 : c.type === 'checkbox' ? false : '';
        }
      }
    }

    setLocalValores(iniciais);
    onUpdate(iniciais);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produto?.id]);

  // sincroniza se o pai atualizar valores externamente
  useEffect(() => {
    if (!valores) return;
    const a = JSON.stringify(localValores);
    const b = JSON.stringify(valores);
    if (a !== b) setLocalValores(valores);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valores]);

  const updateField = (name: string, value: string | number | boolean) => {
    const novos: ValoresProduto = { ...localValores, [name]: value };
    setLocalValores(novos);
    onUpdate(novos);
  };

  const fields = useMemo(() => (produto.ui_schema ?? []).filter((c) => c && c.name), [produto.ui_schema]);

  const seccoes = useMemo(() => {
    return Array.from(new Set(fields.map((c) => c.section).filter(Boolean))) as string[];
  }, [fields]);

  const seccoesParaRender = seccoes.length ? seccoes : ['Geral'];

  return (
    <div>
      {seccoesParaRender.map((sec) => {
        const campos =
          sec === 'Geral' && seccoes.length === 0
            ? fields.filter((c) => c.type !== 'hidden')
            : fields.filter((c) => c.section === sec && c.type !== 'hidden');

        if (campos.length === 0) return null;

        return (
          <div key={sec} style={{ marginBottom: 18 }}>
            <div style={{ fontWeight: 900, margin: '8px 0 10px', color: 'white' }}>{sec}</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {campos.map((c) => {
                const label = c.label ?? c.name;

                // SELECT
                if (c.type === 'select' && Array.isArray(c.options)) {
                  const cur = String(localValores[c.name] ?? c.default ?? '');
                  return (
                    <div key={c.name}>
                      <div style={{ color: '#cbd5e1', fontSize: 13, marginBottom: 6, fontWeight: 800 }}>{label}</div>
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
                          fontWeight: 800,
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

                // CHECKBOX
                if (c.type === 'checkbox') {
                  const cur = Boolean(localValores[c.name] ?? c.default ?? false);
                  return (
                    <label key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#cbd5e1' }}>
                      <input
                        type="checkbox"
                        checked={cur}
                        onChange={(e) => updateField(c.name, e.target.checked)}
                        style={{ transform: 'scale(1.1)' }}
                      />
                      <span style={{ fontWeight: 800 }}>{label}</span>
                    </label>
                  );
                }

                // SLIDER
                if (c.type === 'slider') {
                  const min = c.min ?? 0;
                  const max = c.max ?? 100;
                  const step = c.step ?? 1;
                  const cur = asNumber(localValores[c.name], asNumber(c.default, 0));

                  const unit = c.unit ?? (/(^xPos$|^yPos$|^xPosN$|^yPosN$)/.test(c.name) ? 'mm' : '');

                  return (
                    <div key={c.name}>
                      <div style={{ color: '#cbd5e1', fontSize: 13, marginBottom: 6, fontWeight: 800 }}>
                        {label} {unit ? `(${unit})` : ''}
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 72px', gap: 6, alignItems: 'center' }}>
                        <input
                          type="range"
                          min={min}
                          max={max}
                          step={step}
                          value={cur}
                          onChange={(e) => updateField(c.name, Number(e.target.value))}
                          style={{ width: '100%', height: 18, margin: 0 }}
                        />

                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <input
                            type="number"
                            value={cur}
                            min={min}
                            max={max}
                            step={step}
                            onChange={(e) => updateField(c.name, Number(e.target.value))}
                            style={{
                              width: '100%',
                              height: 30,
                              fontSize: 13,
                              padding: '4px 6px',
                              borderRadius: 10,
                              border: '1px solid #334155',
                              background: '#0f172a',
                              color: 'white',
                              boxSizing: 'border-box',
                              fontWeight: 800,
                            }}
                          />
                          {unit ? (
                            <span style={{ fontSize: 12, opacity: 0.75, whiteSpace: 'nowrap', color: '#cbd5e1' }}>{unit}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  );
                }

                // TEXT (default)
                const cur = String(localValores[c.name] ?? c.default ?? '');
                return (
                  <div key={c.name}>
                    <div style={{ color: '#cbd5e1', fontSize: 13, marginBottom: 6, fontWeight: 800 }}>{label}</div>
                    <input
                      type="text"
                      value={cur}
                      onChange={(e) => updateField(c.name, e.target.value)}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        borderRadius: 10,
                        border: '1px solid #334155',
                        background: '#0f172a',
                        color: 'white',
                        fontWeight: 800,
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}