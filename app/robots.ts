import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/admin', '/checkout', '/checkout-loja', '/carrinho', '/login', '/register', '/forgot-password', '/update-password', '/api/'],
      },
    ],
    sitemap: 'https://pp3d.pt/sitemap.xml',
  };
}
