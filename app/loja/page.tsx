import { redirect } from 'next/navigation';

// A loja vive agora na raiz (pp3d.pt). /loja redireciona para evitar conteúdo duplicado.
export default function LojaPage() {
  redirect('/');
}
