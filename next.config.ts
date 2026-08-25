import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' https://www.googletagmanager.com https://www.google-analytics.com https://staticimgly.com",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in https://www.google-analytics.com",
      "font-src 'self'",
      "worker-src 'self' blob:",
      "connect-src 'self' https://*.supabase.co https://*.supabase.in https://www.google-analytics.com https://stats.g.doubleclick.net https://raw.githack.com https://raw.githubusercontent.com https://staticimgly.com",
      "frame-ancestors 'self'",
    ].join('; '),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },

  // NOTA: sem redirect non-www -> www aqui de propósito. O domínio primário
  // no Vercel está configurado como pp3d.pt (sem www) e já redireciona
  // www -> pp3d.pt a nível de edge; um redirect aqui na direção oposta
  // criava um loop infinito entre os dois. Ver conversa de 2026-08-22.

  // Otimização de imagens (formatos modernos + domínios permitidos para next/image)
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: '*.supabase.in' },
    ],
  },
};

export default nextConfig;
