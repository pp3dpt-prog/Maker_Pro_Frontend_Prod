'use client';

import { supabase } from '@/lib/supabaseClient';

const API_URL = process.env.NEXT_PUBLIC_API_URL!;

if (!API_URL) {
  throw new Error('NEXT_PUBLIC_API_URL não definida');
}

export type GerarStlParams = Record<string, string | number | boolean>;

export async function gerarStl(
  produtoId: string,
  params: GerarStlParams
) {
  // 1️⃣ Obter sessão do Supabase (browser only)
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session) {
    throw new Error('Utilizador não autenticado');
  }

  // 2️⃣ Pedido ao backend com Authorization Bearer
  const response = await fetch(`${API_URL}/gerar-stl-pro`, {
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

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || 'Erro ao gerar STL');
  }

  /**
   * Esperado:
   * {
   *   success: true,
   *   storagePath: "users/<uid>/produto_hash.stl"
   * }
   */
  return response.json();
}