import Link from 'next/link';

export default function LicensesPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0f172a', color: 'white', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '80px 20px' }}>

        <Link href="/" style={{ color: '#3b82f6', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
          ← Voltar ao início
        </Link>

        <h1 style={{ fontSize: '40px', fontWeight: '900', marginTop: '40px', marginBottom: '16px', letterSpacing: '-1px' }}>
          Licenças
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '60px' }}>Última atualização: junho de 2026</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

          <p style={{ color: '#94a3b8', lineHeight: '1.8' }}>
            Todos os modelos e ficheiros STL gerados através da PP3D estão protegidos por direitos de autor
            e sujeitos aos termos de licença descritos abaixo. Ao utilizares a Plataforma, aceitas estes termos.
          </p>

          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: '#3b82f6' }}>Licença Pessoal</h2>
            <p style={{ color: '#94a3b8', lineHeight: '1.8', marginBottom: '16px' }}>
              Incluída em todas as subscrições ativas. Permite-te:
            </p>
            <ul style={{ color: '#94a3b8', lineHeight: '2', paddingLeft: '20px', marginBottom: '20px' }}>
              <li>Imprimir os ficheiros STL gerados para uso pessoal.</li>
              <li>Oferecer peças impressas a familiares e amigos, sem fins comerciais.</li>
              <li>Guardar e reutilizar os ficheiros na tua conta enquanto a subscrição estiver ativa.</li>
            </ul>
            <p style={{ color: '#94a3b8', lineHeight: '1.8' }}>
              <strong style={{ color: 'white' }}>Não permite:</strong> venda, distribuição comercial ou partilha dos ficheiros STL com terceiros.
            </p>
          </div>

          <div style={{ backgroundColor: '#1e293b', border: '1px solid #3b82f6', borderRadius: '16px', padding: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: '#3b82f6' }}>Licença Comercial (Criadores)</h2>
            <p style={{ color: '#94a3b8', lineHeight: '1.8', marginBottom: '16px' }}>
              Disponível para utilizadores com licença comercial ativa. Permite-te:
            </p>
            <ul style={{ color: '#94a3b8', lineHeight: '2', paddingLeft: '20px', marginBottom: '20px' }}>
              <li>Vender produtos físicos impressos com base nos modelos gerados.</li>
              <li>Produzir peças em série para venda, desde que a licença esteja ativa.</li>
              <li>Utilizar os ficheiros em contexto de negócio próprio.</li>
            </ul>
            <p style={{ color: '#94a3b8', lineHeight: '1.8' }}>
              <strong style={{ color: 'white' }}>Importante:</strong> a licença comercial está vinculada a uma subscrição ativa.
              Se a subscrição expirar, a licença comercial caduca automaticamente — mesmo para ficheiros gerados
              durante o período ativo. Consulta a página <Link href="/creators" style={{ color: '#3b82f6' }}>For Creators</Link> para mais detalhes.
            </p>
          </div>

          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: '#34d399' }}>Produtos comprados na Loja</h2>
            <p style={{ color: '#94a3b8', lineHeight: '1.8', marginBottom: '16px' }}>
              Ao comprares um produto físico na <Link href="/loja" style={{ color: '#3b82f6' }}>Loja</Link> adquires o
              <strong style={{ color: 'white' }}> artigo</strong> para uso pessoal. A compra:
            </p>
            <ul style={{ color: '#94a3b8', lineHeight: '2', paddingLeft: '20px', marginBottom: '20px' }}>
              <li>Dá-te a posse da peça física que recebes.</li>
              <li>Inclui as personalizações que escolheste para essa encomenda.</li>
            </ul>
            <p style={{ color: '#94a3b8', lineHeight: '1.8' }}>
              <strong style={{ color: 'white' }}>Não concede</strong> qualquer licença sobre o design ou o ficheiro: não
              autoriza reproduzir, fabricar em série ou revender cópias do produto. Para revenda ou produção comercial,
              é necessária uma licença comercial ou um acordo de parceria connosco.
            </p>
          </div>

          <div style={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '20px', color: 'white' }}>O que nunca é permitido</h2>
            <ul style={{ color: '#94a3b8', lineHeight: '2', paddingLeft: '20px', margin: 0 }}>
              <li>Redistribuir os ficheiros STL originais (com ou sem modificações).</li>
              <li>Vender ou ceder os ficheiros digitais a terceiros.</li>
              <li>Criar plataformas concorrentes com base nos modelos da PP3D.</li>
              <li>Utilizar engenharia reversa nos modelos para criar derivados não autorizados.</li>
              <li>Remover marcas de água ou referências à PP3D dos ficheiros.</li>
            </ul>
          </div>

          <section style={{ color: '#94a3b8', lineHeight: '1.8' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>Dúvidas sobre licenciamento?</h2>
            <p>
              Se tiveres dúvidas sobre o que podes ou não fazer com os ficheiros gerados, contacta-nos antes de agir.
              Estamos disponíveis em{' '}
              <a href="mailto:pp3d.pt@gmail.com" style={{ color: '#3b82f6' }}>pp3d.pt@gmail.com</a>{' '}
              ou no nosso{' '}
              <a href="https://discord.gg/cNK85ZQgGe" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>Discord</a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
