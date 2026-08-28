-- ══════════════════════════════════════════════════════════════════
--  Letras Decorativas — REPARAÇÃO
--  A migração anterior (letras_decorativas_tamanho_folga_fontes.sql)
--  provavelmente reduziu generation_schema a NULL: os operadores
--  jsonb_set/`||` do Postgres são "strict" — se algum caminho não
--  existir exactamente como esperado, o resultado colapsa para NULL,
--  em vez de dar erro. Este script substitui `scad_template` e
--  `generation_schema` inteiros por valores completos e explícitos
--  (sem merges encadeados), corrigindo o problema seja qual for o
--  estado actual da linha. Não altera `estado` — continua rascunho.
--  Correr no Supabase SQL Editor em produção.
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

  generation_schema = '{
    "parameters": {
      "letra": {
        "default": "H",
        "order": 1,
        "ui": {
          "label": "Letra inicial",
          "widget": "select",
          "options": ["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"]
        }
      },
      "fonte_inicial": {
        "default": "Moderno",
        "order": 2,
        "ui": {
          "label": "Estilo da letra",
          "widget": "select",
          "options": ["Moderno","Clássico","Arredondado","Aladin","Amarante","Anton","Baloo 2","Benne","Chewy","Gloria Hallelujah","Lobster","Luckiest Guy","Oswald","Pacifico","Press Start 2P","Racing Sans One","Sigmar One"]
        }
      },
      "nome": {
        "default": "Helena",
        "order": 3,
        "ui": {
          "label": "Nome",
          "widget": "text",
          "placeholder": "Escreve o nome aqui"
        }
      },
      "fonte_nome": {
        "default": "Cursiva Elegante",
        "order": 4,
        "ui": {
          "label": "Estilo do nome",
          "widget": "select",
          "options": ["Cursiva Elegante","Itálico Clássico","Itálico Moderno","Aladin","Amarante","Anton","Baloo 2","Benne","Chewy","Gloria Hallelujah","Lobster","Luckiest Guy","Oswald","Pacifico","Press Start 2P","Racing Sans One","Sigmar One"]
        }
      },
      "altura": {
        "default": 150,
        "min": 80,
        "max": 250,
        "unit": "mm",
        "order": 5,
        "ui": {
          "label": "Tamanho da letra",
          "widget": "slider"
        }
      },
      "tamanho_nome": {
        "default": 57,
        "min": 20,
        "max": 150,
        "unit": "mm",
        "order": 6,
        "ui": {
          "label": "Tamanho do nome (mm)",
          "widget": "slider"
        }
      },
      "espessura_inicial": {
        "default": 15,
        "min": 10,
        "max": 25,
        "unit": "mm",
        "order": 7,
        "ui": {
          "label": "Espessura da letra",
          "widget": "slider"
        }
      },
      "espessura_nome": {
        "default": 8,
        "min": 5,
        "max": 15,
        "unit": "mm",
        "order": 8,
        "ui": {
          "label": "Espessura do nome",
          "widget": "slider"
        }
      },
      "sobreposicao": {
        "default": 3,
        "min": 0,
        "max": 15,
        "unit": "mm",
        "order": 9,
        "ui": {
          "label": "Sobreposição na letra (encaixe)",
          "widget": "slider"
        }
      },
      "folga": {
        "default": 0.3,
        "min": 0.1,
        "max": 1,
        "step": 0.05,
        "unit": "mm",
        "order": 10,
        "ui": {
          "label": "Folga do encaixe (mm)",
          "widget": "slider"
        }
      },
      "posicao_nome": {
        "default": 0,
        "min": -100,
        "max": 100,
        "unit": "mm",
        "order": 11,
        "ui": {
          "label": "Posição vertical do nome",
          "widget": "slider"
        }
      },
      "cor_letra": {
        "default": "#16d8aa",
        "order": 12,
        "ui": {
          "label": "Cor da letra",
          "widget": "color"
        }
      },
      "cor_nome": {
        "default": "#f3f3f0",
        "order": 13,
        "ui": {
          "label": "Cor do nome",
          "widget": "color"
        }
      }
    }
  }'::jsonb
WHERE id = 'letras-decorativas';

-- Confirmar (deve devolver 1 linha, com parameters preenchido):
-- SELECT id, nome, estado,
--        jsonb_object_keys(generation_schema->'parameters') AS parametro
-- FROM public.prod_designs WHERE id = 'letras-decorativas';
