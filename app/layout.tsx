import type { Metadata } from 'next';
import Navbar from '@/components/layout/Navbar';
import './globals.css';

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
      <body className="bg-[#0a0a0a] text-white">
        <Navbar />
        {children}
      </body>
    </html>
  );
}
