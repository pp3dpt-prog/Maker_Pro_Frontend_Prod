export default function Loading() {
  return (
    <div style={{ background: '#080c10', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:0.8} }
        @keyframes spin { to { transform: rotate(360deg); } }
        .sk { background:#1e293b; border-radius:8px; animation:pulse 1.5s ease-in-out infinite; }
      `}</style>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid #1e293b', borderTopColor: '#3b82f6', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <p style={{ color: '#475569', fontSize: 14 }}>A carregar configurador…</p>
      </div>
    </div>
  );
}
