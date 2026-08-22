import type { Metadata } from 'next';
import StoreCatalog from '@/components/loja/StoreCatalog';
import { fetchCatalogo, getViewer, getPrazoConfig } from '@/lib/loja-server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Loja — Brincos, Porta-chaves e Peças 3D',
  description: 'Compra online brincos, porta-chaves e figuras em impressão 3D feitos em Portugal. Personalizados à medida, entrega em todo o país.',
  keywords: ['loja brincos 3D', 'comprar peças impressão 3D Portugal', 'brincos artesanais Lisboa', 'porta-chaves personalizados comprar'],
  alternates: { canonical: 'https://pp3d.pt/loja' },
};

export default async function LojaPage() {
  const [viewer, prazoCfg] = await Promise.all([getViewer(), getPrazoConfig()]);
  const { categorias, produtos, categoriaAtual } = await fetchCatalogo(undefined, viewer.isAdmin);

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
