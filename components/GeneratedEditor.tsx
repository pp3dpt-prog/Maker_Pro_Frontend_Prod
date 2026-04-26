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
    <>
      {Object.entries(schema.parameters).map(([k, def]: any) => {
        const ui = def.ui || {};
        const label = ui.label || k;
        const value = values[k];

        if (ui.widget === 'slider') {
          return (
            <div key={k}>
              <label>{label}</label>
              <input
                type="range"
                min={def.min}
                max={def.max}
                step={ui.step || 1}
                value={value}
                onChange={e =>
                  onChange({
                    ...values,
                    [k]: Number(e.target.value),
                  })
                }
              />
              <input
                type="number"
                value={value}
                onChange={e =>
                  onChange({
                    ...values,
                    [k]: Number(e.target.value),
                  })
                }
              />
            </div>
          );
        }

        if (ui.widget === 'checkbox') {
          return (
            <label key={k}>
              <input
                type="checkbox"
                checked={!!value}
                onChange={e =>
                  onChange({
                    ...values,
                    [k]: e.target.checked,
                  })
                }
              />
              {label}
            </label>
          );
        }

        return (
          <div key={k}>
            <label>{label}</label>
            <input
              type="text"
              value={value}
              onChange={e =>
                onChange({
                  ...values,
                  [k]: e.target.value,
                })
              }
            />
          </div>
        );
      })}
    </>
  );
}