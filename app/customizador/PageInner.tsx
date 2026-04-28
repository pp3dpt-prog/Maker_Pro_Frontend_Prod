'use client';

import { useSearchParams } from 'next/navigation';

export default function PageInner() {
  const sp = useSearchParams();

  return (
    <pre style={{ padding: 24 }}>
      QUERY STRING:
      {sp.toString()}

      ID:
      {sp.get('id') ?? 'NULL'}

      FAMILIA:
      {sp.get('familia') ?? 'NULL'}
    </pre>
  );
}