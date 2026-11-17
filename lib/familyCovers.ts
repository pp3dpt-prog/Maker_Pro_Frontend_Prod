// Capas curadas por família — colagem com fotos reais dos produtos, feita à mão.
// Para famílias sem entrada aqui, usamos a capa escolhida no admin (/admin/produtos)
// ou, na falta dessa, a primeira miniatura de produto disponível.
export const FAMILY_COVERS: Record<string, string> = {
  'bases para copos': '/capas-familias/bases-para-copos.jpg',
  'caixas & organização': '/capas-familias/caixas-organizacao.jpg',
  'etiquetas': '/capas-familias/etiquetas.jpg',
  'iluminárias': '/capas-familias/iluminarias.jpg',
  'marcadores de livro': '/capas-familias/marcadores-de-livro.jpg',
  'pet-tags': '/capas-familias/pet-tags.jpg',
  'porta-chaves': '/capas-familias/porta-chaves.jpg',
};

export function familyCoverFor(familia: string, fallback?: string): string | undefined {
  return FAMILY_COVERS[familia.toLowerCase()] ?? fallback;
}
