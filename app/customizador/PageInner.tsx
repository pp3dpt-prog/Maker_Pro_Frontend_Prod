'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import CustomizadorClient from './CustomizadorClient';

export default function PageInner() {
  const searchParams = useSearchParams();
  const [produto, setProduto] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const qs = searchParams.toString();

    fetch(`/api/produto?${qs}`)
      .then(r => {
        if (!r.ok) throw new Error('Erro ao carregar produto');
        return r.json();
      })
      .then(setProduto)
      .catch(e => setError(e.message));
  }, [searchParams]);

  if (error) {
    return <div style={{ padding: 24 }}>{error}</div>;
  }

  if (!produto) {
    return <div style={{ padding: 24 }}>A carregar produto…</div>;
  }

  return <CustomizadorClient produto={produto} />;
}