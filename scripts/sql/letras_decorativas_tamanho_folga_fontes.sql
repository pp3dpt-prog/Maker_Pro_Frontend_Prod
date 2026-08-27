-- ══════════════════════════════════════════════════════════════════
--  Letras Decorativas — 3 correções pedidas ao testar:
--   1. "Tamanho da letra" deixa de arrastar o tamanho do nome com ele
--      (tamanho_nome passa a parâmetro independente, antes vinha fixo
--      em altura*0.38).
--   2. Novo parâmetro "folga" — o recorte onde o nome encaixa fica um
--      pouco maior que o nome (offset uniforme), para o encaixe físico
--      não ficar demasiado apertado a imprimir em duas peças.
--   3. Mais opções de fonte, reaproveitando as fontes decorativas já
--      usadas no porta-chaves (Aladin, Chewy, Pacifico, ...) — já estão
--      instaladas no backend Docker, usadas tal e qual (sem aproximação).
--  Correr no Supabase SQL Editor em produção. Não altera `estado` —
--  o design continua em rascunho.
-- ══════════════════════════════════════════════════════════════════

UPDATE public.prod_designs
SET
  scad_template = $SCAD$
// ══════════════════════════════════════════════════════
//  Letras Decorativas — PP3D.pt
//  Variáveis injetadas pelo backend antes deste template:
//    letra, fonte_inicial, nome, fonte_nome,
//    altura, tamanho_nome, espessura_inicial, espessura_nome,
//    sobreposicao, folga
// ══════════════════════════════════════════════════════

// === MAPEAMENTO DE FONTES ===
// Nomes especiais mapeiam para fontes "de sistema"; qualquer outro
// valor (fontes decorativas: Chewy, Pacifico, Lobster, ...) é usado
// tal e qual, exactamente como no porta-chaves.
fonte_inicial_real =
  fonte_inicial == "Clássico"    ? "Liberation Serif:style=Bold" :
  fonte_inicial == "Arredondado" ? "Ubuntu:style=Bold" :
  fonte_inicial == "Moderno"     ? "Liberation Sans:style=Bold" :
  fonte_inicial;

fonte_nome_real =
  fonte_nome == "Itálico Clássico" ? "Liberation Serif:style=Bold Italic" :
  fonte_nome == "Itálico Moderno"  ? "DejaVu Serif:style=Bold Italic" :
  fonte_nome == "Cursiva Elegante" ? "URW Chancery L:style=Medium Italic" :
  fonte_nome;

// ── Silhueta 2D do nome (partilhada entre recorte e peça) ─
module silhueta_nome() {
    text(
        nome,
        size   = tamanho_nome,
        font   = fonte_nome_real,
        halign = "center",
        valign = "center"
    );
}

// Silhueta do nome com folga extra — só para o recorte, para a peça
// do nome (impressa à parte) encaixar sem ficar demasiado apertada.
module silhueta_nome_folga() {
    offset(delta = folga)
        silhueta_nome();
}

// ── Letra Inicial com recorte onde o nome encaixa ─────
module corpo_caixa() {
    difference() {
        // Letra sólida
        linear_extrude(height = espessura_inicial, center = false) {
            text(
                letra,
                size   = altura,
                font   = fonte_inicial_real,
                halign = "center",
                valign = "center"
            );
        }
        // Recorte do nome — vem da face frontal para dentro (sobreposicao mm
        // de profundidade), com folga extra para o encaixe não ficar apertado
        translate([0, posicao_nome, espessura_inicial - sobreposicao - 0.01])
            linear_extrude(height = sobreposicao + 0.02, center = false)
                silhueta_nome_folga();
    }
}

// ── Nome Decorativo (encaixa no recorte da letra) ─────
module tampa_caixa() {
    linear_extrude(height = espessura_nome, center = false)
        silhueta_nome();
}

// ── Renderização consoante o modo ─────────────────────
// modo="corpo"  → download da letra com recorte (STL 1)
// modo="tampa"  → download do nome (STL 2)
// outro         → preview montado
if (modo == "corpo") {
    corpo_caixa();
} else if (modo == "tampa") {
    tampa_caixa();
} else {
    // Preview: letra com recorte + nome encaixado
    corpo_caixa();
    translate([0, posicao_nome, espessura_inicial - sobreposicao])
        tampa_caixa();
}
$SCAD$,

  -- 1. Mais opções de fonte (junta as decorativas às já existentes)
  generation_schema = jsonb_set(
    jsonb_set(
      generation_schema,
      '{parameters,fonte_inicial,options}',
      (generation_schema #> '{parameters,fonte_inicial,options}')
        || '["Aladin","Amarante","Anton","Baloo 2","Benne","Chewy","Gloria Hallelujah","Lobster","Luckiest Guy","Oswald","Pacifico","Press Start 2P","Racing Sans One","Sigmar One"]'::jsonb,
      true
    ),
    '{parameters,fonte_nome,options}',
    (generation_schema #> '{parameters,fonte_nome,options}')
      || '["Aladin","Amarante","Anton","Baloo 2","Benne","Chewy","Gloria Hallelujah","Lobster","Luckiest Guy","Oswald","Pacifico","Press Start 2P","Racing Sans One","Sigmar One"]'::jsonb,
    true
  )
WHERE id = 'letras-decorativas';

-- 2. Novo parâmetro tamanho_nome (independente do tamanho da letra)
--    order 5.5 — fica logo a seguir a "Tamanho da letra" (order 5)
UPDATE public.prod_designs
SET generation_schema = jsonb_set(
  generation_schema,
  '{parameters,tamanho_nome}',
  '{"default":57,"min":20,"max":150,"unit":"mm","order":5.5,"ui":{"label":"Tamanho do nome (mm)","widget":"slider"}}'::jsonb,
  true
)
WHERE id = 'letras-decorativas';

-- 3. Novo parâmetro folga (clearance do encaixe)
--    order 8.5 — fica logo a seguir a "Sobreposição na letra" (order 8)
UPDATE public.prod_designs
SET generation_schema = jsonb_set(
  generation_schema,
  '{parameters,folga}',
  '{"default":0.3,"min":0.1,"max":1,"step":0.05,"unit":"mm","order":8.5,"ui":{"label":"Folga do encaixe (mm)","widget":"slider"}}'::jsonb,
  true
)
WHERE id = 'letras-decorativas';

-- Confirmar:
-- SELECT generation_schema->'parameters'->'fonte_inicial'->'options' AS fontes_letra,
--        generation_schema->'parameters'->'fonte_nome'->'options'    AS fontes_nome,
--        generation_schema->'parameters'->'tamanho_nome' AS tamanho_nome,
--        generation_schema->'parameters'->'folga'        AS folga
-- FROM public.prod_designs WHERE id = 'letras-decorativas';
