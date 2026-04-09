# Especificacao Funcional - Portal AF Solucoes (CMMS)

**Versao:** 1.0  
**Data:** 08/04/2026  
**Produto:** Portal AF Solucoes - Gestao de Manutencao (CMMS)  
**Publico deste documento:** Socios, gestores, equipe de produto

---

## Como usar este documento

Este documento descreve **tudo o que o sistema faz** de forma pratica. Cada funcionalidade esta organizada assim:

- **O que e**: explicacao simples do que a funcao faz
- **Quem usa**: quais perfis de usuario tem acesso
- **O que aparece na tela**: o que o usuario ve
- **O que o usuario pode fazer**: acoes disponiveis
- **Regras de negocio**: comportamentos automaticos e restricoes
- **Criterio de aceite**: como saber se esta funcionando corretamente

> **Dica:** Use este documento para revisar se cada funcionalidade atende ao que voces esperam. Se algo nao faz sentido ou falta algo, anote ao lado.

---

## Glossario (termos usados neste documento)

| Termo | Significado |
|-------|-------------|
| **OS (Ordem de Servico)** | Documento que registra um trabalho de manutencao a ser feito |
| **SS (Solicitacao de Servico)** | Pedido feito por alguem para que um servico seja realizado |
| **Ativo** | Qualquer equipamento, maquina ou bem que precisa de manutencao |
| **Unidade** | Filial, fabrica ou local fisico onde a empresa opera |
| **RAF** | Relatorio de Analise de Falha - investigacao do motivo de uma falha |
| **GEP** | Gestao de Variaveis de Processo - monitoramento de dados de producao |
| **KPI** | Indicador de desempenho (ex: tempo medio de reparo) |
| **MTBF** | Tempo Medio Entre Falhas - quanto tempo um equipamento funciona antes de quebrar |
| **MTTR** | Tempo Medio de Reparo - quanto tempo leva para consertar |
| **GUT** | Metodo de priorizacao: Gravidade x Urgencia x Tendencia (nota 1 a 5) |
| **Plano Padrao** | Modelo de manutencao preventiva que serve para toda uma familia de equipamentos |
| **Plano do Ativo** | Manutencao preventiva especifica de um equipamento |
| **Cadastro Basico** | Dados de referencia do sistema (tipos, familias, centros de custo, etc.) |

---

## Perfis de Usuario (Quem pode fazer o que)

O sistema tem 7 perfis. Cada um ve e faz coisas diferentes:

| Perfil | Descricao simples | Exemplo de pessoa |
|--------|-------------------|-------------------|
| **Super Admin** | Controle total do sistema e de todas as empresas | Dono do Portal AF Solucoes |
| **Gestor** | Gerencia tudo dentro da sua empresa/unidade | Gerente de manutencao |
| **Planejador** | Cria planos e programa manutencoes | Planejador de manutencao (PCM) |
| **Mecanico** | Executa ordens de servico mecanicas | Mecanico de manutencao |
| **Eletricista** | Executa ordens de servico eletricas | Eletricista de manutencao |
| **Operador** | Abre solicitacoes e visualiza informacoes | Operador de maquina |
| **Construtor Civil** | Executa ordens de servico civis | Pedreiro, encanador |

### Resumo de permissoes por perfil

| Funcionalidade | Super Admin | Gestor | Planejador | Mecanico/Eletricista/Operador/C.Civil |
|----------------|:-----------:|:------:|:----------:|:--------------------------------------:|
| Ver dashboard | Sim (corporativo) | Sim | Sim | Nao (vai direto para OS) |
| Criar/editar usuarios | Sim | Sim | Nao | Nao |
| Criar/editar ativos | Sim | Sim | Sim | Nao |
| Criar OS | Sim | Sim | Sim | Sim |
| Executar OS | Sim | Sim | Sim | Sim (somente as suas) |
| Aprovar solicitacoes | Sim | Sim | Nao | Nao |
| Ver RAF | Sim | Sim | Nao | Nao |
| Criar RAF | Sim | Sim | Nao | Nao |
| Acessar painel admin | Sim | Nao | Nao | Nao |
| Trocar de unidade | Sim | Sim | Nao | Nao |

---

## MODULO 1: Portal de Entrada (Hub)

### 1.1 Pagina Inicial do Portal

**O que e:** Primeira tela apos o login. Mostra os modulos disponiveis no sistema.

**Quem usa:** Todos os usuarios logados.

**O que aparece na tela:**
- Logo do Portal AF Solucoes
- Nome do usuario logado
- Cartoes dos modulos:
  - **CMMS** (Gestao de Manutencao) - Ativo, pode clicar para entrar
  - **GVP** (Gestao de Variaveis de Processo) - Em breve
  - **GPA** (Gestao de Portaria e Acesso) - Em breve
- Botao de logout

**O que o usuario pode fazer:**
- Clicar no modulo CMMS para acessar o sistema de manutencao
- Fazer logout

**Regras:**
- Se o usuario nao esta logado, ve o botao "Entrar" ao inves do nome
- Modulos desabilitados aparecem com etiqueta "Em breve" e nao sao clicaveis
- Cada empresa pode ter modulos diferentes habilitados

**Criterio de aceite:**
- [ ] Usuario logado ve seu nome e o botao de logout
- [ ] Clicar em CMMS leva ao dashboard ou lista de OS (conforme perfil)
- [ ] Modulos desabilitados nao sao clicaveis

---

## MODULO 2: Login e Autenticacao

### 2.1 Tela de Login

**O que e:** Onde o usuario entra com email e senha para acessar o sistema.

**Quem usa:** Todos.

**O que aparece na tela:**
- Logo do sistema
- Campo de email
- Campo de senha
- Botao "Entrar"
- Mensagem: "Acesso restrito. Contate o administrador da sua empresa"

**O que o usuario pode fazer:**
- Digitar email e senha
- Clicar em "Entrar"

**Regras:**
- Nao existe cadastro publico - somente o admin cria usuarios
- Se email/senha estao errados, aparece mensagem de erro
- Se o usuario esta desativado, nao consegue entrar
- Apos login, vai para o Hub (/hub)
- A sessao dura 7 dias (depois precisa logar novamente)

**Criterio de aceite:**
- [ ] Login com credenciais corretas leva ao Hub
- [ ] Login com credenciais erradas mostra erro
- [ ] Usuario desativado nao consegue logar
- [ ] Sessao expira apos 7 dias

### 2.2 Registro de Empresa (apenas Super Admin)

**O que e:** Tela para o Super Admin criar uma nova empresa no sistema.

**Quem usa:** Apenas Super Admin.

**O que aparece na tela:**
- Formulario com: nome da empresa, email, telefone, site
- Formulario do primeiro usuario admin da empresa

**Regras:**
- O registro publico esta desativado
- Somente o Super Admin pode criar novas empresas
- Ao criar empresa, ja cria o primeiro usuario administrador

---

## MODULO 3: Dashboard (Painel de Controle)

### 3.1 Dashboard Operacional

**O que e:** Painel com resumo numerico da situacao atual da manutencao.

**Quem usa:** Gestor, Planejador, Super Admin.

**O que aparece na tela:**
- **Ordens de Servico:** Total, abertas, em andamento
- **Ativos:** Total, operacionais, parados
- **Solicitacoes:** Total, pendentes

**Regras:**
- Os dados sao filtrados pela unidade ativa do usuario
- Mecanicos, eletricistas e operadores nao veem o dashboard (vao direto para OS)

**Criterio de aceite:**
- [ ] Numeros refletem a realidade do banco de dados
- [ ] Troca de unidade atualiza os numeros
- [ ] Perfis operacionais sao redirecionados para OS

### 3.2 Dashboard Corporativo (Super Admin)

**O que e:** Visao consolidada de todas as unidades e empresas.

**Quem usa:** Apenas Super Admin.

**O que aparece na tela:**
- Total de unidades, ativos, usuarios, ordens de servico
- OS completas vs pendentes
- Solicitacoes pendentes por unidade
- Tabela comparativa entre unidades
- Tipos de OS: corretiva vs preventiva

**Criterio de aceite:**
- [ ] Mostra dados de todas as unidades consolidados
- [ ] Tabela comparativa lista cada unidade com seus numeros

---

## MODULO 4: Ordens de Servico (OS)

### 4.1 Lista de Ordens de Servico

**O que e:** Tela principal para ver e gerenciar todas as ordens de servico.

**Quem usa:** Todos (com permissoes diferentes).

**O que aparece na tela:**
- Alternar entre visualizacao em cartoes ou tabela
- Campo de busca
- Filtros por status: Pendente, Liberada, Em Andamento, Parada, Concluida
- Filtro por situacao: No Sistema / Fora do Sistema
- Botao "Nova OS" (para quem tem permissao)
- Para cada OS: numero, titulo, status, prioridade, ativo, data

**O que o usuario pode fazer:**
- Buscar OS por texto
- Filtrar por status
- Criar nova OS
- Ver detalhes de uma OS
- Executar uma OS (se atribuida a ele)
- Editar uma OS
- Excluir uma OS

**Regras:**
- OS sao filtradas pela unidade ativa
- Cada OS tem um numero interno automatico (formato MAN-XXXXXX)
- Pode ter tambem um numero externo (do ERP/TOTVS)
- Se tem numero externo, esta "No Sistema"; se nao, esta "Fora do Sistema"

**Criterio de aceite:**
- [ ] Lista mostra todas as OS da unidade ativa
- [ ] Filtros funcionam corretamente
- [ ] Busca encontra OS por titulo ou numero
- [ ] Botao Nova OS aparece para perfis com permissao

### 4.2 Criar/Editar Ordem de Servico

**O que e:** Formulario para registrar uma nova OS ou alterar uma existente.

**Quem usa:** Super Admin, Gestor, Planejador, Mecanico, Eletricista, Operador, C.Civil.

**Campos do formulario:**
- **Titulo** (obrigatorio)
- **Descricao**
- **Tipo:** Reativa, Preventiva, Corretiva, Preditiva
- **Subtipo:** Preventiva Manual, Corretiva Planejada, Corretiva Imediata
- **Prioridade:** Nenhuma, Baixa, Media, Alta, Critica
- **Ativo** (qual equipamento)
- **Localizacao/Unidade**
- **Data prevista**
- **Duracao estimada**
- **Usuario responsavel**
- **Equipe responsavel**
- **Tarefas** (checklist de atividades)

**Regras:**
- O numero interno e gerado automaticamente
- Novo status e sempre "Pendente"
- Pode ser gerada automaticamente a partir de uma Solicitacao aprovada

**Criterio de aceite:**
- [ ] Formulario salva todos os campos corretamente
- [ ] Numero interno e gerado automaticamente
- [ ] Status inicial e "Pendente"

### 4.3 Executar Ordem de Servico

**O que e:** Tela onde o tecnico registra o trabalho realizado.

**Quem usa:** Tecnico atribuido a OS (Mecanico, Eletricista, etc.) ou Gestor/Admin.

**O que aparece na tela:**
- Detalhes da OS
- Checklist de tarefas (marcar como concluido)
- Anotacoes de execucao
- Foto antes e foto depois
- Tempo real de parada (inicio e fim)
- Tempo real de manutencao (inicio e fim)
- Custos: mao de obra, pecas, terceiros, ferramentas
- Recursos utilizados
- Feedback

**Fluxo de execucao:**
1. Tecnico clica em "Iniciar Execucao" - status muda para "Em Andamento"
2. Tecnico preenche dados e marca tarefas
3. Tecnico clica em "Concluir" - status muda para "Concluida"
4. Gestor pode "Finalizar" - encerra definitivamente a OS

**Regras:**
- So o tecnico atribuido ou admin pode executar
- Fotos sao opcionais mas recomendadas
- Custos sao calculados automaticamente quando informados

**Criterio de aceite:**
- [ ] Iniciar execucao muda status para "Em Andamento"
- [ ] Tarefas podem ser marcadas individualmente
- [ ] Concluir muda status para "Concluida"
- [ ] Fotos antes/depois sao salvas corretamente
- [ ] Custos sao registrados e somados

### 4.4 Detalhes da Ordem de Servico

**O que e:** Visualizacao completa de todos os dados de uma OS.

**O que aparece na tela:**
- Todos os campos da OS
- Historico de alteracoes
- Tarefas com status
- Custos detalhados
- Fotos
- Arquivos anexados

---

## MODULO 5: Solicitacoes de Servico (SS)

### 5.1 Lista de Solicitacoes

**O que e:** Portal onde qualquer usuario pode pedir um servico de manutencao.

**Quem usa:** Todos (com permissoes diferentes).

**O que aparece na tela:**
- Cartoes ou tabela com as solicitacoes
- Busca por texto
- Status: Pendente, Aprovada, Rejeitada, Cancelada
- Prioridade e urgencia
- Quem criou e quando
- Equipe atribuida

**O que o usuario pode fazer:**
- Criar nova solicitacao
- Ver detalhes
- Editar (se permitido)
- Excluir (nao pode excluir solicitacoes ja aprovadas)

### 5.2 Criar Solicitacao

**O que e:** Formulario para pedir um servico.

**Campos:**
- **Titulo** (obrigatorio)
- **Descricao** do problema
- **Prioridade:** Baixa, Media, Alta, Critica
- **Ativo** relacionado (qual equipamento)
- **Localizacao**
- **Data desejada**
- **Arquivos/fotos** (anexos)

**Regras:**
- Qualquer usuario logado pode criar
- Status inicial e sempre "Pendente"

### 5.3 Aprovacao de Solicitacoes

**O que e:** Tela onde gestores avaliam e aprovam ou rejeitam solicitacoes.

**Quem usa:** Super Admin e Gestor.

**O que o usuario pode fazer:**
- Aprovar: a solicitacao pode ser convertida em OS automaticamente
- Rejeitar: precisa informar motivo
- Ver detalhes completos da solicitacao

**Regras:**
- Apenas Super Admin e Gestor podem aprovar/rejeitar
- Ao aprovar, pode-se marcar para gerar OS automaticamente
- Solicitacao rejeitada nao pode ser excluida

**Criterio de aceite:**
- [ ] Aprovacao muda status para "Aprovada"
- [ ] Rejeicao exige motivo e muda status para "Rejeitada"
- [ ] Aprovacao com conversao gera OS automaticamente
- [ ] Badge no menu mostra quantidade de pendencias

---

## MODULO 6: Gestao de Ativos

### 6.1 Lista de Ativos

**O que e:** Inventario de todos os equipamentos e bens da empresa.

**Quem usa:** Todos podem ver. Super Admin, Gestor e Planejador podem criar/editar.

**O que aparece na tela:**
- **Visao em arvore:** mostra a hierarquia (equipamento pai > sub-equipamentos)
- **Visao em tabela:** lista plana com todos os ativos
- Busca por nome/descricao
- Filtro por status: Operacional, Parado, Em Reparo, Inativo
- Painel de detalhes ao lado (desktop) ou modal (celular)

**O que o usuario pode fazer:**
- Buscar e filtrar ativos
- Ver detalhes de um ativo
- Criar novo ativo
- Criar sub-ativo (equipamento dentro de outro)
- Editar ativo
- Excluir ativo

### 6.2 Cadastro/Edicao de Ativo

**O que e:** Formulario completo para registrar um equipamento.

**Campos principais:**
- **Nome** (obrigatorio)
- **Tag** (codigo curto, maximo 6 caracteres, unico por unidade)
- **Codigo Protheus** (integracao com ERP)
- **Codigo de barras / NFC**
- **Numero de serie**
- **Fabricante e modelo**
- **Status:** Operacional, Parado, Em Reparo, Inativo
- **Localizacao, area, centro de trabalho, centro de custo**
- **Familia e modelo da familia** (classificacao padrao)
- **Custo de aquisicao, valor de compra, custo/hora**
- **Data de compra e garantia**
- **Criticidade GUT:** Gravidade (1-5), Urgencia (1-5), Tendencia (1-5)
- **Tem estrutura?** (sub-equipamentos)
- **Tem contador?** (hodometro, horimetro, etc.)
- **Equipamento pai** (para sub-ativos)
- **Imagem do ativo**

**Regras:**
- Tag deve ser unica dentro da unidade
- Criticidade GUT e calculada automaticamente (G x U x T)
- Ativo pode ter hierarquia (pai > filhos)

### 6.3 Detalhes do Ativo

**O que e:** Pagina completa com todas as informacoes de um equipamento.

**O que aparece:**
- Dados cadastrais
- **Linha do tempo:** historico de tudo que aconteceu com o ativo (criacao, OS, solicitacoes, alteracoes)
- **Anexos:** manuais, fotos, desenhos, certificados (16 categorias)
- **Pecas sobressalentes:** lista de pecas associadas ao ativo
- **Sub-ativos:** equipamentos que fazem parte deste
- **OS relacionadas:** ordens de servico deste ativo

**Criterio de aceite:**
- [ ] Linha do tempo mostra eventos em ordem cronologica
- [ ] Anexos podem ser enviados e baixados
- [ ] Hierarquia de sub-ativos funciona corretamente

### 6.4 Ativos Padrao (Template)

**O que e:** Modelos de ativos pre-cadastrados com base no ERP TOTVS.

**Quem usa:** Gestor, Planejador.

**Funcao:** Serve como template para criar novos ativos mais rapidamente, ja com caracteristicas pre-definidas.

---

## MODULO 7: Localizacoes (Unidades/Locais)

### 7.1 Lista de Localizacoes

**O que e:** Gerenciamento dos locais fisicos (fabricas, filiais, areas).

**Quem usa:** Super Admin, Gestor.

**O que aparece na tela:**
- Cartoes com cada local
- Nome, endereco
- Quantidade de ativos no local
- Quantidade de OS no local

**O que o usuario pode fazer:**
- Criar nova localizacao
- Editar localizacao
- Excluir localizacao
- Criar localizacoes filhas (hierarquia)

**Regras:**
- Localizacoes podem ser hierarquicas (fabrica > setor > area)
- Localizacoes de nivel raiz sao tratadas como "unidades"
- Dados do sistema sao filtrados pela unidade ativa

---

## MODULO 8: Pessoas e Equipes

### 8.1 Lista de Pessoas

**O que e:** Gerenciamento de todos os usuarios do sistema.

**Quem usa:** Super Admin, Gestor.

**O que aparece na tela:**
- Cartoes com foto/iniciais, nome, cargo, email, telefone
- Perfil (badge colorido)
- Status: ativo ou inativo
- Busca por nome ou email
- Filtro por perfil

**O que o usuario pode fazer:**
- Cadastrar nova pessoa (com email, senha, perfil, unidades)
- Editar dados de uma pessoa
- Desativar/ativar pessoa
- Atribuir unidades de acesso

### 8.2 Equipes

**O que e:** Grupos de trabalho para atribuicao de tarefas.

**O que aparece na tela:**
- Cartoes com nome da equipe, descricao
- Membros da equipe (pre-visualizacao de 3 + contagem)
- Quantidade de OS atribuidas
- Quantidade de ativos sob responsabilidade

**O que o usuario pode fazer:**
- Criar equipe com nome, descricao e membros
- Definir lider da equipe
- Adicionar/remover membros
- Atribuir OS e ativos a equipe

---

## MODULO 9: Planos de Manutencao

### 9.1 Planos Padrao (por Familia)

**O que e:** Modelos de manutencao preventiva que se aplicam a toda uma familia de equipamentos.

**Quem usa:** Gestor, Planejador.

**Campos:**
- Sequencia, nome do plano
- Tempo de manutencao e unidade de tempo
- Periodo (frequencia)
- Prioridade
- Para a maquina? (sim/nao)
- Tolerancia em dias
- Tipo de acompanhamento
- **Tarefas** do plano (checklist)
  - Cada tarefa tem: codigo, descricao, ordem, tempo de execucao
  - Cada tarefa pode ter: passos detalhados e recursos necessarios

**Regras:**
- Planos padrao sao vinculados a uma familia de ativos
- Podem ser copiados para ativos especificos

### 9.2 Planos do Ativo (Especificos)

**O que e:** Manutencao preventiva customizada para um equipamento especifico.

**Campos adicionais:**
- Ativo vinculado
- Pode ser baseado em plano padrao ou criado do zero
- Data da ultima manutencao
- Ativo/inativo
- Tipo de servico, area de manutencao, tipo de manutencao

**Regras:**
- Cada ativo pode ter varios planos
- Planos geram OS automaticamente quando chega a data

---

## MODULO 10: Planejamento

### 10.1 Planos de Execucao

**O que e:** Ferramenta para gerar OS preventivas em lote.

**Quem usa:** Planejador, Gestor.

**Como funciona:**
1. Define periodo (data inicio e fim)
2. Define filtros (centro de custo, centro de trabalho, tipo de servico, familia)
3. Sistema calcula quais manutencoes vencem no periodo
4. Gera OS automaticamente para cada manutencao devida

**Campos:**
- Numero do plano (automatico)
- Descricao
- Data do plano, data inicio, data fim
- Filtros de escopo
- Status: Aberto

### 10.2 Programacao (Schedules)

**O que e:** Agenda de OS para um periodo especifico.

**Como funciona:**
1. Cria uma programacao com periodo
2. Adiciona OS existentes a programacao
3. Define data programada para cada OS
4. Confirma a programacao

**Status das OS na programacao:**
- Pendente > Confirmada

---

## MODULO 11: Cadastros Basicos

**O que e:** Dados de referencia que alimentam todo o sistema. Sao as "tabelas auxiliares".

**Quem usa:** Super Admin, Gestor.

### Lista de cadastros basicos:

| Cadastro | O que e | Exemplo |
|----------|---------|---------|
| **Tipos de Manutencao** | Categorias de manutencao | Corretiva, Preventiva, Preditiva |
| **Areas de Manutencao** | Disciplinas tecnicas | Mecanica, Eletrica, Civil |
| **Tipos de Servico** | Servicos especificos | Lubrificacao, Troca de rolamento |
| **Familias de Ativo** | Grupos de equipamentos | Bombas, Motores, Esteiras |
| **Modelos de Familia** | Modelos dentro das familias | Bomba centrifuga KSB |
| **Centros de Custo** | Onde alocar custos | Producao, Manutencao |
| **Centros de Trabalho** | Onde o trabalho acontece | Moagem 1, Ensaque |
| **Areas** | Divisoes fisicas da unidade | Setor A, Setor B |
| **Posicoes** | Posicoes dentro de estruturas | Posicao 1, Posicao 2 |
| **Caracteristicas** | Atributos customizados de ativos | Potencia, Vazao, RPM |
| **Recursos** | Ferramentas, materiais, pessoas | Chave de torque, Guindaste |
| **Calendarios** | Horarios de trabalho e turnos | Calendario Industrial, Adm |
| **Tarefas Genericas** | Biblioteca de tarefas reutilizaveis | Inspecionar, Lubrificar |
| **Passos Genericos** | Procedimentos detalhados | Medir temperatura, Verificar nivel |
| **Tipos de Contador** | Tipos de medicao de equipamentos | Horimetro, Hodometro |

**Funcionalidade padrao de cada cadastro:**
- Listar todos os registros
- Buscar por nome
- Criar novo
- Editar existente
- Excluir

**Regra importante:** Alguns cadastros sao por empresa (compartilhados entre unidades) e outros sao por unidade (especificos).

---

## MODULO 12: Criticidade de Ativos

**O que e:** Classificacao de importancia dos equipamentos usando o metodo GUT.

**Quem usa:** Gestor, Planejador.

**Como funciona:**
- Cada ativo recebe nota de 1 a 5 em tres dimensoes:
  - **Gravidade:** Se quebrar, qual o impacto?
  - **Urgencia:** Precisa resolver com que rapidez?
  - **Tendencia:** Vai piorar se nao fizer nada?
- O sistema calcula: **GUT = G x U x T** (resultado de 1 a 125)
- Quanto maior o GUT, mais critico o ativo

---

## MODULO 13: RAF (Analise de Falha)

### 13.1 Lista de RAFs

**O que e:** Registro de investigacoes sobre falhas de equipamentos.

**Quem usa:** Super Admin e Gestor.

**O que aparece na tela:**
- Numero do RAF, area, equipamento
- Data da ocorrencia
- Operador no momento
- Tipo de falha: Aleatoria ou Repetitiva

### 13.2 Criar/Editar RAF

**Campos:**
- **Identificacao:** Numero do RAF, area, equipamento
- **Ocorrencia:** Data, hora, operador do painel
- **Impacto:** Extensao da parada, quebra, producao perdida
- **Descricao da falha**
- **Acao imediata tomada**
- **Analise 5 Porques:** Metodologia onde se pergunta "por que?" 5 vezes para chegar na causa raiz
- **Testes de hipotese:** Hipoteses testadas durante a investigacao
- **Plano de acao:** Acoes corretivas definidas

**Criterio de aceite:**
- [ ] 5 Porques podem ser preenchidos em cascata
- [ ] Plano de acao tem campos de responsavel e prazo
- [ ] Numero do RAF e unico

---

## MODULO 14: KPI (Indicadores de Desempenho)

**O que e:** Painel com metricas de desempenho da manutencao.

**Quem usa:** Gestor, Planejador, Super Admin.

**Indicadores exibidos:**

| Indicador | O que mede |
|-----------|-----------|
| **Total de OS** | Quantidade total de ordens de servico |
| **OS Concluidas** | Quantas foram finalizadas |
| **OS Pendentes** | Quantas estao esperando |
| **OS Preventivas** | Quantidade de preventivas |
| **OS Corretivas** | Quantidade de corretivas |
| **MTBF** | Tempo medio entre falhas (confiabilidade) |
| **MTTR** | Tempo medio de reparo (eficiencia) |
| **Disponibilidade** | % do tempo que o equipamento esta operacional |
| **PMC** | Cobertura de manutencao preventiva (%) |
| **Custo por ativo** | Quanto custa manter cada equipamento |
| **Reducao de custo** | Economia obtida |

**Filtros:**
- Unidade (para admin)
- Periodo (data inicio e fim)

**Criterio de aceite:**
- [ ] Indicadores calculam corretamente com base nas OS
- [ ] Filtro de periodo funciona
- [ ] Valores monetarios aparecem formatados (R$ X.XXX,XX)

---

## MODULO 15: GEP (Variaveis de Processo)

**O que e:** Monitoramento de dados de producao em tempo real (temperatura, pressao, vazao, etc.).

**Quem usa:** Gestor, Planejador, Operador.

**O que aparece na tela:**
- Seletor de setor (Moagem 1, 2, 3, Secador, etc.)
- Seletor de variaveis (443 variaveis disponiveis)
- Seletor de data
- **Visualizacao em grafico:** linhas de tendencia com areas de turno
- **Visualizacao em tabela:** dados hora a hora, por turno

**Turnos:**
- A: 01h - 07h
- B: 07h - 13h
- C: 13h - 19h
- D: 19h - 01h (dia seguinte)

**Funcionalidades:**
- Comparar multiplas variaveis no mesmo grafico
- Escala normalizada ou real
- Indicadores de status do equipamento (rodando/parado)

**Criterio de aceite:**
- [ ] Grafico mostra dados corretos para data e variaveis selecionadas
- [ ] Turnos sao destacados visualmente no grafico
- [ ] Tabela mostra valores hora a hora

---

## MODULO 16: Painel Administrativo

### 16.1 Portal Admin

**O que e:** Area exclusiva do Super Admin para gerenciar empresas e o sistema todo.

**Quem usa:** Apenas Super Admin.

**O que aparece:**
- Estatisticas globais: empresas, usuarios, unidades, ativos, OS, solicitacoes
- Lista de empresas com:
  - Nome, email, telefone, site
  - Quantidade de usuarios
  - Modulos habilitados
  - Data de criacao

**O que pode fazer:**
- Criar nova empresa (com usuario admin inicial)
- Habilitar/desabilitar modulos por empresa (CMMS, GVP, GPA)

### 16.2 Gestao de Unidades (Admin)

**O que e:** Criar e gerenciar unidades/filiais de todas as empresas.

### 16.3 Gestao de Usuarios (Admin)

**O que e:** Criar, editar e gerenciar todos os usuarios do sistema.

**Funcionalidades:**
- Criar usuario com email, senha, perfil
- Atribuir usuario a uma ou mais unidades
- Ativar/desativar usuario
- Alterar perfil do usuario

---

## MODULO 17: Perfil do Usuario

**O que e:** Tela onde o usuario ve seus proprios dados.

**O que aparece:**
- Avatar com iniciais
- Nome completo, email, usuario
- Cargo e perfil
- Empresa
- Data de entrada no sistema
- Permissoes do seu perfil

**Regra:** So visualizacao - o usuario nao edita o proprio perfil (admin faz isso).

---

## MODULO 18: Pecas e Estoque

> **Status atual:** Este modulo esta desativado. A pagina redireciona para Ordens de Servico.

**Funcionalidade prevista:**
- Cadastro de pecas sobressalentes
- Controle de estoque (quantidade, minimo)
- Categorias de pecas
- Associacao de pecas a ativos
- Uso de pecas em OS

---

## MODULO 19: Arvore Hierarquica

**O que e:** Visualizacao em arvore de toda a estrutura de ativos, mostrando a hierarquia completa.

**Quem usa:** Todos que podem ver ativos.

**Funcao:** Navegacao visual da estrutura: Unidade > Area > Equipamento > Sub-equipamento.

---

## MODULO 20: Relatorios e Analiticos

> **Status atual:** Em desenvolvimento. As funcionalidades estao marcadas como "em construcao".

**Funcionalidades previstas:**
- OS por status
- Tempo medio de conclusao
- Custos de manutencao
- Ativos por status

---

## MODULO 21: Integracao com TOTVS/Protheus

**O que e:** Sincronizacao de dados com o ERP TOTVS Protheus.

**Funcionalidades:**
- **Importar:** Trazer dados do Protheus para o sistema (ativos, familias, planos)
- **Exportar:** Enviar dados do sistema para o Protheus

**Campos de integracao:** Diversos campos tem o prefixo "protheusCode" para mapeamento com o ERP.

---

## MODULO 22: Exportacao de Dados

**O que e:** Exportar listas de dados para Excel.

**Quem usa:** Gestor, Planejador, Super Admin.

**Dados exportaveis:**
- Ordens de servico
- Ativos
- Solicitacoes
- Usuarios
- RAFs

**Formato:** Arquivo Excel (.xlsx) com colunas formatadas e largura automatica.

---

## MODULO 23: Upload de Arquivos

**O que e:** Sistema de envio de arquivos (fotos, documentos, manuais).

**Onde e usado:**
- Anexos em OS
- Anexos em solicitacoes
- Documentos de ativos (16 categorias: manual, foto, desenho, certificado, etc.)
- Fotos antes/depois de execucao

**Funcionalidades:**
- Arrastar e soltar arquivos
- Validacao de tipo de arquivo
- Limite de quantidade
- Pre-visualizacao de imagens
- Upload para nuvem (Cloudinary)

---

## MODULO 24: Notificacoes

**O que e:** Sistema de avisos para os usuarios.

**Funcionalidades:**
- Badge no menu com quantidade de solicitacoes pendentes (para Gestor/Admin)
- Historico de notificacoes (titulo, mensagem, lido/nao lido)

---

## MODULO 25: Troca de Unidade

**O que e:** Permite que usuarios com acesso a multiplas unidades troquem qual unidade estao visualizando.

**Quem usa:** Super Admin e Gestor.

**Como funciona:**
- Seletor no cabecalho (dropdown)
- Lista as unidades que o usuario tem acesso
- Ao trocar, todos os dados na tela sao atualizados para a nova unidade

**Regra:** Apenas usuarios com acesso a mais de uma unidade veem este seletor.

---

## FUNCIONALIDADES TRANSVERSAIS (presentes em todo o sistema)

### F1. Sistema Multi-Empresa
- Cada empresa tem seus proprios dados isolados
- Usuarios de uma empresa nunca veem dados de outra
- Super Admin gerencia todas as empresas

### F2. Sistema Multi-Unidade
- Dentro de cada empresa, dados sao organizados por unidade
- Usuarios veem apenas dados da unidade ativa
- Admin pode trocar entre unidades

### F3. Controle de Acesso por Perfil
- 7 perfis com permissoes diferentes
- Menus, botoes e acoes aparecem/somem conforme o perfil
- APIs tambem validam permissoes (nao so a tela)

### F4. Cabecalho Interno Limpo
- Em todas as telas internas do sistema, o lado esquerdo do header superior deve permanecer vazio
- O texto fixo `CMMS` nao deve aparecer no header principal
- O nome da empresa logada tambem nao deve ser exibido nessa area do topo

### F5. Design Responsivo
- Funciona em computador, tablet e celular
- Menu lateral colapsa em telas pequenas
- Modais viram tela cheia em celular
- Visualizacoes alternam entre grade e tabela

### F6. Busca e Filtros
- Todas as listas principais tem campo de busca
- Filtros por status, tipo, prioridade, etc.
- Busca com delay de 500ms (nao busca a cada tecla)

### F7. Carregamento Visual
- Todas as paginas tem animacao de carregamento (skeleton)
- Evita que o usuario veja tela em branco

### F8. Geracao Automatica de OS Preventiva
- Sistema pode gerar OS automaticamente com base nos planos de manutencao
- Execucao via endpoint programado (cron)

---

## Resumo de Status dos Modulos

| Modulo | Status |
|--------|--------|
| Hub/Portal | Funcionando |
| Login/Autenticacao | Funcionando |
| Dashboard | Funcionando |
| Ordens de Servico | Funcionando |
| Solicitacoes | Funcionando |
| Ativos | Funcionando |
| Localizacoes | Funcionando |
| Pessoas e Equipes | Funcionando |
| Planos de Manutencao | Funcionando |
| Planejamento | Funcionando |
| Cadastros Basicos | Funcionando |
| Criticidade | Funcionando |
| RAF | Funcionando |
| KPI | Funcionando |
| GEP | Funcionando |
| Admin | Funcionando |
| Perfil | Funcionando |
| Pecas/Estoque | Desativado |
| Arvore | Funcionando |
| Relatorios | Em desenvolvimento |
| Integracao TOTVS | Funcionando (parcial) |
| Exportacao Excel | Funcionando |
| Notificacoes | Basico |
