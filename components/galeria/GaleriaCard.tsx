'use client';

import { useState } from 'react';
import Image from 'next/image';

interface Foto { url: string; ordem: number; }

export default function GaleriaCard({ titulo, descricao, fotos }: {
  titulo: string;
  descricao: string | null;
  fotos: Foto[];
}) {
  const [i, setI] = useState(0);
  const foto = fotos[i] ?? fotos[0];

  function ir(dir: -1 | 1, e: React.MouseEvent) {
    e.preventDefault();
    setI(prev => (prev + dir + fotos.length) % fotos.length);
  }

  return (
    <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ position: 'relative', aspectRatio: '1', background: '#0a1120' }}>
        <Image src={foto.url} alt={titulo} fill sizes="(max-width: 640px) 100vw, 380px" style={{ objectFit: 'cover' }} />
        {fotos.length > 1 && (
          <>
            <button onClick={e => ir(-1, e)} aria-label="Foto anterior" style={{
              position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
              width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: 'rgba(8,12,16,0.65)', color: '#f1f5f9', fontSize: 16, lineHeight: 1,
            }}>‹</button>
            <button onClick={e => ir(1, e)} aria-label="Foto seguinte" style={{
              position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
              width: 32, height: 32, borderRadius: '50%', border: 'none', cursor: 'pointer',
              background: 'rgba(8,12,16,0.65)', color: '#f1f5f9', fontSize: 16, lineHeight: 1,
            }}>›</button>
            <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
              {fotos.map((_, idx) => (
                <span key={idx} style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: idx === i ? '#3b82f6' : 'rgba(255,255,255,0.35)',
                }} />
              ))}
            </div>
          </>
        )}
      </div>
      <div style={{ padding: 18 }}>
        <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: '0 0 6px' }}>{titulo}</h2>
        {descricao && <p style={{ fontSize: 13, color: '#8a96aa', lineHeight: 1.6, margin: 0 }}>{descricao}</p>}
      </div>
    </div>
  );
}
