'use client';

import { supabase } from '@/lib/supabaseClient';

export type GerarStlParams = Record<string, string | number | boolean>;

function getApiUrl(): string {
  // NEXT_PUBLIC_* são inlined no build; se não existirem no build, isto vem vazio.
  return (process.env.NEXT_PUBLIC_API_URL ?? '').trim();
}

export async function gerarStl(produtoId: string, params: GerarStlParams) {
  const apiUrl = getApiUrl();

  // IMPORTANTÍSSIMO: isto só pode acontecer quando a função é chamada,
  // não no topo do módulo (senão rebenta o build/prerender só por importar).
  if (!apiUrl) {
    throw new Error('NEXT_PUBLIC_API_URL não definida');
  }

  const { data: { session }, error: sessErr } = await supabase.auth.getSession();

  if (sessErr || !session?.access_token) {
    throw new Error('Utilizador não autenticado (sem sessão).');
  }

  const res = await fetch(`${apiUrl}/gerar-stl-pro`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      id: produtoId,
      ...params,
    }),
  });

  const data = await res.json().catch(() => ({} as any));

  if (!res.ok) {
    throw new Error((data as any)?.error || 'Erro ao gerar STL');
  }

  return data;
}