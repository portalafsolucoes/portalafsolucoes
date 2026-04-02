# 🔄 FLUXOGRAMA COMPLETO DO SISTEMA CMMS - ADWTECH

> **Versão:** 2.0 | **Atualizado:** 27/10/2025 | **Status:** ✅ Implementado e Testado

---

## 📋 ÍNDICE

1. [Tipos de Usuários](#-tipos-de-usuários)
2. [Login e Registro](#-login-e-registro)
3. [Solicitação de Serviço (SS)](#-solicitação-de-serviço-ss)
4. [Ordem de Serviço (OS)](#-ordem-de-serviço-os)
5. [Gestão de Ativos](#-gestão-de-ativos)
6. [Gestão de Peças](#-gestão-de-peças)
7. [Gestão de Equipes](#-gestão-de-equipes)
8. [Dashboards](#-dashboards)
9. [Funcionalidades Futuras](#-funcionalidades-futuras)

---

## 👥 TIPOS DE USUÁRIOS

### SUPER_ADMIN (Super Administrador)
✅ Controle total do sistema  
✅ Gerenciar todas as empresas  
✅ Criar/editar/excluir qualquer recurso  
✅ Acessar todos os relatórios  

### ADMIN (Administrador / Líder de Equipe)
✅ Aprovar ou rejeitar Solicitações de Serviço  
✅ Criar Ordens de Serviço de qualquer tipo  
✅ Atribuir OS para técnicos da sua equipe  
✅ Reatribuir técnicos  
✅ Gerenciar membros da equipe  
✅ Ver dashboard da equipe  
✅ Criar/editar ativos, localizações e peças  
❌ Não pode excluir recursos críticos  
❌ Não pode gerenciar outras equipes  

### TECHNICIAN (Técnico)
✅ Criar Solicitações de Serviço  
✅ Criar OS Corretivas  
✅ Executar OS atribuídas  
✅ Registrar tempo de trabalho  
✅ Registrar peças usadas  
✅ Anexar fotos e documentos  
✅ Atualizar status de OS  
❌ Não pode aprovar SS  
❌ Não pode deletar OS  

### LIMITED_TECHNICIAN (Técnico Limitado)
✅ Criar Solicitações de Serviço  
✅ Executar OS atribuídas  
✅ Registrar tempo de trabalho  
✅ Anexar fotos  
❌ Não pode criar OS  
❌ Não pode registrar peças  

### REQUESTER (Solicitante)
✅ Criar Solicitações de Serviço  
✅ Ver suas próprias solicitações  
✅ Ver ativos e localizações  
❌ Não pode criar OS  
❌ Não pode executar OS  

### VIEW_ONLY (Apenas Visualização)
✅ Ver OS, ativos, peças, localizações  
❌ Não pode criar ou editar nada  

---

## 🔐 LOGIN E REGISTRO

### REGISTRO
```
1. Usuário acessa tela de registro
2. Preenche: Email, Senha, Nome, Empresa
3. Sistema cria conta com role TECHNICIAN
4. Redireciona para login
```

### LOGIN
```
1. Usuário informa email e senha
2. Sistema valida credenciais
3. Cria sessão (válida por 7 dias)
4. Redireciona para dashboard
```

### LOGOUT
```
1. Usuário clica em "Sair"
2. Sistema remove sessão
3. Redireciona para login
```

---

## 📝 SOLICITAÇÃO DE SERVIÇO (SS)

### O QUE É?
Uma **Solicitação de Serviço (SS)** é um pedido de manutenção feito por qualquer usuário. Ela precisa ser aprovada por um líder de equipe antes de virar uma Ordem de Serviço.

### QUEM PODE CRIAR?
✅ REQUESTER  
✅ TECHNICIAN  
✅ LIMITED_TECHNICIAN  
✅ ADMIN  
✅ SUPER_ADMIN  

### FLUXO COMPLETO

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CRIAÇÃO DA SS                                                │
└─────────────────────────────────────────────────────────────────┘

Usuário acessa: Solicitações → Nova Solicitação

Preenche:
  • Título* (obrigatório)
  • Descrição
  • Prioridade* (Nenhuma, Baixa, Média, Alta, Crítica)
  • Ativo (opcional)
  • Localização (opcional)
  • Equipe Responsável* (obrigatório)
  • Data Desejada (opcional)
  • Anexos (fotos, documentos)

Clica em "Criar Solicitação"

                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. SS CRIADA - STATUS: PENDING                                  │
└─────────────────────────────────────────────────────────────────┘

SS aparece em:
  • Lista de solicitações do usuário
  • Lista de aprovações do líder da equipe selecionada

                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. LÍDER DA EQUIPE ANALISA                                      │
└─────────────────────────────────────────────────────────────────┘

Líder acessa: Aprovações
Vê todas as SS pendentes da sua equipe

                    ┌─────────┴─────────┐
                    │                   │
              APROVAR              REJEITAR
                    │                   │
                    ↓                   ↓
        ┌──────────────────┐   ┌──────────────────┐
        │ SS vira OS       │   │ SS arquivada     │
        │ automaticamente  │   │ com motivo       │
        │ Tipo: REACTIVE   │   │ Status: REJECTED │
        │ Status: OPEN     │   └──────────────────┘
        └──────────────────┘
                    ↓
```

---

## 🔧 ORDEM DE SERVIÇO (OS)

### O QUE É?
Uma **Ordem de Serviço (OS)** é uma tarefa de manutenção que será executada por um técnico. Pode ser criada de 2 formas:
1. **Automaticamente** ao aprovar uma SS (tipo REACTIVE)
2. **Manualmente** pelo ADMIN ou TECHNICIAN

### QUEM PODE CRIAR?
✅ ADMIN (todos os tipos)  
✅ TECHNICIAN (apenas CORRECTIVE)  
✅ SUPER_ADMIN  

### TIPOS DE OS

**REACTIVE (Reativa)**
- Criada automaticamente ao aprovar uma SS
- Resposta a um problema reportado
- Não tem periodicidade

**CORRECTIVE (Corretiva)**
- Criada manualmente para corrigir falha
- Ação após quebra de equipamento
- Não tem periodicidade

**PREVENTIVE (Preventiva)**
- Criada manualmente com periodicidade
- Manutenção programada regular
- Gera novas OS automaticamente
- Frequências: Diária, Semanal, Quinzenal, Mensal, Trimestral, Semestral, Anual

**PREDICTIVE (Preditiva)**
- Criada manualmente baseada em análise
- Previne falhas antes que ocorram
- Não tem periodicidade automática

### FLUXO DE CRIAÇÃO MANUAL

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. CRIAR NOVA OS                                                │
└─────────────────────────────────────────────────────────────────┘

Usuário acessa: Ordens de Serviço → Nova Ordem

Preenche:
  • Número Proteus (opcional, 6 dígitos)
  • Título* (obrigatório)
  • Descrição
  • Tipo* (CORRECTIVE, PREVENTIVE, PREDICTIVE, REACTIVE)
  • Prioridade* (Nenhuma, Baixa, Média, Alta, Crítica)
  • Data de Vencimento
  • Ativo (opcional)
  • Localização (opcional)
  • Equipe Responsável
  • Técnico Específico (opcional)

Se tipo = PREVENTIVE:
  • Frequência* (Diária, Semanal, Mensal, etc)
  • A cada X períodos* (número)

Clica em "Criar Ordem de Serviço"

                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. OS CRIADA - STATUS: OPEN                                     │
└─────────────────────────────────────────────────────────────────┘

Sistema gera:
  • Código MAN-XXXXXX (se não tiver número Proteus)
  • Vincula à equipe e técnico
  • Calcula próxima execução (se PREVENTIVE)

                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. TÉCNICO EXECUTA A OS                                         │
└─────────────────────────────────────────────────────────────────┘

Técnico acessa: Ordens de Serviço → [Clica na OS]

Pode:
  ✅ Mudar status (OPEN → IN_PROGRESS → COMPLETE)
  ✅ Marcar tarefas como concluídas
  ✅ Registrar tempo de trabalho (labor)
  ✅ Registrar peças usadas
  ✅ Anexar fotos do trabalho
  ✅ Adicionar custos adicionais
  ✅ Escrever feedback

Clica em "Concluir OS" → Status: COMPLETE

                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. OS FINALIZADA                                                │
└─────────────────────────────────────────────────────────────────┘

Se tipo = PREVENTIVE:
  → Cron job (2h da manhã) cria nova OS automaticamente
  → Ciclo se repete

Se outros tipos:
  → OS arquivada
  → Fica no histórico
```

### STATUS DE OS

- **OPEN** (Aberta): OS criada, aguardando execução
- **IN_PROGRESS** (Em Progresso): Técnico está trabalhando
- **ON_HOLD** (Em Espera): Pausada temporariamente
- **COMPLETE** (Completa): Trabalho finalizado

---

## 🏭 GESTÃO DE ATIVOS

### O QUE É?
**Ativos** são equipamentos, máquinas ou itens que precisam de manutenção.

### QUEM PODE GERENCIAR?
✅ ADMIN  
✅ SUPER_ADMIN  

### FUNCIONALIDADES

**Criar Ativo**
```
Campos:
  • Nome*
  • Descrição
  • Número de Série
  • Modelo
  • Fabricante
  • Data de Aquisição
  • Categoria
  • Localização
  • Status (Operacional / Inativo)
  • Usuário Primário
  • Equipes Responsáveis
  • Foto
```

**Visualizar Ativo**
- Ver detalhes completos
- Histórico de OS relacionadas
- Peças associadas
- Tempo de inatividade (downtime)
- Leituras de medidores

**Editar/Arquivar Ativo**
- ADMIN pode editar
- SUPER_ADMIN pode arquivar

---

## 📦 GESTÃO DE PEÇAS

### O QUE É?
**Peças** são componentes em estoque usados na manutenção.

### QUEM PODE GERENCIAR?
✅ ADMIN  
✅ SUPER_ADMIN  

### FUNCIONALIDADES

**Criar Peça**
```
Campos:
  • Nome*
  • Descrição
  • Custo
  • Quantidade em Estoque*
  • Quantidade Mínima
  • Código de Barras
  • Área/Localização
  • Categoria
  • Foto
```

**Controle de Estoque**
- Sistema alerta quando estoque < quantidade mínima
- Histórico de uso em OS
- Relatório de consumo

**Usar Peça em OS**
- Técnico registra quantidade usada
- Sistema deduz do estoque automaticamente

---

## 👥 GESTÃO DE EQUIPES

### O QUE É?
**Equipes** são grupos de técnicos liderados por um ADMIN.

### QUEM PODE GERENCIAR?
✅ ADMIN (sua própria equipe)  
✅ SUPER_ADMIN (todas as equipes)  

### FUNCIONALIDADES

**Criar Equipe**
```
Campos:
  • Nome*
  • Descrição
  • Líder* (usuário com role ADMIN)
  • Membros (técnicos)
```

**Gerenciar Membros**
- Adicionar técnicos à equipe
- Remover técnicos da equipe
- Ver carga de trabalho de cada membro

---

## 📊 DASHBOARDS

### DASHBOARD PRINCIPAL
**Quem vê:** Todos os usuários

Exibe:
- Total de OS (Abertas, Em Progresso, Completas)
- Total de Ativos (Operacionais, Inativos)
- Total de Peças
- Total de Solicitações Pendentes
- OS Recentes
- Alertas

### DASHBOARD DA EQUIPE
**Quem vê:** ADMIN, SUPER_ADMIN

Exibe:
- Membros da equipe
- OS da equipe (Abertas, Em Progresso)
- SS pendentes de aprovação
- OS completadas no mês
- Performance da equipe
- Links rápidos para aprovações

### RELATÓRIOS
**Quem vê:** ADMIN, SUPER_ADMIN

Tipos:
- Relatório de OS por período
- Relatório de consumo de peças
- Relatório de tempo de trabalho
- Relatório de ativos
- Relatório de downtime

---

## 🚀 FUNCIONALIDADES FUTURAS

### EM PLANEJAMENTO

**Sistema de Notificações**
- Notificar líder quando SS é criada
- Notificar técnico quando OS é atribuída
- Notificar quando estoque de peça está baixo
- Notificar quando OS está atrasada

**Integração com Proteus**
- Sincronizar OS com sistema Proteus
- Importar dados de ativos
- Exportar relatórios

**App Mobile**
- App para técnicos executarem OS no campo
- Tirar fotos direto do celular
- Trabalhar offline

**QR Code para Ativos**
- Gerar QR Code para cada ativo
- Técnico escaneia e acessa histórico
- Criar OS rapidamente

**Relatórios Avançados**
- Gráficos de performance
- Análise preditiva
- Exportar para PDF/Excel

**Gestão de Fornecedores**
- Cadastro de fornecedores
- Ordens de compra
- Histórico de compras

**Gestão de Clientes**
- Cadastro de clientes
- OS para clientes externos
- Faturamento

---

## ✅ RESUMO DO QUE ESTÁ IMPLEMENTADO

### FUNCIONALIDADES COMPLETAS
✅ Sistema de autenticação (login/registro/logout)  
✅ 6 tipos de usuários com permissões (RBAC)  
✅ Criação de Solicitações de Serviço (SS)  
✅ Aprovação/Rejeição de SS por líderes  
✅ Criação de Ordens de Serviço (4 tipos)  
✅ Execução de OS por técnicos  
✅ Registro de tempo de trabalho (labor)  
✅ Registro de peças usadas  
✅ Upload de arquivos/fotos  
✅ Gestão de Ativos  
✅ Gestão de Peças com controle de estoque  
✅ Gestão de Localizações  
✅ Gestão de Equipes e Membros  
✅ Dashboard Principal  
✅ Dashboard da Equipe  
✅ Manutenção Preventiva com periodicidade  
✅ Cron job para gerar OS preventivas automaticamente  
✅ Histórico completo de OS e SS  
✅ Filtros e buscas  
✅ Status de OS (OPEN, IN_PROGRESS, ON_HOLD, COMPLETE)  
✅ Prioridades (5 níveis)  
✅ Sistema de tarefas dentro de OS  
✅ Custos adicionais  
✅ Feedback em OS  

### FUNCIONALIDADES PLANEJADAS
⏳ Sistema de notificações em tempo real  
⏳ Integração com Proteus  
⏳ App Mobile  
⏳ QR Code para ativos  
⏳ Relatórios avançados com gráficos  
⏳ Gestão de fornecedores  
⏳ Gestão de clientes  
⏳ Ordens de compra  

---

**FIM DO DOCUMENTO**
