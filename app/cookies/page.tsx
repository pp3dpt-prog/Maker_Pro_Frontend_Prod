import Link from 'next/link';

export default function CookiesPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '80px 20px' }}>

        <Link href="/" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
          ← Voltar ao início
        </Link>

        <h1 style={{ fontSize: '40px', fontWeight: '900', marginTop: '40px', marginBottom: '16px', letterSpacing: '-1px' }}>
          Política de Cookies
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '60px' }}>Última atualização: maio de 2026</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', color: '#94a3b8', lineHeight: '1.8' }}>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>O que são cookies?</h2>
            <p>
              Cookies são pequenos ficheiros de texto armazenados no teu dispositivo quando visitas um website.
              São utilizados para manter sessões, guardar preferências e melhorar a experiência de utilização.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>Cookies que utilizamos</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '8px' }}>

              <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ color: 'white', fontWeight: '700', marginBottom: '8px' }}>Cookies de Sessão (Essenciais)</h3>
                <p style={{ margin: 0 }}>
                  Utilizados para manter a tua sessão autenticada enquanto navegas na plataforma.
                  São geridos pelo Supabase e são estritamente necessários para o funcionamento do serviço.
                  Sem estes cookies, não é possível iniciar sessão ou aceder à tua conta.
                </p>
              </div>

              <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px', padding: '24px' }}>
                <h3 style={{ color: 'white', fontWeight: '700', marginBottom: '8px' }}>Cookies de Preferências</h3>
                <p style={{ margin: 0 }}>
                  Guardam as tuas preferências de navegação, como o modelo selecionado ou configurações do customizador,
                  para melhorar a tua experiência entre sessões.
                </p>
              </div>

            </div>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>O que NÃO utilizamos</h2>
            <p>
              Não utilizamos cookies de rastreio publicitário, nem partilhamos informação de cookies com redes de publicidade.
              Não existem cookies de terceiros para fins de marketing na MakerPro.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>Como gerir cookies</h2>
            <p>
              Podes controlar e/ou eliminar cookies através das definições do teu browser. No entanto,
              desativar os cookies essenciais irá impedir o correto funcionamento da autenticação na plataforma.
              Consulta as instruções do teu browser para mais informações sobre como gerir cookies:
            </p>
            <ul style={{ paddingLeft: '20px', marginTop: '12px' }}>
              <li>Chrome: Definições → Privacidade e segurança → Cookies</li>
              <li>Firefox: Opções → Privacidade e Segurança</li>
              <li>Safari: Preferências → Privacidade</li>
              <li>Edge: Definições → Privacidade, pesquisa e serviços</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>Mais informações</h2>
            <p>
              Para mais detalhes sobre como tratamos os teus dados, consulta a nossa{' '}
              <Link href="/privacy" style={{ color: '#3b82f6' }}>Política de Privacidade</Link>.
              Para questões, contacta-nos em{' '}
              <a href="mailto:pp3d.pt@gmail.com" style={{ color: '#3b82f6' }}>pp3d.pt@gmail.com</a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
