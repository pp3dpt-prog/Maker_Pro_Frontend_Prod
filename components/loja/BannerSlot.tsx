import { fetchBanners, type BannerPosicao } from '@/lib/loja-server';
import BannerView from '@/components/loja/BannerView';

// Espaço de banner (Server Component). Não mostra nada se não houver banner ativo para
// esta posição e para este público (visitante / maker) — a RLS trata do filtro.
export default async function BannerSlot({ posicao, maxWidth = 1200, padding = '0 32px 28px' }: {
  posicao: BannerPosicao; maxWidth?: number; padding?: string;
}) {
  const [banner] = await fetchBanners(posicao, 1);
  if (!banner) return null;
  return (
    <div style={{ maxWidth, margin: '0 auto', padding }}>
      <BannerView banner={banner} />
    </div>
  );
}
