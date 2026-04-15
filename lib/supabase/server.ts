// lib/supabase/server.ts
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Server-side Supabase client para Server Components (leitura).
 * Next 15+: cookies() é async -> tem de ser awaited. [1](https://nextjs.org/docs/app/api-reference/functions/cookies)
 */
export async function createClient() {
  const cookieStore = await cookies(); // ✅ obrigatório no Next 15+

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      // Em Server Components, evita escrever cookies aqui (no-op)
      set() {},
      remove() {},
    },
  });
}