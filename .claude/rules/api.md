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
- Em rotas de negocio CMMS (tudo fora de `/api/admin/**` e `/api/auth/**`), usar `requireCompanyScope(session)` de `src/lib/user-roles.ts` para falhar cedo quando `companyId` estiver ausente.

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

## Geracao de RAF a partir de SS
- A rota `POST /api/requests/[id]/generate-raf` e o ponto unico que cria uma RAF vinculada diretamente a uma SS sem precisar de OS intermediaria
- A rota deve validar `checkApiPermission(session, 'rafs', 'POST')`, retornar `404` quando a SS nao existir no escopo da empresa, `400` quando o status da SS nao for `APPROVED` e `409` quando ja existir RAF vinculada (`FailureAnalysisReport.requestId = ss.id`)
- O body e opcional: sem body, a rota cria um rascunho rapido herdando `failureDescription` da SS, `occurrenceDate` do `createdAt` da SS, `panelOperator` do nome da sessao e `failureType = RANDOM`; com body, aceita os mesmos campos do `RAFFormModal` (incluindo `fiveWhys`, `hypothesisTests`, `actionPlan`, `failureType`, `stopExtension`, `failureBreakdown`, `productionLost`, `observation`, `immediateAction`)
- `rafNumber` e gerado pelo helper `generateRafNumber(assetId, maintenanceAreaId, companyId)` usando o ativo da SS quando disponivel; `maintenanceAreaId` e `null` neste fluxo (a SS nao carrega area de manutencao)
- O insert deve preencher `requestId = ss.id` e `workOrderId = null`, alem de `companyId`, `unitId` e `createdById` derivados da sessao
- A resposta de sucesso retorna `{ data: { id, rafNumber, requestId } }` com status `201`
- A SS continua com status `APPROVED` apos a geracao da RAF; nao existe transicao automatica para `COMPLETED` por consequencia da RAF, e nao se grava `rafId` no registro da SS (o vinculo vive em `FailureAnalysisReport.requestId`)
- A UI so deve oferecer o botao `Abrir RAF` no painel de detalhe da SS quando `request.status === 'APPROVED'` e `request.failureAnalysisReport == null`

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

## Casos Especificos do Produto
- `Aprovacoes` e exclusivo de `SUPER_ADMIN` e `ADMIN`
- `Configuracoes` do portal sao exclusivas de `SUPER_ADMIN`
- `TECHNICIAN` e `LIMITED_TECHNICIAN` nao devem cair no `Dashboard`; o destino inicial e `Ordens de Servico`
- A troca de unidade so pode ser oferecida a `SUPER_ADMIN` e `ADMIN`, e somente quando houver mais de uma unidade acessivel
- O menu do usuario em `Configuracoes` deve expor apenas as abas `Perfil` e `Seguranca`
- O salvamento de `Configuracoes > Perfil` nao deve sobrescrever campos tecnicos internos nao editaveis no formulario, como `username`
- Quando `Configuracoes > Perfil` receber `locationId`, a API deve validar que a localizacao pertence a empresa ativa da sessao
