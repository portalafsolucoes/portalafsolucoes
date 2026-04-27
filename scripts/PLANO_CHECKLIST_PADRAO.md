# Plano de Ação — Check List Padrão

**Data:** 2026-04-24
**Autor:** Felipe / Claude Code (alinhamento iterativo)
**Escopo:** CMMS — nova feature de cadastro de Check List Padrão por Centro de Trabalho + Tipo de Serviço, agrupando inspeções por (Família, Tipo Modelo) com etapas reusadas de `GenericStep`. Esta é a **fase 1** (template). A fase 2 (emissão de checklists individuais por data, análoga a OS) será tratada em outro chat.

---

## 1. Objetivos

1. **Cadastro de Check List Padrão** — por `(WorkCenter, ServiceType)`, com seções automáticas por `(AssetFamily, AssetFamilyModel)` detectadas a partir dos bens vinculados ao Work Center. Para cada seção, o usuário escolhe etapas (`GenericStep`) a inspecionar.
2. **Auto-detecção de famílias+modelos** — endpoint auxiliar que devolve as combinações `(família, modelo)` presentes no WC, marcando se já estão mapeadas no checklist em edição.
3. **Notificação de bem novo** — quando um `Asset` é criado ou movido para um WC e a combinação `(família, modelo)` desse bem **não** está mapeada em algum checklist do WC, notificar o `createdById` de cada checklist envolvido. Sem checklist ainda → ninguém notificado.
4. **Listagem split-panel** — `/maintenance-plan/standard-checklists` no padrão `AdaptiveSplitPanel` (espelho de `/maintenance-plan/standard`).
5. **Permissões** — novo módulo `standard-checklists`. Acesso completo para SUPER_ADMIN, ADMIN, PLANEJADOR. MANUTENTOR sem acesso.
6. **Exclusão híbrida (Opção C)** — hard-delete enquanto não houver referências históricas; depois (fase 2) força arquivar via `isActive = false`.

---

## 2. Glossário canônico

| Termo | Entidade/Campo | Observação |
|---|---|---|
| Centro de Trabalho | `WorkCenter` — `workCenterId` em Asset | Escopo unitário; obrigatório no checklist |
| Tipo de Serviço | `ServiceType` — `serviceTypeId` | Obrigatório; varia o checklist no mesmo WC |
| Família | `AssetFamily` — `familyId` em Asset | Obrigatório no grupo do checklist |
| Tipo Modelo | `AssetFamilyModel` — `familyModelId` em Asset | Obrigatório no grupo (não é nullável aqui) |
| Etapa Genérica | `GenericStep` — `genericStepId` na step do checklist | Reutilizado, mesma fonte dos planos |
| Check List Padrão | `StandardChecklist` (novo) | Template por `(WC, ServiceType)` |
| Grupo de Família | `StandardChecklistFamilyGroup` (novo) | Por `(família, modelo)` dentro do checklist |
| Item do Check List | `StandardChecklistStep` (novo) | Liga um `GenericStep` a um grupo, com `order` |

---

## 3. Decisões consolidadas (referência rápida)

| Tema | Decisão final |
|---|---|
| Escopo do template | `(workCenterId, serviceTypeId)` — um checklist agrupa todas as famílias+modelos do WC para um dado serviço |
| Unicidade do parent | `UNIQUE(workCenterId, serviceTypeId)` |
| Unicidade do filho | `UNIQUE(checklistId, assetFamilyId, familyModelId)` |
| Tipo Modelo obrigatório | Sim — sempre `(família, modelo)` (não casa "qualquer modelo") |
| Auto-detecção | Lê `Asset.workCenterId = X` e agrupa por `(familyId, familyModelId)` |
| Reuso de GenericStep | Sim, mesmo cadastro de `/basic-registrations/generic-steps` |
| Reordenação | Sim — campo `order` em FamilyGroup e Step, com drag-and-drop no form |
| Nome | Auto-gerado `WC-X / Serviço-Y` (não editável manualmente) |
| Soft vs hard delete | Híbrido (Opção C) — `isActive` para desativar; hard-delete só sem refs históricas |
| Permissões | SUPER_ADMIN, ADMIN, PLANEJADOR full; MANUTENTOR sem acesso |
| Notificação destinatário | `createdById` de cada checklist envolvido (pula se status≠ACTIVE); múltiplos criadores quando múltiplos checklists no WC |
| Notificação trigger | `POST /api/assets` e `PUT /api/assets/[id]` quando `workCenterId` é setado/alterado E o bem tem `familyId` + `familyModelId` |
| Notificação href | `/maintenance-plan/standard-checklists?focus=<checklistId>` |
| Papéis canônicos reais | SUPER_ADMIN, ADMIN, PLANEJADOR, MANUTENTOR (corrigir docs `.md` desatualizadas no mesmo PR) |

---

## 4. Mudanças de schema

### 4.1 Nova migration: `add_standard_checklists`

Timestamp: `20260424180000_add_standard_checklists`.

**3 novas tabelas:**

```prisma
model StandardChecklist {
  id            String   @id @default(cuid())
  name          String                // auto: "WC-X / Serviço-Y"
  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  workCenterId  String
  workCenter    WorkCenter @relation(fields: [workCenterId], references: [id], onDelete: Cascade)

  serviceTypeId String
  serviceType   ServiceType @relation(fields: [serviceTypeId], references: [id])

  unitId        String
  unit          Location @relation("StandardChecklistUnit", fields: [unitId], references: [id], onDelete: Cascade)

  companyId     String
  company       Company @relation(fields: [companyId], references: [id], onDelete: Cascade)

  createdById   String
  createdBy     User @relation("StandardChecklistCreator", fields: [createdById], references: [id])

  familyGroups  StandardChecklistFamilyGroup[]

  @@unique([workCenterId, serviceTypeId])
  @@index([companyId])
  @@index([unitId])
  @@index([workCenterId])
  @@index([serviceTypeId])
  @@index([createdById])
}

model StandardChecklistFamilyGroup {
  id            String  @id @default(cuid())
  order         Int     @default(0)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  checklistId   String
  checklist     StandardChecklist @relation(fields: [checklistId], references: [id], onDelete: Cascade)

  assetFamilyId String
  assetFamily   AssetFamily @relation("ChecklistFamilyGroup", fields: [assetFamilyId], references: [id])

  familyModelId String
  familyModel   AssetFamilyModel @relation("ChecklistFamilyGroup", fields: [familyModelId], references: [id])

  steps         StandardChecklistStep[]

  @@unique([checklistId, assetFamilyId, familyModelId])
  @@index([checklistId])
  @@index([assetFamilyId])
  @@index([familyModelId])
}

model StandardChecklistStep {
  id            String  @id @default(cuid())
  order         Int     @default(0)
  createdAt     DateTime @default(now())

  groupId       String
  group         StandardChecklistFamilyGroup @relation(fields: [groupId], references: [id], onDelete: Cascade)

  genericStepId String
  genericStep   GenericStep @relation("ChecklistStep", fields: [genericStepId], references: [id])

  @@index([groupId])
  @@index([genericStepId])
}
```

**Relações inversas a adicionar nos models existentes:**
- `WorkCenter` → `standardChecklists StandardChecklist[]`
- `ServiceType` → `standardChecklists StandardChecklist[]`
- `Location` → `standardChecklistsAsUnit StandardChecklist[] @relation("StandardChecklistUnit")`
- `Company` → `standardChecklists StandardChecklist[]`
- `User` → `createdStandardChecklists StandardChecklist[] @relation("StandardChecklistCreator")`
- `AssetFamily` → `checklistFamilyGroups StandardChecklistFamilyGroup[] @relation("ChecklistFamilyGroup")`
- `AssetFamilyModel` → `checklistFamilyGroups StandardChecklistFamilyGroup[] @relation("ChecklistFamilyGroup")`
- `GenericStep` → `checklistSteps StandardChecklistStep[] @relation("ChecklistStep")`

**Backfill:** nenhum.

**Module seed:** inserir registro em `Module` via SQL no fim da migration:
```sql
INSERT INTO "Module" (id, slug, name, icon, "order", "productId", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, 'standard-checklists', 'Check Lists Padrão', 'checklist', 7,
        (SELECT id FROM "Product" WHERE slug = 'CMMS'),
        now(), now())
ON CONFLICT (slug) DO NOTHING;

-- Habilitar para todas as empresas existentes
INSERT INTO "CompanyModule" (id, "companyId", "moduleId", enabled, "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, c.id, m.id, true, now(), now()
FROM "Company" c
CROSS JOIN "Module" m
WHERE m.slug = 'standard-checklists'
ON CONFLICT ("companyId", "moduleId") DO NOTHING;
```

### 4.2 Atualização de `prisma/seed.ts`

Adicionar entrada na lista de módulos:
```ts
{ slug: 'standard-checklists', name: 'Check Lists Padrão', icon: 'checklist', order: 6.5 }
```
(Order 6.5 fica entre `maintenance-plan` (6) e `planning` (7); pode ajustar para `7` se preferir reindexar.)

### 4.3 Rollback

```sql
DROP TABLE "StandardChecklistStep";
DROP TABLE "StandardChecklistFamilyGroup";
DROP TABLE "StandardChecklist";
DELETE FROM "CompanyModule" WHERE "moduleId" IN (SELECT id FROM "Module" WHERE slug = 'standard-checklists');
DELETE FROM "Module" WHERE slug = 'standard-checklists';
```

---

## 5. APIs

### 5.1 `GET /api/maintenance-plans/standard-checklists`

Listagem. Query opcionais: `?workCenterId=`, `?serviceTypeId=`, `?search=`, `?includeInactive=1`.

Retorno:
```ts
{
  data: Array<{
    id: string,
    name: string,
    isActive: boolean,
    workCenter: { id, name, protheusCode },
    serviceType: { id, code, name },
    createdBy: { id, firstName, lastName },
    familyGroupsCount: number,    // agregado
    stepsCount: number,           // agregado
    createdAt: string,
    updatedAt: string,
  }>
}
```

### 5.2 `POST /api/maintenance-plans/standard-checklists`

Criar checklist. Body:
```ts
{
  workCenterId: string,
  serviceTypeId: string,
  familyGroups: Array<{
    assetFamilyId: string,
    familyModelId: string,
    order: number,
    steps: Array<{ genericStepId: string, order: number }>
  }>
}
```

- Valida sessão, `requireCompanyScope`, `checkApiPermission(session, 'standard-checklists', 'POST')`
- Aplica `normalizeTextPayload` no body
- Valida que `workCenter` e `serviceType` pertencem ao tenant + à unidade ativa
- Valida unicidade `(workCenterId, serviceTypeId)` antes do insert (retorna `409` se já existir)
- Auto-gera `name = "{workCenter.name} / {serviceType.name}"`
- Persiste `companyId` + `unitId` (do WC) + `createdById` (da sessão)
- Insere `StandardChecklist` + `FamilyGroup[]` + `Step[]` em transação (Supabase RPC ou múltiplos inserts em try/catch)
- Retorno: `{ data: { id, name } }` com `201`

### 5.3 `GET /api/maintenance-plans/standard-checklists/[id]`

Detalhe completo. Retorna o checklist com `familyGroups[]` ordenados por `order`, cada um com `assetFamily`, `familyModel`, `steps[]` ordenadas por `order`, cada step com `genericStep` (incluindo `optionType` e `options[]`).

### 5.4 `PUT /api/maintenance-plans/standard-checklists/[id]`

Atualizar. Body aceita `familyGroups` completo (substitui o conteúdo atual em cascata: deleta groups+steps existentes, recria a partir do payload). Mais simples e seguro que diff.

- Valida `checkApiPermission(session, 'standard-checklists', 'PUT')`
- `normalizeTextPayload` no body
- Recalcula `name` se `serviceTypeId` mudou (o `workCenterId` permanece imutável — se trocar, é outro checklist)
- Bloqueia troca de `workCenterId` (retorna `400`); permite apenas reset interno do conteúdo + troca de `serviceTypeId` desde que respeite unicidade

### 5.5 `DELETE /api/maintenance-plans/standard-checklists/[id]`

Híbrido (Opção C):
- Helper `countChecklistReferences(checklistId)` → na fase 1 retorna sempre `0`. Será estendido na fase 2 quando houver `ChecklistInstance`.
- Se `total === 0` → hard-delete cascata (FamilyGroup → Step). Retorna `200`
- Se `total > 0` → retorna `409` com `{ error, references, total }`. UI pode oferecer endpoint de arquivar.

### 5.6 `PUT /api/maintenance-plans/standard-checklists/[id]/archive`

Soft-delete (set `isActive = false`). Disponível mesmo quando há refs históricas.

### 5.7 `GET /api/work-centers/[id]/family-models?serviceTypeId=...`

Endpoint auxiliar do form. Lê:
- `Asset` onde `workCenterId = X` e tem `familyId` + `familyModelId` (não nulos)
- Agrupa por `(familyId, familyModelId)` com `COUNT(*)` → `assetCount`
- Junta com `AssetFamily.name` e `AssetFamilyModel.name`
- Se `?serviceTypeId=` for fornecido E houver checklist existente para `(workCenterId, serviceTypeId)`, marca cada combo com `alreadyMapped: boolean`

Retorno:
```ts
{
  data: Array<{
    assetFamilyId: string,
    familyName: string,
    familyModelId: string,
    familyModelName: string,
    assetCount: number,
    alreadyMapped: boolean,
  }>
}
```

### 5.8 Padrão geral

Todas as rotas:
- Importam de `@/lib/supabase`, `@/lib/session`, `@/lib/textNormalizer`, `@/lib/user-roles` (`requireCompanyScope`)
- Usam `NextRequest`/`NextResponse` quando há body/query
- Sessão `401` cedo, permissão `403`, `requireCompanyScope` para garantir tenant
- `normalizeTextPayload` em todo POST/PUT/PATCH

---

## 6. Helper de notificação

Arquivo: `src/lib/standard-checklists/notifyMissingFamilyModel.ts`

```ts
export async function notifyMissingFamilyModelMappings(
  assetId: string,
  companyId: string
): Promise<void>
```

Fluxo:
1. Busca o asset por id (`workCenterId`, `familyId`, `familyModelId`).
2. Se algum dos 3 campos for `null` → return silenciosamente.
3. Busca todos os `StandardChecklist` ativos do WC do bem (`workCenterId = X` AND `isActive = true`), incluindo `familyGroups[]` e `createdById`.
4. Para cada checklist, verifica se existe `FamilyGroup` com `(familyId, familyModelId)` do bem.
5. Se **não existir** mapping naquele checklist:
   - Carrega o `User` do `createdById`. Se `status !== 'ACTIVE'` → pula.
   - Cria `Notification`:
     - `title`: "Bem novo sem checklist"
     - `message`: "O bem {tag/name} ({família} / {modelo}) entrou no centro de trabalho {WC}, mas não está coberto pelo Check List Padrão de {ServiceType}. Atualize o checklist se necessário."
     - `href`: `/maintenance-plan/standard-checklists?focus={checklistId}`
6. Não retorna erro se nada for criado — operação silenciosa.

**Integração:**
- Em `POST /api/assets/route.ts` (após o `insert` retornar com sucesso): `await notifyMissingFamilyModelMappings(newAssetId, session.companyId)`. Falha em catch silencioso (não bloqueia criação).
- Em `PUT /api/assets/[id]/route.ts`: chamar **somente** se `workCenterId` foi alterado OU se `familyId`/`familyModelId` foram alterados. Para detectar, comparar `oldAsset` com payload.

---

## 7. UI — Componentes e página

### 7.1 Sidebar (`src/components/layout/Sidebar.tsx`)

Adicionar subitem em "Cadastro de Manutenção" (após "Manutenção do Bem"):
```ts
{ name: 'Check List Padrão', href: '/maintenance-plan/standard-checklists', module: 'standard-checklists' }
```

### 7.2 Página `/maintenance-plan/standard-checklists/page.tsx`

Padrão `PageContainer variant="full"` + `PageHeader` + `AdaptiveSplitPanel`. Espelho de `/maintenance-plan/standard/page.tsx`.

- Listagem em modo tabela (default) e cards (mobile)
- Colunas: Centro de Trabalho, Tipo de Serviço, Famílias+Modelos cobertos, Total de Etapas, Atualizado em, Status (`Ativo`/`Arquivado`), Criado por
- Header actions: Busca + Filtros (WC, Serviço, Status) + Botão "Adicionar Check List"
- Click em linha → abre `StandardChecklistDetailPanel` no painel direito
- Botão "Editar" no detail → abre `StandardChecklistFormPanel inPage`
- Botão "Adicionar" → mesmo `StandardChecklistFormPanel inPage` em modo criação

### 7.3 Componentes em `src/components/standard-checklists/`

**`StandardChecklistDetailPanel.tsx`:**
- Header com nome auto-gerado, badge de status, criador, datas
- Botão `PanelActionButtons` (Editar, Excluir/Arquivar conforme refs)
- Tabs (opcional) ou seções colapsáveis: uma seção por `FamilyGroup`
- Cada seção lista as etapas em ordem, mostrando nome do `GenericStep` + `optionType`

**`StandardChecklistFormPanel.tsx` (inPage):**
- Header com X (fechar)
- Form com:
  - Linha 1: select de Work Center (busca client-side) — desabilitado em modo edição
  - Linha 2: select de Tipo de Serviço — após selecionar, dispara fetch ao endpoint auxiliar para carregar famílias+modelos
  - Aviso quando `(workCenter, serviceType)` já existir (consulta a listagem)
  - Lista de seções `FamilyGroupSection` ordenáveis (drag-and-drop), uma por combinação `(família, modelo)` detectada
  - Para combinações **sem bens** mas que estavam no checklist (modo edição): exibe badge "Sem bens vinculados" + opção remover
  - Para combinações novas detectadas no WC mas não mapeadas ainda: exibe botão "Adicionar seção"
- Footer fixo: Cancelar | Salvar Alterações

**`FamilyGroupSection.tsx`:**
- Cabeçalho colapsável (padrão `ModalSection`): nome da família + modelo + handle de drag-and-drop
- Body: lista de `StandardChecklistStep` ordenáveis com nome do `GenericStep`
- Botão "Adicionar etapa" abre `GenericStepPicker`
- Botão remover seção (com confirmação simples)

**`GenericStepPicker.tsx`:**
- Multi-select com busca sobre `GenericStep` (consome `/api/basic-registrations/generic-steps`)
- Filtro client-side; já oculta etapas já incluídas na seção
- Botão "Adicionar selecionadas (N)"

### 7.4 Hook `useStandardChecklists()` opcional

Para encapsular React Query (`['standard-checklists']`), com mutations de create/update/delete/archive e refetch automático.

---

## 8. Permissões

### 8.1 `src/lib/permissions.ts`

Adicionar entrada `standard-checklists` em cada papel:

| Papel | view | create | edit | delete |
|---|:---:|:---:|:---:|:---:|
| SUPER_ADMIN | ✅ | ✅ | ✅ | ✅ |
| ADMIN | ✅ | ✅ | ✅ | ✅ |
| PLANEJADOR | ✅ | ✅ | ✅ | ✅ |
| MANUTENTOR | ❌ | ❌ | ❌ | ❌ |

Adicionar mapping em `API_MODULE_MAP`:
```ts
'standard-checklists': 'standard-checklists',
```

---

## 9. Documentação a sincronizar

### 9.1 `docs/spec.md`
Nova seção funcional "Check List Padrão" descrevendo:
- Propósito (inspeção rotineira por WC)
- Estrutura (parent + family groups + steps)
- Auto-detecção e notificação de bem novo
- Permissões
- Pendência de fase 2 (emissão por data)

### 9.2 `.claude/rules/components.md`
- Adicionar à tabela "Mapa de Telas e Modais": `/maintenance-plan/standard-checklists | Check List Padrão | Listagem split-panel | StandardChecklistDetailPanel, StandardChecklistFormPanel(inPage), GenericStepPicker | ConfirmDialog | CMMS`
- Seção curta sobre o padrão de "auto-detecção via endpoint auxiliar" para futuros desenvolvedores

### 9.3 `.claude/rules/api.md`
- Nova seção "Check List Padrão" descrevendo as 6 rotas + o endpoint auxiliar de family-models + o helper de notificação
- Documentar a regra "name auto-gerado", a unicidade `(workCenter, serviceType)` e a Opção C de exclusão
- Corrigir lista de papéis canônicos antiga (TECHNICIAN, LIMITED_TECHNICIAN, REQUESTER, VIEW_ONLY) → real (`SUPER_ADMIN`, `ADMIN`, `PLANEJADOR`, `MANUTENTOR`)

### 9.4 `.claude/rules/database.md`
- Documentar os 3 novos models e invariantes
- Idem correção dos papéis canônicos
- Atualizar a regra de "User.companyId NULL apenas para SUPER_ADMIN"

### 9.5 `CLAUDE.md`
- Incluir "Check List Padrão" em "Features do CMMS"
- Atualizar "Roles canonicos de produto" para os 4 reais
- Atualizar a frase sobre `ADMIN`/`SUPER_ADMIN` para refletir 4 papéis

---

## 10. Validações finais

- `npx prisma generate` — gerar client com novos models
- `npm run lint` — passar sem warnings novos
- `npm run build` — build de produção sem erros (incluindo `prisma generate`)
- Não rodar Playwright nesta fase (sem mudança em auth/permissões críticas além da matriz de módulo); deixar a validação visual/manual a cargo do usuário

---

## 11. Sequência de execução

1. ✏️ Escrever este plano em `scripts/PLANO_CHECKLIST_PADRAO.md` ✅
2. 🛠️ Atualizar `prisma/schema.prisma` com os 3 novos models + relações inversas
3. 🛠️ Criar pasta `prisma/migrations/20260424180000_add_standard_checklists/migration.sql` com DDL + module seed
4. 🛠️ Atualizar `prisma/seed.ts` com novo módulo
5. 🛠️ Criar `src/app/api/maintenance-plans/standard-checklists/route.ts` (GET, POST)
6. 🛠️ Criar `src/app/api/maintenance-plans/standard-checklists/[id]/route.ts` (GET, PUT, DELETE)
7. 🛠️ Criar `src/app/api/maintenance-plans/standard-checklists/[id]/archive/route.ts` (PUT)
8. 🛠️ Criar `src/app/api/work-centers/[id]/family-models/route.ts` (GET)
9. 🛠️ Criar `src/lib/standard-checklists/notifyMissingFamilyModel.ts`
10. 🛠️ Integrar helper em `src/app/api/assets/route.ts` (POST) e `src/app/api/assets/[id]/route.ts` (PUT)
11. 🛠️ Atualizar `src/lib/permissions.ts` com módulo + mapping
12. 🛠️ Atualizar `src/components/layout/Sidebar.tsx` com novo subitem
13. 🛠️ Criar componentes em `src/components/standard-checklists/`
14. 🛠️ Criar `src/app/maintenance-plan/standard-checklists/page.tsx`
15. 📝 Sincronizar docs (spec, components.md, api.md, database.md, CLAUDE.md)
16. ✅ Rodar `prisma generate`, `lint`, `build`

---

## 12. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Bem sem `familyId`/`familyModelId` quebrar auto-detecção | Endpoint auxiliar filtra `IS NOT NULL` em ambos; helper de notificação retorna silenciosamente quando faltam |
| Helper de notificação falhar e bloquear criação de Asset | Wrap em try/catch silencioso; nunca propaga erro para o handler |
| Combinação `(WC, ServiceType)` duplicada em criação concorrente | Index único no banco + retorno 409 antes de inserir |
| Step órfão se `GenericStep` for excluído | FK `genericStepId` sem cascade — exclusão de GenericStep deve ser bloqueada (já é o padrão atual via FK) |
| Performance da auto-detecção em WC com muitos bens | Query agrupada (`COUNT`) em SQL puro; limite implícito por unidade |
| Drag-and-drop quebrar em mobile | Fallback para input numérico de `order` em phone (`isPhone`) |

---

## 13. Fora do escopo desta fase

- Emissão periódica de checklists individuais (ChecklistInstance) → fase 2
- Execução do checklist pelo manutentor (UI de execução) → fase 2
- Histórico de checklists executados → fase 2
- Exportação Excel/PDF → não solicitado nesta fase
- Vinculação por bem individual (override) → fase 2 lê do padrão pela combinação (família, modelo) do bem

---

## 14. Critérios de aceite

- [ ] Migration aplicada limpa em ambiente local
- [ ] Módulo `standard-checklists` aparece em `Module` + `CompanyModule` para todas as empresas
- [ ] Sidebar exibe "Check List Padrão" para SUPER_ADMIN, ADMIN, PLANEJADOR; oculta para MANUTENTOR
- [ ] Criar checklist via UI e ver entrada na listagem
- [ ] Editar checklist e re-salvar mantém steps na ordem correta
- [ ] Tentar criar duplicata `(WC, ServiceType)` retorna erro 409
- [ ] Excluir checklist sem refs históricas faz hard-delete
- [ ] `npm run build` passa sem erros
- [ ] Docs `.md` atualizadas e papéis canônicos corrigidos
