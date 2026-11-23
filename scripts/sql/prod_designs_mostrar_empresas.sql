-- Flag de curadoria: quais designs aparecem no catálogo /empresas (venda a
-- empresas/revendedores). Controlado manualmente no admin (/admin/produtos) —
-- não é automático (nem todo o design que aceita upload de imagem faz
-- sentido para uma empresa).
alter table public.prod_designs
  add column if not exists mostrar_empresas boolean not null default false;
