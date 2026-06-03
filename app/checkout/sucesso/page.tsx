import Link from 'next/link';

export default function CheckoutSucesso() {
  return (
    <div style={{ minHeight: '100vh', background: '#080c10', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', color: 'white' }}>
      <div style={{ textAlign: 'center', maxWidth: 480, padding: 32 }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>🎉</div>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Subscrição activada!</h1>
        <p style={{ color: '#64748b', fontSize: 16, marginBottom: 16, lineHeight: 1.6 }}>
          O teu plano foi activado com sucesso. Os downloads estão disponíveis no teu dashboard.
        </p>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '14px 20px', marginBottom: 32, fontSize: 14, color: '#94a3b8' }}>
          🧾 A fatura será enviada para o teu email de registo <strong style={{ color: '#f1f5f9' }}>em até 24 horas</strong>.
        </div>
        <Link href="/dashboard" style={{ display: 'inline-block', padding: '14px 32px', background: '#1d4ed8', color: '#fff', borderRadius: 12, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>
          Ir para o Dashboard →
        </Link>
      </div>
    </div>
  );
}
