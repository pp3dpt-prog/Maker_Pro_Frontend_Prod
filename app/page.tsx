import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0a0a0a', color: 'white', fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section style={{ padding: '120px 20px 100px', textAlign: 'center', background: 'radial-gradient(ellipse at 50% 0%, #1e3a5f 0%, #0a0a0a 70%)' }}>
        <div style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ display: 'inline-block', padding: '6px 16px', borderRadius: '20px', background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.3)', color: '#60a5fa', fontSize: '13px', fontWeight: 700, marginBottom: '28px', letterSpacing: '0.05em' }}>
            PP3D.PT — IMPRESSÃO 3D PERSONALIZADA
          </div>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 950, letterSpacing: '-2px', lineHeight: 1.1, marginBottom: '24px' }}>
            Personalizado por ti,<br />
            <span style={{ color: '#3b82f6' }}>impresso para ti.</span>
          </h1>
          <p style={{ fontSize: '18px', color: '#94a3b8', lineHeight: 1.7, marginBottom: '48px', maxWidth: '580px', margin: '0 auto 48px' }}>
            Cria produtos únicos em 3D — ajusta as medidas, o texto, a forma. Descarrega o ficheiro ou recebe a peça em casa.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/produtos" style={{ textDecoration: 'none', backgroundColor: '#2563eb', color: 'white', padding: '16px 32px', borderRadius: '12px', fontWeight: 700, fontSize: '15px', boxShadow: '0 10px 30px rgba(37,99,235,0.4)' }}>
              Explorar produtos →
            </Link>
            <Link href="/produtos" style={{ textDecoration: 'none', backgroundColor: 'transparent', color: '#94a3b8', padding: '16px 32px', borderRadius: '12px', fontWeight: 700, fontSize: '15px', border: '1px solid #1e293b' }}>
              Ver como funciona
            </Link>
          </div>
        </div>
      </section>

      {/* ── PARA QUEM? ────────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 20px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>

          {/* Consumidor */}
          <div style={{ padding: '40px', borderRadius: '24px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', border: '1px solid #334155' }}>
            <div style={{ fontSize: '40px', marginBottom: '20px' }}>📦</div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '12px', color: '#f1f5f9' }}>Quero receber em casa</h2>
            <p style={{ color: '#94a3b8', lineHeight: 1.7, marginBottom: '28px', fontSize: '15px' }}>
              Personaliza o produto, faz a encomenda e recebe em casa. Sem impressora, sem complicações.
            </p>
            <ul style={{ color: '#64748b', fontSize: '14px', lineHeight: 2, listStyle: 'none', padding: 0, marginBottom: '32px' }}>
              <li>✅ Personalização em tempo real</li>
              <li>✅ Preview antes de encomendar</li>
              <li>✅ Entrega em 3-5 dias úteis</li>
              <li>✅ Sem conta necessária para ver</li>
            </ul>
            <Link href="/produtos" style={{ textDecoration: 'none', display: 'block', textAlign: 'center', padding: '14px', borderRadius: '10px', background: '#2563eb', color: 'white', fontWeight: 700, fontSize: '14px' }}>
              Encomendar agora →
            </Link>
          </div>

          {/* Maker */}
          <div style={{ padding: '40px', borderRadius: '24px', background: 'linear-gradient(135deg, #0f172a, #1e293b)', border: '1px solid #334155' }}>
            <div style={{ fontSize: '40px', marginBottom: '20px' }}>🖨️</div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '12px', color: '#f1f5f9' }}>Tenho impressora 3D</h2>
            <p style={{ color: '#94a3b8', lineHeight: 1.7, marginBottom: '28px', fontSize: '15px' }}>
              Gera ficheiros STL parametrizados e imprime tu próprio. Controlo total, qualidade máxima.
            </p>
            <ul style={{ color: '#64748b', fontSize: '14px', lineHeight: 2, listStyle: 'none', padding: 0, marginBottom: '32px' }}>
              <li>✅ Ficheiros STL otimizados</li>
              <li>✅ Compatível com qualquer impressora</li>
              <li>✅ Sem AMS necessário</li>
              <li>✅ Planos a partir de gratuito</li>
            </ul>
            <Link href="/produtos" style={{ textDecoration: 'none', display: 'block', textAlign: 'center', padding: '14px', borderRadius: '10px', background: 'transparent', color: '#60a5fa', fontWeight: 700, fontSize: '14px', border: '1px solid #1e3a5f' }}>
              Ver ficheiros STL →
            </Link>
          </div>

        </div>
      </section>

      {/* ── COMO FUNCIONA ─────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 20px', background: '#0f172a' }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '12px' }}>Como funciona</h2>
          <p style={{ color: '#64748b', marginBottom: '60px', fontSize: '15px' }}>Três passos. Sem complicações.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '32px' }}>
            {[
              { num: '01', icon: '🎨', title: 'Personaliza', desc: 'Escolhe o produto, ajusta medidas, texto e parâmetros em tempo real.' },
              { num: '02', icon: '👁️', title: 'Vê o resultado', desc: 'Preview 3D instantâneo. Sabes exatamente o que vais receber.' },
              { num: '03', icon: '🚀', title: 'Imprime ou encomenda', desc: 'Descarrega o STL ou encomenda o produto físico. Tu decides.' },
            ].map((step) => (
              <div key={step.num} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '36px', marginBottom: '16px' }}>{step.icon}</div>
                <div style={{ fontSize: '11px', color: '#3b82f6', fontWeight: 800, letterSpacing: '0.1em', marginBottom: '8px' }}>PASSO {step.num}</div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '10px' }}>{step.title}</h3>
                <p style={{ color: '#64748b', fontSize: '14px', lineHeight: 1.7 }}>{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUTOS DESTAQUE ─────────────────────────────────────────────── */}
      <section style={{ padding: '80px 20px', maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '48px' }}>
          <h2 style={{ fontSize: '32px', fontWeight: 800, marginBottom: '12px' }}>Produtos em destaque</h2>
          <p style={{ color: '#64748b', fontSize: '15px' }}>Desde pet tags a litofânias — tudo personalizado ao detalhe.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '40px' }}>
          {[
            { icon: '🐾', name: 'Pet Tags', desc: 'Para o teu animal de estimação' },
            { icon: '🔦', name: 'Litofânias', desc: 'Imagem retroiluminada em 3D' },
            { icon: '🎨', name: 'HueForge', desc: 'Multi-cor por camadas' },
            { icon: '🔑', name: 'Portachaves', desc: 'Texto ou imagem personalizada' },
            { icon: '📚', name: 'Marcadores', desc: 'Multi-cor para os teus livros' },
            { icon: '📦', name: 'Caixas', desc: 'Organizadores paramétricos' },
          ].map((p) => (
            <Link key={p.name} href="/produtos" style={{ textDecoration: 'none', padding: '28px 20px', borderRadius: '16px', background: '#0f172a', border: '1px solid #1e293b', textAlign: 'center', transition: 'border-color 0.2s', display: 'block' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>{p.icon}</div>
              <div style={{ fontWeight: 700, color: '#f1f5f9', marginBottom: '6px', fontSize: '15px' }}>{p.name}</div>
              <div style={{ color: '#64748b', fontSize: '12px' }}>{p.desc}</div>
            </Link>
          ))}
        </div>
        <div style={{ textAlign: 'center' }}>
          <Link href="/produtos" style={{ textDecoration: 'none', color: '#3b82f6', fontWeight: 700, fontSize: '15px' }}>
            Ver todos os produtos →
          </Link>
        </div>
      </section>

      {/* ── MAKERS / CRIADORES ────────────────────────────────────────────── */}
      <section style={{ padding: '80px 20px', background: '#0f172a' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: '40px', marginBottom: '20px' }}>☕</div>
          <h2 style={{ fontSize: '28px', fontWeight: 800, marginBottom: '16px' }}>Feito pela comunidade</h2>
          <p style={{ color: '#94a3b8', lineHeight: 1.8, fontSize: '15px', marginBottom: '32px' }}>
            A PP3D é um projecto independente. Se gostas do que fazemos e queres ajudar a crescer — mais produtos gratuitos, melhor performance, novos modelos — podes apoiar com um café.
          </p>
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://ko-fi.com" target="_blank" rel="noopener noreferrer"
              style={{ textDecoration: 'none', padding: '14px 28px', borderRadius: '12px', background: '#FF5E5B', color: 'white', fontWeight: 700, fontSize: '14px' }}>
              ☕ Apoiar no Ko-fi
            </a>
            <Link href="/produtos" style={{ textDecoration: 'none', padding: '14px 28px', borderRadius: '12px', background: 'transparent', color: '#94a3b8', fontWeight: 700, fontSize: '14px', border: '1px solid #1e293b' }}>
              Explorar produtos
            </Link>
          </div>
        </div>
      </section>

      {/* ── RODAPÉ ────────────────────────────────────────────────────────── */}
      <footer style={{ padding: '48px 20px', borderTop: '1px solid #1e293b', textAlign: 'center' }}>
        <div style={{ marginBottom: '24px' }}>
          <span style={{ fontSize: '20px', fontWeight: 900, color: '#f1f5f9', letterSpacing: '-1px' }}>PP3D<span style={{ color: '#3b82f6' }}>.pt</span></span>
        </div>
        <p style={{ color: '#475569', fontSize: '13px', marginBottom: '24px' }}>
          Personalizado por ti, impresso para ti.
        </p>
        <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '32px' }}>
          {[
            { name: 'Produtos', href: '/produtos' },
            { name: 'Para Criadores', href: '/creators' },
            { name: 'Termos', href: '/terms' },
            { name: 'Privacidade', href: '/privacy' },
            { name: 'Licenças', href: '/licenses' },
            { name: 'DMCA', href: '/dmca' },
          ].map((link) => (
            <Link key={link.name} href={link.href} style={{ color: '#475569', textDecoration: 'none', fontSize: '13px', fontWeight: 500 }}>
              {link.name}
            </Link>
          ))}
        </div>
        <p style={{ color: '#334155', fontSize: '12px' }}>© 2026 PP3D.PT — Todos os direitos reservados.</p>
      </footer>

    </div>
  );
}
