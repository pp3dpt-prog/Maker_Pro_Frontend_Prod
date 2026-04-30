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
        setProduto(data);
      })
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
      {/* HEADER */}
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 32, color: 'white', marginBottom: 8 }}>
          {produto.nome ?? 'Produto'}
        </h1>
        <p style={{ color: '#94a3b8', maxWidth: 600 }}>
          Configure as dimensões e opções do produto antes de gerar o ficheiro STL.
        </p>
      </header>

      {/* LAYOUT 2 COLUNAS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '380px 1fr',
          gap: 40,
          alignItems: 'start',
        }}
      >
        {/* COLUNA ESQUERDA – PARÂMETROS */}
        <div
          style={{
            border: '1px solid #1e3a8a',
            borderRadius: 12,
            padding: 24,
            background: '#000',
          }}
        >
          <h3
            style={{
              fontSize: 18,
              color: '#e5e7eb',
              marginBottom: 16,
            }}
          >
            Parâmetros
          </h3>

          {/* Sliders existentes */}
          <CustomizadorClient produto={produto} />
        </div>

        {/* COLUNA DIREITA – PREVIEW */}
        <div
          style={{
            border: '1px dashed #334155',
            borderRadius: 12,
            minHeight: 420,
            background: '#020617',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#64748b',
            fontSize: 14,
          }}
        >
          Pré‑visualização 3D do modelo
          <br />
          (em breve)
        </div>
      </div>
    </main>
  );
}