import Link from 'next/link';

export default function PrivacyPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '80px 20px' }}>

        <Link href="/" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
          ← Voltar ao início
        </Link>

        <h1 style={{ fontSize: '40px', fontWeight: '900', marginTop: '40px', marginBottom: '16px', letterSpacing: '-1px' }}>
          Política de Privacidade
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '60px' }}>Última atualização: maio de 2026</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', color: '#94a3b8', lineHeight: '1.8' }}>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>1. Responsável pelo Tratamento</h2>
            <p>
              O responsável pelo tratamento dos teus dados pessoais é PP3D.PT, contactável através de{' '}
              <a href="mailto:pp3d.pt@gmail.com" style={{ color: '#3b82f6' }}>pp3d.pt@gmail.com</a>.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>2. Dados Recolhidos</h2>
            <p>Recolhemos os seguintes dados pessoais:</p>
            <ul style={{ paddingLeft: '20px', marginTop: '12px' }}>
              <li><strong style={{ color: 'white' }}>Dados de conta:</strong> endereço de email e palavra-passe (armazenada de forma encriptada).</li>
              <li><strong style={{ color: 'white' }}>Dados de utilização:</strong> modelos acedidos, parâmetros utilizados e ficheiros STL gerados.</li>
              <li><strong style={{ color: 'white' }}>Dados de subscrição:</strong> informação sobre o plano ativo e histórico de pagamentos.</li>
            </ul>
            <p style={{ marginTop: '12px' }}>Não recolhemos dados de cartão de crédito — os pagamentos são processados por plataformas externas certificadas.</p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>3. Finalidade do Tratamento</h2>
            <p>Os teus dados são utilizados para:</p>
            <ul style={{ paddingLeft: '20px', marginTop: '12px' }}>
              <li>Gestão da tua conta e autenticação.</li>
              <li>Fornecimento do serviço de geração de ficheiros STL.</li>
              <li>Gestão de subscrições e licenças.</li>
              <li>Comunicações relacionadas com o serviço (atualizações, alterações de conta).</li>
              <li>Melhoria da Plataforma com base em padrões de utilização anónimos.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>4. Armazenamento e Segurança</h2>
            <p>
              Os dados são armazenados de forma segura através da plataforma Supabase, com encriptação em trânsito (HTTPS)
              e em repouso. Os ficheiros STL gerados são armazenados em servidores seguros e acessíveis apenas
              ao utilizador que os gerou.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>5. Partilha de Dados</h2>
            <p>
              Não vendemos nem partilhamos os teus dados pessoais com terceiros para fins comerciais.
              Os dados podem ser partilhados com prestadores de serviços técnicos (como Supabase) exclusivamente
              para o funcionamento da Plataforma, e sempre sob acordos de confidencialidade.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>6. Os Teus Direitos (RGPD)</h2>
            <p>Ao abrigo do Regulamento Geral sobre a Proteção de Dados (RGPD), tens direito a:</p>
            <ul style={{ paddingLeft: '20px', marginTop: '12px' }}>
              <li>Aceder aos dados pessoais que temos sobre ti.</li>
              <li>Corrigir dados incorretos ou desatualizados.</li>
              <li>Solicitar a eliminação da tua conta e dados associados.</li>
              <li>Opor-te ao tratamento dos teus dados para determinadas finalidades.</li>
              <li>Portabilidade dos teus dados.</li>
            </ul>
            <p style={{ marginTop: '12px' }}>
              Para exerceres qualquer um destes direitos, contacta-nos em{' '}
              <a href="mailto:pp3d.pt@gmail.com" style={{ color: '#3b82f6' }}>pp3d.pt@gmail.com</a>.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>7. Retenção de Dados</h2>
            <p>
              Os teus dados são mantidos enquanto a tua conta estiver ativa. Após o cancelamento da conta,
              os dados pessoais são eliminados no prazo de 30 dias, exceto quando a sua retenção seja exigida por lei.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>8. Cookies</h2>
            <p>
              Utilizamos cookies para manter a sessão autenticada. Consulta a nossa{' '}
              <Link href="/cookies" style={{ color: '#3b82f6' }}>Política de Cookies</Link> para mais informações.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>9. Contacto</h2>
            <p>
              Para questões sobre privacidade, contacta-nos em{' '}
              <a href="mailto:pp3d.pt@gmail.com" style={{ color: '#3b82f6' }}>pp3d.pt@gmail.com</a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
