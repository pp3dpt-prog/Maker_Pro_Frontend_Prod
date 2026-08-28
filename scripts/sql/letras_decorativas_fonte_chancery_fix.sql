-- ══════════════════════════════════════════════════════════════════
--  Letras Decorativas — corrige o nome da fonte "Cursiva Elegante"
--  O pacote Debian fonts-urw-base35 (instalado agora no backend Docker)
--  regista este tipo de letra com o nome de família "Z003", não "URW
--  Chancery L" — confirmado no ficheiro fontconfig oficial do projecto
--  (github.com/ArtifexSoftware/urw-base35-fonts, urw-z003.conf). Com o
--  nome errado, o OpenSCAD fazia fallback silencioso para outra fonte,
--  por isso o STL saía sempre igual independentemente da fonte escolhida.
--  Correr no Supabase SQL Editor em produção. Não altera `estado`.
-- ══════════════════════════════════════════════════════════════════

UPDATE public.prod_designs
SET scad_template = replace(
  scad_template,
  '"URW Chancery L:style=Medium Italic"',
  '"Z003:style=Medium Italic"'
)
WHERE id = 'letras-decorativas';

-- Confirmar (deve mostrar "Z003:style=Medium Italic" na linha da fonte_nome_real):
-- SELECT scad_template FROM public.prod_designs WHERE id = 'letras-decorativas';
