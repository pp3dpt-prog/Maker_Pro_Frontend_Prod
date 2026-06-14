import type { Metadata } from 'next';
import StoreCatalog from '@/components/loja/StoreCatalog';
import { fetchCatalogo, getViewer, getPrazoConfig } from '@/lib/loja-server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: { absolute: 'PP3D.pt — Loja de impressão 3D e personalização' },
  description: 'Produtos impressos em 3D, prontos e personalizáveis. Personaliza, recebe em casa ou levanta em mãos. Sem impressora? Sem problema.',
  alternates: { canonical: 'https://pp3d.pt' },
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'PP3D.pt',
  url: 'https://pp3d.pt',
  description: 'Plataforma portuguesa de personalização e impressão 3D',
  sameAs: ['https://ko-fi.com/pp3dpt'],
};

export default async function HomePage() {
  const [{ categorias, produtos, categoriaAtual }, viewer, prazoCfg] = await Promise.all([
    fetchCatalogo(),
    getViewer(),
    getPrazoConfig(),
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
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
