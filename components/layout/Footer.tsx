'use client';

import { usePathname } from 'next/navigation';

// Páginas com layout full-screen onde o footer não deve aparecer
const FULLSCREEN_PATHS = ['/customizador', '/personalizar-imagem', '/admin'];

export default function Footer() {
  const pathname = usePathname();
  const hide = FULLSCREEN_PATHS.some(p => pathname.startsWith(p));
  if (hide) return null;

  return (
    <footer style={{
      borderTop: '1px solid #1e293b',
      padding: '24px 32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      flexWrap: 'wrap',
      gap: 12,
      fontSize: 13,
      color: '#475569',
    }}>
      <span>© {new Date().getFullYear()} PP3D.pt — Feito com ❤️ em Portugal</span>
      <a
        href="https://ko-fi.com/pp3dpt"
        target="_blank"
        rel="noopener noreferrer"
        style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#ff7875', textDecoration: 'none', fontWeight: 600 }}
      >
        ☕ Apoiar no Ko-fi
      </a>
    </footer>
  );
}
