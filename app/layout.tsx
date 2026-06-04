import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

const siteUrl = 'https://pp3d.pt';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'PP3D.pt — Personalização 3D para toda a gente',
    template: '%s | PP3D.pt',
  },
  description: 'Cria produtos únicos em 3D — personaliza medidas, texto e forma. Descarrega o ficheiro STL ou recebe a peça impressa em casa. Sem impressora? Sem problema.',
  keywords: ['impressão 3D', 'personalização 3D', 'ficheiros STL', 'Portugal', 'produtos 3D', 'customização'],
  authors: [{ name: 'PP3D.pt', url: siteUrl }],
  creator: 'PP3D.pt',
  robots: { index: true, follow: true },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  openGraph: {
    title: 'PP3D.pt — Personalização 3D para toda a gente',
    description: 'Cria produtos únicos em 3D. Personaliza, descarrega e imprime — ou recebe em casa.',
    url: siteUrl,
    siteName: 'PP3D.pt',
    locale: 'pt_PT',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PP3D.pt — Personalização 3D',
    description: 'Cria produtos únicos em 3D personalizados.',
  },
  alternates: {
    canonical: siteUrl,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body className={`${inter.className} bg-[#0a0a0a] text-white`}>
        <Navbar />
        {children}
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
