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
  return (
    <div className="space-y-4">
      {Object.entries(schema.parameters).map(([key, def]: any) => {
        const ui = def.ui || {};
        const label = ui.label || key;
        const value = values[key];

        // SLIDER --------------------------------------------------
        if (ui.widget === 'slider') {
          return (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <label htmlFor={key}>{label}</label>
                <span className="tabular-nums text-slate-400">
                  {value}
                </span>
              </div>

              <input
                id={key}
                type="range"
                min={def.min}
                max={def.max}
                step={def.step || 1}
                value={value}
                onChange={(e) =>
                  onChange({
                    ...values,
                    [key]: Number(e.target.value),
                  })
                }
                className="
                  w-full
                  accent-blue-500
                  cursor-pointer
                "
              />
            </div>
          );
        }

        // CHECKBOX ------------------------------------------------
        if (ui.widget === 'checkbox') {
          return (
            <label
              key={key}
              className="flex items-center gap-2 text-sm text-slate-300"
            >
              <input
                type="checkbox"
                checked={!!value}
                onChange={(e) =>
                  onChange({
                    ...values,
                    [key]: e.target.checked,
                  })
                }
                className="accent-blue-500"
              />
              {label}
            </label>
          );
        }

        // INPUT DEFAULT -------------------------------------------
        return (
          <div key={key} className="space-y-1">
            <label
              htmlFor={key}
              className="block text-xs text-slate-300"
            >
              {label}
            </label>

            <input
              id={key}
              type="number"
              value={value}
              onChange={(e) =>
                onChange({
                  ...values,
                  [key]: Number(e.target.value),
                })
              }
              className="
                w-full
                rounded-md
                border border-slate-700
                bg-slate-900
                px-2 py-1
                text-sm text-slate-100
                focus:outline-none
                focus:border-blue-500
              "
            />
          </div>
        );
      })}
    </div>
  );
}