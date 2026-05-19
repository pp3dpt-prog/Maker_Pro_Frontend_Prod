import { Suspense } from 'react';
import PageInner from './PageInner';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={<div style={{ padding: 24, color: 'white' }}>A carregar…</div>}>
      <PageInner />
    </Suspense>
  );
}
