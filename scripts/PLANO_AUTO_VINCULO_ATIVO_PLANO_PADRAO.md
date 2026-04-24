# Plano de Ação — Auto-vínculo entre Ativos e Planos de Manutenção Padrão

**Data:** 2026-04-24
**Autor:** Felipe / Claude Code (alinhamento iterativo)
**Escopo:** CMMS — vínculo automático bidirecional entre `Asset` e `StandardMaintenancePlan`, mais propagação de alterações do plano padrão para os planos individuais.

---

## 1. Objetivos

1. **Situação 1** — Ao cadastrar ou editar um `Bem/Ativo`, se houver Planos Padrão compatíveis com sua família (+ tipo modelo), oferecer incorporação multi-seleção via diálogo.
2. **Situação 2** — Ao cadastrar ou editar um `Plano Padrão`, se houver Bens compatíveis (mesma família + tipo modelo), oferecer vínculo multi-seleção via diálogo.
3. **Propagação** — Ao editar um Plano Padrão já vinculado a Ativos, oferecer replicar a alteração para os Ativos vinculados sem customizações individuais, listando em alerta os que têm customização.
4. **Override & Revert** — Permitir edição individual do plano por ativo em `/maintenance-plan/asset`, marcando-o como "desacoplado"; oferecer botão "Reverter ao padrão" para desfazer a customização.
5. **Duplicidade** — Impedir criação de dois planos com mesmo serviço + periodicidade + trackingType no mesmo ativo.

---

## 2. Glossário canônico

| Termo | Entidade/Campo | Observação |
|---|---|---|
| Família | `AssetFamily` — `familyId` em Asset/Plano Padrão | Obrigatório em ambos |
| Tipo Modelo | `AssetFamilyModel` — `familyModelId` | Opcional; `NULL` no padrão casa com qualquer modelo da família |
| Plano Padrão | `StandardMaintenancePlan` | Definido por `(familyId, familyModelId, serviceTypeId)` com `sequence` único |
| Plano por Ativo | `AssetMaintenancePlan` | Instância por ativo, pode referenciar `standardPlanId` |
| Override / Detached | `hasLocalOverrides = true` | Plano do ativo foi customizado, não recebe propagação |
| Duplicata | `(assetId, serviceTypeId, maintenanceTime, timeUnit, trackingType)` | Chave funcional; `sequence` não conta |

---

## 3. Decisões consolidadas (referência rápida)

| Tema | Decisão final |
|---|---|
| Match família+modelo | Plano com `familyModelId = NULL` casa com qualquer tipo modelo da família |
| Trigger em edição | Só mostra diálogo se houver ao menos 1 compatível, não-vinculado, não-duplicado |
| Cópia vs referência | Copia tasks/steps **e** mantém `standardPlanId` vivo; override desacopla |
| Chave de duplicata | `serviceTypeId + maintenanceTime + timeUnit + trackingType` |
| Override trigger | Qualquer PUT em `AssetMaintenancePlan`/`AssetMaintenanceTask`/steps, **exceto** `lastMaintenanceDate`, `isActive`, `considerPlanning`, `calendarId`, `maintenanceAreaId` |
| Tipos de edição do Padrão que disparam propagação | **Todas** (nome, descrição, tasks, steps, periodicidade, trackingType, toleranceDays) |
| Dirty check | Server compara payload com estado atual; se não houve mudança estrutural de fato, não abre diálogo |
| Exclusão de Padrão com vínculos | Permitir com confirmação explícita (mostra quantos ativos perdem o vínculo; planos viram custom órfãos) |
| Troca de família/modelo do Padrão com vínculos | **Bloquear** — pede remover vínculos antes |
| Troca de família/modelo do Bem com vínculos | Não bloquear; planos existentes permanecem intactos |
| Reverter ao padrão | Aplica estado **atual** do padrão; zera `hasLocalOverrides`; warning explícito no modal |
| OSs já geradas | Não são alteradas pela propagação; só OSs futuras refletem o novo conteúdo |

---

## 4. Mudanças de schema

### 4.1 Nova migration: `add_local_overrides_to_asset_maintenance_plan`

Adicionar 3 colunas em `AssetMaintenancePlan`:

```prisma
model AssetMaintenancePlan {
  // ... campos existentes
  hasLocalOverrides  Boolean   @default(false)
  detachedAt         DateTime?
  detachedById       String?
  detachedBy         User?     @relation("AssetMaintenancePlanDetacher", fields: [detachedById], references: [id])

  // ... relacionamentos existentes
}
```

**FK behavior**: `detachedById` → `User.id` com `ON DELETE SET NULL` (usuário pode ser arquivado sem perder o registro).

**Backfill**: Nenhum. Todos os registros existentes entram como `hasLocalOverrides = false` — assumimos que planos pré-existentes estão sincronizados com o padrão (se houver) ou são custom puros (sem `standardPlanId`).

**Índice**: `@@index([hasLocalOverrides])` para filtrar rapidamente a lista de propagação.

### 4.2 Arquivos

- `prisma/schema.prisma` — adicionar campos + relação inversa no `User` (`detachedAssetPlans AssetMaintenancePlan[] @relation("AssetMaintenancePlanDetacher")`).
- `prisma/migrations/<timestamp>_add_local_overrides_to_asset_maintenance_plan/migration.sql` — gerado via `npx prisma migrate dev --name add_local_overrides_to_asset_maintenance_plan`.

### 4.3 Rollback da migration
`DROP` das 3 colunas + FK. Sem impacto em dados pré-existentes.

---

## 5. Arquitetura do código

### 5.1 Helper central: `src/lib/maintenance-plans/standardSync.ts`

Fonte única da lógica compartilhada pelos 3 fluxos. Funções exportadas:

| Função | Responsabilidade |
|---|---|
| `findCompatibleStandardPlansForAsset(assetId)` | Retorna Planos Padrão compatíveis com a família+modelo do ativo, já filtrando vínculos e duplicatas |
| `findCompatibleAssetsForStandardPlan(standardPlanId)` | Retorna Ativos compatíveis com a família+modelo do plano, já filtrando vínculos e duplicatas |
| `isDuplicatePlan(assetId, serviceTypeId, maintenanceTime, timeUnit, trackingType)` | Regra única de duplicata |
| `applyStandardToAsset(standardPlanId, assetId, actor)` | Cria `AssetMaintenancePlan` copiando tasks/steps/resources; valida duplicata; popula `standardPlanId`, `isStandard`, `standardSequence` |
| `markAsOverridden(assetPlanId, userId)` | Seta `hasLocalOverrides=true`, `detachedAt=now()`, `detachedById=userId` |
| `revertToStandard(assetPlanId, actor)` | Sobrescreve plano individual com estado atual do padrão; zera override; exige `standardPlanId != null` |
| `propagateStandardChanges(standardPlanId, assetPlanIds, actor)` | Replica estado atual do padrão nos `AssetMaintenancePlan` selecionados (só aceita os com `hasLocalOverrides=false`) |
| `countLinkedAssets(standardPlanId)` | Usado em confirmação de exclusão e habilitação do botão "Propagar" |

**Invariantes garantidas pelo helper:**
- Todo `applyStandardToAsset` faz revalidação de duplicata (defesa em profundidade mesmo com filtro na UI).
- `propagateStandardChanges` rejeita `assetPlanIds` que tenham virado override durante o diálogo (retorna `409` com lista de conflitos).
- Campos operacionais preservados em propagação/revert: `lastMaintenanceDate`, `isActive`, `considerPlanning`, `calendarId`, `maintenanceAreaId`.

### 5.2 APIs novas

| Método | Rota | Consumo |
|---|---|---|
| GET | `/api/maintenance-plans/standard/by-family?familyId=&familyModelId=&assetId=` | Situação 1 — dialog |
| GET | `/api/assets/by-family?familyId=&familyModelId=&standardPlanId=` | Situação 2 — dialog |
| POST | `/api/maintenance-plans/asset/batch-link` | Situação 1 — cria vínculos em lote |
| POST | `/api/maintenance-plans/standard/[id]/apply-to-assets` | Situação 2 — cria vínculos em lote |
| POST | `/api/maintenance-plans/standard/[id]/propagate-changes` | Propagação após edit |
| POST | `/api/maintenance-plans/asset/[id]/revert-to-standard` | Revert na tela `/maintenance-plan/asset` |
| GET | `/api/maintenance-plans/standard/[id]/linked-assets` | Usado pelo botão "Propagar aos ativos vinculados" e pela confirmação de exclusão |

Todas aplicam:
- `requireCompanyScope(session)` para falhar cedo quando `companyId` ausente.
- `checkApiPermission(session, 'maintenance-plans', '<verb>')` — matriz existente.
- `normalizeTextPayload` em bodies, exceto campos preservados.
- Retorno padrão `{ data: ... }` em sucesso, `{ error }` em falha.

### 5.3 Componentes novos

| Componente | Arquivo | Uso |
|---|---|---|
| `StandardPlansIncorporationDialog` | `src/components/assets/StandardPlansIncorporationDialog.tsx` | Situação 1 |
| `AssetLinkingDialog` | `src/components/standard-plans/AssetLinkingDialog.tsx` | Situação 2 |
| `StandardPlanPropagationDialog` | `src/components/standard-plans/StandardPlanPropagationDialog.tsx` | Propagação |
| `RevertToStandardButton` | `src/components/maintenance-plans/RevertToStandardButton.tsx` | Tela `/maintenance-plan/asset` |

Convenções (seguindo `.claude/rules/components.md`):
- Usar `<Modal>` overlay (`size="lg"` ou `xl`) em vez de div manual.
- `ModalSection` para cada bloco interno (lista, alerta, ações).
- Inputs com `preserveCase` onde fizer sentido (busca, por exemplo).
- Responsividade: cards no mobile (< 768px), tabela no desktop.
- Botão primário `<Button>` em laranja-accent; destrutivos em `bg-danger`.

### 5.4 Alterações em componentes existentes

| Arquivo | Motivo |
|---|---|
| `src/components/assets/AssetCreatePanel.tsx` | Disparar `StandardPlansIncorporationDialog` pós-save (Situação 1 — create) |
| `src/components/assets/AssetEditPanel.tsx` | Disparar `StandardPlansIncorporationDialog` ao abrir (Situação 1 — edit) |
| `src/components/standard-plans/StandardPlanFormPanel.tsx` | Disparar `AssetLinkingDialog` pós-save (Situação 2) e `StandardPlanPropagationDialog` em edits |
| `src/app/maintenance-plan/asset/page.tsx` + seus panels | Marcar override em qualquer edição estrutural; adicionar botão "Reverter ao padrão" |
| `src/app/maintenance-plan/standard/page.tsx` | Adicionar botão "Propagar aos ativos vinculados" no painel de detalhe |
| `src/app/api/maintenance-plans/asset/[id]/route.ts` (PUT) | Chamar `markAsOverridden` quando payload toca campos estruturais |
| `src/app/api/maintenance-plans/standard/[id]/route.ts` (PUT) | Dirty check e sinalizar à UI se deve abrir diálogo de propagação |
| `src/app/api/maintenance-plans/standard/[id]/route.ts` (DELETE) | Confirmação explícita com contagem de vinculados; zera `standardPlanId` nos ativos |
| `src/app/api/maintenance-plans/standard/[id]/route.ts` (PUT — família/modelo) | Bloquear troca se houver vínculos |

---

## 6. Fases de implementação

> **Princípio**: cada fase entregável e testável isoladamente. Build e lint devem passar ao final de cada fase.

### Fase 1 — Infraestrutura (schema + helper + APIs GET)

**Entrega**: Base para todas as demais fases. Nenhuma mudança visível ao usuário.

**Passos:**
1. Editar `prisma/schema.prisma` com os 3 novos campos em `AssetMaintenancePlan` + relação inversa no `User`.
2. Rodar `npx prisma migrate dev --name add_local_overrides_to_asset_maintenance_plan`.
3. Rodar `npm run db:generate` para atualizar o client.
4. Criar `src/lib/maintenance-plans/standardSync.ts` com todas as funções listadas em §5.1 (inicialmente stubs + `findCompatible*` e `isDuplicatePlan` completos).
5. Criar `GET /api/maintenance-plans/standard/by-family` usando `findCompatibleStandardPlansForAsset`.
6. Criar `GET /api/assets/by-family` usando `findCompatibleAssetsForStandardPlan`.
7. Criar `GET /api/maintenance-plans/standard/[id]/linked-assets`.

**Validações:**
- `npm run lint`
- `npm run build` (inclui `prisma generate`)
- Smoke test manual via `curl`/Postman em cada endpoint novo com tenant real.

**Riscos:**
- Migration em produção: planejar janela de deploy (adicionar colunas com `DEFAULT` é não-bloqueante).
- Query de compatibilidade em bancos grandes: garantir índice em `familyId` e `familyModelId` (já existem no schema atual).

**Critério de aceite:**
- Os 3 endpoints retornam corretamente plano/ativo compatível em tenant de teste.
- Teste manual com `familyModelId = NULL` no padrão: casa com qualquer modelo da família.
- Teste manual com duplicata pré-existente: endpoint exclui o plano duplicado da lista.

---

### Fase 2 — Situação 1 (diálogo no fluxo do Bem)

**Entrega**: ao criar ou editar um Bem com família definida, diálogo pergunta sobre incorporação de Planos Padrão compatíveis.

**Passos:**
1. Criar `POST /api/maintenance-plans/asset/batch-link` usando `applyStandardToAsset` do helper.
2. Criar componente `StandardPlansIncorporationDialog`:
   - Props: `assetId`, `compatiblePlans[]`, `isOpen`, `onClose`, `onConfirm(selectedIds)`.
   - Mensagem: *"Existem manutenções padrão cadastradas para esta família e tipo modelo. Deseja incorporar a este bem?"*.
   - Lista expansível por plano mostrando: tipo de serviço, nome, periodicidade, tasks (com steps/recursos em sub-expand).
   - Checkbox "Selecionar todas" + checkbox por linha.
   - Botões: "Incorporar selecionados" (primary) / "Pular" (outline).
3. Integrar em `AssetCreatePanel.tsx`:
   - Após `POST /api/assets` bem-sucedido, chamar `GET /api/maintenance-plans/standard/by-family?familyId=X&familyModelId=Y&assetId=Z`.
   - Se retorno tiver `data.length > 0`, abrir diálogo.
   - Confirmação → `POST /api/maintenance-plans/asset/batch-link` com `assetId` + `standardPlanIds`.
4. Integrar em `AssetEditPanel.tsx`:
   - Ao abrir painel, fetch silencioso dos compatíveis.
   - Se existir, mostrar banner discreto no topo do painel ("Há N planos padrão compatíveis disponíveis para incorporar") com botão "Ver".
   - Botão dispara o mesmo diálogo.

**Validações:**
- `npm run lint`, `npm run build`.
- `npm run test` com cenário Playwright novo: criar bem com família que tem 2 planos padrão → diálogo aparece → selecionar 1 → verificar `AssetMaintenancePlan` criado com `isStandard=true`, `standardPlanId` correto.
- Criar bem sem família → diálogo **não** aparece.
- Editar bem que já tem os 2 planos vinculados → diálogo **não** aparece (filtro de duplicata).
- Responsividade: mobile, tablet, desktop.

**Riscos:**
- Tempo de abertura do painel de edit: se o fetch for lento, degradar para lazy (botão que só pergunta quando clicado).
- Edição de bem que muda `familyId` no meio do painel: ao salvar, refetch dos compatíveis é automático.

**Critério de aceite:**
- Diálogo nunca aparece vazio.
- Incorporação cria plano correto com todas as tasks/steps copiadas.
- Duplicatas nunca aparecem na lista.

---

### Fase 3 — Situação 2 (diálogo no fluxo do Plano Padrão)

**Entrega**: ao criar ou editar um Plano Padrão, diálogo pergunta sobre vínculo com Bens compatíveis.

**Passos:**
1. Criar `POST /api/maintenance-plans/standard/[id]/apply-to-assets` usando `applyStandardToAsset` em loop (transacional).
2. Criar componente `AssetLinkingDialog`:
   - Props: `standardPlanId`, `compatibleAssets[]`, `isOpen`, `onClose`, `onConfirm(selectedIds)`.
   - Mensagem: *"Existem bens cadastrados para esta família e tipo modelo. Deseja incorporar esta manutenção padrão aos bens cadastrados?"*.
   - Lista expansível por ativo: código (`tag`/`protheusCode`), nome, com expand para localização, área, status.
   - Checkbox "Selecionar todos" + por linha.
   - Botões: "Vincular selecionados" / "Pular".
3. Integrar em `StandardPlanFormPanel.tsx`:
   - Após `POST /api/maintenance-plans/standard` bem-sucedido, chamar `GET /api/assets/by-family?...&standardPlanId=X`.
   - Se retorno tiver `data.length > 0`, abrir diálogo.
4. Integrar em edição:
   - Mesmo comportamento da Situação 1 — ao abrir o panel, fetch silencioso; banner "Há N bens compatíveis" se houver; botão abre diálogo.

**Validações:**
- Lint, build, testes Playwright novos.
- Criar plano para família com 3 bens cadastrados → diálogo aparece → selecionar 2 → verificar 2 `AssetMaintenancePlan` criados.
- Criar plano para família sem bens → diálogo não aparece.
- Editar plano já vinculado a todos os bens → diálogo não aparece.

**Riscos:**
- Famílias com muitos bens (> 100): adicionar paginação/busca no diálogo.
- Criar plano em lote: transação garante all-or-nothing em caso de falha parcial.

**Critério de aceite:**
- Vínculos em lote criam `AssetMaintenancePlan` corretos para cada ativo selecionado.
- Filtros de duplicidade funcionam (bem que já tem plano com mesmo serviço+periodicidade não aparece).

---

### Fase 4 — Override tracking + Revert

**Entrega**: tela `/maintenance-plan/asset` rastreia edições individuais e permite reverter.

**Passos:**
1. Alterar `PUT /api/maintenance-plans/asset/[id]`:
   - Comparar payload com estado atual.
   - Se algum campo estrutural mudou (lista em §3), chamar `markAsOverridden(id, session.userId)`.
   - Campos operacionais (`lastMaintenanceDate`, `isActive`, `considerPlanning`, `calendarId`, `maintenanceAreaId`) não disparam override.
2. Alterar `PUT /api/maintenance-plans/asset-tasks/[id]` (e endpoints de steps/recursos associados) — qualquer edição dispara override.
3. Criar `POST /api/maintenance-plans/asset/[id]/revert-to-standard`:
   - Valida `standardPlanId != null` (404 se órfão).
   - Chama `revertToStandard`.
   - Retorna plano atualizado.
4. Criar componente `RevertToStandardButton`:
   - Aparece **só** quando `hasLocalOverrides=true` **e** `standardPlanId != null`.
   - Confirmação com texto explícito: *"A versão atual do Plano Padrão será aplicada. Suas alterações individuais serão perdidas. Deseja continuar?"*.
5. Integrar botão em `AssetPlanDetailPanel` da tela `/maintenance-plan/asset`.
6. Mostrar badge `"Customizado"` na listagem quando `hasLocalOverrides=true`.

**Validações:**
- Lint, build.
- Teste manual:
  - Editar periodicidade de um plano individual → verificar `hasLocalOverrides=true` no banco e badge na UI.
  - Clicar "Reverter ao padrão" → confirmar → verificar que plano volta ao estado do padrão e override zera.
  - Editar `lastMaintenanceDate` (campo operacional) → verificar que override **não** é setado.

**Riscos:**
- Usuários podem estranhar o badge. Incluir tooltip explicando.
- Revert remove customizações sem backup: garantir mensagem clara no confirm.

**Critério de aceite:**
- Badge aparece corretamente.
- Revert restaura fielmente o estado atual do padrão.
- Campos operacionais não disparam override.

---

### Fase 5 — Propagação de alterações

**Entrega**: ao editar Plano Padrão, diálogo oferece replicar para ativos vinculados.

**Passos:**
1. Criar `POST /api/maintenance-plans/standard/[id]/propagate-changes`:
   - Body: `{ assetMaintenancePlanIds: string[] }`.
   - Usa `propagateStandardChanges` do helper.
   - Rejeita ids que viraram override durante o diálogo (409 com lista).
2. Alterar `PUT /api/maintenance-plans/standard/[id]`:
   - Dirty check: comparar payload com estado atual.
   - Response adiciona `{ data: { ..., propagation: { eligible: number, detached: number, hasChanges: boolean } } }`.
   - Se `hasChanges=false`, UI não abre diálogo.
3. Criar componente `StandardPlanPropagationDialog`:
   - Props: `standardPlanId`, `eligibleAssets[]`, `detachedAssets[]`, `isOpen`, `onClose`, `onConfirm(selectedIds)`.
   - Título: *"Deseja aplicar estas alterações aos ativos vinculados?"*.
   - Seção 1 — seleção (ativos elegíveis): checkboxes, "Selecionar todos", lista com código + nome.
   - Seção 2 — alerta (ativos com override): readonly, sem checkbox, mostra `detachedBy.firstName`/`detachedAt`, com label *"Não receberão a atualização (editados individualmente)"*.
   - Se seção 1 vazia, mostrar só seção 2 com aviso; botão "Entendi" fecha.
   - Se ambas vazias, diálogo não abre.
4. Integrar em `StandardPlanFormPanel.tsx` após `PUT` bem-sucedido:
   - Se `response.data.propagation.hasChanges && eligible + detached > 0`, buscar `GET /api/maintenance-plans/standard/[id]/linked-assets` e abrir diálogo.
5. Adicionar botão "Propagar aos ativos vinculados" no painel de detalhe (`/maintenance-plan/standard`):
   - Sempre visível se `linkedAssetsCount > 0`.
   - Dispara o mesmo diálogo manualmente.
6. Bloquear troca de `familyId`/`familyModelId` no plano padrão se `linkedAssetsCount > 0` — mensagem: *"Remova os vínculos com ativos antes de alterar família ou tipo modelo."*.
7. Alterar `DELETE /api/maintenance-plans/standard/[id]`:
   - Se `linkedAssetsCount > 0`, retorna `409` com contagem se não vier `?confirmed=true`.
   - Se `?confirmed=true`, executa: zera `standardPlanId` nos `AssetMaintenancePlan` vinculados (viram custom/órfãos), então deleta o padrão.
   - UI: modal de confirmação duplo mostrando quantos ativos perdem o vínculo.

**Validações:**
- Lint, build, Playwright.
- Teste manual:
  - Editar nome do padrão → diálogo aparece (qualquer edição dispara).
  - Editar e não mudar nada → diálogo não aparece (dirty check).
  - Propagar para 2 de 3 ativos; verificar que os 2 refletem o padrão e o 3º permanece.
  - Com 1 ativo override → aparece só na seção de alerta.
  - Excluir padrão com 2 vínculos → modal pede confirmação → confirma → 2 ativos viram órfãos (`standardPlanId=null`) e padrão é deletado.
  - Tentar trocar familyId com vínculos → erro 409 bloqueando.

**Riscos:**
- Propagação em lote de padrão com muitos vínculos: transação pode demorar. Considerar processamento em batch de 50 com progresso.
- Conflito race condition: ativo vira override no meio do diálogo. Helper já rejeita com 409.

**Critério de aceite:**
- Diálogo funciona nos 3 cenários (elegíveis, detached, mistura).
- Botão "Propagar" está sempre acessível para re-disparo.
- Exclusão com vínculos tem confirmação explícita.
- Troca de família bloqueia corretamente.

---

## 7. Documentação a atualizar

Obrigatório ao final de cada fase ou como PR único no fechamento:

| Arquivo | O que atualizar |
|---|---|
| `docs/SPEC.md` | Seção "Gestão de Ativos" e "Planos de Manutenção" — descrever os 3 fluxos, override, revert |
| `.claude/rules/api.md` | Adicionar seção "Auto-vínculo e Propagação" detalhando cada endpoint novo |
| `.claude/rules/components.md` | Adicionar os 3 diálogos ao mapa de modais e documentar padrão de lista expansível com tasks/steps |
| `.claude/rules/database.md` | Documentar campos novos em `AssetMaintenancePlan` e chave de duplicata |
| `CLAUDE.md` | Nenhuma mudança esperada (é geral demais) |
| `docs/DEPRECATIONS.md` | Nenhuma entrada esperada (nada sendo deprecado) |

---

## 8. Estratégia de testes

### 8.1 Testes E2E (Playwright)

Criar em `tests/maintenance-plans/`:
- `asset-incorporates-standard.spec.ts` — Situação 1 completa.
- `standard-links-assets.spec.ts` — Situação 2 completa.
- `override-and-revert.spec.ts` — Fase 4.
- `standard-propagation.spec.ts` — Fase 5.
- `duplicate-prevention.spec.ts` — regra de duplicata em ambos os fluxos.

### 8.2 Testes de regressão manual

Perfis a testar: `SUPER_ADMIN`, `ADMIN`, `TECHNICIAN` (para validar permissões).

Checklist:
- [ ] Criar bem sem família → nenhum diálogo.
- [ ] Criar bem com família sem planos padrão → nenhum diálogo.
- [ ] Criar bem com família que tem planos → diálogo aparece corretamente.
- [ ] Editar bem com planos novos disponíveis → banner + diálogo.
- [ ] Criar plano padrão para família sem bens → nenhum diálogo.
- [ ] Criar plano padrão para família com bens → diálogo.
- [ ] Editar periodicidade do plano individual → override set, badge aparece.
- [ ] Clicar "Reverter ao padrão" → plano volta, badge some.
- [ ] Editar nome do plano padrão com vínculos → diálogo de propagação.
- [ ] Editar sem mudanças → nenhum diálogo.
- [ ] Excluir plano padrão com vínculos → confirmação + ativos viram órfãos.

### 8.3 Smoke test de permissões
- `VIEW_ONLY` e `REQUESTER` não devem ver botões de incorporação, vínculo, propagação ou revert.
- `TECHNICIAN` pode ver e interagir (depende da matriz atual de `maintenance-plans`).

---

## 9. Estratégia de rollback

| Fase | Rollback |
|---|---|
| 1 | Reverter migration (drop colunas) + deletar helper + deletar APIs GET. Sem impacto em dados. |
| 2 | Remover integração em `AssetCreatePanel`/`AssetEditPanel`; API POST batch-link fica ociosa. |
| 3 | Remover integração em `StandardPlanFormPanel`; API POST apply-to-assets fica ociosa. |
| 4 | Remover chamadas a `markAsOverridden`; campos `hasLocalOverrides` etc. ficam com `false` em todos os registros (sem impacto). |
| 5 | Remover diálogo + botão "Propagar"; remover dirty-check do PUT. Registros já propagados permanecem (cópia é idempotente). |

**Regra geral**: cada fase é rolloutável e revertível sem perder dados. Migration só é irreversível se tasks já foram copiadas com `standardPlanId` populado — mas mesmo isso não quebra: os planos continuam funcionando sem o padrão.

---

## 10. Fora do escopo

Decisões adiadas que **não** entram neste plano:

- Versionamento de Plano Padrão (histórico de versões aplicadas). Hoje propagamos sempre o estado atual.
- Propagação seletiva de campos (ex: só mudar periodicidade sem tocar tasks). Hoje é all-or-nothing.
- Notificação proativa ao usuário quando um novo plano padrão compatível é cadastrado enquanto ele tem ativo já criado. Hoje o gatilho é manual (abrir o panel).
- Auditoria granular de propagações em tabela dedicada (`PropagationLog`). Hoje o `updatedAt` + logs de erro são a evidência.
- Permitir override parcial (ex: só o campo X é local, o resto continua sincronizando). Binary flag é a decisão.
- Re-sync automático periódico. Sempre manual.
- Importação de planos padrão via Excel vinculando a múltiplos ativos em uma tacada.

---

## 11. Ordem sugerida de commits

Cada fase = 1 commit (ou PR) separado:

1. `feat: schema + helper + api gets para auto-vinculo de planos padrao` (Fase 1)
2. `feat: dialogo de incorporacao de planos padrao no cadastro de bem` (Fase 2)
3. `feat: dialogo de vinculo de bens no cadastro de plano padrao` (Fase 3)
4. `feat: override tracking e revert na tela maintenance-plan/asset` (Fase 4)
5. `feat: propagacao de alteracoes do plano padrao aos ativos vinculados` (Fase 5)
6. `docs: atualiza SPEC e rules para fluxos de auto-vinculo` (documentação, se não feito dentro de cada fase)

Cada commit deve passar em `npm run lint` e `npm run build` isoladamente.

---

## 12. Checklist de prontidão para iniciar

Antes de abrir o primeiro commit da Fase 1:

- [ ] Plano lido e aprovado pelo usuário.
- [ ] Branch criada (sugestão: `feature/auto-vinculo-ativo-plano-padrao`).
- [ ] Banco local sincronizado com `main` (sem migrations pendentes).
- [ ] Tenant de teste com pelo menos: 2 famílias, 3 tipos modelo, 5 bens, 3 planos padrão, em configurações variadas.
- [ ] Playwright configurado localmente.

---

## 13. Estimativa de esforço

| Fase | Complexidade | Estimativa |
|---|---|---|
| 1 | Média | 1-1.5 dia |
| 2 | Média | 1.5-2 dias |
| 3 | Média | 1.5-2 dias |
| 4 | Média-alta | 2 dias |
| 5 | Alta | 2-3 dias |
| **Total** | | **~8-10 dias** de trabalho focado |

---

**Fim do plano.**
