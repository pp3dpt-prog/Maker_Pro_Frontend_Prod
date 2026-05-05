'use client';

import { useSearchParams } from 'next/navigation';
import CustomizadorClient from './CustomizadorClient';

export default function PageInner() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  if (!id) {
    return <div>ID em falta</div>;
  }

  return <CustomizadorClient designId={id} />;
}
