export const dynamic = 'force-dynamic';

export default async function Page() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const res = await fetch(
    `${url}/rest/v1/prod_designs?id=eq.caixa-parametrica&select=id,nome`,
    {
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      // força request no runtime
      cache: 'no-store',
    }
  );
  
await fetch(
  `${url}/rest/v1/prod_designs?id=eq.caixa-parametrica&select=id,nome`,
  {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    cache: 'no-store',
  }
);


  const text = await res.text();

  return (
    <pre style={{ whiteSpace: 'pre-wrap', padding: 24 }}>
      STATUS: {res.status}

      RESPONSE:
      {text}
    </pre>
  );
}