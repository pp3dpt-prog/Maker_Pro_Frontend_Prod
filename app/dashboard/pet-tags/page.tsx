'use client';

import { useState, useMemo } from 'react';
import STLViewer, { type ViewerSchema } from '@/components/STLViewer';

/* ======================================================
   VIEWER SCHEMA (BD‑DRIVEN — aqui emulado)
====================================================== */

function buildViewerSchema(
  shape: string,
  font: string
): ViewerSchema {
  const map: Record<string, string> = {
    Osso: 'osso',
    Redondo: 'redondo',
    Hexagono: 'hexagono',
    Coração: 'coracao',
  };

  return {
    base_geometry: {
      mode: 'static',
      stl: `/models/blank_${map[shape]}.stl`,
    },
    camera: {
      mode: 'fixed',
      distance: 120,
    },
    text: {
      enabled: true,
      font,
      front: {
        source: 'nome',
        size: 9,
        depth: 1.2,
        offset: [0, 0, 0.08],
      },
      back: {
        source: 'telefone',
        size: 7,
        depth: 0.3,
        offset: [0, 0, -0.05],
      },
    },
  };
}

/* ======================================================
   PAGE
====================================================== */

export default function PetTagsPage() {
  const [shape, setShape] = useState<'Osso' | 'Redondo' | 'Hexagono' | 'Coração'>(
    'Osso'
  );
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [font, setFont] = useState('Open Sans');
  const [mostrarPreview, setMostrarPreview] = useState(false);

  /* ======================================================
     SCHEMA + VALORES (TIPADOS E MEMOIZADOS)
  ======================================================= */

  const viewerSchema = useMemo(
    () => buildViewerSchema(shape, font),
    [shape, font]
  );

  const valoresPreview = useMemo(
    () => ({
      nome: mostrarPreview ? name : '',
      telefone: mostrarPreview ? phone : '',
    }),
    [mostrarPreview, name, phone]
  );

  /* ======================================================
     UI
  ======================================================= */

  return (
    <div style={{ padding: 30, maxWidth: 1100, margin: '0 auto' }}>
      <h2>CONFIGURADOR · PET TAGS</h2>

      {/* 1. FORMA */}
      <h3>1. FORMA</h3>
      <div style={{ display: 'flex', gap: 10, marginBottom: 30 }}>
        {['Osso', 'Redondo', 'Hexagono', 'Coração'].map((s) => (
          <button
            key={s}
            onClick={() => setShape(s as any)}
            style={{
              padding: '10px',
              borderRadius: 8,
              cursor: 'pointer',
              border: 'none',
              background: shape === s ? '#3b82f6' : '#0f172a',
              color: 'white',
            }}
          >
            {s}
          </button>
        ))}
      </div>

      {/* 2. FONTE */}
      <h3>2. FONTE</h3>
      <select
        value={font}
        onChange={(e) => setFont(e.target.value)}
        style={{
          width: '100%',
          padding: 12,
          background: '#0f172a',
          color: 'white',
          borderRadius: 8,
          marginBottom: 20,
          border: '1px solid #334155',
        }}
      >
        <option>Open Sans</option>
        <option>Open Sans Bold</option>
        <option>Roboto</option>
      </select>

      {/* 3. TEXTOS */}
      <h3>3. TEXTOS</h3>
      <input
        placeholder="Nome"
        value={name}
        onChange={(e) => setName(e.target.value)}
        style={{
          width: '100%',
          padding: 12,
          background: '#0f172a',
          borderRadius: 8,
          border: '1px solid #334155',
          color: 'white',
          marginBottom: 10,
        }}
      />

      <input
        placeholder="Telefone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        style={{
          width: '100%',
          padding: 12,
          background: '#0f172a',
          borderRadius: 8,
          border: '1px solid #334155',
          color: 'white',
        }}
      />

      {/* BOTÃO PREVIEW */}
      <button
        onClick={() => setMostrarPreview((v) => !v)}
        style={{
          width: '100%',
          padding: 15,
          marginTop: 30,
          borderRadius: 8,
          border: 'none',
          background: mostrarPreview ? '#ef4444' : '#22c55e',
          color: 'white',
          fontWeight: 'bold',
          cursor: 'pointer',
        }}
      >
        {mostrarPreview ? 'VER PEÇA LIMPA' : 'VISUALIZAR PERSONALIZAÇÃO'}
      </button>

      {/* VIEWER */}
      <div style={{ marginTop: 30 }}>
        <STLViewer
          viewerSchema={viewerSchema}
          valores={valoresPreview}
          stlUrl={null}
          state="idle"
        />
      </div>
    </div>
  );
}
``