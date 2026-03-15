import { createClient } from '@supabase/supabase-js';

// 1. Lê as variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// A palavra 'export' é OBRIGATÓRIA aqui para o ExploreView conseguir importar
export const supabase = createClient(supabaseUrl, supabaseAnonKey);