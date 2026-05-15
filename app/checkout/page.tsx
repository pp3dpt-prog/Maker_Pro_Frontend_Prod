import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CheckoutClient from './CheckoutClient';

interface PageProps {
  searchParams: Promise<{ plan?: string }>;
}

export default async function CheckoutPage({ searchParams }: PageProps) {
  const { plan: planId } = await searchParams;

  if (!planId) redirect('/pricing');

  const supabase = await createClient();

  // Verificar sessão
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/checkout?plan=${planId}`);

  // Buscar dados do plano
  const { data: plano } = await supabase
    .from('prod_planos')
    .select('*')
    .eq('id', planId)
    .single();

  if (!plano) redirect('/pricing');

  // Buscar perfil do utilizador
  const { data: perfil } = await supabase
    .from('prod_perfis')
    .select('plano_id, prod_planos(nome)')
    .eq('id', user.id)
    .maybeSingle();

  const planoAtualNome = (perfil?.prod_planos as { nome?: string } | null)?.nome ?? null;

  return (
    <CheckoutClient
      plano={plano}
      userEmail={user.email ?? ''}
      planoAtualNome={planoAtualNome}
    />
  );
}
