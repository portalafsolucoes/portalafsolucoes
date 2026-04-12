# Plano: Padronização de Rótulos de Enum em PT-BR

## Contexto

Várias telas do CMMS renderizam **valores crus de enum em inglês** (`PENDING`, `NONE`, `APPROVED`, `IN_PROGRESS`, `COMPLETE`, `RELEASED`, `CRITICAL`, `PREVENTIVE`) em badges, células de tabela e cards, quebrando a identidade PT-BR do produto. Evidência: `/requests` exibe badge `PENDING` no card e tabela de OS mostra `PENDING` + `NONE`.

**Causa-raiz:** `src/lib/utils.ts` só tem helpers de cor (`getStatusColor`, `getPriorityColor`). Não existe util central para **rótulos**. Cada tela reimplementou seu próprio mapa (ou nem traduziu).

**Resultado esperado:** nenhum valor de enum em inglês visível ao usuário final, tradução centralizada em `src/lib/status-labels.ts`, docs atualizados para prevenir regressão.

---

## Regras para quem vai executar

1. **Não usar emojis** nos rótulos (o `getPriorityLabel` atual em `/requests` e `/approvals` tem 🔴🟡🟢 — remover).
2. **Não alterar `value`** de `<option>` em selects de filtro — só alterar o **texto exibido**. As queries dependem do valor canônico em inglês.
3. **Não remover** `getStatusColor` / `getPriorityColor` de `src/lib/utils.ts` — só criar o novo arquivo de labels.
4. **Não traduzir no servidor** — APIs continuam retornando enum canônico.
5. **Usar aspas simples, sem ponto-e-vírgula, indentação de 2 espaços** (padrão do repo).
6. **Imports absolutos** com alias `@/` — não usar `../../lib/...`.
7. **Ao remover função local**, verificar se não há mais chamada a ela no arquivo antes de salvar.
8. **Após cada arquivo editado**, rodar `npm run lint` para pegar imports órfãos. Se build quebrar, ler a mensagem e corrigir antes de seguir.

---

# PASSO 1 — Criar util canônico

**Arquivo novo:** `src/lib/status-labels.ts`

Criar com o conteúdo abaixo. Os valores de enum vêm de `prisma/schema.prisma` (linhas 14–127 — consultar se houver dúvida).

```ts
// Mapeamentos canônicos de enums do Prisma para rótulos em português (PT-BR).
// Toda UI do CMMS deve consumir estes helpers em vez de renderizar o valor cru
// ou duplicar mapas locais.

export const WORK_ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  RELEASED: 'Liberada',
  IN_PROGRESS: 'Em Progresso',
  ON_HOLD: 'Em Espera',
  COMPLETE: 'Concluída',
  OPEN: 'Aberta',
}

export const WORK_ORDER_PRIORITY_LABELS: Record<string, string> = {
  NONE: 'Nenhuma',
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

export const WORK_ORDER_TYPE_LABELS: Record<string, string> = {
  REACTIVE: 'Reativa',
  PREVENTIVE: 'Preventiva',
  CORRECTIVE: 'Corretiva',
  PREDICTIVE: 'Preditiva',
}

export const OS_TYPE_LABELS: Record<string, string> = {
  PREVENTIVE_MANUAL: 'Preventiva Manual',
  CORRECTIVE_PLANNED: 'Corretiva Planejada',
  CORRECTIVE_IMMEDIATE: 'Corretiva Imediata',
}

export const REQUEST_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
  CANCELLED: 'Cancelada',
}

export const APPROVAL_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
}

export const ASSET_STATUS_LABELS: Record<string, string> = {
  OPERATIONAL: 'Operacional',
  DOWN: 'Parado',
}

export const SYSTEM_STATUS_LABELS: Record<string, string> = {
  IN_SYSTEM: 'No Sistema',
  OUT_OF_SYSTEM: 'Fora do Sistema',
}

export const FREQUENCY_LABELS: Record<string, string> = {
  DAILY: 'Diária',
  WEEKLY: 'Semanal',
  BIWEEKLY: 'Quinzenal',
  MONTHLY: 'Mensal',
  QUARTERLY: 'Trimestral',
  SEMI_ANNUAL: 'Semestral',
  ANNUAL: 'Anual',
  CUSTOM: 'Customizada',
}

export const PLAN_STATUS_LABELS: Record<string, string> = {
  OPEN: 'Aberta',
  IN_PROGRESS: 'Em Progresso',
  COMPLETE: 'Concluída',
  CANCELLED: 'Cancelada',
}

function lookup(map: Record<string, string>, value?: string | null): string {
  if (!value) return '-'
  return map[value] ?? value
}

export const getWorkOrderStatusLabel = (v?: string | null) => lookup(WORK_ORDER_STATUS_LABELS, v)
export const getWorkOrderPriorityLabel = (v?: string | null) => lookup(WORK_ORDER_PRIORITY_LABELS, v)
export const getWorkOrderTypeLabel = (v?: string | null) => lookup(WORK_ORDER_TYPE_LABELS, v)
export const getOsTypeLabel = (v?: string | null) => lookup(OS_TYPE_LABELS, v)
export const getRequestStatusLabel = (v?: string | null) => lookup(REQUEST_STATUS_LABELS, v)
export const getApprovalStatusLabel = (v?: string | null) => lookup(APPROVAL_STATUS_LABELS, v)
export const getAssetStatusLabel = (v?: string | null) => lookup(ASSET_STATUS_LABELS, v)
export const getSystemStatusLabel = (v?: string | null) => lookup(SYSTEM_STATUS_LABELS, v)
export const getFrequencyLabel = (v?: string | null) => lookup(FREQUENCY_LABELS, v)
export const getPlanStatusLabel = (v?: string | null) => lookup(PLAN_STATUS_LABELS, v)
```

**Como validar este passo:**
- `npm run lint` — arquivo novo deve passar
- `grep -n "status-labels" src/` ainda sem consumidores (próximos passos)

---

# PASSO 2 — Editar `src/app/requests/page.tsx`

**2.1** Localizar o bloco de imports no topo. Adicionar entre os imports de `@/lib/...`:

```ts
import { getRequestStatusLabel, getWorkOrderPriorityLabel } from '@/lib/status-labels'
```

**2.2** Remover a função local `getPriorityLabel` (linhas 133–140 atuais):

```ts
const getPriorityLabel = (priority: string) => {
  switch (priority) {
    case 'HIGH': return '🔴 Alta'
    case 'MEDIUM': return '🟡 Média'
    case 'LOW': return '🟢 Baixa'
    default: return 'Nenhuma'
  }
}
```

**2.3** Substituir linha 205 (`{request.status}`) por:
```tsx
{getRequestStatusLabel(request.status)}
```

**2.4** Substituir linha 209 (`{getPriorityLabel(request.priority)}`) por:
```tsx
{getWorkOrderPriorityLabel(request.priority)}
```

**2.5** Substituir linha 278 (`{request.status}` no Badge da tabela) por:
```tsx
{getRequestStatusLabel(request.status)}
```

**2.6** Substituir linha 282 (`{getPriorityLabel(request.priority)}` no Badge da tabela) por:
```tsx
{getWorkOrderPriorityLabel(request.priority)}
```

**Validar:** abrir `/requests` no `npm run dev` — cards e tabela exibem "Pendente", "Aprovada" etc.

---

# PASSO 3 — Editar `src/app/work-orders/page.tsx`

**3.1** Adicionar import:
```ts
import { getWorkOrderStatusLabel, getWorkOrderPriorityLabel } from '@/lib/status-labels'
```

**3.2** Linha 351: `{wo.status}` → `{getWorkOrderStatusLabel(wo.status)}`
**3.3** Linha 354: `{wo.priority}` → `{getWorkOrderPriorityLabel(wo.priority)}`
**3.4** Linha 423: `{wo.status}` → `{getWorkOrderStatusLabel(wo.status)}`
**3.5** Linha 428: `{wo.priority}` → `{getWorkOrderPriorityLabel(wo.priority)}`

**Atenção:** não mexer nos `<option value="PENDING">Pendente</option>` etc. do filtro (linhas 265–281) — eles já estão corretos.

**Validar:** `/work-orders` — grid e tabela exibem rótulos PT.

---

# PASSO 4 — Editar `src/app/work-orders/[id]/page.tsx`

**4.1** Adicionar import:
```ts
import { getWorkOrderStatusLabel, getWorkOrderPriorityLabel } from '@/lib/status-labels'
```

**4.2** Linha 112: `{workOrder.status}` → `{getWorkOrderStatusLabel(workOrder.status)}`
**4.3** Linha 115: `{workOrder.priority}` → `{getWorkOrderPriorityLabel(workOrder.priority)}`

**Validar:** clicar em uma OS e abrir `/work-orders/[id]`.

---

# PASSO 5 — Editar `src/app/approvals/page.tsx`

**5.1** Adicionar import:
```ts
import { getRequestStatusLabel, getWorkOrderPriorityLabel } from '@/lib/status-labels'
```

**5.2** Remover a função local `getPriorityLabel` (linhas 136–142 — a que tem emojis 🔴🟡🟢).

**5.3** Linha 192: `{request.status}` → `{getRequestStatusLabel(request.status)}`

**5.4** Buscar no arquivo toda chamada a `getPriorityLabel(` e substituir por `getWorkOrderPriorityLabel(`.

**Validar:** `/approvals` sem emojis e com rótulos PT.

---

# PASSO 6 — Editar `src/app/planning/plans/page.tsx`

**6.1** Adicionar import:
```ts
import { getPlanStatusLabel } from '@/lib/status-labels'
```

**6.2** Linha 200: `{p.status}` → `{getPlanStatusLabel(p.status)}`

**Validar:** `/planning/plans`.

---

# PASSO 7 — Editar `src/app/team-dashboard/page.tsx`

**7.1** Adicionar import:
```ts
import {
  getWorkOrderStatusLabel,
  getWorkOrderPriorityLabel,
  getWorkOrderTypeLabel,
} from '@/lib/status-labels'
```

**7.2** Linha 199: `{wo.status}` → `{getWorkOrderStatusLabel(wo.status)}`
**7.3** Linha 204: `{wo.type}` → `{getWorkOrderTypeLabel(wo.type)}`
**7.4** Linha 207: `{wo.priority}` → `{getWorkOrderPriorityLabel(wo.priority)}`
**7.5** Linha 251: `{req.priority}` → `{getWorkOrderPriorityLabel(req.priority)}`

**Validar:** `/team-dashboard`.

---

# PASSO 8 — Editar `src/app/tree/page.tsx`

**8.1** Adicionar import:
```ts
import { getWorkOrderStatusLabel, getRequestStatusLabel } from '@/lib/status-labels'
```

**8.2** Linha 331: `{wo.status}</span>` → `{getWorkOrderStatusLabel(wo.status)}</span>`
**8.3** Linha 347: `{ss.status}</span>` → `{getRequestStatusLabel(ss.status)}</span>`

**Validar:** `/tree` — expandir nós até listar OS e SS.

---

# PASSO 9 — Editar `src/app/assets/[id]/page.tsx`

**9.1** Adicionar import:
```ts
import { getAssetStatusLabel } from '@/lib/status-labels'
```

**9.2** Trocar **todas** as 4 ocorrências `{asset.status}` e `{child.status}` (linhas 181, 423, 505, 532) pelos helpers:
- `{asset.status}` → `{getAssetStatusLabel(asset.status)}`
- `{child.status}` → `{getAssetStatusLabel(child.status)}`

**Validar:** `/assets/[id]`.

---

# PASSO 10 — Editar `src/app/technician/my-tasks/page.tsx`

**10.1** Adicionar import:
```ts
import { getWorkOrderPriorityLabel, getWorkOrderStatusLabel } from '@/lib/status-labels'
```

**10.2** Remover as constantes locais `PRIORITY_LABELS` (linhas 48–54) e `STATUS_LABELS` (linhas 64–70). **Manter** `PRIORITY_COLORS` e `STATUS_COLORS` — só os labels migram.

**10.3** Atualizar `PriorityBadge` (linhas 80–86) para:
```tsx
function PriorityBadge({ priority }: { priority: string }) {
  return (
    <Badge className={PRIORITY_COLORS[priority] || PRIORITY_COLORS.NONE}>
      {getWorkOrderPriorityLabel(priority)}
    </Badge>
  )
}
```

**10.4** Atualizar `StatusBadge` (linhas 88–94) para:
```tsx
function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className={STATUS_COLORS[status] || 'bg-secondary text-foreground'}>
      {getWorkOrderStatusLabel(status)}
    </Badge>
  )
}
```

**Validar:** `/technician/my-tasks` — prioridade/status em PT.

---

# PASSO 11 — Editar `src/components/requests/RequestDetailModal.tsx`

**11.1** Alterar import em `@/lib/utils`:
- **Antes:** `import { formatDate, formatDateTime, getPriorityColor, getStatusColor } from '@/lib/utils'`
- **Adicionar linha:** `import { getWorkOrderPriorityLabel, getRequestStatusLabel, getApprovalStatusLabel } from '@/lib/status-labels'`

**11.2** Remover as funções locais (linhas 99–138):
- `function getPriorityLabel`
- `function getStatusLabel`
- `function getApprovalStatusLabel`

**11.3** Buscar no arquivo todas as chamadas e trocar:
- `getPriorityLabel(` → `getWorkOrderPriorityLabel(`
- `getStatusLabel(` → `getRequestStatusLabel(`
- `getApprovalStatusLabel(` → **mantém o mesmo nome** (só muda a fonte)

**Validar:** abrir detalhe de uma solicitação no painel lateral.

---

# PASSO 12 — Editar `src/components/work-orders/WorkOrderDetailModal.tsx`

**12.1** Adicionar import:
```ts
import { getWorkOrderStatusLabel, getWorkOrderPriorityLabel } from '@/lib/status-labels'
```

**12.2** Remover as funções locais `getPriorityLabel` e `getStatusLabel` (linhas 126–146).

**12.3** Trocar chamadas:
- `getPriorityLabel(` → `getWorkOrderPriorityLabel(`
- `getStatusLabel(` → `getWorkOrderStatusLabel(`

**Validar:** clicar em uma OS — painel lateral com status/prioridade em PT.

---

# PASSO 13 — Editar `src/components/work-orders/FinalizeWorkOrderModal.tsx`

**13.1** Adicionar import:
```ts
import { getWorkOrderStatusLabel, getWorkOrderTypeLabel } from '@/lib/status-labels'
```

**13.2** Linha 321: `{workOrder.status}` → `{getWorkOrderStatusLabel(workOrder.status)}`
**13.3** Linha 322: `{workOrder.type}` → `{getWorkOrderTypeLabel(workOrder.type)}`

**Validar:** abrir modal de finalização de uma OS.

---

# PASSO 14 — Editar `src/components/approvals/ApprovalModal.tsx`

**14.1** Adicionar import:
```ts
import { getRequestStatusLabel, getWorkOrderPriorityLabel } from '@/lib/status-labels'
```

**14.2** Linha 174: `{request.status}` → `{getRequestStatusLabel(request.status)}`

**14.3** Se existirem funções locais `getPriorityLabel` / `getStatusLabel` no arquivo, remover e usar os do util (mesma rotina dos passos anteriores). Se não existirem, só aplicar o 14.1 e 14.2.

**Validar:** `/approvals` → abrir modal de análise.

---

# PASSO 15 — Editar `src/components/planning/PlanDetailPanel.tsx` e `ScheduleDetailPanel.tsx`

**15.1** Em cada arquivo, buscar (`grep`) por `getStatusLabel`, `getPriorityLabel`, `STATUS_LABELS`, `PRIORITY_LABELS`. Se existirem, seguir o mesmo padrão dos passos 11/12: remover e importar do util.

**15.2** Buscar também renders crus `{plan.status}`, `{schedule.status}` — se houver, trocar pelo helper correspondente (`getPlanStatusLabel`).

**Validar:** `/planning/plans` e `/planning/schedules`.

---

# PASSO 16 — Atualizar docs

### 16.1 Editar `.claude/rules/components.md`

No fim da seção "Convencoes de UI e Imports" (logo antes de "Responsividade (OBRIGATORIO)"), acrescentar subseção:

```md
## Rotulos de Enum (OBRIGATORIO)
- Todo render de valor de enum do Prisma (`status`, `priority`, `type`, `frequency`) em JSX deve usar os helpers de `@/lib/status-labels`
- Nao renderizar `{obj.status}` cru, nem duplicar mapas locais tipo `STATUS_LABELS` / `getStatusLabel`
- Nao usar emojis em rotulos de prioridade (ex: 🔴 Alta) — usar apenas texto PT-BR
- Helpers disponiveis: `getWorkOrderStatusLabel`, `getWorkOrderPriorityLabel`, `getWorkOrderTypeLabel`, `getOsTypeLabel`, `getRequestStatusLabel`, `getApprovalStatusLabel`, `getAssetStatusLabel`, `getSystemStatusLabel`, `getFrequencyLabel`, `getPlanStatusLabel`
- Cores continuam em `@/lib/utils` (`getStatusColor`, `getPriorityColor`); labels e cores sao responsabilidades separadas
```

### 16.2 Editar `.claude/rules/api.md`

No fim da seção "Contrato Geral", acrescentar bullet:

```md
- APIs devem retornar valores canonicos de enum (ex: `PENDING`, `HIGH`, `PREVENTIVE`) em ingles; traducao para PT-BR e responsabilidade exclusiva da UI via `@/lib/status-labels`
```

### 16.3 Verificar `docs/SPEC.md`

Abrir, buscar por `PENDING`, `APPROVED`, `RELEASED`, `IN_PROGRESS`, `COMPLETE` em tabelas de status. Se o doc listar só o valor em inglês como "rótulo exibido", acrescentar a coluna PT ou corrigir. Não inventar novos comportamentos; apenas sincronizar rótulos aos definidos no util.

---

# PASSO 17 — Validação final

### 17.1 Comandos obrigatórios (todos devem passar)

```bash
npm run lint
npm run build
```

Se o build falhar com `TS2304: Cannot find name 'getPriorityLabel'` (ou similar), significa que uma chamada foi deixada sem renomear. Voltar ao arquivo apontado e completar o passo.

### 17.2 Smoke manual (obrigatório)

Rodar `npm run dev`, logar como `super.admin@polimix.local / Teste@123` e **varrer cada rota abaixo**, abrindo detalhe e modais onde existirem. Em NENHUMA delas pode aparecer qualquer um dos termos:

`PENDING | APPROVED | REJECTED | CANCELLED | RELEASED | IN_PROGRESS | ON_HOLD | COMPLETE | OPEN | NONE | LOW | MEDIUM | HIGH | CRITICAL | PREVENTIVE | CORRECTIVE | PREDICTIVE | REACTIVE | OPERATIONAL | DOWN | IN_SYSTEM | OUT_OF_SYSTEM | DAILY | WEEKLY | MONTHLY`

Rotas:
- [ ] `/requests` — **caso de teste principal das screenshots** (grid + tabela + painel de detalhe + modal criar/editar)
- [ ] `/work-orders` (grid + tabela + painel detalhe + modal finalizar)
- [ ] `/work-orders/[id]` (abrir uma OS)
- [ ] `/approvals` (lista + modal analisar)
- [ ] `/planning/plans` e `/planning/schedules`
- [ ] `/team-dashboard`
- [ ] `/tree` (expandir até ver OS e SS)
- [ ] `/assets/[id]`
- [ ] `/technician/my-tasks`
- [ ] `/rafs` (olhar, embora não tenha sido modificado; verificar por garantia)

**Atalho de busca rápida no DevTools (F12):** `Ctrl+F` no painel Elements por "PENDING" após carregar cada tela. Zero resultados = aprovado.

### 17.3 Teste automatizado (se houver tempo)

Acrescentar nos testes Playwright existentes de `/requests` e `/work-orders`:
```ts
await expect(page.getByText('PENDING', { exact: true })).toHaveCount(0)
await expect(page.getByText('NONE', { exact: true })).toHaveCount(0)
await expect(page.getByText('IN_PROGRESS', { exact: true })).toHaveCount(0)
```

### 17.4 Regressões a verificar

- [ ] Filtros de select (`/work-orders` linhas 265–281) ainda filtram corretamente ao selecionar "Pendente" etc.
- [ ] Ordenação por status/prioridade em tabelas continua funcionando (usa o valor canônico, não o rótulo).
- [ ] Cores dos badges permanecem idênticas (vieram de `getStatusColor`/`getPriorityColor`, intocados).
- [ ] Dados legados com valor fora do enum **não quebram** — helper retorna o próprio valor como fallback.
- [ ] Abrir console do browser após varrer as telas: **nenhum** warning/erro novo.

---

# Apêndice A — Checklist rápido de arquivos

| # | Arquivo | Ação |
|---|---|---|
| 1 | `src/lib/status-labels.ts` | **criar** |
| 2 | `src/app/requests/page.tsx` | editar (remover getPriorityLabel local + 4 renders) |
| 3 | `src/app/work-orders/page.tsx` | editar (4 renders) |
| 4 | `src/app/work-orders/[id]/page.tsx` | editar (2 renders) |
| 5 | `src/app/approvals/page.tsx` | editar (remover getPriorityLabel local + 1 render) |
| 6 | `src/app/planning/plans/page.tsx` | editar (1 render) |
| 7 | `src/app/team-dashboard/page.tsx` | editar (4 renders) |
| 8 | `src/app/tree/page.tsx` | editar (2 renders) |
| 9 | `src/app/assets/[id]/page.tsx` | editar (4 renders) |
| 10 | `src/app/technician/my-tasks/page.tsx` | editar (remover 2 maps locais + atualizar 2 badges) |
| 11 | `src/components/requests/RequestDetailModal.tsx` | editar (remover 3 funções locais + chamadas) |
| 12 | `src/components/work-orders/WorkOrderDetailModal.tsx` | editar (remover 2 funções locais + chamadas) |
| 13 | `src/components/work-orders/FinalizeWorkOrderModal.tsx` | editar (2 renders) |
| 14 | `src/components/approvals/ApprovalModal.tsx` | editar (1 render + possíveis funções locais) |
| 15 | `src/components/planning/PlanDetailPanel.tsx` | auditar e migrar se tiver funções locais/renders crus |
| 16 | `src/components/planning/ScheduleDetailPanel.tsx` | auditar e migrar se tiver funções locais/renders crus |
| 17 | `.claude/rules/components.md` | docs |
| 18 | `.claude/rules/api.md` | docs |
| 19 | `docs/SPEC.md` | verificar e sincronizar rótulos |

Total: **1 arquivo novo, 15 editados, 3 docs**.

---

# Apêndice B — O que NÃO fazer

- ❌ Não alterar `src/lib/utils.ts` (manter `getStatusColor` / `getPriorityColor` como estão).
- ❌ Não traduzir valores no backend / APIs / schema.
- ❌ Não alterar `value` de `<option>` em selects.
- ❌ Não adicionar dependência de i18n (ex: `next-intl`) — fora do escopo.
- ❌ Não renomear funções auxiliares já exportadas por componentes (`PriorityBadge`, `StatusBadge`).
- ❌ Não remover `getStatusColor` / `getPriorityColor` das chamadas existentes.
- ❌ Não tocar em `/rafs`, `/locations`, `/basic-registrations/*`, `/admin/*`, `/criticality`, `/kpi` — não têm ocorrências mapeadas neste levantamento. Se aparecerem durante a varredura manual, registrar e tratar como extensão.
