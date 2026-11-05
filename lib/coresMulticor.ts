// Cores das peças nos modelos multicor (generation_schema.multicor), para a pré-visualização.
//
// Os params de cor são #RRGGBB; um valor inválido ou em falta usa a cor por omissão.
// "Sem AMS" (select `impressao`) quer dizer uma só troca de cor: tudo o que está em relevo
// (texto, borda, rebordo) sai no mesmo filamento — a pré-visualização tem de mostrar isso.

export function corOu(v: unknown, omissao: string): string {
  return typeof v === 'string' && /^#[0-9a-f]{6}$/i.test(v) ? v : omissao;
}

export function semAms(params: Record<string, any> | null | undefined): boolean {
  return /^sem/i.test(String(params?.impressao ?? '').trim());
}

/** Pet tags: medalha, nome em relevo e rebordo. */
export const CORES_PET_TAG = { base: '#FACC15', texto: '#111111', borda: '#111111' };

export function coresPetTag(params: Record<string, any> | null | undefined) {
  const texto = corOu(params?.cor_texto, CORES_PET_TAG.texto);
  return {
    base: corOu(params?.cor_base, CORES_PET_TAG.base),
    texto,
    borda: semAms(params) ? texto : corOu(params?.cor_borda, CORES_PET_TAG.borda),
  };
}
