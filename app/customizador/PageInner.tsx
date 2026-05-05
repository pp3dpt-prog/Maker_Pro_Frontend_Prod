'use client';

import { useSearchParams } from 'next/navigation';

export default function PageInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  return (
    <main style={{ padding: 40 }}>
      ✅ Customizador aberto <br />
      ID: {id ?? 'nenhum'}
    </main>
  );
}