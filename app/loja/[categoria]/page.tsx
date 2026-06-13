import type { Metadata } from 'next';
import StoreCatalog from '@/components/loja/StoreCatalog';
import { fetchCatalogo, getViewer, getPrazoConfig } from '@/lib/loja-server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ categoria: string }> }): Promise<Metadata> {
  const { categoria } = await params;
  const { categoriaAtual } = await fetchCatalogo(categoria);
  const nome = categoriaAtual?.nome ?? 'Loja';
  return {
    title: nome,
    description: `${nome} — produtos impressos em 3D na PP3D.`,
    alternates: { canonical: `https://pp3d.pt/loja/${categoria}` },
  };
}

export default async function CategoriaPage({ params }: { params: Promise<{ categoria: string }> }) {
  const { categoria } = await params;
  const [{ categorias, produtos, categoriaAtual }, viewer, prazoCfg] = await Promise.all([
    fetchCatalogo(categoria),
    getViewer(),
    getPrazoConfig(),
  ]);

  return (
    <StoreCatalog
      categorias={categorias}
      produtos={produtos}
      categoriaAtual={categoriaAtual}
      ocultarPrecos={viewer.ocultarPrecos}
      prazoCfg={prazoCfg}
    />
  );
}
