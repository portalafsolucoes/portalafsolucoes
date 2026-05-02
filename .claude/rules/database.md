---
globs: prisma/**,src/lib/db/**,src/actions/**
---

# Banco, Schema e Supabase

## Unidade Canonica de Tempo (HORAS DECIMAIS)
- Toda duracao no banco e em APIs internas e armazenada como **horas decimais com 2 casas (`Decimal(10, 2)`)**. Granularidade default no input: `step="0.25"` (0,25 h = 15 min, 0,5 h = 30 min, 0,75 h = 45 min, 1,5 h = 1h30min)
- Colunas afetadas (todas em horas): `WorkOrder.estimatedDuration`, `WorkOrder.actualDuration`, `Task.executionTime`, `StandardMaintenanceTask.executionTime`, `AssetMaintenanceTask.executionTime`, `Labor.duration`
- `StandardMaintenancePlan.maintenanceTime` e `AssetMaintenancePlan.maintenanceTime` (com `timeUnit`) sao **periodicidade do plano**, nao duracao de execucao — permanecem como `Int` e nao entram nesta regra
- `AssetDowntime.duration` continua `Int?` (modelo dormente sem codigo dependente). Quando a feature for ativada, decidir a unidade no contexto
- Conversao para sistemas externos (TOTVS/Protheus, ERPs) acontece **exclusivamente na borda**, em `src/lib/integration/<sistema>/timeAdapter.ts`. Handlers de negocio nunca veem minutos
- Helpers canonicos em `src/lib/units/time.ts`:
  - `toDecimalHours(value)` — normaliza string/number/null para `number | null` em horas com 2 casas (rejeita negativos)
  - `formatHours(hours)` — formata para exibicao (`"2.50 h"` ou `-`)
  - `minutesToHours` / `hoursToMinutes` — usar **apenas** em adapters de borda; nao em handlers de negocio
  - `diffHours(start, end)` — diferenca entre dois timestamps em horas decimais (substitui `(end - start) / 60000`)
- Migration canonica: `prisma/migrations/20260501234507_time_fields_to_decimal_hours/migration.sql` com `ALTER TYPE ... USING ROUND(value::numeric / 60.0, 2)` em transacao unica
- Regra: nao reintroduzir minutos em colunas de duracao. Ao adicionar nova coluna de tempo, usar `Decimal(10, 2)` e horas decimais

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
- `Task.plannedStart` e `Task.plannedEnd` (`DateTime?`, sem fuso) sao a janela planejada por tarefa exposta no formulario de OS em `/work-orders`. Quando ambos estiverem preenchidos, o `Task.executionTime` e derivado por `diffHours(plannedStart, plannedEnd)` e gravado pelo servidor; nao existe trigger SQL — a derivacao mora no helper `normalizeTaskWindow` dos handlers `POST /api/work-orders` e `PATCH /api/work-orders/[id]`. Migration: `prisma/migrations/20260502000000_add_planned_start_end_to_task/migration.sql`
- `AssetMaintenanceTask` e `StandardMaintenanceTask` **nao** ganham os mesmos campos: a janela planejada vive apenas na OS, nao no plano. Plano com `period = 'UNICA'` so produz OS pelo fluxo manual em `/work-orders` (o batch de Planejamento ignora `UNICA`)
- `RAF` deve ter numero unico
- `FailureAnalysisReport.status` usa o enum `RafStatus { ABERTA, FINALIZADA }` (default `ABERTA`); `finalizedAt` e `finalizedById` (FK `User.id` opcional) registram quem e quando finalizou. O valor e sempre **derivado** pela aplicacao via `recalculateRafStatus` em `src/lib/rafs/recalculateStatus.ts` — nao existe trigger SQL
- `FailureAnalysisReport.actionPlan` (JSONB) persiste `ActionPlanItem[]` no shape v2: `{ item, subject, deadline, actionDescription, status: 'PENDING'|'IN_PROGRESS'|'COMPLETED', linkedWorkOrderId?, linkedWorkOrderNumber?, responsibleUserId?, responsibleName?, completedAt? }`. Nao normalizar o campo (descricao livre) alem do que `normalizeTextPayload` ja faz via preservacao de `description`/`notes`
- A migration `20260420120000_add_raf_status_and_finalized_tracking` cria o enum, adiciona as colunas `status`, `finalizedAt`, `finalizedById`, cria FK para `User(id) ON DELETE SET NULL`, indices sobre `status`/`finalizedById` e aplica backfill marcando como `FINALIZADA` as RAFs cujo `actionPlan` tenha todos os itens `COMPLETED` (via `jsonb_array_elements`)

## Auto-vinculo Bem <-> Plano Padrao (campos de override)
- `AssetMaintenancePlan.standardPlanId` (FK opcional) identifica o `StandardMaintenancePlan` de origem quando o plano nasceu de um padrao; `NULL` para planos criados manualmente
- `AssetMaintenancePlan.hasLocalOverrides: Boolean` (default `false`) indica se o plano foi editado estruturalmente apos o clone inicial. Fica `true` quando o usuario altera tarefas, passos, recursos, tempos, tolerancia ou tipo de medidor; `false` quando recebeu propagacao do padrao ou foi revertido
- `AssetMaintenancePlan.detachedAt: DateTime?` registra o instante da primeira edicao estrutural que marcou override. Preservado enquanto `hasLocalOverrides = true`; limpo (`NULL`) ao reverter
- `AssetMaintenancePlan.detachedById` (FK opcional para `User.id`) registra quem fez a edicao que marcou override; limpo ao reverter
- Chave funcional que detecta duplicata entre planos do mesmo ativo: `(assetId, serviceTypeId, maintenanceTime, timeUnit, trackingType)`. Helper canonico em `src/lib/assets/planMatching.ts` — nao reimplementar nos handlers. Retorna-se `skipped` para duplicatas em vez de `409` para permitir processamento em lote
- Semantica: apenas edicoes **estruturais** setam override. Edicoes de campos **operacionais** (`assetId`, `lastMaintenanceDate`, `toleranceDays`, `maintenanceAreaId`, `serviceTypeId`, `sequence`, `isActive`) NAO marcam override — o plano continua sincronizado com o padrao para fins de propagacao
- Helper canonico para marcar override: `markAsOverridden(planId, userId)` em `src/lib/maintenance-plans/standardSync.ts`. Invocado pelas rotas de edicao estrutural de `AssetMaintenancePlan`
- Helper canonico para reverter: `revertToStandard(planId, companyId)` no mesmo arquivo. Reescreve os campos estruturais do plano com o estado atual do padrao, deleta tarefas e recria a partir do padrao, preserva campos operacionais e zera `hasLocalOverrides`/`detachedAt`/`detachedById`
- Helper canonico de propagacao: `propagateStandardChanges(standardPlanId, assetPlanIds, companyId)` no mesmo arquivo. Processa lote e retorna `{ applied, skipped, failed }`; skipa planos com `hasLocalOverrides = true` (defesa em profundidade), ids sem vinculo ao padrao ou ids fora do tenant

## Check List Padrao (modelos)
- `StandardChecklist` armazena o template inspecional de uma combinacao `(WorkCenter, ServiceType)`. Campos: `id`, `name`, `isActive` (default `true`), `workCenterId`, `serviceTypeId`, `unitId`, `companyId`, `createdById`, `createdAt`, `updatedAt`
- Constraint UNIQUE por `(workCenterId, serviceTypeId)` no banco — a API retorna `409` em duplicata. Indices secundarios em `companyId`, `unitId`, `createdById`
- `StandardChecklistFamilyGroup` agrupa as etapas por `(assetFamilyId, familyModelId)` dentro do checklist. Campos: `id`, `order`, `checklistId`, `assetFamilyId`, `familyModelId`, `createdAt`, `updatedAt`. Cascade delete em relacao a `StandardChecklist`
- `StandardChecklistStep` referencia `GenericStep` (catalogo central de etapas reusado entre planos de manutencao e checklists). Campos: `id`, `order`, `groupId`, `genericStepId`, `createdAt`. Cascade delete em relacao a `StandardChecklistFamilyGroup`
- Migration canonica: `prisma/migrations/20260424180000_add_standard_checklists/migration.sql`. Cria as 3 tabelas + indices + cascade FKs
- Hard delete e o padrao para a entidade (DELETE da rota apaga tudo via cascade); `isActive = false` representa **arquivamento** sem perda de dados (rota separada `/archive`). O fluxo permite alternar entre estados arquivado/ativo a qualquer momento

## Inspecao de Area (modelos)
- Enums novos: `AreaInspectionStatus { RASCUNHO, EM_REVISAO, FINALIZADO }` e `AreaInspectionAnswer { OK, NOK, NA }`
- `AreaInspection` representa a inspecao instanciada a partir de um `StandardChecklist`. Campos principais: `id`, `number` (6 digitos), `description`, `dueDate`, `status` (default `RASCUNHO`), `standardChecklistId` (FK opcional `ON DELETE SET NULL` — preserva inspecoes mesmo se o padrao for removido), `checklistName`/`workCenterName`/`serviceTypeName` (snapshot textual do contexto), `assignedToId` (FK obrigatoria para `User`), `submittedForReviewAt`/`finalizedAt`/`reopenedAt` + respectivos `Bys`, `companyId`, `unitId`, `createdById`. Constraint UNIQUE `(companyId, unitId, number)` — sequencia comeca em `000001` por unidade. Indices: `companyId`, `unitId`, `status`, `assignedToId`, `dueDate`, `standardChecklistId`
- `AreaInspectionAsset` armazena o snapshot dos bens da inspecao. Campos: `id`, `order`, `inspectionId` (cascade delete), `assetId` (FK opcional `ON DELETE SET NULL` — historico permanece se o bem for arquivado/removido), `assetName`, `assetTag`, `assetProtheusCode`, `familyId`, `familyModelId`, `familyName`, `familyModelName`. Indices: `inspectionId`, `assetId`
- `AreaInspectionStep` armazena o snapshot das etapas com a resposta inserida pelo manutentor/gestor. Campos: `id`, `order`, `inspectionAssetId` (cascade delete), `genericStepId` (FK opcional `ON DELETE SET NULL`), `stepName`/`stepProtheusCode`/`optionType` (snapshot do `GenericStep`), `answer` (`AreaInspectionAnswer?`), `notes`, `answeredById`, `answeredAt`, `requestId` (FK opcional `ON DELETE SET NULL` para `Request`, com UNIQUE — uma SS por etapa). Indices: `inspectionAssetId`, `genericStepId`, `answer`
- `Request` ganha campo opcional `inspectionId` (FK `ON DELETE SET NULL` para `AreaInspection`) e indice `inspectionId`. Permite filtrar SSs originadas de inspecao via `Request.inspectionId IS NOT NULL`. Linkagem reversa via `AreaInspectionStep.requestId` (UNIQUE) e `AreaInspection.requests`
- Numeracao: helper canonico `generateInspectionNumber(companyId, unitId)` em `src/lib/area-inspections/generateNumber.ts`. Sequencia por unidade (`SELECT max(number) WHERE companyId=$1 AND unitId=$2`), padding 6 digitos. UNIQUE `(companyId, unitId, number)` protege contra colisao com retry no caller
- Migration canonica: `prisma/migrations/20260427180000_add_area_inspections/migration.sql`. Cria 3 tabelas + 2 enums + indices + FKs cascade/setNull + altera `Request` adicionando `inspectionId` + INSERT idempotente do `Module` slug `area-inspections` + propagacao em `CompanyModule`
- Hard delete em RASCUNHO/EM_REVISAO via cascade; FINALIZADO bloqueado (a `Request` originada continua viva, mantendo historico). Reabertura nao deleta SSs ja criadas (opcao A — congelar)

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
