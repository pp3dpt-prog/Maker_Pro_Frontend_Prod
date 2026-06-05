import { createClient } from '@supabase/supabase-js';

// Logger server-side — escreve eventos na tabela prod_logs.
// Nunca lança erro: logging falhado não deve quebrar a aplicação.

type LogLevel = 'info' | 'warn' | 'error';

let _admin: ReturnType<typeof createClient> | null = null;
function getAdmin() {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _admin = createClient(url, key);
  return _admin;
}

export async function logEvento(
  level: LogLevel,
  categoria: string,
  mensagem: string,
  contexto?: Record<string, unknown>,
  userEmail?: string
): Promise<void> {
  try {
    const admin = getAdmin();
    if (!admin) return;
    await admin.from('prod_logs').insert({
      level,
      categoria,
      mensagem,
      contexto: contexto ?? null,
      user_email: userEmail ?? null,
    });
  } catch {
    /* logging nunca quebra o fluxo */
  }
}

// Atalhos
export const logInfo  = (cat: string, msg: string, ctx?: Record<string, unknown>, email?: string) => logEvento('info', cat, msg, ctx, email);
export const logWarn  = (cat: string, msg: string, ctx?: Record<string, unknown>, email?: string) => logEvento('warn', cat, msg, ctx, email);
export const logError = (cat: string, msg: string, ctx?: Record<string, unknown>, email?: string) => logEvento('error', cat, msg, ctx, email);
