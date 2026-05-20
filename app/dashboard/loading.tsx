export default function Loading() {
  return (
    <div style={{ background: '#080c10', minHeight: '100vh', padding: '48px 24px' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
        .sk { background:#1e293b; border-radius:8px; animation:pulse 1.5s ease-in-out infinite; }
      `}</style>
      <div style={{ maxWidth: 800, margin: '0 auto' }}>
        <div className="sk" style={{ width: 200, height: 28, marginBottom: 32 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
          {[1,2,3].map(i => (
            <div key={i} style={{ background: '#0f172a', borderRadius: 16, border: '1px solid #1e293b', padding: 24 }}>
              <div className="sk" style={{ width: '60%', height: 14, marginBottom: 12 }} />
              <div className="sk" style={{ width: '40%', height: 32 }} />
            </div>
          ))}
        </div>
        <div style={{ background: '#0f172a', borderRadius: 20, border: '1px solid #1e293b', padding: 32 }}>
          <div className="sk" style={{ width: 160, height: 20, marginBottom: 20 }} />
          {[1,2,3].map(i => (
            <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div className="sk" style={{ width: 48, height: 48, borderRadius: 10, flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div className="sk" style={{ width: '60%', height: 14, marginBottom: 8 }} />
                <div className="sk" style={{ width: '40%', height: 12 }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
