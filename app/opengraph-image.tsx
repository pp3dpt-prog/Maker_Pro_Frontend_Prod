import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'PP3D.pt — Produtos únicos, impressos em 3D';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #0b1220 0%, #07090d 60%)',
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', fontSize: 30, fontWeight: 800, color: '#93c5fd', letterSpacing: '2px' }}>🇵🇹 IMPRESSÃO 3D PORTUGUESA</div>
        </div>
        <div style={{ display: 'flex', fontSize: 92, fontWeight: 900, letterSpacing: '-3px', lineHeight: 1.05 }}>
          PP3D<span style={{ color: '#3b82f6' }}>.pt</span>
        </div>
        <div style={{ display: 'flex', fontSize: 44, fontWeight: 700, marginTop: '18px', color: '#e2e8f0' }}>
          Produtos únicos, impressos em 3D.
        </div>
        <div style={{ display: 'flex', fontSize: 28, marginTop: '24px', color: '#94a3b8' }}>
          Compra peças prontas ou personaliza ao detalhe.
        </div>
      </div>
    ),
    { ...size },
  );
}
