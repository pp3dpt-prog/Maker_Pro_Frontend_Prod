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
  unit?: string;      // ex: "mm"
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

/** ✅ Fontes disponíveis (as que tens em public/fonts/*.json) */
const FONT_OPTIONS = ['Aladin', 'Amarante', 'Baloo 2', 'Benne'] as const;
type FontOption = typeof FONT_OPTIONS[number];

function isFontOption(v: unknown): v is FontOption {
  return typeof v === 'string' && (FONT_OPTIONS as readonly string[]).includes(v);
}

/** Normaliza valores para inputs controlados */
function inputValue(v: string | number | boolean | undefined): string | number {
  if (typeof v === 'boolean') return v ? 1 : 0;
  return v ?? '';
}

/** Garantir que a fonte nunca fica “OpenSans”/valor inválido */
function normalizeFont(v: unknown): FontOption {
  if (isFontOption(v)) return v;
  return 'Amarante'; // fallback seguro
}

export default function EditorControls({ produto, valores, onUpdate }: Props) {
  const [localValores, setLocalValores] = useState<ValoresProduto>({});

  /** Inicializar a partir das presets da BD */
  useEffect(() => {
    if (!produto?.ui_schema) return;

    const iniciais: ValoresProduto = {
      ...(produto.parametros_default ?? {}),
    };

    produto.ui_schema.forEach((c) => {
      // defaults do schema
      iniciais[c.name] = c.default !== undefined ? c.default : '';
    });

    // ✅ se existir campo "fonte", normaliza já para uma opção válida
    if ('fonte' in iniciais) {
      iniciais.fonte = normalizeFont(iniciais.fonte);
    }

    setLocalValores(iniciais);
    onUpdate(iniciais);
  }, [produto?.id]);

  /** Agrupar por secções */
  const seccoes = Array.from(
    new Set((produto.ui_schema ?? []).map((c) => c.section).filter(Boolean))
  ) as string[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {seccoes.map((sec) => (
        <div
          key={sec}
          style={{
            padding: 12,
            border: '1px solid #334155',
            borderRadius: 10,
            background: '#0b1220',
          }}
        >
          <strong style={{ color: 'white' }}>{sec}</strong>

          {(produto.ui_schema ?? [])
            .filter((c) => c.section === sec)
            .map((c) => {
              const val = localValores[c.name];
              const unitLabel = c.unit ? ` (${c.unit})` : '';

              const isSlider = c.type === 'slider';
              const isFontField = c.name === 'fonte';

              // Mostra valor actual nos sliders (com unidade se houver)
              const sliderValueLabel =
                isSlider
                  ? ` — ${Number(val ?? 0).toFixed(1)}${c.unit ?? ''}`
                  : '';

              return (
                <div key={c.name} style={{ marginTop: 10 }}>
                  <label style={{ display: 'block', fontSize: 12, color: '#cbd5e1' }}>
                    {(c.label ?? c.name) + unitLabel}
                    {sliderValueLabel}
                  </label>

                  {/* ✅ Campo especial: fonte */}
                  {isFontField ? (
                    <select
                      value={normalizeFont(val)}
                      onChange={(e) => {
                        const novos = { ...localValores, [c.name]: e.target.value };
                        setLocalValores(novos);
                        onUpdate(novos);
                      }}
                      style={{
                        width: '100%',
                        marginTop: 6,
                        padding: 10,
                        borderRadius: 8,
                        border: '1px solid #334155',
                        background: '#0f172a',
                        color: 'white',
                      }}
                    >
                      {FONT_OPTIONS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={isSlider ? 'range' : 'text'}
                      min={c.min}
                      max={c.max}
                      step={c.step ?? 1}
                      value={inputValue(localValores[c.name])}
                      onChange={(e) => {
                        const novo =
                          isSlider ? Number(e.target.value) : e.target.value;

                        const novos = { ...localValores, [c.name]: novo };
                        setLocalValores(novos);
                        onUpdate(novos);
                      }}
                      style={{ width: '100%', marginTop: 6 }}
                    />
                  )}
                </div>
              );
            })}
        </div>
      ))}
    </div>
  );
}