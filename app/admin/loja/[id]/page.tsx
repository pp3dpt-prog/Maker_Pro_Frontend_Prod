import ProductEditor from '@/components/admin/loja/ProductEditor';

export default async function EditarProdutoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProductEditor produtoId={id} />;
}
