import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CheckoutClient from './CheckoutClient';

interface PageProps {
  searchParams: Promise<{ plan?: string; intervalo?: string }>;
}

export default async function CheckoutPage({ searchParams }: PageProps) {
  const { plan: planId, intervalo } = await searchParams;
  const billingInterval = intervalo === 'anual' ? 'anual' : 'mensal';

  if (!planId) redirect('/pricing');

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?redirect=/checkout?plan=${planId}&intervalo=${billingInterval}`);

  const { data: plano } = await supabase
    .from('prod_planos')
    .select('*')
    .eq('id', planId)
    .single();

  if (!plano) redirect('/pricing');

  const { data: perfil } = await supabase
    .from('prod_perfis')
    .select('plano_id, role, prod_planos(nome)')
    .eq('id', user.id)
    .maybeSingle();

  const planoAtualNome = (perfil?.prod_planos as { nome?: string } | null)?.nome ?? null;
  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdmin = perfil?.role === 'admin'
    || (!!adminEmail && user.email?.toLowerCase() === adminEmail.toLowerCase());

  return (
    <CheckoutClient
      plano={plano}
      intervalo={billingInterval}
      userEmail={user.email ?? ''}
      planoAtualNome={planoAtualNome}
      isAdmin={isAdmin}
    />
  );
}
