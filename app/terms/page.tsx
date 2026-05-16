import Link from 'next/link';

export default function TermsPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '80px 20px' }}>

        <Link href="/" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
          ← Voltar ao início
        </Link>

        <h1 style={{ fontSize: '40px', fontWeight: '900', marginTop: '40px', marginBottom: '16px', letterSpacing: '-1px' }}>
          Termos e Condições
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '60px' }}>Última atualização: maio de 2026</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', color: '#94a3b8', lineHeight: '1.8' }}>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>1. Aceitação dos Termos</h2>
            <p>
              Ao acederes e utilizares a plataforma MakerPro (doravante "Plataforma"), operada por PP3D.PT,
              aceitas integralmente os presentes Termos e Condições. Se não concordares com algum dos termos aqui descritos,
              deves cessar imediatamente a utilização da Plataforma.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>2. Descrição do Serviço</h2>
            <p>
              A MakerPro é uma plataforma de personalização paramétrica de modelos 3D. Permite aos utilizadores configurar
              modelos através de parâmetros ajustáveis (texto, dimensões, etc.) e gerar ficheiros STL para impressão 3D.
              Os ficheiros gerados são armazenados de forma segura e acessíveis através da conta do utilizador.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>3. Registo e Conta</h2>
            <p>
              Para acederes às funcionalidades da Plataforma, é necessário criares uma conta com um endereço de email válido.
              És responsável por manter a confidencialidade das tuas credenciais de acesso e por todas as atividades
              realizadas sob a tua conta. Deves notificar-nos imediatamente em caso de uso não autorizado da tua conta.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>4. Licenças e Utilização dos Ficheiros</h2>
            <p>
              Os ficheiros STL gerados através da Plataforma estão sujeitos aos termos da licença associada à tua subscrição.
              A comercialização de produtos baseados nos ficheiros gerados requer uma licença ativa. Consulta a página
              de <Link href="/licenses" style={{ color: '#3b82f6' }}>Licenças</Link> e de{' '}
              <Link href="/creators" style={{ color: '#3b82f6' }}>For Creators</Link> para mais detalhes.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>5. Pagamentos e Subscrições</h2>
            <p>
              Determinadas funcionalidades da Plataforma requerem uma subscrição paga. Os preços estão indicados na página
              de <Link href="/pricing" style={{ color: '#3b82f6' }}>Preços</Link>. Os pagamentos são processados de forma segura
              e não armazenamos dados de cartão de crédito. As condições de reembolso estão descritas nos{' '}
              <Link href="/purchase-terms" style={{ color: '#3b82f6' }}>Termos de Compra</Link>.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>6. Usos Proibidos</h2>
            <p>É expressamente proibido:</p>
            <ul style={{ paddingLeft: '20px', marginTop: '12px' }}>
              <li>Utilizar a Plataforma para fins ilegais ou que violem direitos de terceiros.</li>
              <li>Tentar aceder a áreas restritas ou contornar mecanismos de segurança.</li>
              <li>Partilhar ou revender o acesso à tua conta.</li>
              <li>Utilizar processos automatizados para sobrecarregar os servidores da Plataforma.</li>
              <li>Copiar, reproduzir ou distribuir os modelos base sem autorização.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>7. Limitação de Responsabilidade</h2>
            <p>
              A MakerPro não se responsabiliza por danos diretos ou indiretos resultantes da utilização ou incapacidade
              de utilização da Plataforma, incluindo falhas técnicas, interrupções de serviço ou resultados de impressão 3D
              que não correspondam às expectativas do utilizador. Os ficheiros STL são gerados com base nos parâmetros
              introduzidos pelo utilizador, sendo da sua responsabilidade verificar a adequação antes de imprimir.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>8. Alterações aos Termos</h2>
            <p>
              Reservamo-nos o direito de alterar os presentes Termos a qualquer momento. As alterações serão comunicadas
              através da Plataforma ou por email. A continuação da utilização após a publicação das alterações implica
              a aceitação dos novos Termos.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>9. Lei Aplicável</h2>
            <p>
              Os presentes Termos são regidos pela lei portuguesa. Qualquer litígio será submetido à jurisdição dos
              tribunais competentes de Portugal.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>10. Contacto</h2>
            <p>
              Para qualquer questão relacionada com estes Termos, contacta-nos através de{' '}
              <a href="mailto:pp3d.pt@gmail.com" style={{ color: '#3b82f6' }}>pp3d.pt@gmail.com</a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
