import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'PP3D.pt — Brincos, Figuras e Personalização 3D em Portugal';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function OpengraphImage() {
  const logoSrc = new URL('/Logo.png', 'https://pp3d.pt').toString();
  const logoData = await fetch(logoSrc).then((r) => r.arrayBuffer()).catch(() => null);
  const logoUrl = logoData
    ? `data:image/png;base64,${Buffer.from(logoData).toString('base64')}`
    : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          padding: '60px 80px',
          background: 'linear-gradient(135deg, #0b1220 0%, #07090d 100%)',
          color: 'white',
          fontFamily: 'sans-serif',
          gap: '60px',
        }}
      >
        {/* Logo */}
        {logoUrl && (
          <img
            src={logoUrl}
            style={{ width: 220, height: 220, objectFit: 'contain', flexShrink: 0 }}
          />
        )}

        {/* Texto */}
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
          <div style={{ display: 'flex', fontSize: 80, fontWeight: 900, letterSpacing: '-2px', lineHeight: 1 }}>
            PP3D<span style={{ color: '#3b82f6' }}>.pt</span>
          </div>
          <div style={{ display: 'flex', fontSize: 36, fontWeight: 700, marginTop: '20px', color: '#e2e8f0', lineHeight: 1.3 }}>
            Brincos, Figuras e Personalização 3D
          </div>
          <div style={{ display: 'flex', fontSize: 26, marginTop: '16px', color: '#94a3b8' }}>
            Feito em Portugal · Entrega em todo o país
          </div>
          <div style={{ display: 'flex', marginTop: '28px', gap: '12px' }}>
            {['Brincos', 'Porta-chaves', 'Placas animais', 'Figuras geek'].map((tag) => (
              <div
                key={tag}
                style={{
                  display: 'flex',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  background: 'rgba(59,130,246,0.15)',
                  border: '1px solid rgba(59,130,246,0.3)',
                  fontSize: 20,
                  color: '#93c5fd',
                }}
              >
                {tag}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
