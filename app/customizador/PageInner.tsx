
import CustomizadorClient from './CustomizadorClient';

export default function PageInner({ produto }: { produto: any }) {
  return (
    <main>
      <CustomizadorClient
        designId={produto.id}
        initialParams={produto.parametros_default}
      />
    </main>
  );
}
