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
      .then(setProduto)
      .catch((e) => setError(e.message));
  }, [id, familia]);

  if (error) {
    return (
      <div style={{ padding: 40, color: 'white' }}>
        <h2>Erro</h2>
        <p>{error}</p>
      </div>
    );
  }

  if (!produto) {
    return (
      <div style={{ padding: 40, color: '#94a3b8' }}>
        A carregar produto…
      </div>
    );
  }

  return (
    <main style={{ padding: 40, maxWidth: 1400, margin: '0 auto' }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, color: 'white', marginBottom: 8 }}>
          {produto.nome}
        </h1>
        <p style={{ color: '#94a3b8', maxWidth: 600 }}>
          Configure as dimensões e opções do produto antes de gerar o ficheiro STL.
        </p>
      </header>

      {/* ✅ O layout e o preview vivem no CustomizadorClient */}
      <CustomizadorClient produto={produto} />
    </main>
  );
}