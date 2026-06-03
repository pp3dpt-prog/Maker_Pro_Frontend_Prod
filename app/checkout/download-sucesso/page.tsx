import Link from 'next/link';

export default function DownloadSucesso() {
  return (
    <div style={{ minHeight: '100vh', background: '#080c10', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', color: 'white' }}>
      <div style={{ textAlign: 'center', maxWidth: 480, padding: 32 }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>✅</div>
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 12 }}>Pagamento confirmado!</h1>
        <p style={{ color: '#64748b', fontSize: 16, marginBottom: 16, lineHeight: 1.6 }}>
          O teu download foi creditado. Podes agora descarregar o ficheiro STL.
        </p>
        <div style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 12, padding: '14px 20px', marginBottom: 16, fontSize: 14, color: '#94a3b8' }}>
          🧾 A fatura será enviada para o teu email de registo <strong style={{ color: '#f1f5f9' }}>em até 24 horas</strong>.
        </div>
        <p style={{ color: '#475569', fontSize: 14, marginBottom: 32 }}>
          💡 Com uma subscrição, cada download sai a partir de 39 cêntimos.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/produtos" style={{ display: 'inline-block', padding: '14px 28px', background: '#1d4ed8', color: '#fff', borderRadius: 12, textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>
            Voltar aos produtos
          </Link>
          <Link href="/pricing" style={{ display: 'inline-block', padding: '14px 28px', background: 'transparent', color: '#94a3b8', borderRadius: 12, textDecoration: 'none', fontWeight: 700, fontSize: 15, border: '1px solid #1e293b' }}>
            Ver planos
          </Link>
        </div>
      </div>
    </div>
  );
}
