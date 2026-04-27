# Plano de Acao - Inspecao de Area

**Data:** 2026-04-27
**Autor:** Felipe / Claude Code (alinhamento iterativo)
**Escopo:** Nova feature CMMS com tela unica `/inspections/checklists` (inicialmente planejada como duas telas — `Check List` + `Retorno de Check List` — mas consolidadas apos a Fase 6 por redundancia funcional, ja que o servidor filtra automaticamente por `assignedToId` quando o perfil e MANUTENTOR). Item simples no sidebar entre "Ordens de Servico" e "Solicitacoes de Servico".

---

## 1. Decisoes consolidadas (rodadas A-H + 1-9)

| Tema | Decisao |
|---|---|
| Permissoes | SUPER_ADMIN/ADMIN/PLANEJADOR criam/editam/deletam; MANUTENTOR opera (view + edit, sem create/delete) |
| Snapshot vs live | **Snapshot** — clona grupos+etapas no momento da criacao |
| Standard Checklist | Continua **por unidade** (sem mudanca no modelo) — listagem da Inspecao filtra pela unidade ativa |
| Bens compativeis | `Asset.workCenterId == checklist.workCenterId` AND `Asset.unitId == sessao.unitId` AND `(familyId, familyModelId)` casa com algum `StandardChecklistFamilyGroup` AND `archived = false` |
| `serviceType` | Apenas descritivo; nao filtra bens |
| Numeracao | 6 digitos puros, sequencia **por unidade** (`@@unique([companyId, unitId, number])`) |
| Workflow | RASCUNHO -> EM_REVISAO -> FINALIZADO (com retorno e reabertura) |
| Atribuicao | `assignedToId` obrigatorio (manutentor escolhido na criacao) |
| `maintenanceAreaId` na SS | Obrigatorio por NOK no form de finalizacao |
| `priority` na SS | Default herdado do checklist, editavel por NOK |
| Reabertura | Opcao A — congelar SSs ja criadas; novos NOKs geram SSs adicionais |
| Status virtual ATRASADO | Derivado quando `(RASCUNHO ou EM_REVISAO) AND today > dueDate + 1 dia` |
| Revisao do gestor | Pode mudar OK<->NOK, adicionar obs, devolver ao manutentor |
| Validacao "Enviar para revisao" | Bloqueia se houver etapa sem resposta |
| Validacao "Finalizar" | Bloqueia se houver NOK sem dados de SS preenchidos |
| Bulk answer por bem | Botoes "Marcar tudo OK" e "Marcar tudo NA" (sem NOK em massa) |
| Coluna Status na listagem | 3 estados visiveis (Em preenchimento / Em revisao / Finalizado) + virtual Atrasado |
| Impressao | Cabecalho repetido por pagina + paginacao X/Y |
| Vinculo SS | `Request.inspectionId` + `Request.inspectionStepId` (FK opcionais novos) |

---

## 2. Modelo de dados (Prisma)

### 2.1 Enums novos

```prisma
enum AreaInspectionStatus {
  RASCUNHO
  EM_REVISAO
  FINALIZADO
}

enum AreaInspectionAnswer {
  OK
  NOK
  NA
}
```

### 2.2 `AreaInspection` — o "Check List" instanciado

```prisma
model AreaInspection {
  id          String                @id @default(cuid())
  number      String                // 6 digitos: "000001"
  description String
  dueDate     DateTime
  status      AreaInspectionStatus  @default(RASCUNHO)

  // Snapshot do contexto (para nao depender de mudancas posteriores)
  standardChecklistId String?
  standardChecklist   StandardChecklist? @relation(fields: [standardChecklistId], references: [id], onDelete: SetNull)
  checklistName       String
  workCenterId        String?
  workCenterName      String
  serviceTypeId       String?
  serviceTypeName     String

  // Atribuicao
  assignedToId String
  assignedTo   User @relation("AreaInspectionAssignee", fields: [assignedToId], references: [id])

  // Workflow timestamps
  submittedForReviewAt   DateTime?
  submittedForReviewById String?
  submittedForReviewBy   User?     @relation("AreaInspectionSubmitter", fields: [submittedForReviewById], references: [id])
  finalizedAt            DateTime?
  finalizedById          String?
  finalizedBy            User?     @relation("AreaInspectionFinalizer", fields: [finalizedById], references: [id])
  reopenedAt             DateTime?
  reopenedById           String?
  reopenedBy             User?     @relation("AreaInspectionReopener", fields: [reopenedById], references: [id])

  // Tenancy
  companyId String
  company   Company @relation(fields: [companyId], references: [id], onDelete: Cascade)
  unitId    String
  unit      Location @relation("AreaInspectionUnit", fields: [unitId], references: [id])
  createdById String
  createdBy   User @relation("AreaInspectionCreator", fields: [createdById], references: [id])

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relacoes filhas
  assets   AreaInspectionAsset[]
  requests Request[] @relation("InspectionRequests")

  @@unique([companyId, unitId, number])
  @@index([companyId])
  @@index([unitId])
  @@index([status])
  @@index([assignedToId])
  @@index([dueDate])
  @@index([standardChecklistId])
}
```

### 2.3 `AreaInspectionAsset` — bens snapshotados

```prisma
model AreaInspectionAsset {
  id        String   @id @default(cuid())
  order     Int      @default(0)
  createdAt DateTime @default(now())

  inspectionId String
  inspection   AreaInspection @relation(fields: [inspectionId], references: [id], onDelete: Cascade)

  assetId           String?
  asset             Asset? @relation("InspectionAssetRef", fields: [assetId], references: [id], onDelete: SetNull)
  // Snapshot
  assetName         String
  assetTag          String?
  assetProtheusCode String?
  familyId          String?
  familyModelId     String?
  familyName        String?
  familyModelName   String?

  steps AreaInspectionStep[]

  @@index([inspectionId])
  @@index([assetId])
}
```

### 2.4 `AreaInspectionStep` — etapas snapshotadas

```prisma
model AreaInspectionStep {
  id        String   @id @default(cuid())
  order     Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  inspectionAssetId String
  inspectionAsset   AreaInspectionAsset @relation(fields: [inspectionAssetId], references: [id], onDelete: Cascade)

  // Snapshot do GenericStep (para sobreviver a mudancas no catalogo)
  genericStepId String?
  genericStep   GenericStep? @relation("InspectionStepGenericStep", fields: [genericStepId], references: [id], onDelete: SetNull)
  stepName      String
  stepProtheusCode String?
  optionType    String?  // copia de GenericStep.optionType

  // Resposta
  answer       AreaInspectionAnswer?
  notes        String?
  answeredById String?
  answeredBy   User? @relation("AreaInspectionAnswerer", fields: [answeredById], references: [id])
  answeredAt   DateTime?

  // SS gerada (preenchida apos finalize quando answer=NOK)
  requestId String?  @unique
  request   Request? @relation("InspectionStepRequest", fields: [requestId], references: [id], onDelete: SetNull)

  @@index([inspectionAssetId])
  @@index([genericStepId])
  @@index([answer])
}
```

### 2.5 Extensao em `Request` (campos opcionais — nao-breaking)

```prisma
// dentro do model Request
inspectionId      String?
inspection        AreaInspection? @relation("InspectionRequests", fields: [inspectionId], references: [id], onDelete: SetNull)

inspectionStepId  String?  @unique
// (relacao reversa em AreaInspectionStep.request)
```

Indices novos em Request: `@@index([inspectionId])`.

### 2.6 Migration

Arquivo: `prisma/migrations/20260427180000_add_area_inspections/migration.sql`

Conteudo:
1. CREATE TYPE para `AreaInspectionStatus` e `AreaInspectionAnswer`.
2. CREATE TABLE `AreaInspection`, `AreaInspectionAsset`, `AreaInspectionStep` com indices, FKs, cascade.
3. ALTER TABLE `Request` ADD COLUMN `inspectionId TEXT`, `inspectionStepId TEXT UNIQUE`.
4. CREATE INDEX em `Request("inspectionId")`.
5. ADD FOREIGN KEY de `Request.inspectionId` para `AreaInspection(id)` ON DELETE SET NULL.
6. INSERT em `Module` com slug `area-inspections`, name `Inspecao de Area`, icon `fact_check`, order `8` (entre OS=7 e Solicitacoes=9).
7. INSERT em `CompanyModule` (idempotente) habilitando o modulo para todas as empresas.

---

## 3. Helper de numeracao

Arquivo novo: `src/lib/area-inspections/generateNumber.ts`

```ts
export async function generateInspectionNumber(
  companyId: string,
  unitId: string
): Promise<string>
```

Implementacao:
1. Query `SELECT number FROM AreaInspection WHERE companyId = $1 AND unitId = $2 ORDER BY number DESC LIMIT 1`
2. Parse para int (sem prefixo); incrementa
3. Retorna `String(next).padStart(6, '0')`
4. UNIQUE constraint protege contra race; em caso de erro 23505, retry uma vez

---

## 4. Permissoes e Module

### 4.1 `src/lib/permissions.ts`

Adicionar em cada role o modulo `area-inspections`:

```ts
SUPER_ADMIN/ADMIN/PLANEJADOR:
  { module: 'area-inspections', actions: { view: true, create: true, edit: true, delete: true } }

MANUTENTOR:
  { module: 'area-inspections', actions: { view: true, create: false, edit: true, delete: false } }
```

Adicionar em `API_MODULE_MAP`:
```ts
'area-inspections': 'area-inspections',
'inspections': 'area-inspections',  // alias para a rota
```

### 4.2 Module seed via migration

Ja descrito em 2.6. Idempotente: usa `WHERE NOT EXISTS`.

---

## 5. APIs

Todas em `src/app/api/inspections/`:

| Verbo + rota | Permissao | Funcao |
|---|---|---|
| `GET /api/inspections` | view | Lista com filtros (`status`, `assignedToId`, `dueDate`, `q`); deriva `displayStatus` (ATRASADO virtual) |
| `POST /api/inspections` | create | Cria a partir de `{ standardChecklistId, description, dueDate, assignedToId }`. Snapshot transacional |
| `GET /api/inspections/[id]` | view | Detalhe completo: inspecao + assets + steps + requests vinculados |
| `PUT /api/inspections/[id]` | edit | Atualiza `description`, `dueDate`, `assignedToId` (apenas em RASCUNHO ou EM_REVISAO) |
| `PUT /api/inspections/[id]/answers` | edit | Salva respostas em batch: `{ answers: [{ stepId, answer, notes }] }` |
| `POST /api/inspections/[id]/submit-for-review` | edit | RASCUNHO -> EM_REVISAO. Valida 0 etapas sem resposta |
| `POST /api/inspections/[id]/return-to-draft` | edit | EM_REVISAO -> RASCUNHO. Apenas gestores |
| `POST /api/inspections/[id]/finalize` | edit | EM_REVISAO -> FINALIZADO. Cria SSs em batch. Apenas gestores |
| `POST /api/inspections/[id]/reopen` | edit | FINALIZADO -> EM_REVISAO. Apenas gestores |
| `DELETE /api/inspections/[id]` | delete | Hard delete em RASCUNHO/EM_REVISAO. Bloqueia FINALIZADO |
| `GET /api/standard-checklists/[id]/eligible-assets` | standard-checklists view | Lista bens compativeis na unidade ativa |

### 5.1 Validacoes do POST de criacao

- `standardChecklistId` existe, pertence a empresa, `unitId` igual a sessao.unitId
- `assignedToId` existe na empresa
- `dueDate` no futuro (ou >= hoje)
- Valida que existem bens compativeis (>= 1) — se zero, retorna 400

### 5.2 Snapshot transacional (POST /api/inspections)

Pseudo-codigo:
```
1. Le checklist + family groups + steps (com genericStep)
2. Le bens compativeis (Asset.workCenterId = checklist.workCenterId,
   Asset.unitId = session.unitId, (familyId, familyModelId) IN groups)
3. Gera number
4. INSERT AreaInspection
5. Para cada bem: INSERT AreaInspectionAsset
   Para cada step do grupo correspondente: INSERT AreaInspectionStep
6. Em erro, deletar AreaInspection (cascade limpa filhos)
```

### 5.3 Finalize (POST /api/inspections/[id]/finalize)

Body:
```json
{
  "nokDetails": [
    {
      "stepId": "...",
      "title": "...",
      "description": "...",
      "priority": "HIGH",
      "maintenanceAreaId": "...",
      "dueDate": "2026-05-10"
    }
  ]
}
```

Validacao:
- Status atual deve ser EM_REVISAO
- Todo step com `answer = NOK` AND sem `requestId` previo deve ter entry em `nokDetails`
- Toda entry em `nokDetails` deve ter `title` e `maintenanceAreaId`

Execucao:
1. Para cada NOK pendente: cria `Request` com `inspectionId` e `inspectionStepId`, gera `requestNumber` SS-XXXXXX (helper existente inline), status PENDING
2. Atualiza `AreaInspectionStep.requestId` correspondente
3. Atualiza `AreaInspection` para FINALIZADO + `finalizedAt` + `finalizedById`
4. Em erro, rollback (delete dos requests criados nessa execucao)

---

## 6. Componentes UI

### 6.1 Sidebar

`src/components/layout/Sidebar.tsx` — adicionar entre `Ordens de Servico` (linha 79) e `Solicitacoes de Servico` (linha 80):

```ts
{ name: 'Inspecao de Area', href: '/inspections', icon: 'fact_check', module: 'area-inspections', subItems: [
  { name: 'Check List', href: '/inspections/checklists', module: 'area-inspections' },
  { name: 'Retorno de Check List', href: '/inspections/returns', module: 'area-inspections' },
]},
```

### 6.2 Paginas

`src/app/inspections/checklists/page.tsx`
- Listagem split-panel canonica
- Tabela: N°, Descricao, Criado em, Vencimento, N° SSs, Status (badge)
- Filtros: status, atribuido, range de vencimento
- Busca: reconhece numero, descricao, nome do checklist, manutentor
- Botao "Novo Check List" (gestores apenas)

`src/app/inspections/returns/page.tsx`
- Mesma estrutura, focada em execucao
- MANUTENTOR ve apenas inspecoes onde `assignedToId = sessao.userId`
- Gestores veem todas
- Painel direito: `InspectionExecutionPanel` (manutentor) ou `InspectionReviewPanel` (gestor)

### 6.3 Componentes em `src/components/area-inspections/`

| Arquivo | Funcao |
|---|---|
| `InspectionListTable.tsx` | Tabela desktop com SortableHeader |
| `InspectionListCards.tsx` | Cards mobile (`isPhone`) |
| `InspectionStatusBadge.tsx` | Badge dos 4 estados (RASCUNHO/EM_REVISAO/FINALIZADO/ATRASADO virtual) |
| `InspectionFormPanel.tsx` | Criar nova: select StandardChecklist, descricao, vencimento, manutentor; preview de bens elegiveis |
| `InspectionDetailPanel.tsx` | Readonly + botoes de acao (Editar/Excluir/Imprimir/Reabrir) |
| `InspectionExecutionPanel.tsx` | Manutentor preenche; bulk OK/NA por bem; contador de pendencias; "Enviar para revisao" |
| `InspectionReviewPanel.tsx` | Gestor revisa; lista NOKs; botao "Devolver" e "Finalizar" |
| `NokDetailsModal.tsx` | Submodal por NOK (title, description, priority, maintenanceAreaId, dueDate) |
| `FinalizeModal.tsx` | Modal de finalizacao listando todos os NOKs com seus forms |
| `InspectionPrintView.tsx` | Folha A4 compacta |
| `EligibleAssetsPreview.tsx` | Componente interno do FormPanel — mostra bens compativeis |

### 6.4 InspectionPrintView

Layout:
- Header repetido por pagina (CSS `@media print` + classe `print-header`):
  - Empresa + unidade
  - N° check list, descricao, vencimento, manutentor
  - Paginacao "X/Y" (resolvida via JS — calcula numero de paginas a partir da quantidade de bens e altura estimada)
- Legenda em destaque: tres caixinhas no topo `[ ] OK  [ ] NOK  [ ] NA`
- Por bem: cabecalho com tag+nome+familia/modelo, tabela compacta:
  - col 1: # da etapa
  - col 2: nome da etapa
  - col 3: caixinha OK
  - col 4: caixinha NOK
  - col 5: caixinha NA
  - col 6: linha para observacao
- `print:break-inside-avoid` por bloco de bem
- Toolbar Imprimir/Fechar (escondida em print)
- Padrao baseado em `RAFPrintView`

### 6.5 Status badges (paleta sugerida)

- `RASCUNHO` — cinza claro: `bg-gray-100 text-gray-700 border border-gray-300`
- `EM_REVISAO` — cinza medio com destaque: `bg-gray-200 text-gray-900 border border-gray-400 font-semibold`
- `FINALIZADO` — preto/grafite: `bg-gray-900 text-white border border-gray-900`
- `ATRASADO` (virtual sobrepoe RASCUNHO/EM_REVISAO) — borda solida preta + bold + icone `warning`: `bg-white text-gray-900 border-2 border-gray-900 font-bold`

---

## 7. Validacoes UX

| Acao | Bloqueia se |
|---|---|
| Criar | Sem standardChecklistId, sem assignedToId, sem dueDate, ou nenhum bem compativel |
| Salvar respostas | Status nao for RASCUNHO (manutentor) ou EM_REVISAO (gestor) |
| Enviar para revisao | Houver step sem `answer` (mostra contagem) |
| Finalizar | Houver step com `answer=NOK` sem dados de SS preenchidos |
| Reabrir | Status nao for FINALIZADO |
| Excluir | Status for FINALIZADO |
| Imprimir | Sempre permitido (qualquer status) |

---

## 8. Documentacao a atualizar (mesmo ciclo)

| Arquivo | Conteudo |
|---|---|
| `docs/SPEC.md` | Nova secao "Inspecao de Area" com workflow, status, snapshot, numeracao, vinculo SS |
| `.claude/rules/api.md` | Endpoints novos, regras de permissao, validacoes, snapshot |
| `.claude/rules/components.md` | Mapa de telas, padroes de componentes, print view, badges |
| `.claude/rules/database.md` | Modelos novos, numeracao por unidade, extensao de Request |
| `CLAUDE.md` | Adicionar `Inspecao de Area` na lista de features do CMMS |

---

## 9. Testes internos (sem testes visuais)

Conforme solicitado pelo usuario, **nao** rodar testes visuais Playwright. Testes que serao executados:

1. `npm run lint` — apos cada fase principal
2. `npm run build` — apos a Fase 6 para garantir compilacao end-to-end
3. Conferencia de tipos via `tsc` implicito do Next build
4. Verificacao manual de logica via leitura do codigo apos cada fase

---

## 10. Ordem de execucao (fases)

### Fase 1 — Backend base
- [ ] 1.1 Schema Prisma: enums + 3 modelos novos + extensao Request
- [ ] 1.2 Migration SQL completa
- [ ] 1.3 Helper `generateInspectionNumber.ts`
- [ ] 1.4 Permissoes em `permissions.ts` + API_MODULE_MAP
- [ ] 1.5 `npx prisma generate` para regerar client
- [ ] 1.6 Lint check

### Fase 2 — UI base + criacao
- [ ] 2.1 Sidebar com novo grupo
- [ ] 2.2 GET /api/inspections (listagem)
- [ ] 2.3 GET /api/standard-checklists/[id]/eligible-assets
- [ ] 2.4 POST /api/inspections (criacao com snapshot)
- [ ] 2.5 GET /api/inspections/[id] (detalhe)
- [ ] 2.6 Pagina /inspections/checklists com listagem
- [ ] 2.7 InspectionStatusBadge, InspectionListTable, InspectionListCards
- [ ] 2.8 InspectionFormPanel + EligibleAssetsPreview
- [ ] 2.9 Lint check

### Fase 3 — Execucao do manutentor
- [ ] 3.1 PUT /api/inspections/[id]/answers
- [ ] 3.2 POST /api/inspections/[id]/submit-for-review
- [ ] 3.3 InspectionDetailPanel
- [ ] 3.4 InspectionExecutionPanel (com bulk OK/NA, contador de pendencias)
- [ ] 3.5 Pagina /inspections/returns
- [ ] 3.6 Lint check

### Fase 4 — Revisao e finalizacao
- [ ] 4.1 POST /api/inspections/[id]/return-to-draft
- [ ] 4.2 POST /api/inspections/[id]/finalize (cria SSs em batch)
- [ ] 4.3 POST /api/inspections/[id]/reopen
- [ ] 4.4 NokDetailsModal + FinalizeModal
- [ ] 4.5 InspectionReviewPanel
- [ ] 4.6 Validacao de NOK sem detalhes na finalizacao
- [ ] 4.7 Vinculo SS visivel no detalhe (`Request.inspectionId`)
- [ ] 4.8 Lint check

### Fase 5 — Impressao
- [ ] 5.1 InspectionPrintView (folha A4 compacta + cabecalho repetido + paginacao X/Y)
- [ ] 5.2 Botao Imprimir no DetailPanel
- [ ] 5.3 Lint check

### Fase 6 — Polimento
- [ ] 6.1 PUT /api/inspections/[id] (edicao basica)
- [ ] 6.2 DELETE /api/inspections/[id] (hard delete em RASCUNHO/EM_REVISAO)
- [ ] 6.3 Status virtual ATRASADO derivado na listagem
- [ ] 6.4 N° SSs como contagem real
- [ ] 6.5 Filtros e ordenacao client-side em todas as colunas
- [ ] 6.6 Atualizacao de docs/SPEC.md, .claude/rules/*.md, CLAUDE.md
- [ ] 6.7 `npm run lint`
- [ ] 6.8 `npm run build`

---

## 11. Riscos e mitigacoes

| Risco | Mitigacao |
|---|---|
| Snapshot pesado (50 bens x 15 etapas = 750 linhas) | Insert em batch chunked (50 por vez); paginacao no front (accordion por bem) |
| Race condition no `number` | UNIQUE constraint + retry em erro 23505 |
| Falha no meio do snapshot | Cascade DELETE da inspecao limpa filhos automaticamente |
| Falha no meio do finalize (criando SSs) | Coletar IDs criados; em erro, deletar tudo; retornar 500 |
| `optionType` nao OK/NOK/NA | Snapshot copia `optionType`; UI renderiza input apropriado por tipo (OK/NOK/NA, numerico ou texto). MVP: ignorar e forcar OK/NOK/NA — registrar em CLAUDE.md como limitacao |
| Manutentor de outra unidade ve inspecoes | Filtro por `companyId + unitId` em todos os GETs |
| Standard Checklist deletado depois | `onDelete: SetNull` em `standardChecklistId` — snapshot ja preserva nome+contexto |

---

## 12. Definicao de pronto

- [ ] Sidebar mostra "Inspecao de Area" com 2 sub-itens para os 4 perfis
- [ ] Gestor cria nova inspecao -> bens snapshotados corretamente
- [ ] Manutentor preenche respostas e envia para revisao (com validacao)
- [ ] Gestor revisa, edita, finaliza -> SSs criadas com `inspectionId`
- [ ] Reabertura volta para EM_REVISAO sem afetar SSs ja criadas
- [ ] Impressao gera folha A4 compacta com legenda + paginacao X/Y
- [ ] Status ATRASADO aparece na listagem 1+ dia apos vencimento
- [ ] `npm run lint` passa
- [ ] `npm run build` passa
- [ ] Docs atualizadas (SPEC, rules, CLAUDE)
