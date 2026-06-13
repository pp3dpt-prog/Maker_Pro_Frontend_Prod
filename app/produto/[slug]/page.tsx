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

export default async function ProdutoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [produto, viewer, prazoCfg] = await Promise.all([
    fetchProduto(slug),
    getViewer(),
    getPrazoConfig(),
  ]);

  if (!produto) notFound();

  return <ProdutoDetalhe produto={produto} ocultarPrecos={viewer.ocultarPrecos} prazoCfg={prazoCfg} />;
}
