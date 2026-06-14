// Helpers e constantes partilhados pela Loja (admin + público). Puro, sem imports de servidor.

// Convite do Discord (usado na mensagem de preços ao maker).
export const DISCORD_URL = 'https://discord.gg/cNK85ZQgGe';

// Personas que NÃO veem preços (ver docs/plano-loja.md).
export const MAKER_TIPOS = ['maker', 'ambos'];
export function isMakerTipo(tipo?: string | null): boolean {
  return !!tipo && MAKER_TIPOS.includes(tipo);
}

// "Marcador Bonito" -> "marcador-bonito"
export function slugify(txt: string): string {
  return txt
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// 1999 (cents) -> "19,99 €"
export function eur(cents?: number | null): string {
  if (cents == null) return '—';
  return (cents / 100).toLocaleString('pt-PT', { style: 'currency', currency: 'EUR' });
}

// ── Prazo de entrega (em stock vs por produção) ──
export interface PrazoConfig {
  prazo_stock_min: number; prazo_stock_max: number;
  prazo_producao_min: number; prazo_producao_max: number;
}
export const PRAZO_DEFAULT: PrazoConfig = { prazo_stock_min: 1, prazo_stock_max: 3, prazo_producao_min: 3, prazo_producao_max: 5 };

export function prazoEntrega(
  opts: { stockTotal: number; sobEncomenda: boolean },
  cfg: PrazoConfig = PRAZO_DEFAULT,
): { tipo: 'stock' | 'producao'; label: string; dias: string } {
  if (!opts.sobEncomenda && opts.stockTotal > 0) {
    return { tipo: 'stock', label: 'Em stock', dias: `${cfg.prazo_stock_min} a ${cfg.prazo_stock_max} dias úteis` };
  }
  return { tipo: 'producao', label: 'Por produção', dias: `${cfg.prazo_producao_min} a ${cfg.prazo_producao_max} dias úteis` };
}
