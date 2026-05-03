'use client';

type UiParam = {
  name: string;
  type: 'slider' | 'checkbox' | 'number' | 'text';
  label?: string;
  min?: number;
  max?: number;
  step?: number;
  default?: any;
};

type Props = {
  schema: UiParam[];
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
      {schema.map((param) => {
        const {
          name,
          type,
          label = name,
          min,
          max,
          step,
        } = param;

        const value = values[name];

        // SLIDER --------------------------------------------------
        if (type === 'slider') {
          return (
            <div key={name} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <label htmlFor={name}>{label}</label>
                <span className="tabular-nums text-slate-400">
                  {value}
                </span>
              </div>

              <input
                id={name}
                type="range"
                min={min}
                max={max}
                step={step ?? 1}
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

        // CHECKBOX ------------------------------------------------
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

        // INPUT DEFAULT -------------------------------------------
        return (
          <div key={name} className="space-y-1">
            <label
              htmlFor={name}
              className="block text-xs text-slate-300"
            >
              {label}
            </label>

            <input
              id={name}
              type="number"
              value={value}
              onChange={(e) =>
                onChange({
                  ...values,
                  [name]: Number(e.target.value),
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