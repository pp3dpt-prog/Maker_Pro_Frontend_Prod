'use client';

type Props = {
  schema: any;
  values: Record<string, any>;
  onChange: (v: Record<string, any>) => void;
};

export default function GeneratedEditor({ schema, values, onChange }: Props) {
  if (!schema?.parameters) {
    return (
      <div className="text-sm text-red-400">
        Schema inválido – parameters não definidos
      </div>
    );
  }

  const parameters = Object.entries(schema.parameters)
    .sort(([, a]: any, [, b]: any) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="space-y-4">
      {parameters.map(([name, def]: any) => {
        const ui = def.ui || {};
        const label = ui.label || name;
        const step = ui.step ?? 1;
        const type = ui.widget;
        const unit = def.unit;
        const value = values[name];

        // TEXT -----------------------------------------------
        if (type === 'text') {
          return (
            <div key={name} className="space-y-1">
              <label className="block text-xs text-slate-300 font-medium">
                {label}
              </label>
              <input
                type="text"
                value={value ?? ''}
                onChange={(e) =>
                  onChange({ ...values, [name]: e.target.value })
                }
                placeholder={def.default ?? ''}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: '#020617',
                  border: '1px solid #1f2937',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#1f2937'}
              />
            </div>
          );
        }

        // SELECT ---------------------------------------------
        if (type === 'select') {
          const options: string[] = ui.options ?? [];
          return (
            <div key={name} className="space-y-1">
              <label className="block text-xs text-slate-300 font-medium">
                {label}
              </label>
              <select
                value={value ?? def.default ?? ''}
                onChange={(e) =>
                  onChange({ ...values, [name]: e.target.value })
                }
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: '#020617',
                  border: '1px solid #1f2937',
                  borderRadius: '6px',
                  color: 'white',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                {options.map((opt) => (
                  <option key={opt} value={opt} style={{ background: '#020617' }}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          );
        }

        // SLIDER ---------------------------------------------
        if (type === 'slider') {
          return (
            <div key={name} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <label>
                  {label}
                  {unit ? ` (${unit})` : ''}
                </label>
                <span className="tabular-nums text-slate-400">{value}</span>
              </div>
              <input
                type="range"
                min={def.min}
                max={def.max}
                step={step}
                value={value}
                onChange={(e) =>
                  onChange({ ...values, [name]: Number(e.target.value) })
                }
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>
          );
        }

        // CHECKBOX -------------------------------------------
        if (type === 'checkbox') {
          return (
            <label
              key={name}
              className="flex items-center gap-2 text-sm text-slate-300"
            >
              <input
                type="checkbox"
                checked={!!value}
                onChange={(e) =>
                  onChange({ ...values, [name]: e.target.checked })
                }
                className="accent-blue-500"
              />
              {label}
            </label>
          );
        }

        // FALLBACK
        return (
          <div key={name} className="text-xs text-yellow-400">
            Parâmetro não suportado: {name}
          </div>
        );
      })}
    </div>
  );
}
