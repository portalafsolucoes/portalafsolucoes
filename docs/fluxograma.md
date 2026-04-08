# Fluxogramas do Sistema - Portal AF Solucoes (CMMS)

**Versao:** 1.0  
**Data:** 08/04/2026  
**Complemento de:** spec.md

> **Como ler os diagramas:** As setas (-->) mostram o caminho que o usuario faz.
> Losangos ({}) sao decisoes (sim/nao). Retangulos ([]) sao telas ou acoes.

---

## 1. MAPA GERAL DE NAVEGACAO DO SISTEMA

```
                            [Abrir Sistema]
                                  |
                                  v
                         {Usuario logado?}
                          /             \
                        Nao             Sim
                        /                 \
                       v                   v
                  [Tela de Login]     [Hub / Portal]
                       |                   |
                  Email + Senha           |
                       |          +-------+-------+-------+
                       v          |       |       |       |
                  {Valido?}    [CMMS]  [GVP]   [GPA]  [Logout]
                  /      \      |     (breve)  (breve)
                Nao      Sim    |
                /          \    v
           [Erro]     [Hub]  {Perfil?}
                              /        \
                     Admin/Gestor    Operacional
                     /Planejador     (Mec/Elet/Op)
                          |               |
                          v               v
                    [Dashboard]    [Ordens de Servico]
```

---

## 2. MENU LATERAL (Navegacao Principal)

```
MENU LATERAL DO CMMS
|
|-- Dashboard ..................... Painel com numeros resumidos
|-- Arvore ....................... Hierarquia visual dos ativos
|
|-- PESSOAS
|   |-- Pessoas e Equipes ....... Usuarios e grupos de trabalho
|
|-- CADASTROS
|   |-- Cadastros Basicos ....... Tabelas auxiliares (15 tipos)
|   |-- Ativos .................. Equipamentos e bens
|   |-- Criticidade ............. Classificacao GUT dos ativos
|   |-- Planos de Manutencao .... Preventivas (padrao e por ativo)
|   |-- Planejamento ............ Gerar OS em lote + programacao
|
|-- OPERACAO
|   |-- Ordens de Servico ....... OS corretivas e preventivas
|   |-- Solicitacoes ............ Pedidos de servico
|   |-- Aprovacoes .............. Aprovar/rejeitar solicitacoes
|   |-- RAF ..................... Analise de falhas
|
|-- APOIO
|   |-- Localizacoes ............ Fabricas e filiais
|   |-- KPI ..................... Indicadores de desempenho
|   |-- GEP ..................... Variaveis de processo
|   |-- Relatorios .............. (Em desenvolvimento)
|
|-- [Voltar ao Portal] .......... Volta para o Hub
|
|-- ADMIN (so Super Admin)
    |-- Portal Admin ............ Gerenciar empresas
    |-- Unidades ................ Gerenciar unidades
    |-- Usuarios ................ Gerenciar usuarios
```

---

## 3. FLUXO DE LOGIN

```
[Usuario abre o sistema]
        |
        v
{Tem cookie de sessao valido?}
        |              |
       Sim            Nao
        |              |
        v              v
  {Tentando acessar    [Redireciona para
   pagina de login?}    tela de login]
        |       |              |
       Sim     Nao             v
        |       |       [Digita email e senha]
        v       v              |
  [Redireciona  [Mostra         v
   para Hub]     a pagina   {Credenciais corretas?}
                 pedida]        |           |
                              Sim          Nao
                               |            |
                               v            v
                         {Usuario ativo?}  [Mensagem de erro]
                            |        |
                          Sim       Nao
                           |         |
                           v         v
                    [Cria sessao]  [Mensagem: conta
                         |         desativada]
                         v
                   [Vai para Hub]
```

---

## 4. FLUXO COMPLETO DE ORDEM DE SERVICO (OS)

```
                    CRIACAO DA OS
                    =============

    [Criar OS manualmente]     [Aprovar Solicitacao]     [Gerar Preventiva]
            |                         |                        |
            +------------+------------+------------------------+
                         |
                         v
                  [OS criada com
                   status PENDENTE]
                         |
                         v

                    LIBERACAO
                    =========

              {Gestor libera a OS?}
                  |            |
                Sim           Nao
                 |             |
                 v             v
          [Status muda      [Fica PENDENTE
           para LIBERADA]    ate ser liberada]
                 |
                 v

                    EXECUCAO
                    =========

          [Tecnico atribuido
           clica "Iniciar"]
                 |
                 v
          [Status muda para
           EM ANDAMENTO]
                 |
                 v
          [Tecnico preenche:]
          - Marca tarefas concluidas
          - Registra tempo de parada
          - Registra tempo de manutencao
          - Anota custos (mao de obra,
            pecas, terceiros, ferramentas)
          - Tira foto antes/depois
          - Escreve observacoes
                 |
                 v
          {Precisa pausar?}
             |         |
           Sim        Nao
            |          |
            v          v
      [Status muda   [Continua
       para PARADA]   preenchendo]
            |
            v
      [Retoma depois]
            |
            v

                    CONCLUSAO
                    =========

          [Tecnico clica "Concluir"]
                 |
                 v
          [Status muda para CONCLUIDA]
                 |
                 v
          {Gestor finaliza?}
             |         |
           Sim        Nao
            |          |
            v          v
      [OS finalizada  [Fica CONCLUIDA
       definitivamente] ate ser finalizada]
```

---

## 5. FLUXO DE SOLICITACAO DE SERVICO (SS)

```
[Qualquer usuario]
        |
        v
[Cria Solicitacao]
- Titulo, descricao
- Prioridade
- Ativo relacionado
- Anexa fotos/docs
        |
        v
[Status: PENDENTE]
        |
        v
[Aparece no menu do
 Gestor como badge
 de pendencia]
        |
        v
[Gestor abre Aprovacoes]
        |
        v
{Decisao do Gestor}
    |          |          |
 Aprovar    Rejeitar   Ignorar
    |          |          |
    v          v          v
[APROVADA]  [REJEITADA]  [Continua
    |       (com motivo)   PENDENTE]
    |
    v
{Converter em OS?}
    |          |
  Sim        Nao
   |          |
   v          v
[Gera OS    [Fim - fica
 automatica  apenas como
 vinculada]  registro]
   |
   v
[OS segue fluxo
 normal (ver fluxo 4)]
```

---

## 6. FLUXO DE GESTAO DE ATIVOS

```
                [Gestor/Planejador]
                       |
            +----------+----------+
            |                     |
            v                     v
    [Criar Ativo Novo]    [Importar de
            |              Ativo Padrao]
            |                     |
            v                     v
    [Preenche formulario]  [Seleciona template]
    - Nome, tag, serial         |
    - Fabricante, modelo        v
    - Localizacao          [Dados pre-preenchidos]
    - Familia, centro custo     |
    - Criticidade GUT           |
    - Custo, garantia           |
            |                   |
            +--------+----------+
                     |
                     v
              [Ativo criado]
                     |
        +------+-----+------+------+
        |      |     |      |      |
        v      v     v      v      v
    [Anexar  [Add  [Add  [Criar  [Definir
     docs]  pecas] caract.] sub-  criticidade
     manuais sobres-        ativo] GUT]
     fotos   salentes]
     etc.]
        |
        v
    [Linha do tempo registra
     todas as acoes automaticamente]
```

---

## 7. FLUXO DE MANUTENCAO PREVENTIVA

```
[Planejador configura Planos de Manutencao]
                    |
         +----------+----------+
         |                     |
         v                     v
  [Plano Padrao]         [Plano do Ativo]
  (por familia)          (especifico)
  - Tarefas              - Tarefas
  - Recursos             - Recursos
  - Frequencia           - Frequencia
  - Prioridade           - Ultima execucao
         |                     |
         +----------+----------+
                    |
                    v
        [Planejador cria Plano
         de Execucao]
        - Define periodo
        - Define filtros
        - Sistema calcula quais
          manutencoes vencem
                    |
                    v
        [Sistema gera OS
         preventivas em lote]
                    |
                    v
        [OS aparecem na lista
         com tipo "PREVENTIVA"]
                    |
                    v
        [Segue fluxo normal
         de OS (ver fluxo 4)]
```

---

## 8. FLUXO DE RAF (ANALISE DE FALHA)

```
[Ocorre uma falha no equipamento]
              |
              v
[Gestor cria RAF]
- Numero do RAF
- Area e equipamento
- Data e hora da ocorrencia
- Operador que estava no turno
              |
              v
[Registra o impacto]
- Extensao da parada
- Tipo de quebra
- Producao perdida
              |
              v
[Descreve a falha]
- O que aconteceu?
- Acao imediata tomada
              |
              v
[Analise 5 Porques]
- Por que 1: a bomba parou?
  "Porque o rolamento travou"
- Por que 2: o rolamento travou?
  "Porque nao tinha lubrificacao"
- Por que 3: nao tinha lubrificacao?
  "Porque o plano preventivo
   nao foi executado"
- Por que 4: nao foi executado?
  "Porque nao tinha pecas"
- Por que 5: nao tinha pecas?
  "Porque o estoque nao foi reposto"
              |
              v
[Define Plano de Acao]
- Acao: Repor estoque minimo
  Responsavel: Joao
  Prazo: 15/04/2026
- Acao: Revisar frequencia preventiva
  Responsavel: Maria
  Prazo: 20/04/2026
              |
              v
[RAF salvo como Aleatoria
 ou Repetitiva]
```

---

## 9. FLUXO DO GEP (VARIAVEIS DE PROCESSO)

```
[Operador/Gestor acessa GEP]
              |
              v
[Seleciona Setor]
- Moagem 1, 2 ou 3
- Secador
- Expedicao 1 ou 2
- Ensacadeira
- Energia
              |
              v
[Seleciona Variaveis]
(443 disponiveis)
- Temperatura
- Pressao
- Vazao
- Corrente
- etc.
              |
              v
[Seleciona Data]
              |
              v
{Como quer visualizar?}
      |              |
   Grafico         Tabela
      |              |
      v              v
[Linhas de      [Valores hora
 tendencia       a hora, divididos
 com areas       por turno
 dos turnos      A, B, C, D]
 destacadas]
      |
      v
{Escala?}
  |         |
Normal   Normalizada
  |         |
  v         v
[Valores  [0-100% para
 reais]    comparar variaveis
           diferentes]
```

---

## 10. FLUXO ADMINISTRATIVO (SUPER ADMIN)

```
[Super Admin acessa Portal Admin]
              |
     +--------+--------+
     |        |        |
     v        v        v

[Empresas]  [Unidades]  [Usuarios]
     |         |            |
     v         v            v

{Criar nova   {Criar nova  {Criar novo
 empresa?}     unidade?}    usuario?}
     |            |            |
     v            v            v

[Preenche]   [Preenche]   [Preenche]
- Nome       - Nome       - Email
- Email      - Endereco   - Senha
- Telefone   - Empresa    - Nome
- Site                    - Perfil
                          - Unidades
     |            |            |
     v            v            v

[Cria empresa [Cria unidade [Cria usuario
 + usuario     vinculada     com acesso
 admin         a empresa]    as unidades
 inicial]                    selecionadas]
     |
     v
[Habilita modulos]
- CMMS: sim/nao
- GVP: sim/nao
- GPA: sim/nao
```

---

## 11. FLUXO DE TROCA DE UNIDADE

```
[Usuario com acesso
 a multiplas unidades]
        |
        v
[Clica no seletor de
 unidade no cabecalho]
        |
        v
[Lista de unidades
 disponiveis aparece]
        |
        v
[Seleciona outra unidade]
        |
        v
[Sistema salva nova
 unidade ativa]
        |
        v
[TODOS os dados na tela
 sao recarregados com
 dados da nova unidade]
        |
        v
- OS da nova unidade
- Ativos da nova unidade
- Solicitacoes da nova unidade
- Dashboard da nova unidade
- Tudo filtrado pela nova unidade
```

---

## 12. FLUXO DE EXPORTACAO EXCEL

```
[Usuario em qualquer lista]
(OS, Ativos, Solicitacoes,
 Usuarios, RAFs)
        |
        v
[Clica botao "Exportar"]
        |
        v
[Sistema gera arquivo Excel]
- Colunas formatadas
- Largura automatica
- Dados filtrados conforme
  tela atual
        |
        v
[Download automatico
 do arquivo .xlsx]
```

---

## 13. FLUXO DE UPLOAD DE ARQUIVOS

```
[Usuario em tela com anexos]
(OS, Solicitacao, Ativo)
        |
        v
{Como enviar?}
    |           |
Arrastar     Clicar
e soltar     "Selecionar"
    |           |
    +-----+-----+
          |
          v
   {Tipo valido?}
     |        |
   Sim       Nao
    |         |
    v         v
{Dentro do   [Mensagem
 limite?}     de erro]
  |      |
Sim     Nao
 |       |
 v       v
[Upload  [Mensagem:
 para     limite
 nuvem]   excedido]
 |
 v
[Pre-visualizacao
 (se imagem)]
 |
 v
[Arquivo salvo
 e vinculado]
```

---

## 14. MAPA DE DADOS (O que alimenta o que)

```
CADASTROS BASICOS (base de tudo)
================================
[Familias] [Centros Custo] [Centros Trabalho] [Areas]
[Tipos Manut.] [Areas Manut.] [Tipos Servico] [Calendarios]
[Caracteristicas] [Recursos] [Posicoes] [Tarefas] [Passos]
        |
        | alimentam
        v
ATIVOS (equipamentos)
=====================
[Ativo] <-- usa --> [Familia, Centro Custo, Area, Localizacao]
   |
   | sao mantidos por
   v
PLANOS DE MANUTENCAO
====================
[Plano Padrao] --> [Plano do Ativo] --> [Tarefas + Recursos]
        |
        | geram
        v
ORDENS DE SERVICO
=================
[OS] <-- vem de --> [Solicitacao Aprovada]
[OS] <-- vem de --> [Plano Preventivo]
[OS] <-- vem de --> [Criacao Manual]
   |
   | registram
   v
EXECUCAO E CUSTOS
=================
[Tarefas feitas] [Tempo parado] [Custos] [Fotos]
        |
        | alimentam
        v
KPI E INDICADORES
=================
[MTBF] [MTTR] [Disponibilidade] [Custos por ativo]
```

---

## 15. CICLO DE VIDA DE UMA OS (Resumo Visual)

```
+----------+     +-----------+     +-------------+     +---------+     +------------+
| PENDENTE | --> | LIBERADA  | --> | EM ANDAMENTO| --> |CONCLUIDA| --> | FINALIZADA |
+----------+     +-----------+     +-------------+     +---------+     +------------+
  Criada          Gestor            Tecnico             Tecnico         Gestor
  (manual,        autoriza          inicia              termina         encerra
   SS ou           execucao          trabalho            trabalho        de vez
   preventiva)
                                        |
                                        v
                                   +---------+
                                   |  PARADA |
                                   +---------+
                                   (aguardando
                                    peca, info,
                                    etc.)
```

---

## 16. HIERARQUIA DE DADOS DO SISTEMA

```
PORTAL AF SOLUCOES
|
+-- EMPRESA (Polimix, ABC Cimentos, etc.)
    |
    +-- MODULOS HABILITADOS (CMMS, GVP, GPA)
    |
    +-- UNIDADES / LOCALIZACOES
    |   |
    |   +-- Areas
    |   +-- Centros de Trabalho
    |   +-- Ativos
    |   |   |
    |   |   +-- Sub-Ativos
    |   |   +-- Pecas Sobressalentes
    |   |   +-- Anexos (manuais, fotos)
    |   |   +-- Historico (linha do tempo)
    |   |   +-- Caracteristicas
    |   |   +-- Planos de Manutencao
    |   |   +-- Criticidade GUT
    |   |
    |   +-- Ordens de Servico
    |   |   +-- Tarefas
    |   |   +-- Custos
    |   |   +-- Fotos
    |   |   +-- Arquivos
    |   |
    |   +-- Solicitacoes
    |   +-- RAFs
    |   +-- Variaveis de Processo (GEP)
    |
    +-- USUARIOS
    |   +-- Perfil (Super Admin, Gestor, etc.)
    |   +-- Acesso a Unidades
    |   +-- Equipes
    |
    +-- CADASTROS BASICOS
        +-- Familias de Ativo
        +-- Tipos de Manutencao
        +-- Centros de Custo
        +-- Calendarios
        +-- Recursos
        +-- (... 15 tipos no total)
```

---

## 17. FLUXO DE PERMISSOES (Quem ve o que)

```
[Usuario faz login]
        |
        v
[Sistema identifica o perfil]
        |
        v
{Qual perfil?}
        |
   +----+----+----+----+
   |    |    |    |    |
   v    v    v    v    v

SUPER   GESTOR PLNEJ. MECAN. OPERAD.
ADMIN                  ELETR. C.CIVIL
  |       |      |      |      |
  v       v      v      v      v

Tudo    Tudo   Planos  Ver    Ver
+ Admin  da    + OS    + OS   + SS
Portal   empresa + Ativos + SS  (criar)
         /unidade (nao   (executar)
                  gerencia
                  pessoas)

RESULTADO:
- Menus aparecem/somem
- Botoes aparecem/somem
- APIs bloqueiam acoes nao permitidas
```

---

## Legenda dos Diagramas

| Simbolo | Significado |
|---------|-------------|
| `[Texto]` | Tela, acao ou etapa |
| `{Pergunta?}` | Ponto de decisao (sim/nao) |
| `-->` | Direcao do fluxo |
| `|` | Conexao vertical |
| `+--` | Ramificacao / sub-item |
| `(texto)` | Observacao ou nota |
| `v` | Seta para baixo |
