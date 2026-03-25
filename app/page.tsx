import Link from 'next/link';

export default function HomePage() {
  const footerLinks = [
    { name: "For Creators", href: "/creators" },
    { name: "Terms", href: "/terms" },
    { name: "Privacy", href: "/privacy" },
    { name: "Cookies", href: "/cookies" },
    { name: "DMCA", href: "/dmca" },
    { name: "Guidelines", href: "/guidelines" },
    { name: "Purchase & Subscriber", href: "/purchase-terms" },
    { name: "Licenses", href: "/licenses" }
  ];

  return (
    <div style={{ 
      minHeight: '100vh', 
      backgroundColor: '#0f172a', 
      color: 'white', 
      fontFamily: 'Inter, system-ui, sans-serif' 
    }}>
      {/* 1. HERO SECTION */}
      <section style={{ 
        padding: '100px 20px', 
        textAlign: 'center', 
        background: 'linear-gradient(180deg, #0f172a 0%, #1e293b 100%)' 
      }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h1 style={{ fontSize: '48px', fontWeight: '950', letterSpacing: '-2px', marginBottom: '20px' }}>
            PERSONALIZAÇÃO 3D <span style={{ color: '#3b82f6' }}>AO TEU ALCANCE</span>
          </h1>
          <p style={{ fontSize: '18px', color: '#94a3b8', lineHeight: '1.6', marginBottom: '40px' }}>
            Cria produtos únicos com o nosso configurador paramétrico. 
            Escolhe o modelo, ajusta as medidas e recebe uma peça exclusiva feita para ti.
          </p>
          <Link href="/produtos" style={{ 
            textDecoration: 'none',
            backgroundColor: '#2563eb',
            color: 'white',
            padding: '16px 32px',
            borderRadius: '12px',
            fontWeight: 'bold',
            fontSize: '16px',
            boxShadow: '0 10px 15px -3px rgba(37, 99, 235, 0.4)'
          }}>
            EXPLORAR CATÁLOGO →
          </Link>
        </div>
      </section>

      {/* 2. ESPAÇO PARA IMAGEM DE DESTAQUE (Gerada por IA) */}
      <section style={{ padding: '0 20px', marginTop: '-50px' }}>
        <div style={{ 
          maxWidth: '1000px', 
          margin: '0 auto', 
          height: '400px', 
          backgroundColor: '#1e293b', 
          borderRadius: '24px',
          border: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)'
        }}>
          {/* Aqui entrará a Imagem 1 */}
          <div style={{ textAlign: 'center', color: '#475569' }}>
             <p>🖼️ [<img src="/imagem1.png" style={{width: '100%'}} />]</p>
          </div>
        </div>
      </section>

      {/* 3. COMO FUNCIONA (O QUE FAZEMOS) */}
      <section style={{ padding: '100px 20px', maxWidth: '1100px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', fontSize: '32px', fontWeight: '800', marginBottom: '60px' }}>PORQUÊ A MAKERPRO?</h2>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '40px' }}>
          
          {/* Feature 1 */}
          <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '20px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '30px', marginBottom: '15px' }}>📐</div>
            <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>Design Paramétrico</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6' }}>
              Não são apenas modelos fixos. Tu controlas as dimensões, os textos e os detalhes em tempo real.
            </p>
          </div>

          {/* Feature 2 */}
          <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '20px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '30px', marginBottom: '15px' }}>🚀</div>
            <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>Impressão Premium</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6' }}>
              Utilizamos os melhores materiais e tecnologias de impressão 3D para garantir durabilidade e acabamento.
            </p>
          </div>

          {/* Feature 3 */}
          <div style={{ backgroundColor: '#1e293b', padding: '30px', borderRadius: '20px', border: '1px solid #334155' }}>
            <div style={{ fontSize: '30px', marginBottom: '15px' }}>📩</div>
            <h3 style={{ fontSize: '20px', marginBottom: '10px' }}>Contacte-nos</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.6' }}>
              Dúvidas ou encomendas personalizadas? Estamos à distância de um clique para ajudar no teu projeto.
            </p>
          </div>

        </div>
      </section>
      
      {/* 4. FOOTER DETALHADO */}
      <footer style={{ 
        padding: '80px 20px 40px', 
        borderTop: '1px solid #1e293b', 
        backgroundColor: '#0b1120' 
      }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '40px',
            marginBottom: '60px',
            textAlign: 'left'
          }}>
            {/* Coluna Logo/Brand */}
            <div>
              <h3 style={{ fontSize: '20px', fontWeight: '900', marginBottom: '20px', color: '#3b82f6' }}>
                MAKERPRO
              </h3>
              <p style={{ color: '#64748b', fontSize: '14px', lineHeight: '1.6' }}>
                Tecnologia de customização paramétrica e impressão 3D de alta precisão.
              </p>
            </div>

            {/* Coluna Legal/Links */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Recursos e Legal
              </h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                {footerLinks.map((link) => (
                  <li key={link.name} style={{ marginBottom: '12px' }}>
                    <Link href={link.href} style={{ 
                      color: '#94a3b8', 
                      textDecoration: 'none', 
                      fontSize: '14px',
                      transition: 'color 0.2s'
                    }}>
                      {link.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Coluna Suporte */}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '800', marginBottom: '20px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Suporte
              </h4>
              <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '10px' }}>
                Tens dúvidas?
              </p>
              <a href="mailto:suporte@makerpro.pt" style={{ 
                color: '#3b82f6', 
                textDecoration: 'none', 
                fontSize: '14px', 
                fontWeight: '600' 
              }}>
                pp3d.pt@gmail.com
              </a>
            </div>
          </div>

          {/* Copyright final */}
          <div style={{ 
            borderTop: '1px solid #1e293b', 
            paddingTop: '30px', 
            textAlign: 'center' 
          }}>
            <p style={{ color: '#475569', fontSize: '12px' }}>
              © 2026 MakerPro de PP3D.PT. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}