
export const dynamic = 'force-dynamic';

export default function Page({
  searchParams,
}: {
  searchParams: { id?: string };
}) {
  return (
    <main style={{ padding: 40 }}>
      ✅ Customizador aberto <br />
      ID: {searchParams.id ?? 'nenhum'}
    </main>
  );
}
