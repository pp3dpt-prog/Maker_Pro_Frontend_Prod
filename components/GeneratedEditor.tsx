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
  const parameters = schema.parameters;

  return (
    <div className="space-y-4">
      {Object.entries(parameters).map(([name, def]: any) => {
        const ui = def.ui || {};
        const label = ui.label || name;
        const step = ui.step ?? 1;
        const unit = def.unit;
        const type = ui.widget;
        const value = values[name];

        // SLIDER ------------------------------------------------
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

        // CHECKBOX ---------------------------------------------
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

        return null;
      })}
    </div>
  );
}