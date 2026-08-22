import type { Metadata } from 'next';
import StoreCatalog from '@/components/loja/StoreCatalog';
import { fetchCatalogo, getViewer, getPrazoConfig } from '@/lib/loja-server';
import { categoriaDescricao } from '@/lib/loja';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ categoria: string }> }): Promise<Metadata> {
  const { categoria } = await params;
  const { categoriaAtual } = await fetchCatalogo(categoria);
  const nome = categoriaAtual?.nome ?? 'Loja';
  const descricao = categoriaDescricao(nome, categoriaAtual?.descricao);
  return {
    title: nome,
    description: descricao.slice(0, 160),
    alternates: { canonical: `https://pp3d.pt/loja/${categoria}` },
  };
}

export default async function CategoriaPage({ params }: { params: Promise<{ categoria: string }> }) {
  const { categoria } = await params;
  const [viewer, prazoCfg] = await Promise.all([getViewer(), getPrazoConfig()]);
  const { categorias, produtos, categoriaAtual } = await fetchCatalogo(categoria, viewer.isAdmin);

  const breadcrumbJsonLd = categoriaAtual ? {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: 'https://pp3d.pt' },
      { '@type': 'ListItem', position: 2, name: 'Loja', item: 'https://pp3d.pt/loja' },
      { '@type': 'ListItem', position: 3, name: categoriaAtual.nome, item: `https://pp3d.pt/loja/${categoriaAtual.slug}` },
    ],
  } : null;

  return (
    <>
      {breadcrumbJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      )}
      <StoreCatalog
        categorias={categorias}
        produtos={produtos}
        categoriaAtual={categoriaAtual}
        ocultarPrecos={viewer.ocultarPrecos}
        prazoCfg={prazoCfg}
      />
    </>
  );
}
