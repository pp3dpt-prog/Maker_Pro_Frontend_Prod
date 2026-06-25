import Link from 'next/link';
import type { Metadata } from 'next';
import { DISCORD_URL } from '@/lib/loja';
import ReviewsSection from '@/components/ReviewsSection';

export const metadata: Metadata = {
  title: { absolute: 'PP3D.pt — Produtos únicos, impressos em 3D' },
  description: 'Compra peças prontas ou personaliza ao detalhe. Recebe em casa ou em mãos. És maker? Descarrega os ficheiros. Impressão 3D portuguesa.',
  alternates: { canonical: 'https://pp3d.pt' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'PP3D.pt',
  url: 'https://pp3d.pt',
  description: 'Plataforma portuguesa de personalização e impressão 3D',
  sameAs: ['https://ko-fi.com/pp3dpt'],
};

const CATEGORIAS = [
  { icon: '🐾', name: 'Pet Tags' },
  { icon: '🔦', name: 'Litofânias' },
  { icon: '🎨', name: 'HueForge' },
  { icon: '🔑', name: 'Porta-chaves' },
  { icon: '📚', name: 'Marcadores' },
  { icon: '📦', name: 'Caixas' },
];

export default function HomePage() {
  return (
    <div style={{ background: '#07090d', color: '#f1f5f9', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden' }}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <style>{`
        .ll-wrap { max-width: 1120px; margin: 0 auto; padding: 0 24px; }
        .ll-hero {
          position: relative; text-align: center; padding: 110px 24px 90px;
          background:
            radial-gradient(60% 50% at 50% 0%, rgba(37,99,235,0.25) 0%, rgba(7,9,13,0) 70%),
            radial-gradient(40% 40% at 85% 10%, rgba(167,139,250,0.18) 0%, rgba(7,9,13,0) 70%);
        }
        .ll-eyebrow {
          display:inline-flex; align-items:center; gap:8px; padding:6px 14px; border-radius:30px;
          background:rgba(59,130,246,0.1); border:1px solid rgba(59,130,246,0.3);
          color:#93c5fd; font-size:12px; font-weight:700; letter-spacing:0.06em; margin-bottom:28px;
        }
        .ll-h1 { font-size:clamp(38px,6.5vw,68px); font-weight:900; letter-spacing:-0.03em; line-height:1.05; margin:0 0 22px; }
        .ll-h1 span { background:linear-gradient(120deg,#3b82f6,#a78bfa); -webkit-background-clip:text; background-clip:text; color:transparent; }
        .ll-sub { font-size:clamp(16px,2vw,19px); color:#94a3b8; line-height:1.7; max-width:620px; margin:0 auto 40px; }
        .ll-cta-row { display:flex; gap:14px; justify-content:center; flex-wrap:wrap; }
        .ll-btn { display:inline-flex; align-items:center; gap:8px; padding:16px 30px; border-radius:14px; font-weight:800; font-size:15px; text-decoration:none; transition:transform .15s, box-shadow .15s; }
        .ll-btn-primary { background:linear-gradient(135deg,#2563eb,#1d4ed8); color:#fff; box-shadow:0 14px 40px rgba(37,99,235,0.4); }
        .ll-btn-primary:hover { transform:translateY(-2px); box-shadow:0 18px 50px rgba(37,99,235,0.5); }
        .ll-btn-ghost { background:rgba(255,255,255,0.04); color:#e2e8f0; border:1px solid #1e293b; }
        .ll-btn-ghost:hover { border-color:#334155; transform:translateY(-2px); }
        .ll-trust { display:flex; gap:28px; justify-content:center; flex-wrap:wrap; margin-top:44px; }
        .ll-trust span { font-size:13px; color:#8a96aa; font-weight:600; }
        .ll-section { padding:84px 0; }
        .ll-h2 { font-size:clamp(26px,3.5vw,40px); font-weight:900; letter-spacing:-0.02em; margin:0 0 12px; text-align:center; }
        .ll-lead { font-size:16px; color:#8a96aa; text-align:center; max-width:560px; margin:0 auto 52px; line-height:1.7; }
        .ll-duo { display:grid; grid-template-columns:repeat(auto-fit,minmax(320px,1fr)); gap:22px; }
        .ll-card { position:relative; border-radius:24px; padding:40px; border:1px solid #1e293b; background:linear-gradient(160deg,#0f1626,#0b0f18); transition:transform .18s, border-color .18s; display:flex; flex-direction:column; }
        .ll-card:hover { transform:translateY(-4px); border-color:#334155; }
        .ll-card-primary { border-color:rgba(59,130,246,0.4); background:linear-gradient(160deg,#10203f,#0b1220); }
        .ll-badge { align-self:flex-start; font-size:11px; font-weight:800; letter-spacing:0.08em; text-transform:uppercase; padding:5px 12px; border-radius:20px; margin-bottom:18px; }
        .ll-feat { display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:20px; }
        .ll-feat-item { padding:26px; border-radius:18px; background:#0c111b; border:1px solid #161e2e; }
        .ll-cats { display:grid; grid-template-columns:repeat(auto-fit,minmax(150px,1fr)); gap:14px; }
        .ll-cat { display:flex; flex-direction:column; align-items:center; gap:8px; padding:26px 16px; border-radius:16px; background:#0c111b; border:1px solid #161e2e; text-decoration:none; transition:border-color .15s, transform .15s; }
        .ll-cat:hover { border-color:#334155; transform:translateY(-3px); }
        .ll-partner { border-radius:28px; padding:56px 40px; text-align:center; background:linear-gradient(135deg,rgba(124,58,237,0.18),rgba(37,99,235,0.14)); border:1px solid rgba(124,58,237,0.3); }
      `}</style>

      {/* HERO */}
      <section className="ll-hero">
        <div className="ll-wrap">
          <div className="ll-eyebrow">🇵🇹 Impressão 3D portuguesa</div>
          <h1 className="ll-h1">Produtos únicos,<br /><span>impressos em 3D.</span></h1>
          <p className="ll-sub">
            Compra peças prontas ou personaliza ao detalhe. Recebe em casa ou levanta em mãos.
            Tens impressora? Descarrega os ficheiros e imprime tu.
          </p>
          <div className="ll-cta-row">
            <Link href="/loja" className="ll-btn ll-btn-primary">Explorar a loja →</Link>
            <Link href="/makers" className="ll-btn ll-btn-ghost">🖨️ Sou maker</Link>
          </div>
          <div className="ll-trust">
            <span>🔒 Pagamento seguro · Stripe</span>
            <span>🚚 Entrega em 1–5 dias</span>
            <span>🎨 Personalização em tempo real</span>
          </div>
        </div>
      </section>

      {/* DUAS FORMAS */}
      <section className="ll-section">
        <div className="ll-wrap">
          <h2 className="ll-h2">Duas formas de ter o que imaginas</h2>
          <p className="ll-lead">Quer recebas em casa, quer imprimas tu — a personalização é sempre tua.</p>
          <div className="ll-duo">
            {/* Loja — destaque */}
            <div className="ll-card ll-card-primary">
              <span className="ll-badge" style={{ background: 'rgba(59,130,246,0.18)', color: '#93c5fd' }}>Loja · Mais popular</span>
              <div style={{ fontSize: 44, marginBottom: 16 }}>🛍️</div>
              <h3 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 12px' }}>Compra já, recebe em casa</h3>
              <p style={{ color: '#94a3b8', lineHeight: 1.7, fontSize: 15, margin: '0 0 22px' }}>
                Produtos prontos e personalizáveis. Escolhe, ajusta ao teu gosto e finaliza — com envio ou entrega em mãos.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', color: '#cbd5e1', fontSize: 14, lineHeight: 2 }}>
                <li>✅ Peças físicas prontas a enviar</li>
                <li>✅ Personalização 3D em tempo real</li>
                <li>✅ Pagamento seguro e fatura</li>
              </ul>
              <Link href="/loja" className="ll-btn ll-btn-primary" style={{ marginTop: 'auto', justifyContent: 'center' }}>Ver produtos →</Link>
            </div>

            {/* Makers */}
            <div className="ll-card">
              <span className="ll-badge" style={{ background: 'rgba(52,211,153,0.16)', color: '#34d399' }}>Makers</span>
              <div style={{ fontSize: 44, marginBottom: 16 }}>🖨️</div>
              <h3 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 12px' }}>Tens impressora? Imprime tu</h3>
              <p style={{ color: '#94a3b8', lineHeight: 1.7, fontSize: 15, margin: '0 0 22px' }}>
                Acede a designs paramétricos, personaliza as medidas, gera o STL e descarrega. Grátis para começar.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', color: '#cbd5e1', fontSize: 14, lineHeight: 2 }}>
                <li>✅ Ficheiros STL otimizados</li>
                <li>✅ Modelos gratuitos e exclusivos</li>
                <li>✅ Planos a partir de gratuito</li>
              </ul>
              <Link href="/makers" className="ll-btn ll-btn-ghost" style={{ marginTop: 'auto', justifyContent: 'center' }}>Área de makers →</Link>
            </div>
          </div>
        </div>
      </section>

      {/* PORQUÊ CRIAR CONTA */}
      <section className="ll-section" style={{ background: '#0a0e16', borderTop: '1px solid #11192a', borderBottom: '1px solid #11192a' }}>
        <div className="ll-wrap">
          <h2 className="ll-h2">Cria conta para comprares</h2>
          <p className="ll-lead">Uma conta gratuita desbloqueia tudo — e mantém as tuas personalizações e encomendas num só lugar.</p>
          <div className="ll-feat">
            {[
              { icon: '🛒', t: 'Carrinho e checkout', d: 'Guarda os produtos e finaliza quando quiseres, em segurança.' },
              { icon: '🎨', t: 'Personalizações guardadas', d: 'As tuas medidas e ficheiros ficam associados à tua conta.' },
              { icon: '📦', t: 'Acompanha encomendas', d: 'Estado do pedido, orçamentos e histórico no teu dashboard.' },
              { icon: '⬇️', t: 'Downloads de maker', d: 'Acede e descarrega os ficheiros STL quando és maker.' },
            ].map(f => (
              <div key={f.t} className="ll-feat-item">
                <div style={{ fontSize: 28, marginBottom: 12 }}>{f.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px' }}>{f.t}</h3>
                <p style={{ color: '#8a96aa', fontSize: 13.5, lineHeight: 1.6, margin: 0 }}>{f.d}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 40 }}>
            <Link href="/register" className="ll-btn ll-btn-primary">Criar conta grátis</Link>
          </div>
        </div>
      </section>

      {/* CATEGORIAS */}
      <section className="ll-section">
        <div className="ll-wrap">
          <h2 className="ll-h2">O que vais encontrar</h2>
          <p className="ll-lead">De pet tags a litofânias — tudo personalizado ao detalhe.</p>
          <div className="ll-cats">
            {CATEGORIAS.map(c => (
              <Link key={c.name} href="/loja" className="ll-cat">
                <span style={{ fontSize: 32 }}>{c.icon}</span>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>{c.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* REVIEWS (com AggregateRating schema) */}
      <ReviewsSection />

      {/* PARCERIAS / REVENDA */}
      <section className="ll-section" style={{ paddingTop: 20 }}>
        <div className="ll-wrap">
          <div className="ll-partner">
            <div style={{ fontSize: 40, marginBottom: 16 }}>🤝</div>
            <h2 style={{ fontSize: 'clamp(24px,3vw,34px)', fontWeight: 900, margin: '0 0 14px' }}>Abertos a parcerias e revenda</h2>
            <p style={{ color: '#c4b5fd', fontSize: 16, lineHeight: 1.7, maxWidth: 560, margin: '0 auto 30px' }}>
              Tens uma loja, marca ou queres revender os nossos produtos? Trabalhamos com parceiros e makers —
              fala connosco e montamos algo à tua medida.
            </p>
            <div className="ll-cta-row">
              <a href="mailto:pp3d.pt@gmail.com?subject=Parceria%2FRevenda%20PP3D" className="ll-btn ll-btn-primary">Falar sobre parcerias</a>
              <a href={DISCORD_URL} target="_blank" rel="noopener noreferrer" className="ll-btn ll-btn-ghost">Entrar no Discord</a>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="ll-section" style={{ textAlign: 'center', paddingTop: 20 }}>
        <div className="ll-wrap">
          <h2 className="ll-h2">Pronto para criar algo único?</h2>
          <p className="ll-lead">Começa na loja ou explora a área de makers.</p>
          <div className="ll-cta-row">
            <Link href="/loja" className="ll-btn ll-btn-primary">Explorar a loja →</Link>
            <Link href="/makers" className="ll-btn ll-btn-ghost">Sou maker</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
