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