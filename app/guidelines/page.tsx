import Link from 'next/link';

export default function GuidelinesPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '80px 20px' }}>

        <Link href="/" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
          ← Voltar ao início
        </Link>

        <h1 style={{ fontSize: '40px', fontWeight: '900', marginTop: '40px', marginBottom: '16px', letterSpacing: '-1px' }}>
          Guidelines
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '60px' }}>Como tirar o máximo partido da PP3D e da nossa comunidade</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>

          <section>
            <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '16px', color: '#3b82f6' }}>Como usar a plataforma</h2>
            <ul style={{ color: '#94a3b8', lineHeight: '2', paddingLeft: '20px', margin: 0 }}>
              <li>Regista-te e inicia sessão para aceder ao catálogo completo de modelos.</li>
              <li>No <strong style={{ color: 'white' }}>Customizador</strong>, ajusta os parâmetros do modelo em tempo real — texto, dimensões e outros detalhes.</li>
              <li>Utiliza o modo <strong style={{ color: 'white' }}>Preview</strong> para verificar o resultado antes de gerar o ficheiro final.</li>
              <li>Quando estiveres satisfeito, gera o ficheiro STL final e faz o download diretamente.</li>
              <li>Os ficheiros gerados ficam guardados no teu Dashboard para acesso futuro.</li>
            </ul>
          </section>

          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px' }}>Regras da plataforma</h2>
            <ul style={{ color: '#94a3b8', lineHeight: '2', paddingLeft: '20px', margin: 0 }}>
              <li>Não partilhes as tuas credenciais de acesso com terceiros.</li>
              <li>Não utilizes os ficheiros gerados para fins que violem os termos de licença.</li>
              <li>Não tentes contornar os sistemas de autenticação ou geração de ficheiros.</li>
              <li>Reporta qualquer erro ou comportamento inesperado no Discord ou por email.</li>
            </ul>
          </div>

          <section>
            <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '16px', color: '#3b82f6' }}>Como usar o Discord</h2>
            <p style={{ color: '#94a3b8', lineHeight: '1.8', marginBottom: '20px' }}>
              O nosso servidor de Discord é o sítio certo para tirares dúvidas, partilhares os teus projetos e
              ligares-te à comunidade PP3D. Para tirares o máximo partido:
            </p>
            <ul style={{ color: '#94a3b8', lineHeight: '2', paddingLeft: '20px', margin: 0 }}>
              <li>Usa o canal <strong style={{ color: 'white' }}>#pedir-ajuda</strong> para dúvidas sobre a plataforma ou sobre os modelos.</li>
              <li>Descreve o teu problema com o máximo de detalhe — modelo utilizado, parâmetros, erro que aparece.</li>
              <li>Partilha os teus resultados no canal <strong style={{ color: 'white' }}>#showcase</strong> — mostra as tuas peças impressas!</li>
              <li>Usa o canal <strong style={{ color: 'white' }}>#sugestões</strong> para propor novos modelos ou melhorias à plataforma.</li>
              <li>Trata todos os membros com respeito — mensagens ofensivas ou spam resultarão em remoção.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '22px', fontWeight: '800', marginBottom: '16px', color: '#3b82f6' }}>Partilhar produtos e sucessos</h2>
            <p style={{ color: '#94a3b8', lineHeight: '1.8' }}>
              Adoramos ver o que a comunidade cria! Se fizeste uma peça que ficou incrível, partilha uma foto no Discord.
              As melhores criações podem ser destacadas na página principal da PP3D.
              Ao partilhares, estás a inspirar outros utilizadores e a ajudar a crescer a comunidade.
            </p>
          </section>

          <div style={{ backgroundColor: '#1e293b', border: '1px solid #5865F2', borderRadius: '16px', padding: '32px', textAlign: 'center' }}>
            <p style={{ color: '#94a3b8', marginBottom: '20px' }}>Pronto para entrar na comunidade?</p>
            <a href="https://discord.gg/cNK85ZQgGe" target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              backgroundColor: '#5865F2',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '12px',
              fontWeight: '700',
              fontSize: '15px',
              textDecoration: 'none'
            }}>
              Entrar no Discord
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}
