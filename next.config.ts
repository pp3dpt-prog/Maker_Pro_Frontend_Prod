import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Não expor o cabeçalho "X-Powered-By" (best-practices)
  poweredByHeader: false,

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
