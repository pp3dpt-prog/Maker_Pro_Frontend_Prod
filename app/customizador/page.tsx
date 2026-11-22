import { Suspense } from 'react';
import type { Metadata } from 'next';
import PageInner from './PageInner';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}): Promise<Metadata> {
  const { id } = await searchParams;
  if (!id) {
    return {
      title: 'Customizador 3D — Personaliza o teu produto',
      description: 'Personaliza em tempo real brincos, porta-chaves, placas e figuras 3D da PP3D.pt. Escolhe cores, texto e tamanho e encomenda online.',
    };
  }

  const supabase = await createClient();
  const { data: design } = await supabase
    .from('prod_designs')
    .select('nome, descricao, thumbnail_url')
    .eq('id', id)
    .eq('estado', 'ativo')
    .maybeSingle();

  if (!design) {
    return {
      title: 'Customizador 3D — Personaliza o teu produto',
      description: 'Personaliza em tempo real brincos, porta-chaves, placas e figuras 3D da PP3D.pt. Escolhe cores, texto e tamanho e encomenda online.',
    };
  }

  const title = `Personalizar ${design.nome}`;
  const description = design.descricao?.slice(0, 160) ?? `Personaliza o ${design.nome} em tempo real e encomenda online na PP3D.pt.`;
  const url = `https://pp3d.pt/customizador?id=${id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      images: design.thumbnail_url ? [{ url: design.thumbnail_url }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: design.thumbnail_url ? [design.thumbnail_url] : undefined,
    },
  };
}

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: 'white' }}>A carregar customizador…</div>}>
      <PageInner />
    </Suspense>
  );
}