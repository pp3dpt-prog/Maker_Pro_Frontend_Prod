import Link from 'next/link';

export default function CheckoutErro() {
  return (
    <div style={{ minHeight: '100vh', background: '#080c10', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', color: 'white' }}>
      <div style={{ textAlign: 'center', maxWidth: 480, padding: 32 }}>
        <div style={{ fontSize: 64, marginBottom: 24 }}>❌</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Pagamento não concluído</h1>
        <p style={{ color: '#8a96aa', fontSize: 15, marginBottom: 32, lineHeight: 1.6 }}>
          O pagamento foi cancelado ou ocorreu um erro. Não foi debitado qualquer valor.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/pricing" style={{ display: 'inline-block', padding: '14px 28px', background: '#1d4ed8', color: '#fff', borderRadius: 12, textDecoration: 'none', fontWeight: 700 }}>
            Tentar novamente
          </Link>
          <Link href="/" style={{ display: 'inline-block', padding: '14px 28px', background: 'transparent', color: '#94a3b8', borderRadius: 12, textDecoration: 'none', fontWeight: 700, border: '1px solid #1e293b' }}>
            Voltar ao início
          </Link>
        </div>
      </div>
    </div>
  );
}
