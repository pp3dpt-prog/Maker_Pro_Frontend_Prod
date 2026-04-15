'use client';

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton (uma instância para toda a app)
let _client: SupabaseClient | null = null;

/**
 * Compatibilidade: módulos que fazem `import { createClient } from '@/lib/supabase/client'`
 * passam a funcionar.
 */
export function createClient(): SupabaseClient {
  if (_client) return _client;

  _client = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: 'pkce',
    },
  });

  return _client;
}

/**
 * Compatibilidade extra: módulos que fazem `import { supabase } from '@/lib/supabase/client'`
 */
export const supabase = createClient();