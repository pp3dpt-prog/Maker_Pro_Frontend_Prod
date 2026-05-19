import Link from 'next/link';

export default function PurchaseTermsPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '80px 20px' }}>

        <Link href="/" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
          ← Voltar ao início
        </Link>

        <h1 style={{ fontSize: '40px', fontWeight: '900', marginTop: '40px', marginBottom: '16px', letterSpacing: '-1px' }}>
          Termos de Compra e Subscrição
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '60px' }}>Última atualização: maio de 2026</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', color: '#94a3b8', lineHeight: '1.8' }}>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>1. Planos e Preços</h2>
            <p>
              A PP3D oferece planos de subscrição com acesso às funcionalidades da Plataforma, incluindo geração
              de ficheiros STL e acesso ao catálogo de modelos paramétricos. Os preços atuais estão disponíveis na
              página de <Link href="/pricing" style={{ color: '#3b82f6' }}>Preços</Link>.
              Reservamo-nos o direito de alterar os preços com aviso prévio de 30 dias.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>2. Faturação</h2>
            <p>
              A subscrição é cobrada no início de cada período de faturação (mensal ou anual, conforme o plano escolhido).
              A renovação é automática, salvo cancelamento antes do final do período em curso.
              Receberás uma confirmação de pagamento por email após cada cobrança.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>3. Cancelamento</h2>
            <p>
              Podes cancelar a tua subscrição a qualquer momento através do teu Dashboard ou contactando-nos por email.
              Após o cancelamento, continuarás a ter acesso ao serviço até ao final do período já pago.
              O cancelamento não dá direito a reembolso proporcional dos dias restantes, exceto nos casos descritos abaixo.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>4. Política de Reembolso</h2>
            <p>Tens direito a reembolso total nos seguintes casos:</p>
            <ul style={{ paddingLeft: '20px', marginTop: '12px' }}>
              <li>Solicitação de reembolso nos primeiros <strong style={{ color: 'white' }}>7 dias</strong> após a primeira subscrição, caso não tenhas utilizado o serviço de forma significativa.</li>
              <li>Falha técnica grave da nossa parte que tenha impedido o acesso ao serviço por mais de 48 horas consecutivas.</li>
            </ul>
            <p style={{ marginTop: '12px' }}>
              Para solicitar um reembolso, contacta-nos em{' '}
              <a href="mailto:pp3d.pt@gmail.com" style={{ color: '#3b82f6' }}>pp3d.pt@gmail.com</a> com o assunto
              "Pedido de Reembolso".
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>5. O que está incluído na subscrição</h2>
            <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
              <li>Acesso ao catálogo completo de modelos paramétricos.</li>
              <li>Geração ilimitada de ficheiros STL em modo preview.</li>
              <li>Geração de ficheiros STL finais de alta qualidade.</li>
              <li>Armazenamento dos ficheiros gerados na tua conta.</li>
              <li>Acesso a novos modelos adicionados durante o período de subscrição.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>6. Licença de Utilização</h2>
            <p>
              A subscrição concede-te uma licença pessoal e não exclusiva para utilizar os ficheiros gerados.
              Para fins comerciais, é necessária uma licença específica. Consulta a página{' '}
              <Link href="/creators" style={{ color: '#3b82f6' }}>For Creators</Link> e a página de{' '}
              <Link href="/licenses" style={{ color: '#3b82f6' }}>Licenças</Link> para mais detalhes.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>7. Contacto</h2>
            <p>
              Para questões sobre compras ou subscrições, contacta-nos em{' '}
              <a href="mailto:pp3d.pt@gmail.com" style={{ color: '#3b82f6' }}>pp3d.pt@gmail.com</a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
