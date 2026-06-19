import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { CartProvider } from '@/components/loja/CartContext';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';

const GA_ID = 'G-7KJCGXHW9Q';

const inter = Inter({ subsets: ['latin'], display: 'swap' });

const siteUrl = 'https://pp3d.pt';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: 'PP3D.pt — Brincos, Figuras e Personalização 3D em Portugal',
    template: '%s | PP3D.pt',
  },
  description: 'Brincos, porta-chaves, placas para animais e figuras feitos em impressão 3D e personalizados à medida. Encomenda online — entregamos em todo Portugal. Zona de Lisboa, Carnaxide e Oeiras.',
  keywords: [
    'impressão 3D Portugal', 'brincos impressão 3D', 'personalização 3D Lisboa',
    'porta-chaves personalizados', 'placa identificação animal', 'figuras 3D personalizadas',
    'brincos feitos à mão Portugal', 'impressão 3D Carnaxide', 'peças 3D personalizadas',
    'letreiros luminosos 3D', 'ficheiros STL personalizados', 'presentes personalizados Portugal',
  ],
  authors: [{ name: 'PP3D.pt', url: siteUrl }],
  creator: 'PP3D.pt',
  robots: { index: true, follow: true },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
  openGraph: {
    title: 'PP3D.pt — Brincos, Figuras e Personalização 3D em Portugal',
    description: 'Brincos, porta-chaves e figuras feitos em impressão 3D e personalizados à medida. Entrega em todo Portugal.',
    url: siteUrl,
    siteName: 'PP3D.pt',
    locale: 'pt_PT',
    type: 'website',
    images: [{ url: `${siteUrl}/og-image.png`, width: 1200, height: 630, alt: 'PP3D.pt — Personalização 3D' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PP3D.pt — Brincos e Personalização 3D',
    description: 'Brincos, porta-chaves e figuras feitos em impressão 3D e personalizados à medida.',
    images: [`${siteUrl}/og-image.png`],
  },
  alternates: {
    canonical: siteUrl,
  },
};

const localBusinessJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: 'PP3D.pt',
  description: 'Brincos, porta-chaves, placas para animais e figuras feitos em impressão 3D e personalizados à medida.',
  url: siteUrl,
  logo: `${siteUrl}/favicon.ico`,
  image: `${siteUrl}/og-image.png`,
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Carnaxide',
    addressRegion: 'Lisboa',
    addressCountry: 'PT',
  },
  areaServed: { '@type': 'Country', name: 'Portugal' },
  sameAs: ['https://www.instagram.com/pp3d.pt/'],
  priceRange: '€€',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessJsonLd) }}
        />
      </head>
      <body className={`${inter.className} bg-[#0a0a0a] text-white`}>
        <CartProvider>
          <Navbar />
          {children}
          <Footer />
        </CartProvider>
        <Analytics />
        {/* Google Analytics 4 */}
        <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
        <Script id="ga4" strategy="afterInteractive">{`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', { page_path: window.location.pathname });
        `}</Script>
      </body>
    </html>
  );
}
