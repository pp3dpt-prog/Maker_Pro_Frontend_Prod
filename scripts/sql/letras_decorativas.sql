-- ══════════════════════════════════════════════════════════════════
--  Letras Decorativas Personalizadas
--  Dois STLs separados: letra inicial (corpo_caixa) + nome (tampa_caixa)
--  Correr no Supabase SQL Editor em produção.
-- ══════════════════════════════════════════════════════════════════

INSERT INTO public.prod_designs (
  id,
  nome,
  familia,
  descricao,
  scad_template,
  generation_schema
)
VALUES (
  'letras-decorativas',
  'Letras Decorativas Personalizadas',
  'letras-decorativas',
  'Letra inicial em 3D com nome decorativo personalizado. Dois ficheiros STL separados para imprimir em cores diferentes e combinar.',

  -- ── SCAD TEMPLATE ────────────────────────────────────────────────
  $SCAD$
// ══════════════════════════════════════════════════════
//  Letras Decorativas — PP3D.pt
//  Variáveis injetadas pelo backend antes deste template:
//    letra, fonte_inicial, nome, fonte_nome,
//    altura, espessura_inicial, espessura_nome
// ══════════════════════════════════════════════════════

// === MAPEAMENTO DE FONTES ===
// Inicial
fonte_inicial_real =
  fonte_inicial == "Clássico"    ? "Liberation Serif:style=Bold" :
  fonte_inicial == "Arredondado" ? "Ubuntu:style=Bold" :
  "Liberation Sans:style=Bold";  // "Moderno" (default)

// Nome
fonte_nome_real =
  fonte_nome == "Itálico Clássico" ? "Liberation Serif:style=Bold Italic" :
  fonte_nome == "Itálico Moderno"  ? "DejaVu Serif:style=Bold Italic" :
  "URW Chancery L:style=Medium Italic"; // "Cursiva Elegante" (default)

// Tamanho do nome: proporcional à altura da inicial
tamanho_nome = altura * 0.38;

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
        // Recorte do nome — vem da face frontal para dentro (sobreposicao mm de profundidade)
        translate([0, posicao_nome, espessura_inicial - sobreposicao - 0.01])
            linear_extrude(height = sobreposicao + 0.02, center = false)
                silhueta_nome();
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

  -- ── GENERATION SCHEMA ────────────────────────────────────────────
  '{
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
          "options": ["Moderno","Clássico","Arredondado"]
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
          "options": ["Cursiva Elegante","Itálico Clássico","Itálico Moderno"]
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
      "espessura_inicial": {
        "default": 15,
        "min": 10,
        "max": 25,
        "unit": "mm",
        "order": 6,
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
        "order": 7,
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
        "order": 8,
        "ui": {
          "label": "Sobreposição na letra (encaixe)",
          "widget": "slider"
        }
      },
      "posicao_nome": {
        "default": 0,
        "min": -100,
        "max": 100,
        "unit": "mm",
        "order": 9,
        "ui": {
          "label": "Posição vertical do nome",
          "widget": "slider"
        }
      }
    }
  }'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nome              = EXCLUDED.nome,
  familia           = EXCLUDED.familia,
  descricao         = EXCLUDED.descricao,
  scad_template     = EXCLUDED.scad_template,
  generation_schema = EXCLUDED.generation_schema;
