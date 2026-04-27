---
globs: src/app/api/**,src/actions/**
---

# API Routes e Server Actions

## Tenancy e Escopo de Papeis (SUPER_ADMIN vs ADMIN)
- `SUPER_ADMIN` e staff Portal AF Solucoes: `companyId` e `NULL` no banco (`''` na sessao). Opera cross-tenant (rotas `/api/admin/**`). NAO pode executar operacoes de negocio CMMS sem um tenant explicito.
- `ADMIN` e administrador da empresa cliente: `companyId` obrigatorio; tem acesso automatico a TODAS as unidades raiz (Location sem `parentId`) via `UserUnit` (invariante mantido por `src/lib/admin-scope.ts`).
- `POST /api/admin/companies`: apenas `SUPER_ADMIN` autoriza; o usuario inicial criado DEVE ter `role = ADMIN` (persistido como `GESTOR`). Rejeitar qualquer tentativa de criar usuario SUPER_ADMIN por esta rota.
- `POST /api/admin/units`: apos inserir a nova unidade, chamar `linkAllCompanyAdminsToUnit(companyId, unitId)` para propagar `UserUnit` para todos os ADMINs da empresa.
- `POST /api/users` e `PUT /api/users/[id]`: rejeitar com `403` qualquer payload que tente atribuir `role = SUPER_ADMIN` quando a sessao NAO for SUPER_ADMIN. Quando a role final for `ADMIN`, chamar `ensureAdminUnitAccess(companyId, userId)` para garantir o invariante.
- Quando a sessao for `PLANEJADOR`, `POST /api/users` e `PUT /api/users/[id]` devem rejeitar com `403` qualquer payload cuja role canonica final NAO seja `PLANEJADOR` ou `MANUTENTOR`. Em `PUT`, validar tambem que a role canonica atual do usuario-alvo esta nesse mesmo conjunto — PLANEJADOR nao pode editar `ADMIN`/`SUPER_ADMIN` mesmo mantendo a role original. `DELETE /api/users/[id]` e lifecycle destrutivo (`archive`, `reset-password`) continuam restritos a `SUPER_ADMIN`/`ADMIN` (matriz `people-teams/DELETE`).
- Em rotas de negocio CMMS (tudo fora de `/api/admin/**` e `/api/auth/**`), usar `requireCompanyScope(session)` de `src/lib/user-roles.ts` para falhar cedo quando `companyId` estiver ausente.

## Normalizacao de Texto (MAIUSCULAS sem acento)
- Todo handler de escrita (`POST`/`PUT`/`PATCH`) deve chamar `normalizeTextPayload` de `@/lib/textNormalizer` sobre o body logo apos `await request.json()`
- Padrao: `const body = normalizeTextPayload(await request.json())`
- Campos preservados (NAO uppercase): `email`, `password`, `currentPassword`, `newPassword`, `confirmPassword`, `username`, `website`, qualquer chave terminada em `Url`/`Link`/`Href`/`Src`, `logo`, `avatarUrl`, `description`, `notes`, `observation`, `feedback`, `rejectionReason`, `executionNotes`, `failureDescription`, `immediateAction`, `message`, `token`, `apiKey`, `secret`, `hash`, `workDays` (JSON de configuracao de calendario — chaves internas como `day`/`label`/`shifts[].start|end` devem permanecer no formato original)
- Qualquer outro campo string e convertido para `UPPER(unaccent(value))` e sofre `trim()`
- Rotas de integracao ERP/Protheus (`/api/integration/totvs/*`) e importacoes externas (`/api/gep/import`) **nao devem** aplicar o normalizer — preservar o payload bruto do sistema externo
- Search e filtros devem usar `ILIKE` para permanecer case-insensitive; o dado no banco ja esta em caixa alta

## Contrato Geral
- Consultar `docs/SEGURANCA.md` sempre que a mudanca tocar autenticacao, sessao, autorizacao, isolamento multiempresa/unidade, upload sensivel, exportacao, logs de erro, segredos, headers ou readiness de producao
- Toda rota e toda server action devem validar permissao no servidor; esconder item de menu nao substitui seguranca
- Validacoes de permissao devem sempre considerar `perfil + empresa + unidade ativa`
- A UI e a API devem compartilhar a mesma regra central de permissao; nao manter matriz divergente
- O sistema deve trabalhar com papeis canonicos de produto: `SUPER_ADMIN`, `ADMIN`, `TECHNICIAN`, `LIMITED_TECHNICIAN`, `REQUESTER` e `VIEW_ONLY`
- Se o banco ou legado ainda possuir perfis antigos, a camada de auth/API deve normalizar esses valores antes de decidir acesso, sidebar, redirects, badges e permissoes
- A normalizacao de papel deve usar exclusivamente o campo `role` persistido no banco; email, username e jobTitle NAO podem influenciar o papel efetivo (V04 — escalada de privilegio por padrao de email foi corrigida e nao deve ser reintroduzida)
- Em payloads e respostas do modulo de `Pessoas`, `role` representa o papel de acesso do sistema e `jobTitle` representa o cargo profissional; APIs nao devem misturar esses conceitos nem rotular valores legados operacionais como se fossem o papel exibido ao usuario
- Quando a UI enviar `jobTitleId`, as APIs de usuario devem validar que o cargo pertence a empresa ativa, persistir o vinculo no banco e manter o nome do cargo refletido no campo textual exibido na ficha da pessoa

## Registro Publico e Aprovacao de Empresa
- `POST /api/auth/register` e rota **publica** (sem sessao) usada pela tela `/register`. Deve validar CNPJ, e-mail unico, criar `Company` em `status = 'PENDING_APPROVAL'`, criar primeiro usuario como `ADMIN` (persistido como `GESTOR`) com `emailVerificationToken` + `emailVerificationExpires` (24h), enfileirar e-mail de verificacao em `EmailOutbox` e retornar `201` com `{ data: { companyId, email } }`
- `GET /api/auth/verify-email?token=...` valida o token, marca `emailVerifiedAt`, retorna `404` para token inexistente, `410` para token expirado, `200` para sucesso (`{ data: { alreadyVerified: boolean } }`). **Nao** loga o usuario — a aprovacao ainda e obrigatoria
- `POST /api/admin/companies/[id]/approve` e `POST /api/admin/companies/[id]/reject` sao exclusivos de SUPER_ADMIN. `reject` exige `reason` no body, anonimiza PII do admin inicial, registra em `RejectedCompanyLog` e mantem CNPJ/email reaproveitaveis via indices parciais
- `approve` deve popular `CompanyModule` com todos os modulos habilitados (`enabled = true`) de forma idempotente — buscar `Module` + `CompanyModule` existentes, inserir apenas os ausentes. A sidebar filtra por esta tabela, entao empresas aprovadas sem esse passo aparecem com menu vazio ao logar. Mesmo padrao ja aplicado em `POST /api/admin/companies` quando o SUPER_ADMIN cria a empresa diretamente
- Login em `/api/auth/login` bloqueia usuarios cuja empresa esteja em `PENDING_APPROVAL` (403) ou `REJECTED` (401 indistinguivel de credenciais invalidas). Usuario com `emailVerificationToken` e sem `emailVerifiedAt` tambem recebe 403 com mensagem clara de verificar e-mail

## Notificacoes In-App
- `GET /api/notifications` retorna as notificacoes do usuario autenticado, ordem desc por `createdAt`, com `unreadCount`. Suporta `?unreadOnly=1` e `?limit=N` (default 30, max 100)
- `POST /api/notifications/[id]/read` marca uma notificacao como lida; 403 quando `userId` nao corresponde a sessao; 404 se nao existir
- `POST /api/notifications/read-all` marca todas as notificacoes nao lidas do usuario como lidas
- Os eventos de signup, aprovacao e rejeicao de empresa, alem de reset manual de senha, devem inserir notificacoes destinadas ao usuario afetado e/ou aos SUPER_ADMINs correspondentes

## Reset Manual de Senha e Troca Forcada
- `POST /api/users/[id]/reset-password` e restrito a SUPER_ADMIN/ADMIN (matriz `people-teams/DELETE`). Gera senha temporaria aleatoria, atualiza hash no banco, seta `mustChangePassword = true` e retorna `{ data: { userId, tempPassword, mustChangePassword } }`. A senha em texto claro so aparece nesta resposta — nao e persistida em claro nem enviada por e-mail automatico. Rejeita auto-reset (usuario operando sobre a propria conta) e usuarios `ARCHIVED`
- `POST /api/auth/change-password` recebe `{ currentPassword, newPassword, confirmPassword }`, valida senha atual com `verifyPassword`, limpa `mustChangePassword` ao finalizar. **Nao** aplicar `normalizeTextPayload` neste body (senhas sao preservadas). Rejeita `newPassword === currentPassword` e `newPassword === user.email`
- `/api/auth/login` e `/api/auth/me` devem expor `mustChangePassword` no retorno para a UI gatear o redirect para `/change-password`. O guard client-side mora em `AppShell` (`ForcedPasswordChangeGuard`) e forca o usuario para `/change-password` em qualquer rota interna enquanto a flag estiver `true`

## Autenticacao e Sessao
- O endpoint `/api/auth/me` e a leitura de modulos da empresa devem ser tratados como dados dinamicos de sessao, sem cache compartilhado entre usuarios
- Login, logout e troca de contexto autenticado devem invalidar ou limpar cache de autenticacao e de modulos habilitados no cliente
- Chaves de cache no cliente que dependem do usuario devem considerar ao menos empresa e contexto autenticado para evitar vazamento visual de sessao anterior
- O retorno de autenticacao para a UI deve expor o papel canonico como `role`
- Se necessario, o papel legado pode ser exposto apenas como apoio tecnico, por exemplo em `legacyRole`
- Redirects padrao do CMMS devem respeitar o perfil: perfis operacionais entram por `Ordens de Servico`; os demais entram por `Dashboard`
- Quando um perfil nao tiver acesso a uma pagina, o sistema deve redirecionar para o destino padrao permitido do perfil, e nao deixar a tela quebrada ou parcialmente carregada

## Padrões de API Routes
- Em handlers do App Router, usar `NextRequest` e `NextResponse` quando houver leitura de corpo, query string ou resposta customizada
- Resolver a sessao logo no inicio e retornar `401` quando nao houver sessao e `403` quando a sessao nao tiver permissao
- Em consultas sensiveis, validar primeiro o escopo da empresa e da unidade ativa e so depois executar a query
- Em sucesso, preferir respostas JSON consistentes; neste repo os consumidores frequentemente esperam `{ data: ... }`
- Em falhas, retornar JSON com `error` e status HTTP coerente (`400`, `401`, `403`, `404`, `409`, `500`)
- Toda acao que altera dados deve validar payload, status permitidos e relacoes obrigatorias antes de persistir
- Campos sensiveis como `password` nunca podem retornar para a UI, nem em listagens, nem em detalhes, nem em respostas de edicao
- APIs de usuario devem normalizar email e rejeitar payloads com email sem dominio completo ou com email igual a senha
- APIs de `Pessoas` devem aceitar e persistir os campos editaveis do modal de pessoa: nome, sobrenome, email, senha opcional na edicao, telefone, cargo (`jobTitle`), papel (`role`), taxa/hora, localizacao, calendario, unidades de acesso e status

## Sincronizacao de Documentacao
- Toda mudanca de contrato, permissao, validacao ou comportamento de rota/action deve atualizar a secao funcional correspondente em `docs/SPEC.md`
- Toda mudanca que altere autenticacao, sessao, autorizacao, isolamento, upload sensivel, exportacao, logs de erro, segredos, headers ou hardening deve atualizar `docs/SEGURANCA.md`
- Quando a mudanca alterar um padrao reutilizavel de API ou server action, atualizar este arquivo no mesmo ciclo

## Tratamento de Erros e Validacao
- Formularios e APIs devem garantir validacoes de negocio e status inicial correto
- Rejeicao de solicitacao exige motivo
- Criacao de empresa deve criar o primeiro usuario admin
- Modulos habilitados por empresa devem refletir na navegacao real do sistema
- Acoes, menus e badges devem respeitar perfil e tambem ser validados na API
- Quando a API expuser dados de upload, anexos, fotos ou logo, usar somente URLs vindas da fonte configurada, sem fallback hardcoded
- `POST /api/requests` e `PUT /api/requests/[id]` exigem `maintenanceAreaId` (campo obrigatorio da SS). A API deve retornar `400` quando ausente e validar que o id pertence a empresa ativa da sessao. Registros legados sem area permanecem no banco como `NULL` (coluna nullable para nao quebrar migracao), mas toda nova SS ou edicao precisa informar o campo

## Server Actions
- Aplicar as mesmas validacoes de sessao, empresa, unidade e papel usadas nas API routes
- Nao mover regra de seguranca apenas para o cliente ao migrar um fluxo para server action
- Reutilizar a logica central de permissao e normalizacao de papel em vez de reimplementar regras dentro de cada action

## Reprogramacao de OS
- A rota `PUT /api/planning/schedules/[id]/items` e o ponto unico que registra reprogramacao oficial: quando a `scheduledDate` de um item muda e a OS associada esta atrasada (`dueDate < hoje` e status nao final), o servidor deve atualizar a OS para `status = REPROGRAMMED`, preencher `rescheduledDate`, incrementar `rescheduleCount` e inserir uma entry em `WorkOrderRescheduleHistory` com `previousDate`, `newDate`, `previousStatus`, `wasOverdue = true`, `userId` da sessao
- A `previousDate` da entry e a ultima data efetiva conhecida da OS (`rescheduledDate` anterior se ja existia, senao a `dueDate` original)
- A `dueDate` original da OS NAO deve ser alterada por reprogramacao; ela continua sendo a referencia de prazo planejado para fins de KPI e auditoria visual
- A API de listagem de OS (`GET /api/work-orders` com `summary=true`) deve expor `rescheduleCount` e `rescheduledDate` para alimentar o badge `Reprogramada Nx` e a coluna `Atraso Original`
- A API de detalhe (`GET /api/work-orders/[id]`) deve incluir a colecao `rescheduleHistory` com `previousDate`, `newDate`, `wasOverdue`, `createdAt` e dados do usuario que reprogramou
- O endpoint `GET /api/kpi` deve expor `process.reschedulingRate` calculado como `% de OSs com rescheduleCount > 0` sobre o total no periodo; este KPI e independente do `pmc` (que continua medindo cumprimento puro do plano)

## RAF (Relatorio de Analise de Falha)
- `Aprovacoes` continua exclusivo de `SUPER_ADMIN` e `ADMIN`
- `RAF` deixou de ser exclusivo dos perfis aprovadores: `SUPER_ADMIN` e `ADMIN` mantem acesso completo (`view`, `create`, `edit`, `delete`); `TECHNICIAN` e `LIMITED_TECHNICIAN` passaram a ter `view`, `create` e `edit` (sem `delete`); `REQUESTER` e `VIEW_ONLY` continuam sem acesso
- `checkApiPermission(session, 'rafs', ...)` e a fonte unica desta matriz; nao reimplementar a regra dentro de cada handler
- `FailureAnalysisReport` aceita dois vinculos de origem mutuamente exclusivos: `workOrderId` (RAF gerada a partir de uma OS) ou `requestId` (RAF gerada diretamente a partir de uma SS); pelo menos um dos dois deve estar preenchido para sustentar o rastreio de origem
- `area` e `equipment` sao campos de apoio do formulario e podem ser opcionais quando a RAF nasce de uma SS, ja que herdam contexto do ativo da solicitacao
- `GET /api/requests/[id]` deve retornar `failureAnalysisReport: { id, rafNumber } | null` para que a UI consiga sinalizar o vinculo SS<->RAF e desabilitar o botao de gerar RAF quando ja existir uma
- `GET /api/rafs` (lista) e `GET /api/rafs/[id]` (detalhe) devem retornar tambem `request: { id, requestNumber, title, asset, ... } | null`, alem da OS, para que a tela de RAF tolere casos sem `workOrder`

## Status da RAF (derivacao server-side)
- `FailureAnalysisReport.status` tem tipo `RafStatus { ABERTA, FINALIZADA }` com default `ABERTA`. O valor e SEMPRE derivado no servidor pelo helper `recalculateRafStatus(actionPlan, currentUserId)` em `src/lib/rafs/recalculateStatus.ts`
- `PUT /api/rafs/[id]` deve **remover** `status`, `finalizedAt`, `finalizedById` e `finalizedBy` do body antes do update; usar o `actionPlan` efetivo (do body ou da leitura atual) e recalcular
- Regra de transicao: `actionPlan` vazio → `ABERTA`; todos os itens com `status = 'COMPLETED'` → `FINALIZADA` (preserva `finalizedAt` e `finalizedById` existentes, senao preenche com `now` e `currentUserId`); qualquer item nao-concluido → `ABERTA` (reabertura zera `finalizedAt` e `finalizedById`)
- `POST /api/requests/[id]/generate-raf` insere com `status: 'ABERTA'`, `finalizedAt: null`, `finalizedById: null`
- `GET /api/rafs` (lista e summary) e `GET /api/rafs/[id]` devem retornar `status`, `finalizedAt` e `finalizedBy:User!finalizedById(id, firstName, lastName)` para a UI
- Parser canonico de deadline: `parseDeadline`/`isOverdue` em `src/lib/rafs/deadline.ts`; aceita ISO e `dd/mm/yyyy` e considera `OVERDUE` quando a data e estritamente anterior a `hoje` e o status nao e `COMPLETED`

## PA das RAFs — Stats (GET /api/rafs/action-plan/stats)
- Endpoint unico que alimenta os 4 KPIs da tela `/rafs/action-plan`: `openRafs`, `finalizedRafs`, `onTimeActions`, `overdueActions`
- Valida sessao (`401`), permissao `checkApiPermission(session, 'rafs', 'GET')` (`403`) e escopo empresa via `requireCompanyScope` (`403` quando companyId ausente)
- Aceita query opcional `unitId`; quando ausente, usa `session.unitId` como recorte operacional
- `onTimeActions` conta acoes nao-concluidas com `deadline >= hoje` ou sem deadline; `overdueActions` conta nao-concluidas com `deadline < hoje`
- Resposta: `{ data: { openRafs, finalizedRafs, onTimeActions, overdueActions } }`

## Geracao de RAF a partir de SS
- A rota `POST /api/requests/[id]/generate-raf` e o ponto unico que cria uma RAF vinculada diretamente a uma SS sem precisar de OS intermediaria
- A rota deve validar `checkApiPermission(session, 'rafs', 'POST')`, retornar `404` quando a SS nao existir no escopo da empresa, `400` quando o status da SS nao for `APPROVED` e `409` quando ja existir RAF vinculada (`FailureAnalysisReport.requestId = ss.id`)
- O body e opcional: sem body, a rota cria um rascunho rapido herdando `failureDescription` da SS, `occurrenceDate` do `createdAt` da SS, `panelOperator` do nome da sessao e `failureType = RANDOM`; com body, aceita os mesmos campos do `RAFFormModal` (incluindo `fiveWhys`, `hypothesisTests`, `actionPlan`, `failureType`, `stopExtension`, `failureBreakdown`, `productionLost`, `observation`, `immediateAction`)
- `rafNumber` e gerado pelo helper `generateRafNumber(assetId, maintenanceAreaId, companyId)` usando o ativo da SS quando disponivel e a area de manutencao **da propria SS** (`Request.maintenanceAreaId`, campo obrigatorio na criacao da SS); quando o ativo nao tiver `tag` preenchida, o helper faz fallback para `Asset.protheusCode` para compor o segundo token do nome da RAF
- O insert deve preencher `requestId = ss.id` e `workOrderId = null`, alem de `companyId`, `unitId` e `createdById` derivados da sessao. `FailureAnalysisReport` nao persiste `maintenanceAreaId` proprio — a area vive na origem (OS ou SS) e e lida via join em `/api/rafs`
- A resposta de sucesso retorna `{ data: { id, rafNumber, requestId } }` com status `201`
- A SS continua com status `APPROVED` apos a geracao da RAF; nao existe transicao automatica para `COMPLETED` por consequencia da RAF, e nao se grava `rafId` no registro da SS (o vinculo vive em `FailureAnalysisReport.requestId`)
- A UI so deve oferecer o botao `Abrir RAF` no painel de detalhe da SS quando `request.status === 'APPROVED'` e `request.failureAnalysisReport == null`
- `GET /api/rafs` (lista) e `GET /api/rafs/[id]` (detalhe) devem incluir `maintenanceArea:MaintenanceArea(id, name, code)` no join de `request`, alem do join ja existente em `workOrder`, para que a tela de RAF exiba area tanto para RAFs nascidas de OS quanto de SS. O `asset` em ambos os joins deve expor `protheusCode` para sustentar o fallback visual do `Cod. Bem`

## Lifecycle e Exclusao de Usuario
- O modelo `User` opera com tres estados via enum `UserStatus`: `ACTIVE` (uso normal), `INACTIVE` (desativado, sem login, historico preservado), `ARCHIVED` (anonimizado para LGPD). O campo `enabled` (Boolean) esta deprecado e e sincronizado pelas rotas de lifecycle por compatibilidade
- Login (`POST /api/auth/login`): usuarios `INACTIVE` recebem `403` ("Conta desativada"); usuarios `ARCHIVED` recebem `401` indistinguivel de credenciais invalidas
- `POST /api/users/[id]/deactivate` — bloqueia login (`status = INACTIVE`), mantem PII e referencias historicas. Bloqueia auto-desativacao e desativacao do ultimo `SUPER_ADMIN` ativo
- `POST /api/users/[id]/reactivate` — volta para `ACTIVE`. Indisponivel se status for `ARCHIVED`
- `POST /api/users/[id]/archive` — anonimiza PII (`firstName='Usuario'`, `lastName='Removido #<shortId>'`, email/username com sufixo `@archived.local`, phone/image/password limpos) e seta `status = ARCHIVED`. Body opcional `{ reason }`. Bloqueia auto-acao e ultimo `SUPER_ADMIN` ativo. Acao nao reversivel
- `DELETE /api/users/[id]` — passou a executar hard delete somente quando `countUserReferences(id).hasHistory == false`. Caso contrario retorna `409` com `{ error, references, total }` listando categorias com contagem (`workOrders`, `requestsCreated`, `failureAnalysisReports`, `labors`, `teamMemberships`, etc.). Nao permite auto-exclusao
- `GET /api/users/[id]/references` — retorna `{ data: { counts, total, hasHistory } }` para a UI decidir quais botoes destrutivos exibir
- Helper canonico de checagem de FK: `countUserReferences` em `src/lib/users/userReferences.ts`. Verificacao de "ultimo SUPER_ADMIN ativo": `isLastActiveSuperAdmin(userId, companyId)` no mesmo arquivo. Nao reimplementar essa logica nos handlers
- A UI nunca deve oferecer hard delete sem antes consultar `/references`; o servidor valida novamente para evitar bypass

## Historico do Ativo (GET /api/assets/[id]/history)
- Sem parametros extras, retorna apenas os campos brutos de `AssetHistory` + `userName` (batch por `userId`); comportamento atual preservado para o timeline interativo e exportacao XLSX
- Com `?include=details`, retorna tambem os objetos `workOrder` e `request` aninhados em cada evento, usando batch fetch (mesmo padrao do `userId`) por `workOrderId` e `requestId` distintos:
  - `workOrder`: `id`, `title`, `type`, `status`, `sequenceNumber`, `internalId`, `externalId`, `executionNotes`, `laborCost`, `partsCost`, `thirdPartyCost`, `toolsCost`, `createdAt`, `completedOn`, joins para `serviceType`, `maintenanceArea`, `assetMaintenancePlan`, `maintenancePlanExec` e colecao `woResources` (com `resource`, `jobTitle`, `user`)
  - `request`: `id`, `requestNumber`, `title`, `status`, `failureDescription`, `rejectionReason`, `createdAt`, joins para `maintenanceArea`, `requester` e `failureAnalysisReport`
- Ambos os batch fetchs validam `companyId` da sessao (`eq('companyId', session.companyId)`)
- `include=details` e consumido exclusivamente pelo `AssetHistoryPrintView` (geracao de PDF). O timeline interativo e a exportacao XLSX NAO devem enviar este param
- Tipos canonicos em `src/types/assetHistory.ts`: `WorkOrderFullDetail`, `RequestFullDetail`, `AssetHistoryEvent`

## Drilldown de Criticidade (GET /api/criticality/[assetId]/open-items)
- Endpoint unico que alimenta as abas `SS abertas`, `OS abertas` e `RAF` do painel de detalhe da tela `/criticality`
- Valida sessao (`401` quando ausente), escopo de empresa via `requireCompanyScope` (`403` quando companyId ausente), existencia do ativo no tenant (`404` quando nao existir) e escopo da unidade ativa (`403` quando o ativo estiver fora da unidade efetiva da sessao)
- Permissoes sao avaliadas por feature: `hasPermission(session, 'requests'|'work-orders'|'rafs', 'view')`. Quando um perfil nao tiver `view` em uma feature, a respectiva colecao no retorno e `[]` (nao e erro)
- Filtros fixos de "aberto": `OPEN_REQUEST_STATUSES = ['PENDING', 'APPROVED']`, `OPEN_WORK_ORDER_STATUSES = ['PENDING', 'RELEASED', 'IN_PROGRESS', 'ON_HOLD']` (OS respeitam tambem `archived = false`); RAFs nao aplicam filtro de status
- RAFs seguem abordagem hibrida de lookup:
  1. FK via `WorkOrder.assetId` (`originKind = 'work_order'`, `originLabel` = `internalId` da OS)
  2. FK via `Request.assetId` (`originKind = 'request'`, `originLabel` = `requestNumber` da SS)
  3. Fallback legado por nome exato do ativo (match case/acento-insensitivo do `equipment` com `Asset.name`) apenas para RAFs sem `workOrderId` e sem `requestId` (`originKind = 'legacy_name_match'`)
- Ordenacao: `requests` e `workOrders` por `dueDate` asc (NULLS LAST) + `createdAt` asc; `rafs` por `occurrenceDate` desc
- Resposta: `{ data: { requests: RequestItem[], workOrders: WorkOrderItem[], rafs: RafItem[] } }`

## Modo Batch via ?ids= (OS, SS, RAF)
- `GET /api/work-orders`, `GET /api/requests` e `GET /api/rafs` aceitam `?ids=id1,id2,...` para retornar lote de registros pela PK
- Sempre aplicar filtro de `companyId` alem do `in('id', ids)`; ids de fora do tenant silenciosamente somem do retorno
- Limite maximo de `50` ids por requisicao; ids acima do limite devem ser truncados server-side
- A ordem do resultado deve preservar a ordem do parametro de entrada (uso do padrao `Map<id, row>` para reassociar)
- Este modo alimenta os componentes `WorkOrdersBatchPrintView`, `RequestsBatchPrintView` e `RAFsBatchPrintView`, que renderizam uma pagina A4 por registro com `print:break-after-page` entre elas

## Auto-vinculo Bem <-> Plano Padrao
Feature que cria `AssetMaintenancePlan` automaticamente a partir de planos padrao (`StandardMaintenancePlan`) compativeis, com rastreio de override e reversao e propagacao de alteracoes. Helpers centralizados em `src/lib/maintenance-plans/standardSync.ts`; duplicata canonica em `src/lib/assets/planMatching.ts` (chave funcional `{assetId, serviceTypeId, maintenanceTime, timeUnit, trackingType}`).

### Criterio de compatibilidade (mesma regra em ambas as direcoes)
- `assetFamilyId` do Bem === `assetFamilyId` do plano padrao (obrigatorio)
- `assetModelId`: plano com `modelId = NULL` casa com qualquer modelo; plano com `modelId` preenchido so casa com bens do mesmo modelo (regra assimetrica)
- Plano padrao deve estar ativo (`isActive = true`)
- Bem deve estar operacional (nao arquivado/inativo)

### Situacao 1 — A partir do Bem
- `POST /api/assets` e `PUT /api/assets/[id]`: apos salvar, o handler calcula planos padrao compativeis. Se houver candidatos, a resposta inclui `compatibleStandardPlans: StandardPlanCandidate[]` para a UI abrir `AssetLinkingDialog`
- `POST /api/assets/[id]/apply-standard-plans` recebe `{ standardPlanIds: string[] }`; para cada id compativel, chama `applyStandardToAsset(standardPlanId, assetId, companyId)` que cria o `AssetMaintenancePlan` + tarefas/passos/recursos clonados. Rejeita duplicatas (chave funcional) como `skipped`; falhas de I/O viram `failed`
- Resposta: `{ data: { applied, skipped, failed } }` com contagens e ids

### Situacao 2 — A partir do Plano Padrao
- `GET /api/maintenance-plans/standard/[id]/compatible-assets` lista bens compativeis (aplica filtro de familia/modelo + escopo empresa/unidade) marcando `alreadyLinked: boolean` para bens com plano ativo baseado neste padrao
- `POST /api/maintenance-plans/standard/[id]/apply-to-assets` recebe `{ assetIds: string[] }`; cria `AssetMaintenancePlan` para cada bem compativel sem plano preexistente. Mesma semantica de `applied/skipped/failed`
- `POST /api/maintenance-plans/standard` (criacao): apos salvar, o handler retorna `compatibleAssets` para abrir o dialog imediatamente

### Override e Reversao
- Editar estruturalmente um `AssetMaintenancePlan` (tarefas, passos, recursos, tempos, tolerancia, tipo de medidor) marca `hasLocalOverrides = true`, preenche `detachedAt = now()` e `detachedById = session.userId`
- Campos operacionais (`assetId`, `lastMaintenanceDate`, `toleranceDays`, `maintenanceAreaId`, `serviceTypeId`, `sequence`, `isActive`) podem ser editados sem disparar override
- Helper `markAsOverridden(planId, userId)` em `src/lib/maintenance-plans/standardSync.ts` e o ponto unico que aplica esse marcador — invocado pelas rotas de edicao estrutural
- `POST /api/maintenance-plans/asset/[id]/revert` reverte o plano ao estado atual do plano padrao: preserva campos operacionais, reescreve campos estruturais, deleta/recria tarefas e limpa `hasLocalOverrides = false`, `detachedAt = null`, `detachedById = null`. Rejeita com `400` se `standardPlanId` estiver ausente ou `404` se o plano nao existir no tenant

### Propagacao de Alteracoes do Padrao
- `GET /api/maintenance-plans/standard/[id]/linked-assets` retorna `{ data: { items, eligible, detached } }` onde `items` e a lista completa, `eligible` sao os planos sem override (`hasLocalOverrides = false`) e `detached` sao os com override. Cada item expoe `assetMaintenancePlanId`, `asset`, `hasLocalOverrides`, `detachedAt`, `detachedBy`, `isActive`, `updatedAt`
- `POST /api/maintenance-plans/standard/[id]/propagate` recebe `{ assetPlanIds: string[] }` (nao vazio). Para cada id, chama `propagateStandardChanges` em `standardSync.ts`: revalida vinculo ao plano padrao, skipa se `hasLocalOverrides = true` (defesa em profundidade — a UI ja filtra), skipa ids nao encontrados/fora do padrao, atualiza campos estruturais preservando operacionais, deleta tarefas antigas e recria a partir do padrao. Preserva `hasLocalOverrides = false`
- Falhas por item viram `failed`, sem abortar o lote. Status `500` apenas quando todos falham; caso contrario `200` com `{ data: { applied, skipped, failed, appliedCount, skippedCount, failedCount }, message }`
- `PUT /api/maintenance-plans/standard/[id]` (edicao): apos salvar, a UI consulta `/linked-assets` e, se houver `eligible.length > 0`, abre `PropagateChangesDialog` listando eligiveis como selecionaveis e customizados como contexto (desabilitados com badge e explicacao "nao recebera propagacao")

## Check List Padrao (`/api/maintenance-plans/standard-checklists`)
- Feature `standard-checklists` no `API_MODULE_MAP`. Acesso: `SUPER_ADMIN`, `ADMIN`, `PLANEJADOR` com matriz `{ view, create, edit, delete }`. `MANUTENTOR` recebe `403` em todos os verbos
- `GET /api/maintenance-plans/standard-checklists` lista checklists do tenant, filtrados por `companyId` da sessao e `unitId` da sessao quando presente. Aceita query opcional `?workCenterId=` e `?serviceTypeId=` para busca direcionada. Retorno: `{ data: StandardChecklist[] }` com joins `workCenter`, `serviceType`, `unit`, `createdBy`
- `POST /api/maintenance-plans/standard-checklists` cria checklist + grupos + etapas em sequencia (sem transacao Supabase, mas erros de inserts subsequentes propagam 500). Body: `{ name, workCenterId, serviceTypeId, isActive?, familyGroups: [{ assetFamilyId, familyModelId, order?, steps: [{ genericStepId, order? }] }] }`. Valida WC/ServiceType pertencem a empresa (`404`) e unicidade do par `(workCenterId, serviceTypeId)` no tenant (`409`). `unitId` e herdado do WC. Retorna `{ data: { id }, message }` com `201`
- `GET /api/maintenance-plans/standard-checklists/[id]` retorna detalhe com `familyGroups` aninhados; cada grupo expoe `assetFamily(code, name)`, `familyModel(name)` e `steps[].genericStep(name, protheusCode, optionType)`. `404` quando nao pertence ao tenant
- `PUT /api/maintenance-plans/standard-checklists/[id]` aceita `{ name?, isActive?, familyGroups? }`. Quando `familyGroups` esta presente no body, o handler **sobrescreve** completamente: deleta os grupos antigos (cascade SQL apaga as etapas) e reinsere a estrutura nova. Os campos `workCenterId` e `serviceTypeId` NAO sao editaveis (a UI ja desabilita os selects); o handler ignora silenciosamente caso venham no payload
- `DELETE /api/maintenance-plans/standard-checklists/[id]` faz hard delete (cascade SQL apaga grupos e etapas). Sem soft delete — o "arquivar" e separado e nao remove o registro
- `PUT /api/maintenance-plans/standard-checklists/[id]/archive` recebe `{ isActive: boolean }` e atualiza apenas a flag `isActive` + `updatedAt`. Permite alternar entre arquivado e ativo a qualquer momento sem remover dados
- `GET /api/work-centers/[id]/family-models` retorna `{ data: Array<{ assetFamilyId, familyModelId, assetFamily, familyModel, assetCount }> }` listando os pares unicos `(familia, modelo)` presentes em bens nao-arquivados do WC, agrupados e com contagem. Usado pela auto-deteccao no formulario de checklist
- Side-effect em `POST /api/assets` e `PUT /api/assets/[id]`: apos persistir o bem, se ele tiver `workCenterId + familyId + familyModelId` preenchidos, o servidor chama `notifyMissingFamilyModel(asset, session)` (helper em `src/lib/standard-checklists/notifyMissingFamilyModel.ts`) que verifica se ha checklist ativo para o WC sem grupo cobrindo o par; em caso afirmativo, insere `Notification` para o `createdById` do checklist. Helper e wrapped em try/catch e nao quebra o fluxo de salvamento se falhar

## Casos Especificos do Produto
- `Aprovacoes` e exclusivo de `SUPER_ADMIN` e `ADMIN`
- `Configuracoes` do portal sao exclusivas de `SUPER_ADMIN`
- `TECHNICIAN` e `LIMITED_TECHNICIAN` nao devem cair no `Dashboard`; o destino inicial e `Ordens de Servico`
- A troca de unidade so pode ser oferecida a `SUPER_ADMIN` e `ADMIN`, e somente quando houver mais de uma unidade acessivel
- O menu do usuario em `Configuracoes` deve expor apenas as abas `Perfil` e `Seguranca`
- O salvamento de `Configuracoes > Perfil` nao deve sobrescrever campos tecnicos internos nao editaveis no formulario, como `username`
- Quando `Configuracoes > Perfil` receber `locationId`, a API deve validar que a localizacao pertence a empresa ativa da sessao
