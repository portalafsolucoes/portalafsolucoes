# Codigo Deprecado

Registro de arquivos e componentes substituidos que aguardam remocao.
Antes de remover, verificar que nenhum import ou referencia depende do item.

| Arquivo | Motivo | Substituto | Deprecado em | Condicao para remocao |
|---------|--------|------------|--------------|----------------------|
| `src/components/basic-registrations/CrudTable.tsx` | Substituido pelo split-panel (GenericCrudTable + GenericEditPanel + GenericDetailPanel) | `GenericCrudTable.tsx`, `GenericEditPanel.tsx`, `GenericDetailPanel.tsx` | 2026-04-10 | Nenhum import restante no projeto |
| `src/app/requests/approvals/page.tsx` — padrao overlay exclusivo | `showModal + handleOpenModal` substituidos por split-panel com `selectedRequest + hasSidePanel`; botoes de acao removidos das linhas da tabela | `ApprovalModal` com `inPage=true` no painel direito; modal overlay mantido apenas no mobile | 2026-04-10 | Padrao ja migrado; entrada pode ser removida apos validacao em producao |

## Sessão de padronização split-panel — 2026-04-10

### /work-orders
- **Arquivo**: `src/app/work-orders/page.tsx`
- **Motivo**: Remoção de coluna de ações inline da tabela e dos cards de grid
- **Substituto**: Ações disponíveis exclusivamente no painel de detalhe direito (`WorkOrderDetailModal inPage`)
- **Data**: 2026-04-10
- **Condição para remoção**: Após validação visual com todos os perfis

### /requests
- **Arquivo**: `src/app/requests/page.tsx`, `src/components/requests/RequestDetailModal.tsx`
- **Motivo**: Migração para split-panel; `RequestDetailModal` inPage body reescrito
- **Substituto**: Layout split-panel com `inPage=true`; overlay mantido para mobile
- **Data**: 2026-04-10
- **Condição para remoção**: Após validação E2E

### /requests/approvals
- **Arquivo**: `src/app/requests/approvals/page.tsx`, `src/components/approvals/ApprovalModal.tsx`
- **Motivo**: Já estava migrado — verificado e confirmado
- **Data**: 2026-04-10

### /maintenance-plan/standard + /maintenance-plan/asset
- **Arquivo**: `src/app/maintenance-plan/standard/page.tsx`, `src/app/maintenance-plan/asset/page.tsx`
- **Motivo**: Reescritos para split-panel; formulários inline removidos das páginas
- **Substituto**: `PlanDetailPanel`, `PlanFormPanel` e `AssetPlanDetailPanel`, `AssetPlanFormPanel` com `inPage`
- **Data**: 2026-04-10
- **Condição para remoção**: Após validação E2E

### /planning/plans + /planning/schedules
- **Arquivo**: `src/app/planning/plans/page.tsx`, `src/app/planning/schedules/page.tsx`
- **Motivo**: Schedules reescrito para split-panel; coluna "Ações" com botão "Confirmar" inline removida
- **Substituto**: `ScheduleDetailPanel` com ação de confirmar dentro do painel
- **Data**: 2026-04-10
- **Condição para remoção**: Após validação E2E

### /locations
- **Arquivo**: `src/app/locations/page.tsx`, `src/api/locations/[id]/route.ts`, `src/components/locations/LocationDetailPanel.tsx`
- **Motivo**: Botões de ação no painel canonicizados; campo `parent` adicionado à API; mobile corrigido
- **Data**: 2026-04-10

### /criticality
- **Arquivo**: `src/app/criticality/page.tsx`
- **Motivo**: Linhas expandíveis removidas; migrado para split-panel com `CriticalityDetailPanel`
- **Substituto**: `CriticalityDetailPanel` com scores GUT visuais
- **Data**: 2026-04-10
- **Condição para remoção**: Após validação visual

### /technician/my-tasks
- **Arquivo**: `src/app/technician/my-tasks/page.tsx`
- **Motivo**: Layout corrigido (PageContainer, PageHeader, thead); split-panel adicionado
- **Data**: 2026-04-10

### /admin/portal + /admin/users + /admin/units
- **Arquivo**: `src/app/admin/portal/page.tsx`, `src/app/admin/users/page.tsx`, `src/app/admin/units/page.tsx`
- **Motivo**: Modais overlay substituídos por split-panel com painéis inPage
- **Data**: 2026-04-10
- **Condição para remoção**: Após validação com SUPER_ADMIN
