type GenerationSchema = {
  parameters: Record<string, any>;
};

type Props = {
  schema: GenerationSchema;
  values: Record<string, any>;
  onChange: (next: Record<string, any>) => void;
};

export default function GeneratedEditor({ schema, values, onChange }: Props) {
  return (
    <>
      {Object.entries(schema.parameters).map(([key, def]) => {
        const ui = def.ui ?? {};
        const label = ui.label ?? key;
        const value = values[key];

        if (ui.widget === 'slider') {
          return (
            <div key={key}>
              <label>{label}</label>
              <input
                type="range"
                min={def.min}
                max={def.max}
                step={ui.step ?? 1}
                value={value}
                onChange={e =>
                  onChange({ ...values, [key]: Number(e.target.value) })
                }
              />
              <input
                type="number"
                value={value}
                onChange={e =>
                  onChange({ ...values, [key]: Number(e.target.value) })
                }
              />
            </div>
          );
        }

        if (ui.widget === 'checkbox') {
          return (
            <label key={key}>
              <input
                type="checkbox"
                checked={Boolean(value)}
                onChange={e =>
                  onChange({ ...values, [key]: e.target.checked })
                }
              />
              {label}
            </label>
          );
        }

        return (
          <div key={key}>
            <label>{label}</label>
            <input
              type="text"
              value={value}
              onChange={e =>
                onChange({ ...values, [key]: e.target.value })
              }
            />
          </div>
        );
      })}
    </>
  );
}