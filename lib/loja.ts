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

// Descrições SEO por categoria (fallback quando a categoria não tem `descricao` definida no admin).
export const CATEGORIA_DESCRICOES: Record<string, string> = {
  'Pet Tags': 'Placas de identificação para animais, personalizadas com o nome, contacto e o que quiseres gravar. Feitas em impressão 3D, resistentes ao uso diário na coleira do teu cão ou gato. Escolhe a forma, a cor e o texto — produzimos e enviamos para todo Portugal, com entrega também na zona de Lisboa, Carnaxide e Oeiras.',
  'Litofânias': 'Litofanias personalizadas a partir de uma foto tua — quando iluminadas por trás, revelam a imagem em detalhe e profundidade. Um presente único para aniversários, casamentos ou datas especiais. Envias a foto, tratamos da conversão e imprimimos em 3D com a qualidade que a memória merece.',
  'HueForge': 'Peças e placas HueForge multicor, impressas em 3D com transições de cor realistas a partir de uma imagem. Ideal para quadros, decoração e presentes personalizados com grande impacto visual. Trabalhamos o ficheiro e a impressão de ponta a ponta.',
  'Porta-chaves': 'Porta-chaves personalizados impressos em 3D — com nome, iniciais, logótipo ou o design que preferires. Peças resistentes e leves, perfeitas para presente ou para o dia a dia. Personaliza a cor e o texto e recebe em casa.',
  'Marcadores': 'Marcadores de livros personalizados e impressos em 3D, em designs originais ou à tua medida. Um pormenor simples que torna qualquer livro — ou prenda — mais especial. Escolhe o modelo e a cor que preferires.',
  'Caixas': 'Caixas personalizadas impressas em 3D, com o tamanho e o design pensados para guardar ou oferecer o que quiseres. Cada caixa é orçamentada à medida das tuas necessidades — fala connosco para o teu projeto.',
};

export function categoriaDescricao(nome: string, descricaoBd?: string | null): string {
  return descricaoBd?.trim() || CATEGORIA_DESCRICOES[nome] || `${nome} personalizados, impressos em 3D em Portugal. Escolhe o design, ajusta ao teu gosto e recebe em casa ou levanta em mãos.`;
}

export function prazoEntrega(
  opts: { stockTotal: number; sobEncomenda: boolean },
  cfg: PrazoConfig = PRAZO_DEFAULT,
): { tipo: 'stock' | 'producao'; label: string; dias: string } {
  if (!opts.sobEncomenda && opts.stockTotal > 0) {
    return { tipo: 'stock', label: 'Em stock', dias: `${cfg.prazo_stock_min} a ${cfg.prazo_stock_max} dias úteis` };
  }
  return { tipo: 'producao', label: 'Por produção', dias: `${cfg.prazo_producao_min} a ${cfg.prazo_producao_max} dias úteis` };
}
