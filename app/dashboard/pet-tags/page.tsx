'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase'; 
import STLViewer from '@/components/STLViewer';

export default function STLMakerPro() {
  const [shape, setShape] = useState('Osso');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [font, setFont] = useState('OpenSans');
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const [stlUrl, setStlUrl] = useState('');

  useEffect(() => {
    // Mapeamento rigoroso para os teus ficheiros em public/models/
    const map: any = { 
      'Osso': 'osso', 
      'Redondo': 'redondo', 
      'Hexagono': 'hexagono', 
      'Coração': 'coracao' 
    };
    
    // Forçamos a URL correta. Ex: /models/blank_osso.stl
    const novaUrl = `/models/blank_${map[shape]}.stl`;
    console.log("A carregar modelo:", novaUrl);
    setStlUrl(novaUrl);
    
    // Sempre que mudar a forma, desligamos o preview para forçar o utilizador a clicar de novo
    setMostrarPreview(false);
  }, [shape]);

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#020617', color: 'white' }}>
      <div style={{ width: '350px', padding: '25px', background: '#1e293b', borderRight: '1px solid #334155', overflowY: 'auto' }}>
        <h1 style={{ fontSize: '20px', color: '#3b82f6', marginBottom: '25px' }}>CONFIGURADOR</h1>
        
        <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>1. FORMA</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
          {['Osso', 'Redondo', 'Hexagono', 'Coração'].map(s => (
            <button key={s} onClick={() => setShape(s)} style={{
              padding: '10px', borderRadius: '8px', cursor: 'pointer', border: 'none',
              background: shape === s ? '#3b82f6' : '#0f172a', color: 'white'
            }}>{s}</button>
          ))}
        </div>

        <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>2. FONTE</label>
        <select value={font} onChange={(e) => setFont(e.target.value)} style={{
          width: '100%', padding: '12px', background: '#0f172a', color: 'white', borderRadius: '8px', marginBottom: '20px', border: '1px solid #334155'
        }}>
          <option value="OpenSans">Open Sans (Padrão)</option>
          <option value="Bebas">Bebas Neue</option>
          <option value="Kiddosy">Kiddosy</option>
          <option value="Strezy">Strezy Break</option>
          <option value="Playfair">Playfair</option>
        </select>

        <label style={{ fontSize: '11px', color: '#64748b', fontWeight: 'bold' }}>3. TEXTOS</label>
        <input placeholder="Nome na Frente" value={name} onChange={(e) => setName(e.target.value)} style={{
          width: '100%', padding: '12px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155', color: 'white', marginBottom: '10px'
        }} />
        <input placeholder="Telefone no Verso" value={phone} onChange={(e) => setPhone(e.target.value)} style={{
          width: '100%', padding: '12px', background: '#0f172a', borderRadius: '8px', border: '1px solid #334155', color: 'white'
        }} />

        <button onClick={() => setMostrarPreview(!mostrarPreview)} style={{
          width: '100%', padding: '15px', marginTop: '30px', borderRadius: '8px', border: 'none',
          background: mostrarPreview ? '#ef4444' : '#22c55e', color: 'white', fontWeight: 'bold', cursor: 'pointer'
        }}>
          {mostrarPreview ? "VER PEÇA LIMPA" : "VISUALIZAR PERSONALIZAÇÃO"}
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {stlUrl && (
          <STLViewer 
            url={stlUrl} 
            valores={mostrarPreview ? { nome_pet: name, telefone: phone, fonte: font } : {}} 
          />
        )}
      </div>
    </div>
  );
}