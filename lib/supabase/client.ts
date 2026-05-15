'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

// createBrowserClient gere cookies automaticamente — necessário para que o
// servidor (middleware, Server Components) consiga ler a sessão do cliente.
let _client: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (_client) return _client;
  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return _client;
}

export const supabase = createClient();
