export const dynamic = 'force-dynamic';

export default async function Page() {
  const res = await fetch('/api/produto?id=caixa-parametrica', {
    cache: 'no-store',
  });

  const data = await res.json();

  return (
    <pre style={{ whiteSpace: 'pre-wrap', padding: 24 }}>
      PAGE OK
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}