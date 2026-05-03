'use client';

type Props = {
  schema: any;
  values: Record<string, any>;
  onChange: (v: Record<string, any>) => void;
};

export default function GeneratedEditor({
  schema,
  values,
  onChange,
}: Props) {
  if (!schema?.parameters) {
    return (
      <div className="text-sm text-red-400">
        Schema inválido – parameters não definidos
      </div>
    );
  }

  // ✅ Normalização + ordenação explícita
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

        // SLIDER --------------------------------------------------
        if (type === 'slider') {
          return (
            <div key={name} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <label>
                  {label}
                  {unit ? ` (${unit})` : ''}
                </label>
                <span className="tabular-nums text-slate-400">
                  {value}
                </span>
              </div>

              <input
                type="range"
                min={def.min}
                max={def.max}
                step={step}
                value={value}
                onChange={(e) =>
                  onChange({
                    ...values,
                    [name]: Number(e.target.value),
                  })
                }
                className="w-full accent-blue-500 cursor-pointer"
              />
            </div>
          );
        }

        // CHECKBOX -----------------------------------------------
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
                  onChange({
                    ...values,
                    [name]: e.target.checked,
                  })
                }
                className="accent-blue-500"
              />
              {label}
            </label>
          );
        }

        // FALLBACK (caso apareça algo inesperado)
        return (
          <div key={name} className="text-xs text-yellow-400">
            Parâmetro não suportado: {name}
          </div>
        );
      })}
    </div>
  );
}