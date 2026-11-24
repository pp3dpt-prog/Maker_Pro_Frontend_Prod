// Cores geridas no admin (/admin/cores):
//   prod_cores               → paleta global de filamentos (nome, hex, ativo, ordem)
//   prod_designs.cores_config → por design e por parâmetro de cor: { default?, permitidas? }
//   prod_loja_config.cores_livres → se o cliente pode usar o seletor de cor livre
//
// aplicarCores() reescreve o generation_schema antes de ir para o browser, por isso o
// customizador e os editores de imagem recebem já a paleta e a cor por omissão certas.

export interface Cor { nome: string; hex: string; ativo?: boolean; ordem?: number }
export type CoresConfig = Record<string, { default?: string | null; permitidas?: string[] | null }>;

const up = (h: unknown) => String(h ?? '').toUpperCase();

export function parametrosDeCor(schema: any): [string, any][] {
  const params = schema?.parameters;
  if (!params || typeof params !== 'object') return [];
  return Object.entries(params).filter(([, def]: any) => def?.ui?.widget === 'color' || def?.type === 'color');
}

export function aplicarCores(schema: any, cores: Cor[], config: CoresConfig | null | undefined, coresLivres = true): any {
  if (!schema?.parameters || !Array.isArray(cores) || cores.length === 0) return schema;
  const ativas = cores.filter(c => c.ativo !== false).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
  const porHex = new Map(cores.map(c => [up(c.hex), c]));
  const novo = { ...schema, parameters: { ...schema.parameters } };

  for (const [nome, def] of parametrosDeCor(schema)) {
    const cfg = config?.[nome] ?? {};
    let paleta: { nome: string; hex: string }[];
    if (Array.isArray(cfg.permitidas) && cfg.permitidas.length) {
      const set = new Set(cfg.permitidas.map(up));
      paleta = ativas.filter(c => set.has(up(c.hex)));
    } else if (Array.isArray(def?.ui?.paleta) && def.ui.paleta.length) {
      // Paleta própria do design: tira as cores desativadas no admin e usa os nomes do admin
      paleta = def.ui.paleta
        .filter((c: any) => porHex.get(up(c.hex))?.ativo !== false)
        .map((c: any) => ({ nome: porHex.get(up(c.hex))?.nome ?? c.nome, hex: up(c.hex) }));
    } else {
      paleta = ativas;
    }
    paleta = paleta.map(c => ({ nome: c.nome, hex: up(c.hex) }));

    let omissao = cfg.default ? up(cfg.default) : up(def.default);
    if (paleta.length && !paleta.some(c => c.hex === omissao) && !coresLivres && omissao) omissao = paleta[0].hex;

    novo.parameters[nome] = {
      ...def,
      default: def.default === '' && !cfg.default ? '' : omissao,
      ui: { ...(def.ui ?? {}), paleta, ...(coresLivres ? {} : { sem_livre: true }) },
    };
  }
  return novo;
}

export function nomeDaCor(hex: string, cores: Cor[]): string | null {
  return cores.find(c => up(c.hex) === up(hex))?.nome ?? null;
}
