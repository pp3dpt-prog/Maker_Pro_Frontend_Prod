# Plano — Módulo de Loja Online + área `/makers`

> Estado: **aprovado para implementação**. Modelo de preços = **opção B** (visitante e cliente veem
> preços; maker não vê).
> Última atualização: 2026-06-12.

---

## 1. Visão geral

Adicionar à app (Next.js 16 / App Router, Supabase, Stripe + ifthenpay, Vercel) **um único deploy, um
único login**:

- **Loja** em `pp3d.pt` — montra pública de produtos físicos + personalizadores. Link discreto
  "Makers →" no topo.
- **`/makers`** — área digital, exige login. Catálogo de designs com regras de gratuito/pago/exclusivo
  e downloads.
- **`/admin/loja`** — gestão de produtos, stock, fotos, preços, categorias, encomendas (padrão do
  `/admin` atual).

Não é uma reescrita: o catálogo de personalizadores já existe (`prod_designs`, `/produtos`,
`/customizador`). A loja física e o gating por role são o que se acrescenta.

---

## 2. Personas — usar `prod_perfis.tipo_utilizador` (JÁ EXISTE)

A pergunta da impressora **já está implementada** em `app/bem-vindo/page.tsx`, gravando
`prod_perfis.tipo_utilizador` com 3 valores. `role` é só para admin — **não se mexe**.

| Persona | Login | `tipo_utilizador` | Vê preços | Downloads /makers |
|---|:---:|---|:---:|:---:|
| Visitante | ❌ | — | ✅ | ❌ |
| Consumidor | ✅ | `consumidor` | ✅ | ❌ |
| Maker | ✅ | `maker` | ❌ (msg Discord/ticket) | ✅ |
| Ambos | ✅ | `ambos` | ❌ (msg Discord/ticket) | ✅ |
| Admin | ✅ | (qualquer) + `role='admin'` | ✅ | ✅ |

> **Regra final:** `tipo_utilizador IN ('maker','ambos')` → **esconde preços** (mensagem Discord/ticket)
> **e** dá acesso a downloads em `/makers`. `consumidor` (e visitante) → vê preços, sem downloads.

### Matriz — Loja física (`pp3d.pt`) — opção B

| | Vê produtos | Vê **preços** | Compra |
|---|:---:|:---:|:---:|
| Visitante | ✅ | ✅ | precisa login |
| Cliente | ✅ | ✅ | ✅ |
| Maker | ✅ | ❌ → "preços não disponíveis — fala no Discord ou abre ticket" | ❌ |
| Admin | ✅ | ✅ | ✅ |

### Matriz — `/makers` (digital, exige login)

| Tipo de design | Download |
|---|---|
| Não-exclusivo **gratuito** (`gratuito=true`) | ✅ qualquer maker |
| Não-exclusivo **pago** (`gratuito=false`) | ✅ se `downloads_limite − downloads_mes > 0` **ou** comprar avulso |
| **Exclusivo** (`estado='exclusivo'`) | 🔒 bloqueado → "fazer upgrade ao plano" |

- "Downloads disponíveis" = sistema de créditos já existente (`prod_perfis.downloads_limite` /
  `downloads_mes`, renovado pelo cron `/api/cron/recarregar-creditos`).
- Compra avulsa do ficheiro já existe (`/api/stripe/download-avulso`).
- **A geração/preview do STL exige login; o download do ficheiro só acontece dentro de `/makers`** e é
  validado server-side (não contornável pelo URL).

---

## 3. Routing (App Router + route groups)

Os `(grupo)` não aparecem no URL — só dão layout próprio a cada zona.

```
app/
 ├─ (loja)/                         # layout: header com preços + carrinho + link discreto "Makers →"
 │   ├─ layout.tsx
 │   ├─ page.tsx  (ou loja/)        → pp3d.pt = LOJA (físicos + personalizadores)
 │   ├─ loja/[categoria]/page.tsx   → /loja/ferramentas
 │   ├─ produto/[slug]/page.tsx     → página de produto (OG tags + partilha social)
 │   └─ carrinho/page.tsx
 ├─ (makers)/                       # layout próprio, sem carrinho, identidade "maker"
 │   ├─ layout.tsx
 │   └─ makers/page.tsx             → /makers  (catálogo digital + downloads)
 ├─ admin/loja/                     # gestão
 │   ├─ page.tsx                    (lista de produtos + stock inline)
 │   ├─ novo/page.tsx
 │   ├─ [id]/page.tsx               (editar: stock, fotos, preço, design_id)
 │   └─ categorias/page.tsx
 └─ (intactos: /produtos /familia /customizador /pricing — continuam no sitemap)
```

A visibilidade de preços e o gating de downloads resolvem-se com `role` + créditos, lidos de
`prod_perfis` (+ `prod_planos`), exatamente como já é feito em `app/produtos/page.tsx` e `middleware.ts`.

---

## 4. Modelo de dados (SQL Supabase)

### 4.1 Alterações a tabelas existentes

```sql
-- Role passa a distinguir maker/cliente (além de admin)
-- valores: 'admin' | 'maker' | 'cliente' | null
-- (sem migração destrutiva; novos registos gravam o valor certo)

-- Designs: dividir não-exclusivos em gratuito/pago + preço de compra avulsa
alter table prod_designs add column if not exists gratuito boolean default false;
alter table prod_designs add column if not exists preco_digital_cents int;  -- compra avulsa do pago
```

### 4.2 Tabelas novas (loja física)

```sql
create table prod_loja_categorias (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nome text not null,
  descricao text,
  imagem_url text,
  ordem int default 0,
  ativo boolean default true,
  created_at timestamptz default now()
);

create table prod_loja_produtos (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nome text not null,
  descricao text,
  categoria_id uuid references prod_loja_categorias(id) on delete set null,
  preco_cents int not null,                -- preço base (variantes podem fazer override)
  preco_promo_cents int,
  stock int not null default 0,            -- usado só em produtos SEM variantes
  portes_cents int,                        -- override por produto (null = usa config global)
  design_id uuid references prod_designs(id) on delete set null, -- liga ao personalizador
  permite_personalizar boolean default false,                   -- botão → /customizador?id=design_id
  estado text not null default 'rascunho',                      -- rascunho | ativo | inativo
  peso_gramas int,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Variantes (cor + tamanho). Produto com variantes: stock vive aqui, não no produto.
create table prod_loja_variantes (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid references prod_loja_produtos(id) on delete cascade,
  cor text,                                -- ex: 'Preto'  (null se a dimensão não se aplica)
  tamanho text,                            -- ex: 'M' / '20cm'
  sku text,
  stock int not null default 0,
  preco_cents int,                         -- override do preço base (null = herda do produto)
  ordem int default 0,
  ativo boolean default true,
  unique (produto_id, cor, tamanho)
);

create table prod_loja_imagens (
  id uuid primary key default gen_random_uuid(),
  produto_id uuid references prod_loja_produtos(id) on delete cascade,
  variante_id uuid references prod_loja_variantes(id) on delete cascade, -- foto específica da cor (opcional)
  url text not null,
  alt text,
  ordem int default 0
);

-- Config global da loja (singleton) — portes editáveis no admin
create table prod_loja_config (
  id int primary key default 1,
  portes_cents int not null default 0,           -- portes base
  portes_gratis_acima_cents int,                 -- envio grátis acima deste total (null = nunca)
  check (id = 1)
);
insert into prod_loja_config (id, portes_cents) values (1, 0) on conflict do nothing;

create table prod_loja_carrinho_itens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  sessao_id text,                          -- convidados sem login
  produto_id uuid references prod_loja_produtos(id) on delete cascade,
  variante_id uuid references prod_loja_variantes(id) on delete cascade, -- null se produto sem variantes
  quantidade int not null default 1,
  personalizacao jsonb,                    -- params do customizador, se aplicável
  created_at timestamptz default now()
);

create table prod_loja_encomendas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  numero serial,
  estado text default 'pendente',          -- pendente|pago|enviado|entregue|cancelado
  total_cents int not null,
  portes_cents int default 0,
  metodo_pagamento text,                   -- stripe | ifthenpay
  payment_ref text,
  morada_envio jsonb,
  nif text,
  created_at timestamptz default now()
);

create table prod_loja_encomenda_itens (
  id uuid primary key default gen_random_uuid(),
  encomenda_id uuid references prod_loja_encomendas(id) on delete cascade,
  produto_id uuid references prod_loja_produtos(id),
  variante_id uuid references prod_loja_variantes(id),
  nome text,                               -- snapshot nome/cor/tamanho/preço à data
  cor text,
  tamanho text,
  preco_cents int,
  quantidade int,
  personalizacao jsonb
);
```

Promoções para partilha social reutilizam a tabela `cupons` existente (acrescentar
`imagem_social_url` se se quiser OG dedicado por promo).

---

## 5. RLS (resumo)

- `prod_loja_categorias` / `prod_loja_produtos` / `prod_loja_imagens`: **SELECT público** só de
  ativos; **escrita** só admin (mesmo check do middleware: `role='admin'` ou `ADMIN_EMAIL`).
  - **Os preços nunca se filtram por RLS** — a coluna é lida na mesma; a **decisão de mostrar o preço
    é na UI/servidor consoante o role** (esconde-se a maker). Manter o gating na app, não na RLS, para
    o admin e o webhook continuarem a ler tudo.
- `prod_loja_carrinho_itens`: utilizador só vê/edita as suas linhas (`user_id = auth.uid()`).
- `prod_loja_encomendas` / `_itens`: utilizador vê as suas; admin vê todas.

---

## 6. Storage

Bucket público novo `loja_produtos` (separado de `makers_pro_stl_prod`, que é privado para STLs).
Upload via API route com `service_role`, padrão idêntico a `app/api/admin/thumbnail/route.ts`
(recebe base64 → `upload` → `getPublicUrl` → grava em `prod_loja_imagens`).

---

## 7. Registo / persona — JÁ EXISTE, não mexer

A persona é capturada em `app/bem-vindo/page.tsx` (após confirmação de email), que grava
`prod_perfis.tipo_utilizador` = `consumidor | maker | ambos`. O perfil é criado pelo trigger
`handle_new_user()` (`scripts/sql/trigger_criar_perfil.sql`) com `tipo_utilizador = null` até à escolha.

**Não é preciso alterar o registo.** A loja e o `/makers` apenas leem `tipo_utilizador` para aplicar o
gating (preços e downloads). Eventual ajuste: o `/bem-vindo` redireciona hoje para `/produtos` — pode
passar a redirecionar makers para `/makers`.

---

## 8. Loja física — preços (opção B) e checkout

- **Preços**: renderizados para visitante/cliente/admin; **escondidos a `role='maker'`**, substituídos
  por bloco "preços não disponíveis — fala no Discord ou abre ticket" (link Discord + `/api/suporte`).
- **Carrinho**: context React + `prod_loja_carrinho_itens`. Convidado usa `sessao_id` (cookie); ao
  fazer login, merge das linhas.
- **Checkout físico**: nova route `app/api/stripe/checkout-loja/route.ts` em **`mode: 'payment'`**
  (one-time) com `line_items` do carrinho, `shipping_address_collection` e portes. ifthenpay
  (MB Way/Multibanco) como alternativa.
- **Portes**: lidos server-side de `prod_loja_config.portes_cents` (valor definido no admin), com
  override por produto (`prod_loja_produtos.portes_cents`) e envio grátis acima de
  `portes_gratis_acima_cents`. Nunca calculados no cliente.
- **Webhook**: estender `app/api/stripe/webhook` para `mode:'payment'` → marcar encomenda `pago` e
  **decrementar stock da variante comprada** (`prod_loja_variantes.stock`, ou `produto.stock` se sem
  variantes) numa transação SQL (evita overselling).

---

## 9. `/makers` — catálogo digital + downloads

- Exige login (redirect a `/login` se anónimo).
- Lista designs: ativos não-exclusivos visíveis; exclusivos visíveis mas bloqueados (overlay +
  "upgrade ao plano" → `/pricing`). Reaproveita o overlay de `app/produtos/page.tsx`.
- Botão de download por design, com lógica server-side:
  - `gratuito=true` → permite a qualquer maker.
  - `gratuito=false` → exige `downloads_limite − downloads_mes > 0` (consome 1) **ou** compra avulsa
    (`/api/stripe/download-avulso`).
  - `estado='exclusivo'` → exige plano com acesso.
- Mostra créditos restantes do utilizador.

---

## 10. Partilha social + promoções

- `produto/[slug]` com `generateMetadata` → Open Graph (título, descrição, imagem, preço) + Twitter
  Card → pré-visualização rica em WhatsApp/Facebook/Instagram.
- Botões de partilha (Web Share API + links diretos). Com promo ativa, OG com badge de desconto.

---

## 11. Admin (`/admin/loja`)

Segue o padrão de `app/admin/page.tsx` e `/admin/campanhas`:

- Lista de produtos com estado/stock inline.
- Form criar/editar: nome, slug, categoria, preço, preço-promo, descrição, **upload de várias fotos**
  (com ordem), toggle "permite personalizar" + escolher `design_id`, **portes** (override opcional).
- **Gestão de variantes** por produto: linhas de cor + tamanho, cada uma com stock, SKU e preço
  opcional. Stock do produto passa a ser por variante (produto sem variantes usa `produto.stock`).
- **Definições da loja**: portes base + limiar de envio grátis (`prod_loja_config`).
- Gestão de categorias.
- Lista de encomendas com mudança de estado (pendente → enviado → entregue).

---

## 12. Fases de implementação

1. **SQL + RLS + bucket `loja_produtos`** + colunas novas em `prod_designs`.
2. **Registo** — pergunta da impressora + gravação de `role`.
3. **Admin `/admin/loja`** — CRUD + upload de fotos (permite carregar produtos antes da loja pública).
4. **Loja pública** — `(loja)/`, `/loja/[categoria]`, `produto/[slug]` com OG + regra de preços
   (opção B). Link discreto "Makers →" no header.
5. **Carrinho + checkout** — context, API `mode:'payment'`, webhook + stock.
6. **`/makers`** — catálogo digital + downloads gated (pode entrar em paralelo, é independente).
7. **Sitemap** — acrescentar produtos/categorias da loja a `app/sitemap.ts`.

---

## 13. Decisões fechadas

- **Portes**: valor definido no admin (`prod_loja_config.portes_cents`) + override por produto +
  limiar de envio grátis. ✅
- **Stock**: com **variantes de cor + tamanho** (`prod_loja_variantes`), stock por variante. ✅

## 14. Notas confirmadas no código

- `prod_perfis` é criado pelo trigger `handle_new_user()` (`scripts/sql/trigger_criar_perfil.sql`);
  colunas: `id, email, role, plano, tipo_utilizador, downloads_mes, downloads_limite`.
- Persona = `tipo_utilizador` (`consumidor|maker|ambos`), escolhida em `/bem-vindo`. `role` = só admin.
- **Fase 1 entregue**: `scripts/sql/loja_modulo.sql` (tabelas, variantes, config, RLS, helper
  `is_admin()`, policies de escrita admin, bucket `loja_produtos`).
- **Fase 4 entregue** (Loja pública, em `/loja`): `lib/loja.ts` (constantes + helpers puros,
  `DISCORD_URL` placeholder), `lib/loja-server.ts` (`getViewer`, `fetchCatalogo`, `fetchProduto`,
  `getPrazoConfig`); `/loja` + `/loja/[categoria]` (`StoreCatalog`); `/produto/[slug]` com
  `generateMetadata` (OG) + `ProdutoDetalhe` (galeria, variantes, preço/mensagem-maker, prazo,
  personalizador, partilha). Regra de preços opção B (oculta a maker/ambos). Link "Loja" na Navbar;
  loja no `sitemap.ts`. Carrinho = stub ("em breve") até à Fase 5. `tsc` limpo.
  Pendente: trocar `DISCORD_URL`; mudar raiz `/` para a loja (quando aprovado).
- **Fase 3 entregue** (Admin): link "🛒 Loja" na sidebar de `app/admin/page.tsx`;
  `app/admin/loja/_ui.ts` (estilos + slugify + eur); `app/admin/loja/page.tsx` (lista);
  `app/admin/loja/categorias/page.tsx`; `app/admin/loja/definicoes/page.tsx` (portes);
  `app/admin/loja/novo` + `[id]` via `components/admin/loja/ProductEditor.tsx` (campos + variantes +
  fotos); upload em `app/api/admin/loja/upload/route.ts` (service_role). Escrita direta pelo browser
  client (RLS admin). `tsc --noEmit` limpo.

### Decisões fechadas (gating)
- `tipo_utilizador IN ('maker','ambos')` → sem preços (msg Discord/ticket) + com downloads.
- `consumidor` / visitante → vê preços, sem downloads.

### Modelo Carrinho + Personalização + Orçamento (Fase 5 — decidido)
- Personalização entra no carrinho: produto de loja com `permite_personalizar`+`design_id`; o
  customizador recebe o produto e o botão passa a **"Adicionar ao carrinho"** (params em
  `prod_loja_carrinho_itens.personalizacao`). Fluxo `PedidoOrcamentoModal`/`prod_pedidos_orcamento`
  mantém-se como **fallback** (designs sem produto de loja ligado).
- **Preço de personalizados:** peça de tamanho único → **preço fixo do produto** (igual perso ou não).
  Peça que varia (ex.: caixa) → flag **`prod_loja_produtos.requer_orcamento=true`** → sem preço fixo.
- **Checkout ramifica:** se o carrinho tiver **qualquer** item `requer_orcamento` → a encomenda inteira
  vira **pedido de orçamento**; cliente só paga **depois** do admin entregar o valor final. Caso
  contrário → pagamento imediato (Stripe/ifthenpay).
- Flag `requer_orcamento` entregue (SQL + admin + display "Sob orçamento" na loja).
- **Carrinho entregue**: `CartContext` (localStorage), badge na navbar, add-to-cart na página de
  produto, `/carrinho`.
- **Checkout entregue** (exige login): `app/checkout-loja` (morada + resumo) → `app/api/loja/checkout`
  (recalcula preços server-side, ramifica orçamento vs Stripe `mode:'payment'`); webhook estendido
  (`tipo:'loja'` → marca `pago` + decrementa stock); `app/checkout-loja/sucesso` (limpa carrinho).
  Portes da config + override por produto + grátis acima do limiar.
- **Admin de encomendas entregue**: `app/admin/loja/encomendas` (lista + filtro por estado, detalhe
  com itens/morada, mudar estado, definir valor final do orçamento + `app/api/admin/loja/gerar-pagamento`
  que cria link Stripe). RLS: policies admin em `prod_loja_encomendas`/`_itens`.
- **Preçário**: link no topo agora só aparece a `maker`/`ambos`/admin (Navbar lê `tipo_utilizador`).
- **Integração customizador→carrinho entregue**: página de produto passa `?produto=<slug>` ao
  customizador; lá, ao gerar/pré-visualizar o STL captura-se o `storagePath`; o botão passa a
  "🛒 Adicionar ao carrinho" (fallback orçamento se sem produto ligado). A linha guarda
  `personalizacao = { params, stl_url, stl_path }`, que segue para `encomenda_itens`. Admin descarrega
  o STL no detalhe da encomenda via `app/api/admin/loja/stl-url` (URL assinada, bucket privado).
  Nota: designs "legacy" (binário, sem storagePath) entram no carrinho sem STL anexado.
- **FALTA**: ifthenpay (MB Way/Multibanco); email ao cliente com link de orçamento. Pendente:
  trocar DISCORD_URL, mudar raiz `/` para a loja. Stripe só testável em produção.
