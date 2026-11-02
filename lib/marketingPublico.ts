// Público-alvo das publicações geradas com IA.
export type Publico = 'clientes' | 'makers';

export const CONTEXTO_PUBLICO: Record<Publico, string> = {
  clientes: `PÚBLICO: clientes finais que compram o produto já impresso e entregue em casa.
Foco: personalização, presente, uso no dia a dia, ver em 3D antes de encomendar.`,
  makers: `PÚBLICO: makers — pessoas com impressora 3D (ou acesso a uma) que gostam de fazer e personalizar.
Foco: a plataforma pp3d.pt gera ficheiros STL paramétricos à medida (ajustas medidas, forma e texto com
sliders e pré-visualização 3D em tempo real, sem saber CAD), descarregas o STL e imprimes na tua máquina.
Ângulos úteis: poupar horas de modelação, ajustar ao milímetro (caixas para PCB/Raspberry Pi, suportes,
etiquetas), tolerâncias e dobradiças que já vêm resolvidas, ideias para vender produtos personalizados
(a venda de peças feitas com os modelos exige licença ativa na conta, não prometas mais do que isso).
Tom de comunidade maker: técnico mas acessível, usa termos como STL, PLA, camadas, tolerância, sem jargão desnecessário.
Call-to-action: experimentar o gerador em pp3d.pt/makers. Não inventes preços, créditos, planos nem descontos.`,
};
