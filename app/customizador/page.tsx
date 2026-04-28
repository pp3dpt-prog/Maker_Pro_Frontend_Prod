'use client';

import { useEffect, useState } from 'react';
import CustomizadorClient from './CustomizadorClient';

export default function Page({
  searchParams,
}: {
  searchParams?: { id?: string; familia?: string };
}) {
  const [produto, setProduto] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const qs = new URLSearchParams(searchParams as any).toString();

    fetch(`/api/produto?${qs}`)
      .then((r) => {
        if (!r.ok) throw new Error('Erro ao carregar produto');
        return r.json();
      })
      .then(setProduto)
      .catch((e) => setError(e.message));
  }, [searchParams]);

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Erro</h2>
        <p>{error}</p>
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
