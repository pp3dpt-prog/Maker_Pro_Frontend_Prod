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

  // Oculta parâmetros condicionais (visible_when no schema)
  // Ex: { "visible_when": { "num_cores": { "min": 2 } } }
  //     { "visible_when": { "impressao": { "ne": "Sem AMS (troca de cor manual)" } } }
  // eq/ne com texto comparam o valor como texto (para selects).
  const paramVisivel = ([, def]: [string, any]): boolean => {
    const cond = def.ui?.visible_when;
    if (!cond) return true;
    return Object.entries(cond).every(([param, constraint]: [string, any]) => {
      const bruto = values[param] ?? (schema.parameters as any)[param]?.default;
      const val = Number(bruto ?? 0);
      if (constraint.min !== undefined && val < constraint.min) return false;
      if (constraint.max !== undefined && val > constraint.max) return false;
      if (typeof constraint.eq === 'string') { if (String(bruto ?? '') !== constraint.eq) return false; }
      else if (constraint.eq !== undefined && val !== constraint.eq) return false;
      if (constraint.ne !== undefined && String(bruto ?? '') === String(constraint.ne)) return false;
      return true;
    });
  };

  const parameters = Object.entries(schema.parameters)
    .filter(paramRelevante)
    .filter(paramVisivel)
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

        // ── NUMBER (medida escrita à mão; vazio = valor automático) ──────
        if (type === 'number') {
          return (
            <div key={name} className="space-y-1">
              <label className="block text-xs text-slate-300 font-medium">
                {label}
                {unit ? ` (${unit})` : ''}
              </label>
              <input
                type="number"
                inputMode="decimal"
                min={def.min}
                max={def.max}
                step={step}
                value={value ?? ''}
                onChange={(e) =>
                  onChange({ ...values, [name]: e.target.value === '' ? '' : Number(e.target.value) })
                }
                placeholder={ui.placeholder ?? ''}
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

        // ── SLIDER ────────────────────────────────────────────────────────
        if (type === 'slider') {
          // ui.mm_por_forma: mostra o tamanho em mm (% × tamanho base da forma escolhida)
          const base = ui.mm_por_forma
            ? Number(ui.mm_por_forma.valores?.[values[ui.mm_por_forma.param] ?? 'Retangular'])
            : NaN;
          const mmExtra = base > 0 && Number.isFinite(Number(value))
            ? Math.round((Number(value) * base) / 100)
            : null;
          return (
            <div key={name} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <label>
                  {label}
                  {unit ? ` (${unit})` : ''}
                </label>
                <span className="tabular-nums text-slate-400">
                  {value}
                  {mmExtra ? ` (≈ ${mmExtra} mm)` : ''}
                </span>
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

        // ── COLOR ─────────────────────────────────────────────────────────
        if (type === 'color') {
          // ui.paleta (opcional): [{ "nome": "Azul", "hex": "#1E3A8A" }, ...] — os filamentos
          // disponíveis; aparecem como amostras clicáveis por cima do seletor livre.
          const paleta: { nome: string; hex: string }[] = Array.isArray(ui.paleta) ? ui.paleta : [];
          const atual = String(value ?? def.default ?? '').toUpperCase();
          // ui.auto (opcional): texto de um botão que deixa a cor vazia = automática (p.ex. "Cor da
          // imagem" nas imagens a cores dos suportes — o servidor usa a cor detetada na imagem)
          const auto: string | null = typeof ui.auto === 'string' ? ui.auto : null;
          return (
            <div key={name} className="space-y-1">
              <label className="block text-xs text-slate-300 font-medium">
                {label}
              </label>
              {auto && (
                <button
                  type="button"
                  aria-pressed={atual === ''}
                  onClick={() => onChange({ ...values, [name]: '' })}
                  style={{
                    fontSize: 11, padding: '3px 10px', borderRadius: 999, cursor: 'pointer', marginBottom: 4,
                    background: atual === '' ? 'rgba(59,130,246,0.2)' : 'transparent', color: '#cbd5e1',
                    border: atual === '' ? '1px solid #60a5fa' : '1px solid #334155',
                  }}
                >
                  {auto}
                </button>
              )}
              {paleta.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
                  {paleta.map((c) => {
                    const sel = atual === String(c.hex).toUpperCase();
                    return (
                      <button
                        key={c.hex}
                        type="button"
                        title={c.nome}
                        aria-label={c.nome}
                        aria-pressed={sel}
                        onClick={() => onChange({ ...values, [name]: c.hex })}
                        style={{
                          width: 26, height: 26, borderRadius: '50%', padding: 0,
                          background: c.hex, cursor: 'pointer',
                          border: sel ? '2px solid #60a5fa' : '1px solid #334155',
                          boxShadow: sel ? '0 0 0 2px rgba(96,165,250,0.35)' : 'none',
                        }}
                      />
                    );
                  })}
                </div>
              )}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input
                  type="color"
                  value={(value ?? def.default) || '#ffffff'}
                  onChange={(e) => onChange({ ...values, [name]: e.target.value })}
                  style={{
                    width: 40,
                    height: 32,
                    padding: 0,
                    border: '1px solid #1f2937',
                    borderRadius: '6px',
                    background: 'transparent',
                    cursor: 'pointer',
                  }}
                />
                <span style={{ fontSize: 12, color: '#8a96aa', fontFamily: 'monospace' }}>
                  {auto && atual === '' ? auto : (value ?? def.default ?? '').toString().toUpperCase()}
                </span>
              </div>
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
                      <div style={{ fontSize: 11, color: '#8a96aa', marginTop: 2 }}>
                        PNG, JPG, WEBP · máx. 8 MB
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Input oculto */}
              <input
                type="file"
                accept={typeof ui.accept === 'string' ? ui.accept : "image/png,image/jpeg,image/webp"}
                style={{ display: 'none' }}
                ref={(el) => { fileInputRefs.current[name] = el; }}
                onChange={handleFileChange}
              />
            </div>
          );
        }

        // ── HIDDEN (valor fixo do modelo, p.ex. "deco" na família Decoração) ──
        if (type === 'hidden') return null;

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
