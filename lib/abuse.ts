import { createClient } from '@supabase/supabase-js';

// Detector de abuso simples baseado em contagem de logs recentes.
// Conta acções de um identificador (email ou IP) numa janela de tempo.

let _admin: ReturnType<typeof createClient> | null = null;
function getAdmin() {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _admin = createClient(url, key);
  return _admin;
}

/**
 * Conta quantas vezes um identificador fez uma acção (categoria) na janela.
 * Devolve { bloqueado, total }.
 */
export async function verificarAbuso(
  identificador: string,
  categoria: string,
  max: number,
  janelaSegundos: number
): Promise<{ bloqueado: boolean; total: number }> {
  try {
    const admin = getAdmin();
    if (!admin) return { bloqueado: false, total: 0 };

    const desde = new Date(Date.now() - janelaSegundos * 1000).toISOString();
    const { count } = await admin
      .from('prod_logs')
      .select('id', { count: 'exact', head: true })
      .eq('categoria', categoria)
      .eq('user_email', identificador)
      .gte('created_at', desde);

    const total = count ?? 0;
    return { bloqueado: total >= max, total };
  } catch {
    return { bloqueado: false, total: 0 };
  }
}

/** Extrai um identificador do request: IP do header x-forwarded-for. */
export function getIP(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('x-real-ip') ?? 'desconhecido';
}
