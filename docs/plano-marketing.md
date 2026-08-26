# Plano — Módulo Marketing (publicação social + campanhas pagas + analytics + assistente IA)

> Estado: **Fase orgânica + analytics + assistente de IA (Gemini, gratuito) implementados no código.**
> Falta setup do lado do Meta (Fase 0, feito pelo utilizador) para ligar a publicação real. Parte paga
> implementada mas por testar (precisa de Ad Account com pagamento no Meta Business).
> Última atualização: 2026-08-26.

---

## 1. Visão geral

Três peças, todas sob `/admin/marketing` (link "🚀 Marketing" na sidebar do admin):

1. **Publicação orgânica** no Instagram + Facebook (grátis) — criar, agendar ou publicar já.
2. **Impulsionar (Meta Ads)** — opcional, por publicação já publicada. Mostra previsão de
   alcance/custo antes de decidir. **Campanhas nascem sempre pausadas** — só gastam dinheiro depois
   de um clique explícito de confirmação em "Ativar e gastar".
3. **Analytics** — gráficos (recharts) com receita por produto e vistas/cliques de campanhas
   internas, mais um bloco de sugestões calculadas a partir dos dados reais.

Extra: **assistente de IA** (botão flutuante 🤖, sempre visível em qualquer página `/admin/**`,
montado em `app/admin/layout.tsx`) que responde a perguntas em linguagem natural com base nos dados
reais da loja (vendas dos últimos 30 dias, campanhas, publicações). Usa o **Google Gemini**
(`gemini-3.6-flash`, tier gratuito, sem cartão de crédito) — sem custo de assinatura nem por
pergunta dentro dos limites gratuitos. **Nota:** os nomes dos modelos Gemini mudam com alguma
frequência (`gemini-2.5-flash` deixou de estar disponível para chaves novas passados poucos meses) —
se o assistente voltar a dar "Erro ao contactar o assistente", testa primeiro
`curl -X POST "https://generativelanguage.googleapis.com/v1beta/models/<modelo>:generateContent?key=<chave>" -d '{"contents":[{"parts":[{"text":"oi"}]}]}'`
para confirmar qual o nome de modelo atual antes de mexer no resto do código.

---

## 2. Fase 0 — Setup no Meta (só o utilizador pode fazer)

Pré-requisito para a publicação orgânica funcionar de verdade:

1. Converter a conta de Instagram para **Business/Creator** e ligá-la à Página de Facebook da pp3d.
2. Criar uma **Meta App** em [developers.facebook.com](https://developers.facebook.com) — modo
   "Development" chega, não precisa de App Review da Meta para publicar só nas próprias páginas.
3. Gerar um **Page Access Token de longa duração**, e obter o `Page ID` e o `Instagram Business
   Account ID` (via Graph API Explorer ou o próprio painel da App).
4. Preencher no `.env` (produção: nas env vars do Vercel):
   ```
   META_PAGE_ACCESS_TOKEN=...
   META_PAGE_ID=...
   META_IG_USER_ID=...
   ```
5. **Só quando quiser testar a parte paga**: criar uma Ad Account no Business Manager com método de
   pagamento, e preencher `META_AD_ACCOUNT_ID`.
6. Para o assistente de IA: `GEMINI_API_KEY` — obtida em
   [aistudio.google.com/apikey](https://aistudio.google.com/apikey), gratuita, sem cartão de crédito
   (tier gratuito tem limite de pedidos/dia, mais que suficiente para um painel de admin).

Sem estas env vars, as rotas de publicação devolvem erro claro (`MetaApiError`) em vez de falhar
silenciosamente.

---

## 3. Schema (Supabase)

`scripts/sql/marketing_modulo.sql` — `prod_marketing_posts` (publicações) e `prod_marketing_ads`
(campanhas pagas, sempre nascem `rascunho`/`pausada`). RLS: só admin (`is_admin()`, já existente em
`loja_modulo.sql`). Correr este SQL uma vez no Supabase antes de usar o módulo.

---

## 4. Código

- `lib/meta.ts` — wrapper fino da Graph API (publicação orgânica) e Marketing API (estimativa de
  alcance, criação/ativação/pausa de campanhas). Sem lógica de negócio.
- `lib/marketing-publish.ts` — lógica partilhada de "publicar um post", usada pela rota
  `publicar-agora` e pelo cron `publicar-agendados` (evita duplicar o fluxo).
- `app/api/admin/marketing/*` — rotas admin: `criar-post`, `publicar-agora`, `estimar-alcance`,
  `criar-campanha-paga`, `ativar-campanha` (exige `confirmar:true`), `pausar-campanha`, `assistente`
  (chat streaming com o Gemini).
- `app/api/cron/publicar-agendados` e `app/api/cron/sync-insights` (ambos diários — **o plano Vercel
  Hobby só permite crons uma vez por dia**; uma tentativa de correr `publicar-agendados` de hora a
  hora chegou a invalidar o deploy inteiro sem erro visível na lista de Deployments, só um check
  "0/1" a falhar no commit do GitHub — se um dia passar a Pro, pode voltar a ser horário), registados
  em `vercel.json`, mesmo padrão de auth (`CRON_SECRET`) dos crons existentes.
- `app/admin/marketing/page.tsx` — UI com 3 separadores (Criar publicação / Fila / Analytics).
- `app/admin/layout.tsx` + `components/admin/AdminAssistant.tsx` — widget de chat flutuante,
  disponível em qualquer página `/admin/**`.

---

## 5. Restrição de segurança (não negociável)

Criar uma campanha paga (`criar-campanha-paga`) nunca a ativa — fica sempre `status: PAUSED` na Meta
e `estado: 'pausada'` na BD. Só a rota `ativar-campanha`, chamada a partir de um botão dedicado na UI
com confirmação explícita, liga o gasto real. Nenhum cron ou automatismo chama essa rota.

---

## 6. Por testar / próximos passos

- [ ] Preencher as env vars do Meta (Fase 0) e publicar um post de teste real.
- [ ] Confirmar que o cron `publicar-agendados` corre no Vercel (testar primeiro com `curl` manual +
      `CRON_SECRET`).
- [ ] Só depois de ter Ad Account: testar `estimar-alcance` e `criar-campanha-paga` — **nunca clicar
      em "Ativar" com orçamento real sem decisão consciente**.
- [ ] Preencher `GEMINI_API_KEY` para o assistente de IA funcionar (sem ela, o botão 🤖 mostra erro
      claro ao tentar responder, mas não parte o resto do site).
