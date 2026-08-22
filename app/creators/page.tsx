import Link from 'next/link';

export default function CreatorsPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '80px 20px' }}>

        <Link href="/" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
          ← Voltar ao início
        </Link>

        <h1 style={{ fontSize: '40px', fontWeight: '900', marginTop: '40px', marginBottom: '16px', letterSpacing: '-1px' }}>
          For Creators
        </h1>
        <p style={{ color: '#8a96aa', fontSize: '14px', marginBottom: '60px' }}>Última atualização: maio de 2026</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

          <section>
            <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '16px', color: '#3b82f6' }}>Vender na PP3D</h2>
            <p style={{ color: '#94a3b8', lineHeight: '1.8' }}>
              A PP3D é uma plataforma de personalização 3D que permite aos utilizadores aceder a modelos paramétricos e
              gerar ficheiros STL únicos. Se pretendes comercializar produtos criados com base nos nossos modelos,
              é obrigatório que tenhas uma <strong style={{ color: 'white' }}>licença ativa</strong> na tua conta.
            </p>
          </section>

          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px' }}>Regras para criadores</h2>
            <ul style={{ color: '#94a3b8', lineHeight: '2', paddingLeft: '20px', margin: 0 }}>
              <li>Só podes vender produtos gerados pela plataforma se tiveres uma <strong style={{ color: 'white' }}>licença válida e ativa</strong>.</li>
              <li>Podes consultar o estado da tua licença a qualquer momento no teu <strong style={{ color: 'white' }}>Dashboard</strong>.</li>
              <li>Se a tua licença expirar, <strong style={{ color: 'white' }}>não podes continuar a vender</strong>, mesmo que os ficheiros tenham sido gerados durante o período de licença ativa.</li>
              <li>A licença é pessoal e intransmissível — não pode ser partilhada ou cedida a terceiros.</li>
              <li>A PP3D reserva-se o direito de revogar a licença em caso de violação dos termos.</li>
            </ul>
          </div>

          <section>
            <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '16px', color: '#3b82f6' }}>Como verificar a tua licença</h2>
            <p style={{ color: '#94a3b8', lineHeight: '1.8' }}>
              Acede ao teu <strong style={{ color: 'white' }}>Dashboard</strong> após iniciar sessão. Lá encontrarás o estado atual da tua licença,
              a data de validade e as opções de renovação. Certifica-te sempre de que a tua licença está ativa antes de
              comercializares qualquer produto.
            </p>
            <div style={{ marginTop: '24px' }}>
              <Link href="/dashboard" style={{
                display: 'inline-block',
                backgroundColor: '#2563eb',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '14px',
                textDecoration: 'none'
              }}>
                Ver o meu Dashboard →
              </Link>
            </div>
          </section>

          <section>
            <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '16px', color: '#3b82f6' }}>Dúvidas?</h2>
            <p style={{ color: '#94a3b8', lineHeight: '1.8' }}>
              Se tiveres questões sobre licenciamento ou sobre como funciona o programa para criadores,
              entra no nosso servidor de Discord ou contacta-nos diretamente.
            </p>
            <div style={{ marginTop: '16px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <a href="https://discord.gg/cNK85ZQgGe" target="_blank" rel="noopener noreferrer" style={{
                display: 'inline-block',
                backgroundColor: '#5865F2',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '14px',
                textDecoration: 'none'
              }}>
                Entrar no Discord
              </a>
              <a href="mailto:pp3d.pt@gmail.com" style={{
                display: 'inline-block',
                backgroundColor: '#1e293b',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '10px',
                fontWeight: '700',
                fontSize: '14px',
                textDecoration: 'none',
                border: '1px solid #334155'
              }}>
                pp3d.pt@gmail.com
              </a>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
