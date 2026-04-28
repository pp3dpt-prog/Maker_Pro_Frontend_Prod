import CustomizadorClient from './CustomizadorClient';

export const dynamic = 'force-dynamic';

export default async function Page({
  searchParams,
}: {
  searchParams?: { id?: string; familia?: string };
}) {
  const qs = new URLSearchParams(searchParams as any).toString();

  const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/produto?${qs}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Produto não definido</h2>
        <p>Não foi possível carregar o produto.</p>
      </div>
    );
  }

  const produto = await res.json();
  return <CustomizadorClient produto={produto} />;
}