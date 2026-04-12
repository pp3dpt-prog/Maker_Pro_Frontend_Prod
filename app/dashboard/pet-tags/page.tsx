'use client';

import { useState, useEffect } from 'react';
import STLViewer from '@/components/STLViewer';

export default function STLMakerPro() {
  const [shape, setShape] = useState('Osso');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [font, setFont] = useState('Open Sans');
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const [stlUrl, setStlUrl] = useState('');

  useEffect(() => {
    const map: Record<string, string> = {
      Osso: 'osso',
      Redondo: 'redondo',
      Hexagono: 'hexagono',
      Coração: 'coracao',
    };

    const novaUrl = `/models/blank_${map[shape]}.stl`;
    setStlUrl(novaUrl);

    // Sempre que muda a forma, voltamos à peça limpa
    setMostrarPreview(false);
  }, [shape]);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 20 }}>
      <h2>CONFIGURADOR</h2>

      {/* 1. FORMA */}
      <h3>1. FORMA</h3>
      <div style={{ display: 'flex', gap: 10 }}>
        {['Osso', 'Redondo', 'Hexagono', 'Coração'].map((s) => (
          <button
            key={s}
            onClick={() => setShape(s)}
            style={{
              padding: '10px',
              borderRadius: '8px',
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
      <h3 style={{ marginTop: 20 }}>2. FONTE</h3>
      <select
        value={font}
        onChange={(e) => setFont(e.target.value)}
        style={{
          width: '100%',
          padding: '12px',
          background: '#0f172a',
          color: 'white',
          borderRadius: '8px',
          marginBottom: '20px',
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
          padding: '12px',
          background: '#0f172a',
          borderRadius: '8px',
          border: '1px solid #334155',
          color: 'white',
          marginBottom: '10px',
        }}
      />

      <input
        placeholder="Telefone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        style={{
          width: '100%',
          padding: '12px',
          background: '#0f172a',
          borderRadius: '8px',
          border: '1px solid #334155',
          color: 'white',
        }}
      />

      {/* BOTÃO PREVIEW */}
      <button
        onClick={() => setMostrarPreview((v) => !v)}
        style={{
          width: '100%',
          padding: '15px',
          marginTop: '30px',
          borderRadius: '8px',
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
      {stlUrl && (
        <div style={{ marginTop: 30 }}>
          <STLViewer
            baseStlUrl={stlUrl}
            nome={mostrarPreview ? name : ''}
            telefone={mostrarPreview ? phone : ''}
            font={font}
            fontSize={7}
            xPos={0}
            yPos={0}
            relevo={true}
          />
        </div>
      )}
    </div>
  );
}