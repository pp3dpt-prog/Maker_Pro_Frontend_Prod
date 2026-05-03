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
  // ✅ Normalização do schema
  // Aceita:
  // 1) schema.parameters (antigo)
  // 2) schema como array (ui_schema novo)

  const params = Array.isArray(schema)
    ? schema
    : schema?.parameters
    ? Object.values(schema.parameters).map((p: any) => ({
        name: p.name,
        type: p.ui?.widget ?? p.type,
        label: p.ui?.label ?? p.label ?? p.name,
        min: p.min,
        max: p.max,
        step: p.step,
      }))
    : [];

  if (!params.length) {
    return (
      <div className="text-sm text-red-400">
        Schema inválido — nenhum parâmetro definido
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {params.map((param: any) => {
        const {
          name,
          type,
          label = name,
          min,
          max,
          step,
        } = param;

        const value = values[name];

        if (type === 'slider') {
          return (
            <div key={name} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <label>{label}</label>
                <span className="tabular-nums text-slate-400">
                  {value}
                </span>
              </div>

              <input
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
                className="w-full accent-blue-500"
              />
            </div>
          );
        }

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

        return (
          <div key={name} className="space-y-1">
            <label className="block text-xs text-slate-300">
              {label}
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) =>
                onChange({
                  ...values,
                  [name]: Number(e.target.value),
                })
              }
              className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-sm"
            />
          </div>
        );
      })}
    </div>
  );
}