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
  credit_cost,
  scad_template,
  generation_schema
)
VALUES (
  'letras-decorativas',
  'Letras Decorativas Personalizadas',
  'letras-decorativas',
  'Letra inicial em 3D com nome decorativo personalizado. Dois ficheiros STL separados para imprimir em cores diferentes e combinar.',
  2,

  -- ── SCAD TEMPLATE ────────────────────────────────────────────────
  $SCAD$
// ══════════════════════════════════════════════════════
//  Letras Decorativas — PP3D.pt
//  corpo_caixa() → Letra Inicial  (ficheiro 1)
//  tampa_caixa() → Nome           (ficheiro 2)
// ══════════════════════════════════════════════════════

// === PARÂMETROS (injectados pelo backend) ===
letra            = "H";
fonte_inicial    = "Moderno";
nome             = "Helena";
fonte_nome       = "Cursiva Elegante";
altura           = 150;
espessura_inicial = 15;
espessura_nome   = 8;
tem_tampa        = 1;   // sempre 1 — gera sempre os dois STLs

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

// ── Letra Inicial ──────────────────────────────────────
module corpo_caixa() {
    linear_extrude(height = espessura_inicial, center = false) {
        text(
            letra,
            size   = altura,
            font   = fonte_inicial_real,
            halign = "center",
            valign = "center"
        );
    }
}

// ── Nome Decorativo ────────────────────────────────────
module tampa_caixa() {
    linear_extrude(height = espessura_nome, center = false) {
        text(
            nome,
            size   = tamanho_nome,
            font   = fonte_nome_real,
            halign = "center",
            valign = "center"
        );
    }
}

// Preview mostra apenas a letra inicial
corpo_caixa();
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
      }
    }
  }'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  nome              = EXCLUDED.nome,
  familia           = EXCLUDED.familia,
  descricao         = EXCLUDED.descricao,
  credit_cost       = EXCLUDED.credit_cost,
  scad_template     = EXCLUDED.scad_template,
  generation_schema = EXCLUDED.generation_schema;
