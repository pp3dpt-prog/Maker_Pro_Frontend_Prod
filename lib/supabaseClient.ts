'use client';

import { createClient } from '@/lib/supabase/client';

// Mantém compatibilidade com imports existentes: `import { supabase } from '@/lib/supabaseClient'`
export const supabase = createClient();