'use client';

import { useEffect, useState } from 'react';

/* ──────────────────────────────────────────────
 TIPOS
────────────────────────────────────────────── */
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

interface EditorControlsProps {
  produto: ProdutoAtual;
  valores: ValoresProduto;
  onUpdate: (valores: ValoresProduto) => void;
}

/* ──────────────────────────────────────────────
 UTILITÁRIO: valor seguro para <input>
────────────────────────────────────────────── */
function inputValue(
  v: string | number | boolean | undefined
): string | number {
  if (typeof v === 'boolean') return v ? 1 : 0;
  return v ?? '';
}

/* ──────────────────────────────────────────────
 COMPONENTE
────────────────────────────────────────────── */
function EditorControls({
  produto,
  valores,
  onUpdate,
}: EditorControlsProps) {
  const [localValores, setLocalValores] = useState<ValoresProduto>({});

  /* Inicializar a partir das presets da BD */
  useEffect(() => {
    if (!produto?.ui_schema) return;

    const iniciais: ValoresProduto = {
      ...(produto.parametros_default ?? {}),
    };

    produto.ui_schema.forEach((campo) => {
      iniciais[campo.name] =
        campo.default !== undefined ? campo.default : '';
    });

    setLocalValores(iniciais);
    onUpdate(iniciais);
  }, [produto?.id]);

  /* Agrupar campos por secção */
  const seccoes = Array.from(
    new Set(
      produto.ui_schema
        ?.map((c) => c.section)
        .filter(Boolean)
    )
  ) as string[];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {seccoes.map((sec) => (
        <div key={sec}>
          <strong>{sec}</strong>

          {produto.ui_schema
            ?.filter((c) => c.section === sec)
            .map((c) => (
              <div key={c.name} style={{ marginTop: 8 }}>
                <label
                  style={{
                    fontSize: 12,
                    display: 'block',
                    marginBottom: 4,
                  }}
                >
                  {c.label ?? c.name}
                  {c.unit ? ` (${c.unit})` : ''}
                </label>

                <input
                  type={c.type === 'slider' ? 'range' : 'text'}
                  min={c.min}
                  max={c.max}
                  step={c.step ?? 1}
                  value={inputValue(localValores[c.name])}
                  onChange={(e) => {
                    const novoValor =
                      c.type === 'slider'
                        ? Number(e.target.value)
                        : e.target.value;

                    const novos = {
                      ...localValores,
                      [c.name]: novoValor,
                    };

                    setLocalValores(novos);
                    onUpdate(novos);
                  }}
                  style={{ width: '100%' }}
                />
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}

/* ──────────────────────────────────────────────
 EXPORT (ESTA LINHA FALTAVA)
────────────────────────────────────────────── */
export default EditorControls;