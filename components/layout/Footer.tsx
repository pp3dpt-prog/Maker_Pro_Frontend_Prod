'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Páginas com layout full-screen onde o footer não deve aparecer
const FULLSCREEN_PATHS = ['/customizador', '/personalizar-imagem', '/admin'];

const NAV_LINKS = [
  { name: 'Loja', href: '/loja' },
  { name: 'Makers', href: '/makers' },
  { name: 'Para Criadores', href: '/creators' },
  { name: 'Preçário', href: '/pricing' },
];

const LEGAL_LINKS = [
  { name: 'Termos', href: '/terms' },
  { name: 'Termos de Compra', href: '/purchase-terms' },
  { name: 'Privacidade', href: '/privacy' },
  { name: 'Cookies', href: '/cookies' },
  { name: 'Licenças', href: '/licenses' },
  { name: 'Diretrizes', href: '/guidelines' },
  { name: 'DMCA', href: '/dmca' },
  { name: 'Livro de Reclamações', href: 'https://www.livroreclamacoes.pt/inicio', external: true },
];

const linkStyle: React.CSSProperties = { color: '#94a3b8', textDecoration: 'none', fontSize: 13, fontWeight: 500 };

export default function Footer() {
  const pathname = usePathname();
  const hide = FULLSCREEN_PATHS.some(p => pathname.startsWith(p));
  if (hide) return null;

  return (
    <footer style={{ borderTop: '1px solid #1e293b', background: '#080c10' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto', padding: '40px 32px 28px' }}>

        {/* Marca + navegação */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.5px' }}>PP3D<span style={{ color: '#3b82f6' }}>.pt</span></span>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: '8px 0 0', maxWidth: 280, lineHeight: 1.6 }}>
              Personalizado por ti, impresso para ti. Impressão 3D portuguesa.
            </p>
          </div>
          <nav style={{ display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'flex-start' }}>
            {NAV_LINKS.map(l => (
              <Link key={l.name} href={l.href} style={linkStyle}>{l.name}</Link>
            ))}
          </nav>
        </div>

        {/* Documentos legais */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, paddingTop: 22, borderTop: '1px solid #11192a' }}>
          {LEGAL_LINKS.map(l => (
            l.external ? (
              <a key={l.name} href={l.href} target="_blank" rel="noopener noreferrer" style={linkStyle}>{l.name}</a>
            ) : (
              <Link key={l.name} href={l.href} style={linkStyle}>{l.name}</Link>
            )
          ))}
        </div>

        {/* Rodapé inferior */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between', marginTop: 24 }}>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>© {new Date().getFullYear()} PP3D.pt — Todos os direitos reservados. Feito com ❤️ em Portugal.</span>
          <a href="https://ko-fi.com/pp3dpt" target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ff7875', textDecoration: 'none', fontWeight: 600, fontSize: 13 }}>
            ☕ Apoiar no Ko-fi
          </a>
        </div>
      </div>
    </footer>
  );
}
