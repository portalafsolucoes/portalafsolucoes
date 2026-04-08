# Fluxograma Codex

Este arquivo espelha a `spec_codex.md` em formato visual.

Os diagramas abaixo usam Mermaid.

## 1. Visao geral do sistema

```mermaid
flowchart TD
    A[Portal / Hub] --> B[Login]
    B --> C[Identificar empresa, perfil e unidade ativa]
    C --> D[Dashboard]

    D --> E[Cadastros Basicos]
    D --> F[Ativos e Arvore]
    D --> G[Solicitacoes]
    D --> H[Aprovacoes]
    D --> I[Ordens de Servico]
    D --> J[Planos e Programacao]
    D --> K[Criticidade]
    D --> L[RAF]
    D --> M[KPI]
    D --> N[GEP]
    D --> O[Administracao]
```

## 2. Fluxo de acesso e navegacao

```mermaid
flowchart TD
    A[Acessar /] --> B[Redireciona para /hub]
    B --> C{Usuario ja esta logado?}
    C -- Nao --> D[Ir para /login]
    C -- Sim --> E[Entrar no modulo]
    D --> F[Validar email e senha]
    F --> G{Credenciais validas?}
    G -- Nao --> H[Exibir erro]
    G -- Sim --> I[Criar sessao]
    I --> J[Identificar empresa]
    J --> K[Identificar perfil]
    K --> L[Definir unidade ativa]
    L --> E
    E --> M[Exibir menu conforme permissoes e modulos habilitados]
```

## 3. Fluxo operacional principal

```mermaid
flowchart TD
    A[Cadastros Basicos] --> B[Ativos, areas, centros, equipes e recursos]
    B --> C[Operacao registra Solicitação de Servico]
    C --> D[Aprovacao gerencial]
    D --> E{Aprovada?}
    E -- Nao --> F[Solicitacao rejeitada]
    E -- Sim --> G{Vai virar OS?}
    G -- Nao --> H[Solicitacao aprovada sem virar OS]
    G -- Sim --> I[Gerar Ordem de Servico]
    I --> J[Executar OS]
    J --> K[Finalizar OS]
    K --> L[Atualizar historico do ativo]
    L --> M[Alimentar KPI, criticidade e rastreabilidade]
```

## 4. Fluxo de solicitacoes e aprovacoes

```mermaid
flowchart TD
    A[Usuario cria SS] --> B[Status PENDING]
    B --> C[Fila de aprovacoes]
    C --> D{Gestor aprova?}
    D -- Nao --> E[Status REJECTED]
    D -- Sim --> F[Status APPROVED]
    F --> G{Converter em OS?}
    G -- Nao --> H[SS continua aprovada]
    G -- Sim --> I[Criar OS corretiva]
    I --> J[Vincular responsavel]
    J --> K[OS entra em execucao]
```

## 5. Fluxo de ordem de servico

```mermaid
flowchart TD
    A[OS criada manualmente ou a partir de SS] --> B[Status PENDING]
    B --> C{Foi liberada/programada?}
    C -- Sim --> D[Status RELEASED]
    C -- Nao --> D
    D --> E[Executor inicia]
    E --> F[Status IN_PROGRESS]
    F --> G{Precisa pausar?}
    G -- Sim --> H[Status ON_HOLD]
    H --> E
    G -- Nao --> I[Registrar execucao]
    I --> J[Finalizar]
    J --> K[Status COMPLETE]
```

## 6. Fluxo de planejamento preventivo

```mermaid
flowchart TD
    A[Manutencao Padrao por familia] --> B[Manutencao do Bem por ativo]
    B --> C[Emissao de Plano de Manutencao]
    C --> D[Gerar OSs previstas no periodo]
    D --> E[Programacao de OSs]
    E --> F[Confirmar programacao]
    F --> G[Liberar OSs para execucao]
    G --> H[Execucao de campo]
    H --> I[Finalizacao]
```

## 7. Fluxo automatico de preventivas

```mermaid
flowchart TD
    A[Rotina automatica] --> B[Buscar OSs preventivas elegiveis]
    B --> C{OS anterior concluida e data atingida?}
    C -- Nao --> D[Somente reajustar proxima data]
    C -- Sim --> E[Gerar nova OS preventiva]
    E --> F[Copiar atribuicoes]
    F --> G[Ajustar data pelo calendario]
    G --> H[Registrar nova proxima execucao]
```

## 8. Fluxo de ativos, arvore e criticidade

```mermaid
flowchart TD
    A[Unidade] --> B[Area]
    B --> C[Centro de Trabalho]
    C --> D[Ativo]
    D --> E[Subativo]

    D --> F[Solicitacoes]
    D --> G[Ordens de Servico]
    D --> H[RAFs]
    D --> I[Historico]
    D --> J[Criticidade]

    J --> K[Calculo GUT]
    J --> L[Contagem de SS abertas]
    J --> M[Contagem de OS abertas]
    J --> N[Contagem de RAFs]
    J --> O[Classificacao final]
```

## 9. Fluxo de pessoas, equipes e unidades

```mermaid
flowchart TD
    A[Gestao de Usuarios] --> B[Definir papel]
    A --> C[Definir unidades permitidas]
    A --> D[Ativar ou desativar usuario]

    E[Pessoas e Equipes] --> F[Criar pessoa]
    E --> G[Criar equipe]
    E --> H[Vincular membros]
    E --> I[Usar equipe em SS e OS]

    C --> J[Escolha de unidade ativa]
    J --> K[Filtragem operacional dos dados]
```

## 10. Fluxo de administracao do portal

```mermaid
flowchart TD
    A[SUPER_ADMIN] --> B[Criar empresa]
    B --> C[Criar unidade principal]
    C --> D[Criar usuario administrador inicial]
    D --> E[Habilitar modulos da empresa]
    E --> F[Empresa pronta para operar]
```

## 11. Fluxo de RAF

```mermaid
flowchart TD
    A[Ocorrencia de falha] --> B[Criar RAF]
    B --> C[Registrar contexto da falha]
    C --> D[Descrever acao imediata]
    D --> E[Preencher 5 porques]
    E --> F[Registrar testes de hipotese]
    F --> G[Montar plano de acao]
    G --> H[Usar aprendizado para manutencao e gestao]
```

## 12. Fluxo de KPI e GEP

```mermaid
flowchart TD
    A[Dados de OS, SS e ativos] --> B[KPI]
    B --> C[Indicadores de confiabilidade]
    B --> D[Indicadores de processo]
    B --> E[Indicadores de custo]

    F[Arquivos e leituras GEP] --> G[Importacao de dados]
    G --> H[Graficos e tabelas por turno]
    H --> I[Apoio a analise operacional]

    I --> B
```

