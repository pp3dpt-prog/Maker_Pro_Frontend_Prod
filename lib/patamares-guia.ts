// Guia de troca de filamento para o "Porta-chaves texto com patamares"
// (templates/portachaves_nome_multicor.scad, Docker). O STL não carrega cor —
// cada nível é impresso com um filamento diferente, trocado à mão a meio da
// impressão. `altura` é a espessura (mm) de cada nível; a peça deste design
// nunca tem mais de 3 níveis.
export function buildGuiaCoresPatamares(opts: {
  nome: string;
  numCores: number;
  altura: number;
  cores: string[];
}): string {
  const { nome, numCores, altura, cores } = opts;
  const n = Math.max(1, Math.min(3, numCores));
  const linhas: string[] = [`Guia de cores — Porta-chaves "${nome}"`, ''];

  for (let i = 0; i < n; i++) {
    const z0 = (i * altura).toFixed(1);
    const z1 = ((i + 1) * altura).toFixed(1);
    const ultimo = i === n - 1;
    const cor = cores[i] ?? '—';
    linhas.push(`Nível ${i + 1}: ${z0}mm → ${z1}mm — cor ${cor}${ultimo ? ' (topo)' : ''}`);
    if (!ultimo) {
      linhas.push(`  ⏸ Pausa a impressão aos ${z1}mm e troca para a cor do Nível ${i + 2} (${cores[i + 1] ?? '—'})`);
    }
  }

  return linhas.join('\n');
}
