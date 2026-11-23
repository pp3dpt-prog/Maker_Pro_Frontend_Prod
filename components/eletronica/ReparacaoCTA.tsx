'use client';

import { useState } from 'react';
import Link from 'next/link';
import PedidoReparacaoModal from '@/components/PedidoReparacaoModal';

export default function ReparacaoCTA({ loggedIn, email }: { loggedIn: boolean; email?: string | null }) {
  const [open, setOpen] = useState(false);

  if (!loggedIn) {
    return (
      <Link
        href="/login?redirect=/eletronica"
        style={{ padding: '14px 28px', background: '#f59e0b', color: '#1c1203', borderRadius: 12, fontSize: 15, fontWeight: 800, textDecoration: 'none', display: 'inline-block' }}
      >
        Pedir reparação
      </Link>
    );
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{ padding: '14px 28px', background: '#f59e0b', color: '#1c1203', borderRadius: 12, fontSize: 15, fontWeight: 800, border: 'none', cursor: 'pointer' }}
      >
        Pedir reparação
      </button>
      <PedidoReparacaoModal isOpen={open} onClose={() => setOpen(false)} defaultEmail={email ?? ''} />
    </>
  );
}
