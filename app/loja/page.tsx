import type { Metadata } from 'next';
import StoreCatalog from '@/components/loja/StoreCatalog';
import { fetchCatalogo, getViewer, getPrazoConfig } from '@/lib/loja-server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Loja',
  description: 'Produtos impressos em 3D, prontos e personalizáveis. Recebe em casa ou levanta em mãos.',
  alternates: { canonical: 'https://pp3d.pt/loja' },
};

export default async function LojaPage() {
  const [{ categorias, produtos, categoriaAtual }, viewer, prazoCfg] = await Promise.all([
    fetchCatalogo(),
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
