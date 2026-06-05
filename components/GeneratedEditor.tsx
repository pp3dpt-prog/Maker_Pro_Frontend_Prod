'use client';

import { useRef, useState } from 'react';

type Props = {
  schema: any;
  values: Record<string, any>;
  onChange: (v: Record<string, any>) => void;
  /** Called when the user picks a file for an image_upload widget.
   *  Should upload the file and return the Supabase Storage path. */
  onFileUpload?: (paramName: string, file: File) => Promise<string>;
};

export default function GeneratedEditor({ schema, values, onChange, onFileUpload }: Props) {
  const [uploadStates, setUploadStates] = useState<Record<string, 'idle' | 'uploading' | 'error'>>({});
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  if (!schema?.parameters) {
    return (
      <div className="text-sm text-red-400">
        Schema inválido – parameters não definidos
      </div>
    );
  }

  // Nº de letras do nome actual (porta-chaves usa `Text`; outros podem usar `nome`)
  const nomeAtual = String(values.Text ?? values.nome ?? '');
  const numLetras = nomeAtual.length;

  // Esconde parâmetros por-letra que não se aplicam ao nome actual.
  //  - altura (letter_N_height) controla a letra N  → mostrar até N = numLetras
  //  - espaço (letter_N_space) controla a letra N+1 → mostrar até N = numLetras-1
  const paramRelevante = ([name]: [string, any]): boolean => {
    const m = name.match(/^letter_(\d+)_(space|height)$/);
    if (!m) return true;
    if (numLetras === 0) return true; // sem nome ainda — mostra os defaults
    const n = Number(m[1]);
    return m[2] === 'space' ? n <= numLetras - 1 : n <= numLetras;
  };

  // Rótulo honesto para os parâmetros por-letra:
  //  - letter_N_height → "Altura da letra N"
  //  - letter_N_space  → "Espaço da letra N+1" (porque controla a letra seguinte)
  const rotuloLetra = (name: string, fallback: string): string => {
    const m = name.match(/^letter_(\d+)_(space|height)$/);
    if (!m) return fallback;
    const n = Number(m[1]);
    return m[2] === 'height' ? `Altura da letra ${n}` : `Espaço da letra ${n + 1}`;
  };

  const parameters = Object.entries(schema.parameters)
    .filter(paramRelevante)
    .sort(([, a]: any, [, b]: any) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="space-y-4">
      {parameters.map(([name, def]: any) => {
        const ui     = def.ui || {};
        const label  = rotuloLetra(name, ui.label || name);
        const step   = ui.step ?? 1;
        const type   = ui.widget;
        const unit   = def.unit;
        const value  = values[name];

        // ── TEXT ──────────────────────────────────────────────────────────
        if (type === 'text') {
          return (
            <div key={name} className="space-y-1">
              <label className="block text-xs text-slate-300 font-medium">
                {label}
              </label>
              <input
                type="text"
                value={value ?? ''}
                onChange={(e) => onChange({ ...values, [name]: e.target.value })}
                placeholder={ui.placeholder ?? def.default ?? ''}
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
                onFocus={(e) => (e.target.style.borderColor = '#3b82f6')}
                onBlur={(e)  => (e.target.style.borderColor = '#1f2937')}
              />
            </div>
          );
        }

        // ── SELECT ────────────────────────────────────────────────────────
        if (type === 'select') {
          const options: string[] = ui.options ?? [];
          return (
            <div key={name} className="space-y-1">
              <label className="block text-xs text-slate-300 font-medium">
                {label}
              </label>
              <select
                value={value ?? def.default ?? ''}
                onChange={(e) => onChange({ ...values, [name]: e.target.value })}
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

        // ── SLIDER ────────────────────────────────────────────────────────
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

        // ── CHECKBOX ──────────────────────────────────────────────────────
        if (type === 'checkbox') {
          return (
            <label
              key={name}
              className="flex items-center gap-2 text-sm text-slate-300"
            >
              <input
                type="checkbox"
                checked={!!value}
                onChange={(e) => onChange({ ...values, [name]: e.target.checked })}
                className="accent-blue-500"
              />
              {label}
            </label>
          );
        }

        // ── INFO ──────────────────────────────────────────────────────────
        if (type === 'info') {
          return (
            <div
              key={name}
              style={{
                marginTop: 12,
                padding: '10px 14px',
                borderRadius: 8,
                backgroundColor: 'rgba(59,130,246,0.08)',
                border: '1px solid rgba(59,130,246,0.2)',
                fontSize: 12,
                color: '#94a3b8',
                lineHeight: 1.6,
              }}
            >
              {ui.text}
            </div>
          );
        }

        // ── IMAGE UPLOAD ──────────────────────────────────────────────────
        if (type === 'image_upload') {
          const uploadState = uploadStates[name] ?? 'idle';
          const previewUrl  = previewUrls[name];
          const hasValue    = !!value;

          const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
            const file = e.target.files?.[0];
            if (!file) return;

            // Validar tamanho (max 8 MB)
            if (file.size > 8 * 1024 * 1024) {
              alert('Imagem demasiado grande. Máximo: 8 MB.');
              return;
            }

            // Mostrar preview local imediatamente
            const objectUrl = URL.createObjectURL(file);
            setPreviewUrls((prev) => ({ ...prev, [name]: objectUrl }));
            setUploadStates((prev) => ({ ...prev, [name]: 'uploading' }));

            try {
              if (!onFileUpload) throw new Error('Upload não configurado');
              const storagePath = await onFileUpload(name, file);
              onChange({ ...values, [name]: storagePath });
              setUploadStates((prev) => ({ ...prev, [name]: 'idle' }));
            } catch (err) {
              console.error('Erro no upload:', err);
              setUploadStates((prev) => ({ ...prev, [name]: 'error' }));
              setPreviewUrls((prev) => { const n = { ...prev }; delete n[name]; return n; });
              onChange({ ...values, [name]: null });
            }

            // Limpar o input para permitir re-selecionar o mesmo ficheiro
            if (fileInputRefs.current[name]) fileInputRefs.current[name]!.value = '';
          };

          const handleClear = () => {
            onChange({ ...values, [name]: null });
            setPreviewUrls((prev) => { const n = { ...prev }; delete n[name]; return n; });
            setUploadStates((prev) => ({ ...prev, [name]: 'idle' }));
          };

          return (
            <div key={name} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{ fontSize: 12, color: '#cbd5e1', fontWeight: 500 }}>
                {label}
              </label>

              {/* Preview ou zona de upload */}
              {hasValue && previewUrl ? (
                <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden' }}>
                  <img
                    src={previewUrl}
                    alt="Preview"
                    style={{ width: '100%', maxHeight: 140, objectFit: 'cover', display: 'block' }}
                  />
                  {uploadState === 'uploading' && (
                    <div style={{
                      position: 'absolute', inset: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'rgba(0,0,0,0.55)',
                      fontSize: 13, color: '#93c5fd',
                    }}>
                      ⏳ A carregar…
                    </div>
                  )}
                  <button
                    onClick={handleClear}
                    title="Remover imagem"
                    style={{
                      position: 'absolute', top: 6, right: 6,
                      width: 24, height: 24, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)',
                      color: '#f1f5f9', fontSize: 13, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRefs.current[name]?.click()}
                  style={{
                    border: '2px dashed #334155',
                    borderRadius: 8,
                    padding: '20px 12px',
                    textAlign: 'center',
                    cursor: uploadState === 'uploading' ? 'wait' : 'pointer',
                    background: 'rgba(15,23,42,0.6)',
                    transition: 'border-color 0.2s',
                  }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = '#3b82f6')}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = '#334155')}
                >
                  {uploadState === 'error' ? (
                    <>
                      <div style={{ fontSize: 22, marginBottom: 4 }}>⚠️</div>
                      <div style={{ fontSize: 12, color: '#f87171' }}>Erro no upload. Tenta novamente.</div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 24, marginBottom: 4 }}>🖼️</div>
                      <div style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>
                        Clica para carregar imagem
                      </div>
                      <div style={{ fontSize: 11, color: '#475569', marginTop: 2 }}>
                        PNG, JPG, WEBP · máx. 8 MB
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Input oculto */}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                style={{ display: 'none' }}
                ref={(el) => { fileInputRefs.current[name] = el; }}
                onChange={handleFileChange}
              />
            </div>
          );
        }

        // ── FALLBACK ──────────────────────────────────────────────────────
        return (
          <div key={name} className="text-xs text-yellow-400">
            Parâmetro não suportado: {name}
          </div>
        );
      })}
    </div>
  );
}
