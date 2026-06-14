import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProdutoDetalhe from '@/components/loja/ProdutoDetalhe';
import { fetchProduto, getViewer, getPrazoConfig } from '@/lib/loja-server';
import { eur } from '@/lib/loja';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const produto = await fetchProduto(slug);
  if (!produto) return { title: 'Produto não encontrado' };

  const foto = [...produto.prod_loja_imagens].sort((a, b) => a.ordem - b.ordem)[0]?.url;
  const preco = produto.preco_promo_cents ?? produto.preco_cents;
  const desc = produto.descricao?.slice(0, 160) ?? `${produto.nome} — ${eur(preco)} na loja PP3D.`;
  const url = `https://pp3d.pt/produto/${slug}`;

  return {
    title: produto.nome,
    description: desc,
    alternates: { canonical: url },
    openGraph: {
      title: produto.nome,
      description: desc,
      url,
      type: 'website',
      images: foto ? [{ url: foto }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: produto.nome,
      description: desc,
      images: foto ? [foto] : undefined,
    },
  };
}

function stockTotal(p: { stock: number; prod_loja_variantes: { stock: number }[] }): number {
  if (p.prod_loja_variantes?.length) return p.prod_loja_variantes.reduce((s, v) => s + (v.stock ?? 0), 0);
  return p.stock ?? 0;
}

export default async function ProdutoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [produto, viewer, prazoCfg] = await Promise.all([
    fetchProduto(slug),
    getViewer(),
    getPrazoConfig(),
  ]);

  if (!produto) notFound();

  const url = `https://pp3d.pt/produto/${slug}`;
  const fotos = [...produto.prod_loja_imagens].sort((a, b) => a.ordem - b.ordem).map(i => i.url);
  const st = stockTotal(produto);
  const disponibilidade = st > 0 ? 'InStock' : produto.sob_encomenda ? 'PreOrder' : 'OutOfStock';

  // Schema.org Product — preço real (nunca o do viewer); omite oferta se for sob orçamento
  const productLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: produto.nome,
    description: produto.descricao ?? `${produto.nome} — produto impresso em 3D na PP3D.`,
    image: fotos.length ? fotos : undefined,
    brand: { '@type': 'Brand', name: 'PP3D.pt' },
    category: produto.prod_loja_categorias?.nome,
  };
  if (!produto.requer_orcamento) {
    productLd.offers = {
      '@type': 'Offer',
      priceCurrency: 'EUR',
      price: ((produto.preco_promo_cents ?? produto.preco_cents) / 100).toFixed(2),
      availability: `https://schema.org/${disponibilidade}`,
      itemCondition: 'https://schema.org/NewCondition',
      url,
    };
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Início', item: 'https://pp3d.pt' },
      { '@type': 'ListItem', position: 2, name: 'Loja', item: 'https://pp3d.pt/loja' },
      ...(produto.prod_loja_categorias
        ? [{ '@type': 'ListItem', position: 3, name: produto.prod_loja_categorias.nome, item: `https://pp3d.pt/loja/${produto.prod_loja_categorias.slug}` }]
        : []),
      { '@type': 'ListItem', position: produto.prod_loja_categorias ? 4 : 3, name: produto.nome, item: url },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <ProdutoDetalhe produto={produto} ocultarPrecos={viewer.ocultarPrecos} prazoCfg={prazoCfg} />
    </>
  );
}
