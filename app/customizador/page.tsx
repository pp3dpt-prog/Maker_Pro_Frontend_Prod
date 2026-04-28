'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import CustomizadorClient from './CustomizadorClient';

export default function Page() {
  const searchParams = useSearchParams();
  const [produto, setProduto] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const qs = searchParams.toString();

    fetch(`/api/produto?${qs}`)
      .then(async (r) => {
        if (!r.ok) {
          const text = await r.text();
          throw new Error(`API error ${r.status}: ${text}`);
        }
        return r.json();
      })
      .then(setProduto)
      .catch((e) => setError(e.message));
  }, [searchParams]);

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Erro</h2>
        <pre>{error}</pre>
      </div>
    );
  }

  if (!produto) {
    return (
      <div style={{ padding: 24 }}>
        <p>A carregar produto…</p>
      </div>
    );
  }

  return <CustomizadorClient produto={produto} />;
}
``
