'use client';

import { useState, useEffect } from 'react';

export default function EditorControls({ produto, onUpdate }: { produto: any, onUpdate: (vals: any) => void }) {
  const [valores, setValores] = useState<any>({});
  const campos = produto?.ui_schema || [];

  useEffect(() => {
    const iniciais: any = {};
    campos.forEach((c: any) => {
      // Se for texto, deixamos vazio para a forma aparecer "limpa"
      iniciais[c.name] = c.type === 'range' ? c.min : ''; 
      
      if (c.type === 'font-select') iniciais[c.name] = 'inter';
    });
    setValores(iniciais);
    onUpdate(iniciais);
  }, [produto]);

  const handleChange = (name: string, value: any) => {
    const novosValores = { ...valores, [name]: value };
    setValores(novosValores);
    onUpdate(novosValores);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {campos.map((campo: any) => (
        <div key={campo.name}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', marginBottom: '8px', textTransform: 'uppercase' }}>
            {campo.label}
          </label>

          {campo.type === 'range' ? (
            <input 
              type="range" min={campo.min} max={campo.max} 
              value={valores[campo.name] || campo.min}
              onChange={(e) => handleChange(campo.name, Number(e.target.value))}
              style={{ width: '100%', accentColor: '#3b82f6' }}
            />
          ) : campo.type === 'font-select' ? (
            <select 
              value={valores[campo.name] || 'inter'} 
              onChange={(e) => handleChange(campo.name, e.target.value)}
              style={{ width: '100%', padding: '12px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}
            >
              <option value="inter">Inter</option>
              <option value="montserrat">Montserrat</option>
              <option value="roboto-mono">Roboto Mono</option>
            </select>
          ) : (
            <input 
              type="text" 
              placeholder={`Escreva o ${campo.label.toLowerCase()}...`}
              value={valores[campo.name] || ''}
              onChange={(e) => handleChange(campo.name, e.target.value.toUpperCase())}
              style={{ width: '100%', padding: '12px', backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: 'white' }}
            />
          )}
        </div>
      ))}
      {/* Botão de Preço */}
      <div style={{ marginTop: '10px', padding: '15px', backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '10px', textAlign: 'center' }}>
        <span style={{ fontSize: '20px', fontWeight: 'bold' }}>{produto?.preco}€</span>
      </div>
    </div>
  );
}