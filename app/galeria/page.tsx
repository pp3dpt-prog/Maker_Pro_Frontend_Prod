import type { Metadata } from 'next';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';

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
}

async function fetchGaleria(): Promise<ItemGaleria[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('prod_galeria')
    .select('id, titulo, descricao, foto_url')
    .eq('ativo', true)
    .order('ordem', { ascending: true });
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
          <div key={it.id} style={{ background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, overflow: 'hidden' }}>
            <div style={{ position: 'relative', aspectRatio: '1', background: '#0a1120' }}>
              <Image src={it.foto_url} alt={it.titulo} fill sizes="(max-width: 640px) 100vw, 380px" style={{ objectFit: 'cover' }} />
            </div>
            <div style={{ padding: 18 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: '#f1f5f9', margin: '0 0 6px' }}>{it.titulo}</h2>
              {it.descricao && <p style={{ fontSize: 13, color: '#8a96aa', lineHeight: 1.6, margin: 0 }}>{it.descricao}</p>}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
