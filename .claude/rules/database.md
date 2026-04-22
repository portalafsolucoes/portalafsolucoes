---
globs: prisma/**,src/lib/db/**,src/actions/**
---

# Banco, Schema e Supabase

## Padronizacao Textual (MAIUSCULAS sem acento)
- Todo texto de negocio persistido no banco deve estar em **MAIUSCULAS e sem acento**
- A normalizacao acontece no servidor via `normalizeTextPayload` (de `@/lib/textNormalizer`) antes do insert/update
- Campos preservados em case/acento original: `email`, `password`, `username`, URLs (`website`, `*Url`, `*Link`), descricoes longas (`description`, `notes`, `observation`, `feedback`, `rejectionReason`, `executionNotes`, `failureDescription`, `immediateAction`, `message`), `protheusCode`, `workDays` (JSON de calendario com chaves machine-readable) e enums
- Buscas devem usar `ILIKE` ou a funcao `upper_no_accent(t)` (criada pela migration `20260416234842_uppercase_text_backfill`) para permanecerem insensiveis ao acento/caso do input
- Antes de qualquer backfill global similar, rodar `scripts/check-uppercase-collisions.ts` para detectar colisoes em campos UNIQUE

## Stack de Dados
- O projeto usa PostgreSQL via Supabase com Prisma ORM
- `prisma/schema.prisma` e a referencia estrutural principal do schema
- A aplicacao precisa refletir o modelo funcional definido em `docs/SPEC.md`, mesmo quando o schema legado ainda tiver nomes antigos

## Isolamento e Escopo
- `User.companyId` e `NULL` APENAS para staff Portal AF (SUPER_ADMIN cross-tenant). Para todos os demais papeis (ADMIN, TECHNICIAN, LIMITED_TECHNICIAN, REQUESTER, VIEW_ONLY) o `companyId` e obrigatorio; queries de negocio CMMS devem rejeitar sessoes com `companyId` ausente (usar `requireCompanyScope`).
- Invariante de ADMIN: para todo usuario com papel canonico `ADMIN` (persistido como `GESTOR`), deve existir `UserUnit` para todas as `Location` raiz (sem `parentId`) da sua empresa. Propagar via `linkAllCompanyAdminsToUnit` ao criar unidade e `ensureAdminUnitAccess` ao promover usuario.
- `Company` e o limite maximo de isolamento; usuarios de uma empresa nunca acessam dados de outra
- `Unit` e o recorte operacional principal; a maior parte das listagens, metricas e consultas deve ser filtrada pela unidade ativa
- Localizacoes raiz sao tratadas como unidades
- Toda query de negocio deve considerar `perfil + empresa + unidade ativa`
- Apenas `SUPER_ADMIN` e `ADMIN` podem trocar de unidade, e somente quando tiverem acesso a mais de uma

## Relacionamentos Essenciais
- `Company` se relaciona com usuarios, unidades e modulos habilitados
- `Module` e habilitado por empresa via `CompanyModule`
- `User` pode ter multiplas unidades de acesso e precisa ser normalizado para os papeis canonicos de produto
- `User` pode se vincular ao cadastro estruturado de cargos da empresa; sempre que existir selecao de cargo na UI, o banco deve persistir esse relacionamento e manter o nome do cargo sincronizado para exibicao
- `Team` agrupa tecnicos para atribuicao de OS e ativos
- `Asset` e hierarquico e pode ter subativos, anexos, pecas, OS relacionadas, solicitacoes relacionadas, contador, imagem e criticidade GUT
- `Location` organiza a estrutura fisica hierarquica da unidade
- `MaintenancePlan` pode ser padrao por familia de ativo ou especifico por ativo, com tarefas, passos e recursos
- `Request` pode ser aprovada ou rejeitada e pode gerar `WorkOrder`; carrega `maintenanceAreaId` (FK opcional no banco para preservar registros legados, mas obrigatorio pela API em criacao/edicao) que alimenta o numero da RAF quando a SS gerar uma RAF direta
- `WorkOrder` suporta numero interno `MAN-XXXXXX`, numero externo do ERP/TOTVS, checklist, custos, tempos, recursos e fotos antes/depois
- `WorkOrder.rescheduleCount` e contador denormalizado de quantas vezes a OS foi reprogramada estando atrasada; usado para badge na listagem e KPI sem precisar agregar a tabela de historico
- `WorkOrderRescheduleHistory` armazena auditoria granular de cada reprogramacao (data anterior, nova data, status anterior, flag `wasOverdue`, motivo opcional, usuario, timestamp); cascade delete em relacao a `WorkOrder`
- `RAF` deve ter numero unico
- `FailureAnalysisReport.status` usa o enum `RafStatus { ABERTA, FINALIZADA }` (default `ABERTA`); `finalizedAt` e `finalizedById` (FK `User.id` opcional) registram quem e quando finalizou. O valor e sempre **derivado** pela aplicacao via `recalculateRafStatus` em `src/lib/rafs/recalculateStatus.ts` — nao existe trigger SQL
- `FailureAnalysisReport.actionPlan` (JSONB) persiste `ActionPlanItem[]` no shape v2: `{ item, subject, deadline, actionDescription, status: 'PENDING'|'IN_PROGRESS'|'COMPLETED', linkedWorkOrderId?, linkedWorkOrderNumber?, responsibleUserId?, responsibleName?, completedAt? }`. Nao normalizar o campo (descricao livre) alem do que `normalizeTextPayload` ja faz via preservacao de `description`/`notes`
- A migration `20260420120000_add_raf_status_and_finalized_tracking` cria o enum, adiciona as colunas `status`, `finalizedAt`, `finalizedById`, cria FK para `User(id) ON DELETE SET NULL`, indices sobre `status`/`finalizedById` e aplica backfill marcando como `FINALIZADA` as RAFs cujo `actionPlan` tenha todos os itens `COMPLETED` (via `jsonb_array_elements`)

## Convencoes de Schema
- O sistema deve trabalhar com papeis canonicos de produto: `SUPER_ADMIN`, `ADMIN`, `TECHNICIAN`, `LIMITED_TECHNICIAN`, `REQUESTER` e `VIEW_ONLY`
- Se enums ou registros legados ainda usarem papeis antigos, a aplicacao deve mapear esses valores antes de decidir acesso
- Ativos devem ter `tag` unica por unidade
- Criticidade GUT segue `Gravidade x Urgencia x Tendencia`, com faixa de `1` a `125`
- Campos integrados com TOTVS/Protheus tendem a usar prefixo `protheusCode`
- Uploads e imagens associados ao banco devem usar Cloudinary

## Padrões de Query
- Consultas no servidor devem aplicar filtros explicitos de empresa e unidade; nunca confiar apenas no filtro visual da UI
- Preferir selects explicitos, ordenacao explicita e filtros por igualdade para o contexto autenticado
- Qualquer contagem, indicador ou dashboard deve respeitar o mesmo recorte da unidade ativa, exceto consolidacoes corporativas exclusivas do `SUPER_ADMIN`
- Chaves de cache derivadas de consultas de usuario devem considerar contexto autenticado para evitar vazamento visual de sessao anterior

## Padrões de Supabase
- Ao consultar Supabase, usar tabelas/modelos de forma explicita com filtros por `companyId`, `unitId`, status e demais chaves de negocio
- Validar a sessao antes de executar queries privilegiadas
- Em operacoes com modulos habilitados, company modules e logo da empresa, a origem deve ser o banco e nao fallback local hardcoded
- Em fluxos de login, logout e troca de contexto, tratar respostas de auth e company modules como dinamicas e sem cache compartilhado
