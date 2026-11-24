import type { Metadata } from 'next';
import StoreCatalog from '@/components/loja/StoreCatalog';
import { fetchCatalogo, getViewer, getPrazoConfig, resgatarPremioLoja } from '@/lib/loja-server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Loja — Brincos, Porta-chaves e Peças 3D',
  description: 'Compra online brincos, porta-chaves e figuras em impressão 3D feitos em Portugal. Personalizados à medida, entrega em todo o país.',
  keywords: ['loja brincos 3D', 'comprar peças impressão 3D Portugal', 'brincos artesanais Lisboa', 'porta-chaves personalizados comprar'],
  alternates: { canonical: 'https://pp3d.pt/loja' },
};

export default async function LojaPage() {
  const [viewer, prazoCfg, premio] = await Promise.all([getViewer(), getPrazoConfig(), resgatarPremioLoja()]);
  const { categorias, produtos, categoriaAtual } = await fetchCatalogo(undefined, viewer.isAdmin);

  return (
    <>
      {premio?.tipo === 'maker_bonus' && (
        <div style={{ background: 'linear-gradient(90deg,#065f46,#047857)', color: '#ecfdf5', padding: '14px 20px', textAlign: 'center', fontSize: 14, fontWeight: 700 }}>
          🎁 Detetámos e corrigimos um bug no registo — como pedido de desculpa, tens +{premio.quantidade} downloads grátis com o código <strong>{premio.codigo}</strong> em &quot;Tens um código?&quot; no teu dashboard.
        </div>
      )}
      {premio?.tipo === 'desconto_loja' && (
        <div style={{ background: 'linear-gradient(90deg,#1e3a8a,#1d4ed8)', color: '#eff6ff', padding: '14px 20px', textAlign: 'center', fontSize: 14, fontWeight: 700 }}>
          🎁 Detetámos e corrigimos um bug no registo — como pedido de desculpa, tens 10% de desconto numa compra com o código <strong>{premio.codigo}</strong> no checkout.
        </div>
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
