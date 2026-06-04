import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/admin', '/checkout', '/api/'],
      },
    ],
    sitemap: 'https://pp3d.pt/sitemap.xml',
  };
}
