export default function Loading() {
  return (
    <div style={{ background: '#080c10', minHeight: '100vh', padding: '64px 24px' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
        .sk { background:#1e293b; border-radius:8px; animation:pulse 1.5s ease-in-out infinite; }
      `}</style>

      {/* Header skeleton */}
      <div style={{ maxWidth: 1200, margin: '0 auto 48px' }}>
        <div className="sk" style={{ width: 120, height: 14, marginBottom: 16 }} />
        <div className="sk" style={{ width: 320, height: 36, marginBottom: 12 }} />
        <div className="sk" style={{ width: 200, height: 14 }} />
      </div>

      {/* Grid skeleton */}
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 20 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ borderRadius: 20, overflow: 'hidden', border: '1px solid #1e293b', background: '#0f172a' }}>
            <div className="sk" style={{ width: '100%', height: 200, borderRadius: 0 }} />
            <div style={{ padding: 20 }}>
              <div className="sk" style={{ width: '70%', height: 18, marginBottom: 10 }} />
              <div className="sk" style={{ width: '50%', height: 13, marginBottom: 16 }} />
              <div className="sk" style={{ width: '100%', height: 36, borderRadius: 10 }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
