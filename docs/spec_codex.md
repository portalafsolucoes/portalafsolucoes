# Spec Codex

## 1. Objetivo deste documento

Este arquivo existe para transformar o sistema em uma especificação mais profissional, mas fácil de validar por pessoas não técnicas.

A ideia aqui nao e explicar codigo. A ideia e responder, de forma organizada:

- O que o sistema faz na pratica
- Quem usa cada parte
- Quais dados entram
- Quais resultados saem
- Como os modulos se conectam
- Quais ferramentas sustentam o sistema por baixo

## 2. Como esta spec foi montada

Esta spec foi montada a partir de leitura do projeto real:

- rotas de telas em `src/app`
- componentes principais em `src/components`
- regras de acesso em `src/lib/permissions.ts`
- sessao e troca de unidade em `src/lib/session.ts` e APIs relacionadas
- estrutura de banco em `prisma/schema.prisma`
- APIs de negocio em `src/app/api`

Tambem foi considerada uma referencia externa de boas praticas para documentacao funcional:

- separar visao de negocio da visao tecnica
- deixar claro objetivo, atores, entradas, fluxo principal e resultado esperado
- usar fluxos visuais para facilitar validacao
- evitar excesso de jargao tecnico

## 3. Recomendacao de formato

Para este sistema, a melhor forma de documentar nao e "linha por linha da interface" e nem "linha por linha do codigo".

O formato mais util para voces avaliarem o sistema e este:

1. Visao executiva do produto
2. Regras gerais do sistema
3. Funcionalidades praticas por modulo
4. Ferramentas e estrutura tecnica separadas
5. Riscos, pontos de atencao e proximos passos
6. Fluxogramas espelhando a mesma logica

Motivo:

- por tela apenas fica muito visual e pouco estrategico
- por funcao tecnica fica dificil para leigos validarem
- por modulo de negocio permite entender operacao, navegacao e valor

## 4. Resumo executivo

O sistema e um CMMS web para gestao de manutencao industrial com foco em:

- ativos e estrutura fisica
- solicitacoes de servico
- ordens de servico
- planejamento e programacao
- planos de manutencao
- pessoas, equipes e acessos
- criticidade de ativos
- RAFs de analise de falha
- indicadores KPI
- leitura de variaveis industriais no modulo GEP
- operacao multiempresa e multiunidade

Em termos simples, o sistema ajuda a organizar o ciclo completo da manutencao:

1. cadastrar estrutura e ativos
2. receber demandas
3. aprovar ou rejeitar demandas
4. transformar demanda em ordem de servico, quando fizer sentido
5. executar e finalizar manutencoes
6. planejar preventivas e programacoes
7. acompanhar desempenho e criticidade

## 5. Perfis de acesso

Os perfis encontrados no codigo sao:

- `SUPER_ADMIN`: acesso total, inclusive administracao do portal
- `GESTOR`: acesso amplo ao modulo operacional da empresa
- `PLANEJADOR`: foco em planejamento, com restricoes em gestao de usuarios/configuracoes
- `MECANICO`
- `ELETRICISTA`
- `OPERADOR`
- `CONSTRUTOR_CIVIL`

Leitura pratica desses perfis:

- `SUPER_ADMIN` e `GESTOR` controlam e aprovam
- `PLANEJADOR` organiza plano, programacao e cadastros
- perfis operacionais enxergam quase tudo, mas atuam principalmente em solicitacoes e ordens de servico

Observacao importante:

- existem documentos antigos no projeto falando em `ADMIN`, `TECHNICIAN`, `REQUESTER` e outros nomes
- a referencia valida atual, pelo codigo, e a lista acima

## 6. Regras gerais do sistema

### 6.1 Entrada no sistema

- a rota inicial redireciona para `/hub`
- o `hub` funciona como portal de entrada de modulos
- hoje o modulo efetivamente ativo para manutencao leva para `/dashboard`
- login e obrigatorio para acessar rotas protegidas

### 6.2 Multiempresa

O portal suporta varias empresas.

Cada empresa possui:

- seus usuarios
- seus modulos habilitados
- suas unidades
- seus ativos, ordens, solicitacoes, planos e indicadores

### 6.3 Multiunidade

O sistema tambem trabalha com unidade ativa.

Na pratica:

- o usuario entra vinculado a uma empresa
- ele pode ter acesso a uma ou varias unidades
- a unidade ativa filtra os dados operacionais
- `SUPER_ADMIN` e `GESTOR` podem trocar a unidade ativa quando possuem mais de uma

### 6.4 Modulos habilitados por empresa

Nem toda empresa precisa ver tudo.

Existe um controle de modulos por empresa, usado pelo menu lateral. Isso permite:

- ativar so o que faz sentido para cada cliente
- esconder funcionalidades nao contratadas ou nao usadas

## 7. Funcionalidades praticas

Esta e a parte principal da spec.

---

## 7.1 Portal, login e navegacao

### Objetivo

Permitir entrada segura no sistema e escolha do ambiente de trabalho.

### Usuario principal

- todos os usuarios

### O que faz

- mostra portal de modulos em `/hub`
- permite login
- direciona o usuario para o modulo correto
- protege rotas privadas por sessao em cookie

### Fluxo pratico

1. usuario acessa portal
2. escolhe entrar no modulo de manutencao
3. faz login
4. sistema identifica empresa, perfil e unidade ativa
5. usuario passa a navegar pelo menu lateral conforme permissao

### Valor para o negocio

- organiza a entrada
- evita acesso indevido
- prepara o sistema para varios produtos dentro do mesmo portal

---

## 7.2 Dashboard

### Objetivo

Dar uma visao geral rapida do estado da manutencao.

### Usuario principal

- todos com permissao de dashboard
- `SUPER_ADMIN` recebe visao corporativa

### O que faz

- resume ordens de servico
- resume ativos
- resume solicitacoes
- exibe cards e visao executiva

### Valor para o negocio

- ajuda a abrir o sistema ja entendendo o tamanho da operacao
- serve como painel de acompanhamento rapido

---

## 7.3 Pessoas e Equipes

### Objetivo

Organizar a mao de obra e a estrutura humana da manutencao.

### Usuario principal

- gestores
- planejadores
- administradores operacionais

### O que faz

- cadastro e consulta de pessoas
- cadastro e consulta de equipes
- filtros por perfil
- visualizacao em grade, tabela e hierarquia
- relacao entre pessoas, equipes e funcoes

### Informacoes principais

- nome
- email
- cargo
- perfil de acesso
- taxa/hora
- unidades permitidas
- participacao em equipes

### Valor para o negocio

- deixa claro quem pode fazer o que
- ajuda a formar equipes
- apoia programacao e atribuicao de ordens

---

## 7.4 Cadastros Basicos

### Objetivo

Criar a base mestra do sistema.

### Usuario principal

- gestores
- planejadores

### O que faz

Centraliza os cadastros que sustentam o restante do sistema:

- tipos de manutencao
- areas de manutencao
- tipos de servico
- calendarios
- centros de custos
- areas
- centros de trabalho
- tipos modelo
- familias de bens
- posicoes
- recursos
- tarefas genericas
- etapas genericas
- caracteristicas
- tipos de contador

### Leitura pratica

Sem esse modulo, o restante do sistema perde padrao.

Ele e a base para:

- classificar ativos
- padronizar planos
- definir tempos, areas e servicos
- estruturar recursos e especialidades

### Valor para o negocio

- padroniza a operacao
- reduz cadastro baguncado
- permite escalar o sistema com mais consistencia

---

## 7.5 Ativos

### Objetivo

Gerenciar os bens e equipamentos que sofrem manutencao.

### Usuario principal

- gestores
- planejadores
- operacionais, em consulta

### O que faz

- cadastro de ativos
- edicao e exclusao
- relacionamento pai e filho entre ativos
- visualizacao em arvore ou tabela
- painel de detalhes
- anexos e historico
- criacao de subativos

### Estrutura de negocio associada

Um ativo pode se ligar a:

- unidade
- area
- centro de trabalho
- familia
- modelo
- caracteristicas
- solicitacoes
- ordens de servico
- criticidade
- RAFs

### Valor para o negocio

- concentra o historico do equipamento
- facilita rastreabilidade
- melhora planejamento e manutencao preventiva

---

## 7.6 Arvore do sistema

### Objetivo

Permitir navegacao da estrutura fisica e tecnica da manutencao.

### O que faz

- organiza unidade > area > centro de trabalho > ativo
- permite expandir e navegar hierarquia
- mostra detalhes do ativo selecionado
- mostra OSs, SSs e RAFs relacionados ao ativo

### Valor para o negocio

- melhora entendimento da planta
- ajuda supervisores a localizar rapidamente onde esta o problema

---

## 7.7 Criticidade de ativos

### Objetivo

Priorizar os ativos que merecem mais atencao.

### O que faz

- calcula score com base na matriz GUT
- considera solicitacoes abertas
- considera ordens abertas
- considera RAFs
- considera status do ativo
- classifica em `critico`, `alerta` ou `ok`

### Regras praticas

Os valores GUT podem ser editados.

Isso permite que a criticidade nao dependa apenas do historico automatico, mas tambem do julgamento do negocio.

### Valor para o negocio

- ajuda a priorizar manutencao
- evita tratar todos os ativos como iguais
- apoia reunioes de priorizacao

---

## 7.8 Solicitaçoes de Servico

### Objetivo

Registrar demandas de manutencao.

### O que faz

- cria solicitacoes
- lista solicitacoes
- edita solicitacoes
- exclui solicitacoes nao aprovadas, quando permitido
- permite anexar arquivos
- relaciona equipe responsavel

### Dados principais

- titulo
- descricao
- prioridade
- data desejada
- equipe
- anexos
- status

### Fluxo pratico

1. usuario cria uma solicitacao
2. ela entra como pendente
3. a area responsavel pode aprovar ou rejeitar
4. se aprovada, pode:
   - continuar como solicitacao aprovada
   - virar ordem de servico

### Valor para o negocio

- formaliza pedidos
- evita perder demanda verbal
- organiza fila de manutencao

---

## 7.9 Aprovaçoes

### Objetivo

Permitir triagem das solicitacoes.

### Usuario principal

- `GESTOR`
- `SUPER_ADMIN`

### O que faz

- lista solicitacoes pendentes
- lista solicitacoes aprovadas
- lista solicitacoes rejeitadas
- aprova
- rejeita
- permite indicar tecnico responsavel
- permite escolher se a solicitacao vira OS

### Regra importante

Ao aprovar uma solicitacao, o gestor pode escolher:

- manter como SS aprovada
- converter em OS corretiva

### Valor para o negocio

- cria filtro gerencial
- evita transformar toda solicitacao em ordem de servico automaticamente
- separa o que e apenas atendimento simples do que precisa virar manutencao formal

---

## 7.10 Ordens de Servico

### Objetivo

Executar a manutencao de forma controlada.

### O que faz

- cria OS manualmente
- lista OSs
- detalha OS
- edita OS
- executa OS
- finaliza OS
- exclui OS quando permitido

### Tipos percebidos no sistema

- corretiva
- preventiva
- preditiva
- reativa

### Dados principais

- titulo
- descricao
- tipo
- prioridade
- ativo
- localizacao
- data
- tecnico responsavel
- status
- tarefas

### Status praticos

- `PENDING`
- `RELEASED`
- `IN_PROGRESS`
- `ON_HOLD`
- `COMPLETE`

### Regra importante de identificacao

Uma OS pode ser:

- `IN_SYSTEM`: quando tem numero externo valido
- `OUT_OF_SYSTEM`: quando o sistema gera numero interno proprio

### Valor para o negocio

- formaliza a execucao
- registra historico
- conecta manutencao com ativo, pessoas e custos

---

## 7.11 Execucao e finalizacao de OS

### Objetivo

Registrar o trabalho realmente feito.

### O que faz

- permite iniciar execucao
- registrar informacoes de execucao
- finalizar ordem

### Resultado esperado

Ao final, a OS deixa rastro operacional do que foi feito.

Mesmo quando a tela nao detalha tudo de custo na listagem principal, o modelo de dados suporta:

- tarefas
- mao de obra
- custos adicionais
- pecas
- arquivos

### Valor para o negocio

- ajuda a medir produtividade
- melhora rastreabilidade
- cria base para KPI e historico

---

## 7.12 Planos de manutencao

Este bloco tem quatro camadas e merece ser lido separado.

### Camada 1. Manutencao padrao

Serve para definir uma manutencao modelo por familia de ativo.

Exemplo:

- toda bomba da familia X precisa da manutencao Y a cada periodo Z

### Camada 2. Manutencao do bem

Serve para definir manutencao especifica para um ativo individual.

Exemplo:

- a bomba 102 tem uma rotina especial que outras bombas nao tem

### Camada 3. Emissao de plano

Serve para gerar um plano em um periodo.

Na pratica:

- o usuario define descricao, data inicial e data final
- o sistema emite OSs para ativos com manutencao prevista no periodo

### Camada 4. Programacao

Serve para organizar quando essas OSs serao executadas e, depois, confirmar a liberacao.

### Valor para o negocio

- tira a manutencao preventiva do improviso
- transforma regra em agenda
- aproxima planejamento da operacao real

---

## 7.13 Geraçao automatica de preventivas

### Objetivo

Nao depender apenas da acao manual para manter preventivas vivas.

### O que faz

Existe uma rotina agendada que verifica OSs preventivas e:

- gera nova OS quando a anterior foi concluida e ja chegou o momento da proxima
- reajusta a proxima data
- considera calendario de trabalho quando houver

### Valor para o negocio

- evita esquecer preventivas recorrentes
- reduz falha por dependencia humana

---

## 7.14 RAF - Relatorio de Analise de Falha

### Objetivo

Investigar falhas de forma estruturada.

### Usuario principal

- gestores
- super administradores

### O que faz

- cria RAF
- edita RAF
- visualiza RAF
- exclui RAF
- registra:
  - area
  - equipamento
  - data e hora
  - operador
  - descricao da falha
  - acao imediata
  - 5 porques
  - testes de hipotese
  - tipo de falha
  - plano de acao

### Valor para o negocio

- transforma falha em aprendizado
- evita repetir problema sem registrar causa
- cria base para melhoria continua

---

## 7.15 KPI - Indicadores

### Objetivo

Medir desempenho da manutencao.

### O que faz

- calcula indicadores de confiabilidade
- calcula indicadores de processo e planejamento
- calcula indicadores de custo e qualidade
- permite filtro por unidade e periodo

### Valor para o negocio

- ajuda a enxergar resultado
- melhora reunioes de acompanhamento
- transforma manutencao em gestao por indicador

---

## 7.16 GEP / GVP - Variaveis de processo

### Objetivo

Monitorar variaveis industriais e comparar comportamento por hora e por turno.

### O que faz

- carrega variaveis por setor
- mostra graficos e tabelas
- organiza leitura por turnos
- permite selecao de variaveis
- diferencia variaveis medias e totalizadoras
- usa arquivos e APIs proprias de importacao

### Leitura pratica

Esse modulo complementa a manutencao, porque ajuda a cruzar comportamento operacional com falhas e desempenho.

### Valor para o negocio

- melhora analise de processo
- aproxima manutencao da operacao industrial
- pode apoiar manutencao preditiva

---

## 7.17 Localizaçoes e unidades

### Objetivo

Organizar a divisao fisica e administrativa da operacao.

### O que faz

- cadastro de localizacoes
- cadastro de unidades/filiais
- contagem de membros e ativos por unidade
- base para filtragem operacional

### Valor para o negocio

- permite escalar o sistema para varias plantas
- separa dados por contexto operacional

---

## 7.18 Gestao de usuarios

### Objetivo

Controlar quem acessa o sistema e a quais unidades cada pessoa pode acessar.

### O que faz

- cria usuario
- edita usuario
- exclui usuario
- define papel
- define taxa/hora
- ativa ou desativa
- vincula unidades

### Valor para o negocio

- aumenta controle
- reduz risco de acesso indevido
- facilita governanca interna

---

## 7.19 Administracao do portal

### Objetivo

Gerenciar o produto em nivel corporativo e multiempresa.

### Usuario principal

- apenas `SUPER_ADMIN`

### O que faz

- cadastra nova empresa
- cria admin inicial da empresa
- cria unidade principal inicial
- habilita modulos por empresa
- mostra estatisticas globais do portal

### Valor para o negocio

- permite vender e operar o sistema para multiplos clientes
- deixa o produto pronto para crescimento comercial

## 8. Ferramentas e estrutura tecnica

Esta secao foi separada de proposito.

Ela explica o "como funciona por baixo", sem misturar com a avaliacao funcional.

### 8.1 Plataforma web

- Next.js com App Router
- React
- TypeScript

Leitura simples:

- frontend e backend vivem no mesmo projeto
- as telas chamam APIs do proprio sistema

### 8.2 Banco de dados

- PostgreSQL
- modelado com Prisma
- acesso operacional tambem usando Supabase nas APIs

Leitura simples:

- o banco guarda empresas, usuarios, unidades, ativos, SS, OS, planos, RAFs, KPIs e dados de processo

### 8.3 Autenticacao

- login por email e senha
- sessao em cookie
- filtro por empresa
- filtro por unidade ativa

### 8.4 Controle de permissao

- baseado em perfis
- aplicado no menu
- aplicado em telas
- aplicado em APIs

### 8.5 Interface

- componentes proprios
- layout padrao com sidebar
- modais para cadastro, edicao e detalhe

### 8.6 Testes e qualidade

- existem testes E2E em Playwright
- existem documentos de auditoria no repositorio

### 8.7 Integracoes e automacoes

O projeto ja mostra estrutura para:

- importacao de dados GEP
- integracoes com TOTVS
- rotina automatica de preventivas
- upload de arquivos

## 9. Navegaçao principal do sistema

Fluxo mais comum de uso:

1. Portal
2. Login
3. Dashboard
4. Cadastro e organizacao da base
5. Recebimento de solicitacoes
6. Aprovacao
7. Conversao em OS quando necessario
8. Execucao e finalizacao
9. Analise em criticidade, RAF e KPI
10. Planejamento de novas preventivas e programacoes

## 10. Ponto forte do sistema

O maior ponto forte percebido no codigo e que o sistema nao e apenas um cadastro de ordens.

Ele ja nasce com estrutura para:

- multiempresa
- multiunidade
- controle de modulos por empresa
- manutencao preventiva estruturada
- criticidade
- analise de falhas
- indicadores
- leitura de variaveis industriais

Isso coloca o produto em um nivel mais proximo de plataforma do que de ferramenta simples.

## 11. Pontos de atencao para gestao

Os pontos abaixo nao significam erro. Eles sao temas que merecem revisao gerencial:

- existem documentos antigos no repositorio com nomenclaturas de perfis diferentes das regras atuais
- existe coexistencia de camadas Prisma e Supabase, o que exige disciplina para manutencao
- alguns modulos estao mais maduros do que outros
- ha espaco para consolidar melhor as regras entre SS, execucao direta e conversao para OS
- vale padronizar um glossario oficial: unidade, localizacao, area, centro de trabalho, ativo, bem, solicitacao, ordem, plano, programacao

## 12. Recomendacao para uso desta spec

Quando voces forem revisar o sistema, usem esta ordem:

1. confiram se os modulos listados representam a operacao real de voces
2. validem se os perfis de acesso fazem sentido
3. validem se o fluxo SS > aprovacao > OS esta alinhado com a operacao
4. validem se o bloco de planos e programacoes esta coerente com a manutencao preventiva
5. validem se KPI, criticidade e RAF estao medindo o que realmente importa

## 13. Proximo nivel recomendado de profissionalizacao

Depois desta spec, o ideal e criar mais tres documentos simples:

- `glossario_negocio.md`
- `regras_de_acesso.md`
- `backlog_prioridades.md`

Assim voces ficam com:

- uma spec mestra
- um fluxo visual
- um dicionario de termos
- uma lista de prioridades reais de evolucao

## 14. Arquivo complementar

O espelho visual desta spec foi criado em:

- `fluxograma_codex.md`

## 15. Referencias externas usadas para orientar o formato

Estas referencias foram usadas como apoio de metodo, nao como fonte do funcionamento do sistema:

- Atlassian, sobre product specification e separacao entre resumo, escopo, requisitos funcionais e tecnicos:
  - https://www.atlassian.com/agile/product-management/product-specification
- Mermaid, sobre sintaxe oficial de fluxogramas e organizacao em subfluxos:
  - https://mermaid.js.org/syntax/flowchart.html
