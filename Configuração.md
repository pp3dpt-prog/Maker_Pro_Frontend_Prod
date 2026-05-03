# Maker Pro — Configuração do Projeto

## 1. Visão do Produto

O Maker Pro é uma plataforma de criação de objetos paramétricos
para impressão 3D, organizada por Famílias e Modelos,
onde os utilizadores configuram peças, visualizam previews,
e descarregam ficheiros STL finais mediante crédito.

---

## 2. Conceitos Fundamentais

### 2.1 Família
Agrupamento lógico de peças com propósito semelhante.

Exemplos:
- Pet Tags
- Caixas
- Peças Mecânicas
- Hueforge / Artístico
- Vasos

### 2.2 Modelo
Uma peça física concreta dentro de uma família.

Cada modelo possui:
- Um template OpenSCAD (`.scad`)
- Um schema de geração (`generation_schema`)
- Um custo definido na base de dados
- Um output primário (STL)

---

## 3. Arquitetura de Geração (Confirmada)

### 3.1 Backend STL
- Implementado em Node.js + Express
- OpenSCAD executado via `spawn`
- STL gerado em diretório temporário
- STL guardado no Supabase Storage
- URL gerado como Signed URL com TTL

### 3.2 generator.scad
- Recebe parâmetros do backend
- Inclui templates específicos
- Aplica textos, relevos e operações booleanas
- NÃO contém geometria base
- NÃO contém lógica de negócio

### 3.3 Templates OpenSCAD
Templates OpenSCAD
Os templates OpenSCAD são armazenados na base de dados como texto.
O backend:

recupera o template da BD
injeta variáveis
gera um ficheiro .scad temporário
executa o OpenSCAD sobre esse ficheiro
remove o ficheiro após a geração

---

## 4. Contrato da API de Geração

### Endpoint
POST /gerar-stl-pro

### Entrada
```json
{
  "id": "<design_id>",
  "mode": "final",
  "params": { ... }
}


____________________________________________________________________________________________
:::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
____________________________________________________________________________________________


## 9. Frontend — Editor Paramétrico

### 9.1 Papel do Frontend

O frontend do Maker Pro é responsável por:
- Apresentar catálogo de famílias e modelos
- Permitir configuração de parâmetros via schema
- Mostrar previews visuais
- Iniciar pedidos de geração STL
- Gerir estados de loading e erro

O frontend NÃO:
- Gera geometria final
- Decide custos
- Executa lógica de crédito
- Manipula ficheiros STL diretamente

---

### 9.2 Componente Principal: CustomizadorClient

Responsável por:
- Inicializar valores a partir do `generation_schema`
- Manter estado dos parâmetros
- Coordenar preview e geração STL
- Orquestrar comunicação com o backend

Estados implícitos:
- idle: sem STL gerado
- generating: backend a processar
- preview: URL temporário disponível
- error: erro devolvido pela API

---

### 9.3 Preview Paramétrico (Preview3D)

- Representação visual aproximada
- Baseada em geometria simples
- Atualiza em tempo real com sliders
- Não representa o STL final
- Não consome créditos

Serve apenas para:
"perceber a forma e proporção"

---

### 9.4 Visualizador Final (STLViewer)

- Carrega STL real via URL
- URL é sempre remoto (Supabase Storage)
- Apenas visualiza, nunca gera
- Representa o resultado final antes do download

---

### 9.5 Separação Obrigatória de Momentos

- Preview Paramétrico:
  - imediato
  - gratuito
  - iterativo

- STL Final:
  - gerado pelo backend
  - visualizado no STLViewer
  - download consome créditos

Esta separação é estrutural e não deve ser quebrada.

## 10. Catálogo, Exploração e Navegação

### 10.1 Conceitos de Navegação

O frontend distingue três momentos distintos da experiência:

1. Explorar
2. Escolher
3. Criar

Cada momento tem uma rota e objetivo próprios.

---

### 10.2 Explorar (/explore)

A rota /explore serve para:
- descoberta de possibilidades
- inspiração
- apresentação de programas/aplicações

Não é o caminho principal para criação direta.

Fonte de dados:
- prod_programas

---

### 10.3 Catálogo de Produtos (/produtos)

A rota /produtos representa:
- a lista oficial de designs disponíveis
- cada design corresponde a um modelo concreto

Cada design possui:
- nome
- descrição
- tags
- custo em créditos

Unidade central do sistema: **Design**

---

### 10.4 Cartão de Design (DesignCard)

O DesignCard é a representação visual básica de um modelo.

Mostra:
- informações essenciais
- custo
- identidade do design

É a ponte entre catálogo e editor.

---

### 10.5 Entrada no Editor (/customizador)

A entrada no editor ocorre sempre a partir de um Design.

O editor recebe:
- design_id
- generation_schema
- parâmetros iniciais

Não existem entradas genéricas no editor sem um design associado.

## 11. APIs do Frontend (App Router)

### 11.1 Resolução do Design (/api/produto)

Esta rota é responsável por determinar qual o design ativo
no editor paramétrico.

Entrada:
- id (opcional)
- familia (opcional)

Comportamento:
- Se id existir → devolve esse design
- Se id não existir mas familia existir → devolve o primeiro design da família

Saída:
- id
- nome
- generation_schema

Esta rota garante que o editor nunca opera sem um design concreto.

---

### 11.2 Geração de STL (/api/gerar-stl-pro)

Esta rota atua como proxy entre o frontend e o backend de geração STL.

Responsabilidades:
- Validar body JSON
- Encaminhar token de autenticação
- Definir timeout defensivo
- Garantir que o frontend recebe sempre JSON

Esta rota:
- NÃO gera STL
- NÃO devolve ficheiros
- NÃO aplica lógica de negócio

Todas as respostas seguem o formato JSON:
- Sucesso: { success, url }
- Erro: { error }

## 12. Download Final do STL

### 12.1 Conceito

O download final representa o momento de aquisição do ficheiro STL.
É distinto da geração e do preview.

---

### 12.2 Regras

- O STL visto no preview é temporário
- O download final consome créditos
- O download só é permitido após geração concluída
- O backend é responsável por:
  - validar créditos
  - debitar créditos
  - guardar STL na área definitiva do cliente

---

### 12.3 Fluxo

1. Utilizador clica "Download STL"
2. Frontend chama /api/download-stl
3. Backend valida utilizador
4. Backend verifica créditos
5. Backend move STL temporário → definitivo
6. Backend gera URL permanente
7. Frontend inicia download

---

### 12.4 Separação Obrigatória

- /api/gerar-stl-pro → preview
- /api/download-stl → compra/download

Estas rotas não devem ser misturadas.


Configuração do Sistema — Customizador STL
Versão: 1.0 (estado atual consolidado)
Última atualização: 2026‑04‑10

1. Visão Geral
O sistema permite ao utilizador:

configurar um modelo paramétrico (ex: caixa)
gerar um preview STL (sem custo)
visualizar o modelo num viewer 3D
efetuar o download final do STL (com débito de créditos)
quando aplicável, descarregar dois STLs separados (caixa + tampa)

Toda a lógica crítica (custos, número de ficheiros, débito de créditos) é controlada exclusivamente no backend.

2. Arquitetura Geral
Plain TextFrontend (Next.js) ├─ CustomizadorClient.tsx        → UI principal do customizador │   ├─ GeneratedEditor           → parâmetros dinâmicos │   ├─ STLViewer                 → preview 3D (Z‑up) │   └─ DownloadStlButton         → download final │ └─ API Routes (App Router)     ├─ /api/gerar-stl-pro        → preview (sem custo)     └─ /api/download-stl         → download final (com custo)Mostrar mais linhas

3. Base de Dados (Supabase)
3.1 Tabela prod_designs
Armazena os modelos paramétricos.
Campos relevantes:

id
nome
scad_template → template OpenSCAD completo
generation_schema → definição dos parâmetros
credit_cost → custo em créditos do download


O custo não depende do número de STLs gerados.


3.2 Tabela prod_perfis
Campos relevantes:

id (user_id)
creditos_disponiveis


3.3 Tabela prod_transacoes
Histórico financeiro:

user_id
descricao
creditos_alterados
criado_em

Cada download cria uma transação negativa.

4. OpenSCAD (Modelo)
4.1 Estrutura do Template
O scad_template vive na base de dados e contém:
Plain Textscad não é totalmente suportado. O realce da sintaxe baseia-se em Plain Text.module corpo_caixa() { ... }module tampa_caixa() { ... }``Mostrar mais linhas
Regras fixas:

Z é sempre altura
origem em (0,0,0)
caixa aberta em +Z
tapa é objeto separado
encaixe macho na tampa (entra para −Z)


4.2 Exportação de STL
O backend não exporta um STL combinado para download final.
Regra:

corpo_caixa(); → caixa.stl
tampa_caixa(); → tampa.stl (se tem_tampa === 1)


5. API — /api/gerar-stl-pro
Função

Geração de preview STL
Sem débito de créditos
Devolve signedUrl temporário
Usado apenas para visualização

Input
JSON{  "id": "design_id",  "paramsMostrar mais linhas

6. API — /api/download-stl
Função

Geração final dos STL(s)
Débito de créditos
Resposta direta como download

Comportamento

















CondiçãoResultadotem_tampa = 01 ficheiro: caixa.stltem_tampa = 1ZIP com caixa.stl + tampa.stl

Custo = credit_cost do design
Débito feito apenas se geração for bem‑sucedida
Runtime forçado: Node.js (export const runtime = 'nodejs')


7. STLViewer (Frontend)
Responsabilidades

visualizar o STL de preview
manter consistência com OpenSCAD e slicers

Regras importantes

camera.up.set(0, 0, 1) → Z‑up
não recentrar pelo centro
geometria ancorada em box.min para preservar relações (caixa + tampa)


8. Botão “Download STL”
Localização

Ficheiro: components/DownloadStlButton.tsx
Usado em: CustomizadorClient.tsx

Comportamento

só aparece após existir preview
envia:

design_id
params atuais


não calcula custo
não decide número de ficheiros

Toda a lógica crítica está no backend.

9. Fluxo Completo do Utilizador

Ajusta parâmetros
Clica Gerar STL
Visualiza preview
Clica Download STL
Backend:

valida créditos
gera STL(s)
debita créditos
devolve STL ou ZIP


Browser inicia download


10. Estado Atual do Projeto
✅ SCAD correto (orientação, encaixe, tampa)
✅ Viewer alinhado (Z‑up)
✅ Preview funcional
✅ Download com custo dinâmico
✅ 1 ou 2 STLs conforme tampa
✅ TypeScript limpo
✅ Backend fechado

11. Próximos Passos Possíveis (não implementados)

Mostrar custo ao lado do botão
Desativar botão se creditos < credit_cost
Histórico “Meus Downloads”
Export automático para storage definitivo


📌 Este ficheiro representa o estado consolidado do sistema neste momento.
Quando quiseres, o próximo passo natural é puramente UX ou expansão funcional — a base está correta e fechada.


Atualização de Estado do Sistema
Data: 03‑05‑2026
Objetivo: Consolidar o que foi descoberto hoje, corrigir pressupostos errados e alinhar os próximos passos sem quebrar o que já funciona.


1. Conclusões Confirmadas Hoje
1.1 generation_schema é a fonte única (e suficiente)
Não existe (neste momento) um ui_schema separado a ser usado no sistema. Todo o UI é derivado de generation_schema.parameters, incluindo:

ui.label
ui.widget (slider, checkbox)
ui.step
min, max, default, unit
Decisão: ✅ Manter o generation_schema como contrato único entre backend, frontend e OpenSCAD.


1.2 Ordem dos parâmetros não pode depender do JSON
Foi confirmado que alterar a ordem dos campos no JSON não garante alteração da ordem no UI, porque:

parameters é um objeto
Object.entries() não é um contrato semântico de ordenação
Solução implementada:

Introdução do campo explícito order em cada parâmetro
Ordenação no frontend antes do render
const parameters = Object.entries(schema.parameters)
  .sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0));


✅ A ordem do UI passa a ser determinística e controlada pela base de dados.


1.3 Editor Paramétrico (GeneratedEditor)
O GeneratedEditor.tsx passou a:

Respeitar order
Usar ui.label
Usar ui.step
Mostrar valor atual do slider
Mostrar unidade (unit)
Suportar slider e checkbox
Estado atual: ✅ Estável ✅ Compatível com o backend ✅ Sem lógica de negócio


2. Problema do Download — Análise Final
2.1 O erro não era de frontend
O erro 500: This page couldn’t load foi identificado como:

Falha da rota /api/download-stl
Exceção no servidor antes de devolver resposta
O botão, o fetch e o fluxo no frontend estavam corretos.


2.2 Erros críticos encontrados na rota /api/download-stl
❌ Erro 1 — Tipo errado em tem_tampa

Frontend envia boolean (true/false)
Backend verificava === 1
Correção aplicada:
if (params.tem_tampa === true) { ... }




❌ Erro 2 — Uso incorreto de ReadableStream

archiver produz Node streams
ReadableStream (Web API) causava crash no runtime
Correção aplicada:

Uso direto do stream Node retornado por archiver
Remoção completa do wrapper ReadableStream


❌ Erro 3 — MIME type inadequado para STL

application/sla causava comportamento instável
Correção aplicada:
Content-Type: application/octet-stream




2.3 Estado atual do Download
✅ Download de 1 STL funciona ✅ Download de ZIP (2 STLs) funciona ✅ Runtime Node.js confirmado (export const runtime = 'nodejs') ✅ Sem crashes 500


3. Estado Atual do Sistema (Resumo)

✅ Preview parametrizado funcional
✅ Geração de STL final protegida por créditos
✅ Download robusto (STL ou ZIP)
✅ UI controlada por schema da BD
✅ Ordem dos parâmetros determinística
✅ Separação Preview / Download mantém‑se intacta


4. Pontos de Atenção (não bloqueantes, mas importantes)
4.1 Débito de créditos antes do stream
Atualmente os créditos são debitados antes de o ficheiro ser totalmente entregue.
Risco:

Falha a meio do stream
Utilizador perde créditos
Mitigação futura (não implementada):

Debitar após conclusão do stream
Ou marcar transação como pending → confirmed


4.2 Limpeza de ficheiros temporários
Os ficheiros em /tmp não são limpos automaticamente.
Próximo passo recomendado:

Job periódico de cleanup
Ou limpeza após archive.finalize()


5. Próximos Passos Planeados (por prioridade)

✅ Consolidar esta versão (sem novas mudanças estruturais)
➜ UX: Input numérico sincronizado com slider
Tooltips (ui.description)
➜ Lógica condicional no UI: visible_if (ex: esconder campos quando tem_tampa = false)
➜ Robustez: Idempotência de download
Anti‑duplo clique


📌 Este documento representa o estado real do sistema após as correções técnicas de 03‑05‑2026. Qualquer evolução futura deve partir deste baseline, sem regressões.
