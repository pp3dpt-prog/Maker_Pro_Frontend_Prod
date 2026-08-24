import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import GaleriaCard from '@/components/galeria/GaleriaCard';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Galeria de Trabalhos',
  description: 'Peças personalizadas, edições únicas e trabalhos feitos à medida pela PP3D.pt — impressão 3D em Portugal.',
  alternates: { canonical: 'https://pp3d.pt/galeria' },
};

interface ItemGaleria {
  id: string;
  titulo: string;
  descricao: string | null;
  foto_url: string;
  prod_galeria_fotos: { url: string; ordem: number }[];
}

async function fetchGaleria(): Promise<ItemGaleria[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('prod_galeria')
    .select('id, titulo, descricao, foto_url, prod_galeria_fotos(url, ordem)')
    .eq('ativo', true)
    .order('ordem', { ascending: true })
    .order('ordem', { ascending: true, referencedTable: 'prod_galeria_fotos' });
  return (data ?? []) as ItemGaleria[];
}

export default async function GaleriaPage() {
  const itens = await fetchGaleria();

  return (
    <main style={{ background: '#080c10', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '56px 32px 28px' }}>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#3b82f6', marginBottom: 12 }}>Galeria PP3D</p>
        <h1 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: '#f1f5f9', letterSpacing: '-0.03em', margin: '0 0 12px' }}>
          Trabalhos e <span style={{ color: '#3b82f6' }}>peças personalizadas</span>
        </h1>
        <p style={{ fontSize: 16, color: '#8a96aa', maxWidth: 640, lineHeight: 1.6, margin: 0 }}>
          Algumas peças que já fizemos — personalizações, edições únicas e trabalhos sob pedido. Não estão todas à venda, mas mostram o que conseguimos fazer à tua medida.
        </p>
      </div>

      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '0 32px 80px',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24,
      }}>
        {itens.length === 0 ? (
          <p style={{ color: '#8a96aa', gridColumn: '1/-1' }}>Ainda não há peças na galeria.</p>
        ) : itens.map(it => (
          <GaleriaCard
            key={it.id}
            titulo={it.titulo}
            descricao={it.descricao}
            fotos={it.prod_galeria_fotos?.length ? it.prod_galeria_fotos : [{ url: it.foto_url, ordem: 0 }]}
          />
        ))}
      </div>
    </main>
  );
}
