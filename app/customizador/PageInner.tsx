'use client';

import CustomizadorClient from './CustomizadorClient';

type Props = {
  produto: {
    id: string;
    parametros_default: Record<string, any>;
  };
};

export default function PageInner({ produto }: Props) {
  return (
    <main>
      <CustomizadorClient
        designId={produto.id}
        initialParams={produto.parametros_default}
      />
    </main>
  );
}