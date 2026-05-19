import Link from 'next/link';

export default function DmcaPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '80px 20px' }}>

        <Link href="/" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
          ← Voltar ao início
        </Link>

        <h1 style={{ fontSize: '40px', fontWeight: '900', marginTop: '40px', marginBottom: '16px', letterSpacing: '-1px' }}>
          Política DMCA
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '60px' }}>Última atualização: maio de 2026</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', color: '#94a3b8', lineHeight: '1.8' }}>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>Respeito pelos Direitos de Autor</h2>
            <p>
              A PP3D respeita os direitos de propriedade intelectual e espera que os seus utilizadores façam o mesmo.
              Todos os modelos disponíveis na Plataforma são criados ou licenciados pela PP3D.PT.
              Se acreditas que algum conteúdo da nossa plataforma infringe os teus direitos de autor, podes submeter
              uma notificação nos termos descritos abaixo.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>Como submeter uma reclamação</h2>
            <p>Para reportar uma alegada violação de direitos de autor, envia um email para{' '}
              <a href="mailto:pp3d.pt@gmail.com" style={{ color: '#3b82f6' }}>pp3d.pt@gmail.com</a> com o assunto
              <strong style={{ color: 'white' }}> "DMCA - Reclamação de Direitos de Autor"</strong>, incluindo:</p>
            <ul style={{ paddingLeft: '20px', marginTop: '12px' }}>
              <li>A tua identificação completa e informação de contacto.</li>
              <li>Descrição da obra protegida por direitos de autor que alegas ter sido infringida.</li>
              <li>URL ou localização exata do conteúdo em causa na nossa Plataforma.</li>
              <li>Declaração de que acreditas, de boa fé, que a utilização do material não foi autorizada.</li>
              <li>Declaração de que as informações prestadas são verdadeiras e que és o titular dos direitos ou estás autorizado a agir em nome do titular.</li>
              <li>A tua assinatura eletrónica ou física.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>Processo após reclamação</h2>
            <p>
              Após recebermos uma reclamação válida, iremos analisá-la e, se considerarmos que existe uma violação,
              removeremos ou desativaremos o acesso ao conteúdo em causa. O utilizador responsável pelo conteúdo
              será notificado. Se o conteúdo tiver sido removido por engano, podes submeter uma contra-notificação.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>Política de reincidência</h2>
            <p>
              Utilizadores que reincidentemente violem direitos de autor terão as suas contas suspensas ou
              permanentemente encerradas, a critério da PP3D.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>Contacto</h2>
            <p>
              Para qualquer questão relacionada com direitos de autor, contacta-nos em{' '}
              <a href="mailto:pp3d.pt@gmail.com" style={{ color: '#3b82f6' }}>pp3d.pt@gmail.com</a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
