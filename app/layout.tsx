import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Navbar from '@/components/layout/Navbar';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

export const metadata: Metadata = {
  title: 'PP3D.pt — Personalizado por ti, impresso para ti',
  description: 'Cria produtos únicos em 3D — ajusta as medidas, o texto, a forma. Descarrega o ficheiro ou recebe a peça em casa.',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  openGraph: {
    title: 'PP3D.pt — Personalizado por ti, impresso para ti',
    description: 'Personalização 3D para toda a gente. Sem impressora? Recebe em casa.',
    siteName: 'PP3D.pt',
    locale: 'pt_PT',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className={`${inter.className} bg-[#0a0a0a] text-white`}>
        <Navbar />
        {children}
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
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              color: '#ff7875', textDecoration: 'none', fontWeight: 600,
            }}
          >
            ☕ Apoiar no Ko-fi
          </a>
        </footer>
      </body>
    </html>
  );
}
