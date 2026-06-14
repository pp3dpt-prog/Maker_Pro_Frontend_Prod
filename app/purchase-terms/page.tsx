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
        <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '60px' }}>Última atualização: junho de 2026</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '36px', color: '#94a3b8', lineHeight: '1.8' }}>

          <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0 }}>Parte A — Loja (produtos físicos)</h2>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>1. Encomendas e contrato</h2>
            <p>
              A compra de produtos na <Link href="/loja" style={{ color: '#3b82f6' }}>Loja</Link> exige uma conta com sessão iniciada.
              Ao finalizar a encomenda, celebras um contrato de compra e venda à distância connosco.
              Enviamos a confirmação da encomenda por email. Reservamo-nos o direito de recusar ou cancelar encomendas
              em caso de erro manifesto de preço, indisponibilidade de stock ou suspeita de fraude, com reembolso integral
              de qualquer valor já cobrado.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>2. Preços e pagamento</h2>
            <p>
              Os preços apresentados na Loja incluem IVA à taxa legal em vigor e não incluem portes, que são calculados no
              checkout. O pagamento é processado de forma segura pela <strong style={{ color: 'white' }}>Stripe</strong>;
              não armazenamos os dados do teu cartão. Aceitamos os métodos de pagamento indicados no momento da compra.
              Os utilizadores com perfil de <em>maker</em> não visualizam preços de retalho — para condições, contactam-nos
              pelo Discord ou abrem um pedido de suporte.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>3. Envio e portes</h2>
            <p>
              Os portes são definidos no checkout, podendo variar por produto e existir envio gratuito acima de um valor mínimo.
              Os prazos de entrega indicados em cada produto são estimativas em dias úteis: tipicamente
              <strong style={{ color: 'white' }}> 1 a 3 dias</strong> para artigos em stock e
              <strong style={{ color: 'white' }}> 3 a 5 dias</strong> para artigos feitos por produção, a contar da confirmação
              do pagamento. Atrasos de transportadoras estão fora do nosso controlo.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>4. Entrega em mãos</h2>
            <p>
              A entrega em mãos está disponível apenas para <strong style={{ color: 'white' }}>Oeiras, Carnaxide e Linda-a-Velha</strong>,
              é coordenada diretamente connosco e não tem portes. Encomendas com entrega em mãos seguem como
              <strong style={{ color: 'white' }}> pedido de orçamento</strong>: combinamos o local e a hora e o pagamento é
              efetuado posteriormente, após confirmação do valor final.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>5. Orçamentos</h2>
            <p>
              Alguns produtos (por exemplo, peças cujo tamanho varia significativamente) são vendidos
              <strong style={{ color: 'white' }}> sob orçamento</strong>. Nesses casos a encomenda é registada sem pagamento imediato;
              confirmamos o valor final e só depois disponibilizamos o pagamento. Não há qualquer obrigação de compra enquanto não
              aceitares o valor apresentado.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>6. Produtos personalizados</h2>
            <p>
              Os produtos personalizados são produzidos especificamente segundo as tuas indicações (medidas, texto, cor, etc.).
              Nos termos da lei (DL 24/2014, art. 17.º), os bens feitos por encomenda ou claramente personalizados
              <strong style={{ color: 'white' }}> não estão sujeitos ao direito de livre resolução</strong>, salvo defeito de fabrico.
              Pedimos que reveja cuidadosamente a personalização (incluindo a pré-visualização 3D) antes de confirmar.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>7. Direito de livre resolução e devoluções</h2>
            <p>
              Para produtos de stock não personalizados, tens o direito de livre resolução no prazo de
              <strong style={{ color: 'white' }}> 14 dias</strong> a contar da receção, sem necessidade de justificação.
              Para o exercer, contacta-nos em <a href="mailto:pp3d.pt@gmail.com" style={{ color: '#3b82f6' }}>pp3d.pt@gmail.com</a>
              {' '}com o assunto "Devolução". O artigo deve ser devolvido em bom estado; os custos de devolução são da tua
              responsabilidade, salvo se o produto apresentar defeito. Reembolsamos os valores recebidos no prazo de 14 dias
              após a receção do artigo devolvido.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>8. Conformidade e garantia</h2>
            <p>
              Os produtos beneficiam da garantia legal de conformidade aplicável a bens de consumo. Em caso de defeito,
              contacta-nos com a descrição e fotografias do problema; avaliaremos a reparação, substituição ou reembolso
              conforme a lei. Reclamações podem também ser apresentadas no{' '}
              <a href="https://www.livroreclamacoes.pt/inicio" target="_blank" rel="noopener noreferrer" style={{ color: '#3b82f6' }}>Livro de Reclamações</a>.
            </p>
          </section>

          <h2 style={{ fontSize: '15px', fontWeight: 800, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '12px 0 0' }}>Parte B — Subscrições e ficheiros digitais</h2>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>9. Planos e Preços</h2>
            <p>
              A PP3D oferece planos de subscrição com acesso às funcionalidades da Plataforma, incluindo geração
              de ficheiros STL e acesso ao catálogo de modelos paramétricos. Os preços atuais estão disponíveis na
              página de <Link href="/pricing" style={{ color: '#3b82f6' }}>Preços</Link>.
              Reservamo-nos o direito de alterar os preços com aviso prévio de 30 dias.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>10. Faturação (subscrições)</h2>
            <p>
              A subscrição é cobrada no início de cada período de faturação (mensal ou anual, conforme o plano escolhido).
              A renovação é automática, salvo cancelamento antes do final do período em curso.
              Receberás uma confirmação de pagamento por email após cada cobrança.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>11. Cancelamento (subscrições)</h2>
            <p>
              Podes cancelar a tua subscrição a qualquer momento através do teu Dashboard ou contactando-nos por email.
              Após o cancelamento, continuarás a ter acesso ao serviço até ao final do período já pago.
              O cancelamento não dá direito a reembolso proporcional dos dias restantes, exceto nos casos descritos abaixo.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>12. Reembolso (subscrições)</h2>
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
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>13. O que está incluído na subscrição</h2>
            <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
              <li>Acesso ao catálogo completo de modelos paramétricos.</li>
              <li>Geração ilimitada de ficheiros STL em modo preview.</li>
              <li>Geração de ficheiros STL finais de alta qualidade.</li>
              <li>Armazenamento dos ficheiros gerados na tua conta.</li>
              <li>Acesso a novos modelos adicionados durante o período de subscrição.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>14. Licença de Utilização</h2>
            <p>
              A subscrição concede-te uma licença pessoal e não exclusiva para utilizar os ficheiros gerados.
              Para fins comerciais, é necessária uma licença específica. Consulta a página{' '}
              <Link href="/creators" style={{ color: '#3b82f6' }}>For Creators</Link> e a página de{' '}
              <Link href="/licenses" style={{ color: '#3b82f6' }}>Licenças</Link> para mais detalhes.
            </p>
          </section>

          <section>
            <h2 style={{ fontSize: '20px', fontWeight: '800', marginBottom: '12px', color: 'white' }}>15. Contacto</h2>
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
