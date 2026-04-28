'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import CustomizadorClient from './CustomizadorClient';

export default function PageInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const familia = searchParams.get('familia');

  const [produto, setProduto] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id && !familia) return;

    const qs = new URLSearchParams();
    if (id) qs.set('id', id);
    if (familia) qs.set('familia', familia);

    fetch(`/api/produto?${qs.toString()}`)
      .then(async (r) => {
        if (!r.ok) {
          const txt = await r.text();
          throw new Error(txt || 'Erro ao carregar produto');
        }
        return r.json();
      })
      .then((data) => {
        console.log('PRODUTO CARREGADO:', data); // ✅ DEBUG FINAL
        setProduto(data);
      })
      .catch((e) => setError(e.message));
  }, [id, familia]);

  if (error) {
    return (
      <div style={{ padding: 24 }}>
        <h2>Erro</h2>
        <pre>{error}</pre>
      </div>
    );
  }

  if (!produto) {
    return <div style={{ padding: 24 }}>A carregar produto…</div>;
  }

  return <CustomizadorClient produto={produto} />;
}