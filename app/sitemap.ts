import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = 'https://pp3d.pt';

  // Páginas estáticas
  const staticPages: MetadataRoute.Sitemap = [
    { url: siteUrl,               lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${siteUrl}/produtos`, lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${siteUrl}/pricing`,  lastModified: new Date(), changeFrequency: 'monthly', priority: 0.8 },
    { url: `${siteUrl}/login`,    lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${siteUrl}/register`, lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
  ];

  // Páginas de produtos activos
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { data: designs } = await supabase
      .from('prod_designs')
      .select('id, familia, updated_at')
      .eq('estado', 'ativo');

    const productPages: MetadataRoute.Sitemap = (designs ?? []).map(d => ({
      url: `${siteUrl}/customizador?id=${d.id}`,
      lastModified: d.updated_at ? new Date(d.updated_at) : new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }));

    const familias = [...new Set((designs ?? []).map(d => d.familia).filter(Boolean))];
    const familiaPages: MetadataRoute.Sitemap = familias.map(f => ({
      url: `${siteUrl}/familia/${encodeURIComponent(f)}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));

    return [...staticPages, ...familiaPages, ...productPages];
  } catch {
    return staticPages;
  }
}
