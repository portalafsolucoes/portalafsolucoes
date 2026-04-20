# Plano de Implantação — PA das RAFs

**Versão:** 1.0
**Data:** 2026-04-20
**Responsável pela análise:** Claude Code (análise) / usuário (decisões)
**Escopo:** Nova tela "PA das RAFs" + ampliação do plano de ação com responsável + status persistido na RAF + auto-finalização.

---

## 1. Objetivo

Entregar uma tela dedicada ao acompanhamento e controle das ações (Planos de Ação — PAs) de todas as RAFs da empresa, permitindo:

- Lista única com uma linha por ação de cada RAF.
- Dashboard de 4 indicadores no topo.
- Filtros ricos e autocomplete global.
- Edição inline de status por ADMIN/TECHNICIAN.
- Geração de OS por ação.
- Exportação Excel.
- Status da RAF (`ABERTA` / `FINALIZADA`) persistido e auto-calculado.
- Novo submenu "Análise de Falhas" no sidebar com dois itens: "RAFs" e "PA das RAFs".

---

## 2. Decisões consolidadas

### Definições do usuário

| Item | Decisão |
|------|---------|
| A | Responsável por ação = `User` (não Team) |
| B | "Ação realizada" = `status === COMPLETED` |
| C | RAF ganha campo `status` persistido: `ABERTA` \| `FINALIZADA` |
| D | Botão "Gerar OS" por linha mantido na nova tela |
| E | Edição inline restrita a ADMIN e TECHNICIAN |
| F | Exportação Excel na nova tela |
| G | Rota `/rafs/action-plan` / label "PA das RAFs" |
| H | Auto-finalização server-side via helper único (Opção C) |

### Regras derivadas (D1–D9)

| Item | Decisão |
|------|---------|
| D1 | RAF sem actionPlan ou vazio → `ABERTA` + badge "Precisa de PA" |
| D2 | Reabertura automática ao descompletar ou adicionar ação |
| D3 | Backfill na migration preenchendo `status` dos registros existentes |
| D4 | Persistir `finalizedAt` e `finalizedBy` (User?) |
| D5 | LIMITED_TECHNICIAN perde só a edição inline; mantém edição via modal completo |
| D6 | Filtro "Responsável" na nova tela |
| D7 | Responsável inativo/arquivado mantém vínculo histórico; exibe "(inativo)" |
| D8 | Ordenação default: status != COMPLETED primeiro → deadline asc (vencidas no topo) → RAF desc |
| D9 | Legenda monocromática com símbolos: ● vencida / ◐ em andamento / ○ pendente no prazo / ✓ concluída / — sem prazo |

### Ordenação visual de colunas

Seguir o padrão do commit `feat: integrar ordenacao visual em tabelas` já em uso em `/work-orders`, `/rafs`, `/requests`: ícones `unfold_more` (neutro), `arrow_upward` / `arrow_downward` (ativo com `text-accent-orange`).

---

## 3. Regras de segurança e padrões obrigatórios

- Multi-tenant: **toda** query com `.eq('companyId', session.companyId)` + `requireCompanyScope(session)`.
- Permissões: usar `checkApiPermission(session, 'rafs', ...)` — **não** criar módulo novo.
- Normalização: `normalizeTextPayload` em todo POST/PUT/PATCH.
- Tipografia: seguir `.claude/rules/components.md` (inputs com uppercase CSS; `preserveCase` onde couber).
- Paleta: branco / tons de cinza / preto. Laranja `text-accent-orange` apenas em estado ativo de ordenação (padrão existente).
- Status da RAF é **derivado server-side**: rejeitar payload do cliente tentando setar `status` direto.

---

## 4. Arquitetura de alto nível

```
┌─ Sidebar: "Análise de Falhas" (expansível)
│   ├─ RAFs              → /rafs                (tela atual, inalterada visualmente)
│   └─ PA das RAFs       → /rafs/action-plan    (NOVA)
│
├─ API:
│   ├─ GET  /api/rafs                        → adiciona `status`, `finalizedAt`, `finalizedBy` no select
│   ├─ PUT  /api/rafs/[id]                   → chama recalculateRafStatus() + ignora `status` do body
│   ├─ POST /api/requests/[id]/generate-raf  → nasce com status='ABERTA'
│   └─ GET  /api/rafs/action-plan/stats      → NOVO — 4 KPIs do dashboard
│
├─ Helper canônico:
│   └─ src/lib/rafs/recalculateStatus.ts     → NOVO — fonte única de verdade
│
├─ Types canônicos:
│   └─ src/types/raf.ts                      → NOVO — ActionPlanItem v2 + RafStatus
│
└─ UI:
    ├─ src/app/rafs/action-plan/page.tsx     → NOVA tela
    ├─ src/components/rafs/ActionPlanTable.tsx
    ├─ src/components/rafs/ActionPlanDashboardCards.tsx
    ├─ src/components/rafs/ActionPlanFilters.tsx
    ├─ src/components/rafs/ActionPlanStatusBadge.tsx (legenda)
    ├─ src/components/rafs/ResponsibleSelect.tsx     (dropdown de User)
    ├─ src/components/rafs/RAFFormModal.tsx          → adiciona coluna "Responsável"
    ├─ src/components/rafs/RAFEditModal.tsx          → adiciona coluna "Responsável"
    └─ src/components/rafs/RAFViewModal.tsx          → exibe "Responsável" + status RAF
```

---

## 5. Fases de implementação

As fases são **cumulativas e reversíveis**. Cada fase tem critério de aceite e ponto de parada seguro. Não avançar sem validar a anterior.

---

### FASE 0 — Preparação e validação prévia (sem código de produto)

**Objetivo:** eliminar riscos antes de mexer em código.

**Ações:**

1. Executar script de auditoria `deadline` legado:
   - Criar `scripts/check-action-plan-deadline-format.ts` (somente leitura).
   - Rodar e registrar: quantas ações têm `deadline` fora de ISO `YYYY-MM-DD`, quantas têm vazio, quantas em `dd/mm/yyyy`.
   - Saída esperada: relatório em stdout. **Não** gravar arquivo em `auditoria/` — é scan técnico, não evidência formal.

2. Executar auditoria de shape de `actionPlan`:
   - Mesmo script lista quantas ações já têm campos `responsibleUserId`, `linkedRequestId` (esperado: zero; confirma estado limpo).

3. Confirmar que o sidebar em `Sidebar.tsx:120–132` reexpande corretamente quando `/rafs/action-plan` estiver sob o grupo "Análise de Falhas" (teste manual rápido após Fase 3).

**Critério de aceite:** relatórios prontos, sem surpresas. Se houver >5% de `deadline` em formato não-ISO, ativar parser defensivo (já previsto).

**Rollback:** N/A — scripts somente leitura.

---

### FASE 1 — Schema e tipos canônicos (base de dados)

**Objetivo:** adicionar colunas novas na RAF sem quebrar nada existente.

**Enum definido:** `RafStatus { ABERTA, FINALIZADA }` (PT). Valores persistidos em português, consistentes com a UI.

**Mudanças em `prisma/schema.prisma`:**

1. Criar enum `RafStatus`.
2. Adicionar em `FailureAnalysisReport`:
   - `status RafStatus @default(ABERTA)`
   - `finalizedAt DateTime?`
   - `finalizedById String?`
   - `finalizedBy User? @relation("RafFinalizedBy", fields: [finalizedById], references: [id])`
3. Adicionar relação inversa em `User`: `rafsFinalized FailureAnalysisReport[] @relation("RafFinalizedBy")`.

**Migration Prisma:**

- Nome: `20260420_add_raf_status_and_finalized_tracking`
- SQL: `ADD COLUMN` + `CREATE TYPE` + **backfill** via update baseado em `actionPlan` existente:

```sql
-- pseudocódigo do backfill
UPDATE "FailureAnalysisReport"
SET status = 'FINALIZADA',
    "finalizedAt" = COALESCE("updatedAt", "createdAt")
WHERE jsonb_array_length("actionPlan") > 0
  AND NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements("actionPlan") e
    WHERE e->>'status' <> 'COMPLETED'
  );
-- demais linhas permanecem ABERTA (default)
```

- `finalizedById` fica `NULL` no backfill — não temos como descobrir o autor histórico. Documentar em comentário SQL.

**Novo arquivo `src/types/raf.ts`:**

```ts
export type RafStatusValue = 'ABERTA' | 'FINALIZADA'

export interface ActionPlanItem {
  item: number
  subject: string
  deadline: string              // ISO YYYY-MM-DD preferencial; tolerar dd/mm/yyyy legado
  actionDescription: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'
  linkedWorkOrderId?: string
  linkedWorkOrderNumber?: string
  responsibleUserId?: string    // NOVO
  responsibleName?: string      // NOVO (denormalizado p/ exibição rápida)
  completedAt?: string          // NOVO (timestamp ISO)
}
```

**Critério de aceite:**
- `npm run db:generate` roda sem erro.
- `npm run build` roda sem erro.
- Query manual no Prisma Studio mostra `status` populado corretamente em amostra de RAFs existentes (pelo menos uma ABERTA e uma FINALIZADA se houver dados).

**Rollback:**
- `prisma migrate resolve --rolled-back` + migration inversa dropando colunas e enum.
- Nenhum código de aplicação referencia os campos ainda, então o rollback é seguro.

**Ponto de parada seguro:** ao final da Fase 1, o sistema funciona igual antes. Campos novos existem mas não são lidos/escritos por ninguém.

---

### FASE 2 — Helper canônico + integração silenciosa nas APIs de RAF

**Objetivo:** fazer o status novo ser atualizado automaticamente em **toda** escrita de RAF, sem ainda expor nada na UI.

**Arquivos:**

1. **NOVO** `src/lib/rafs/recalculateStatus.ts`:
   - Função pura `recalculateRafStatus(actionPlan, currentUserId)` retornando `{ status, finalizedAt, finalizedBy }`.
   - RAF sem ações → `ABERTA`.
   - Todas COMPLETED → `FINALIZADA` com timestamp e usuário.
   - Qualquer outra → `ABERTA` com `finalizedAt: null` (**reabertura automática**).
   - Zero dependência de `supabase` ou `prisma` — recebe dados, devolve dados. Testável isoladamente.

2. **NOVO** `src/lib/rafs/deadline.ts`:
   - `parseDeadline(value: string | undefined): Date | null` — aceita ISO e `dd/mm/yyyy`, retorna `null` para vazio/inválido.
   - `isOverdue(deadline, status)` — retorna `false` se `status === 'COMPLETED'` ou deadline null.

3. **MODIFICAR** `src/app/api/rafs/[id]/route.ts` (PUT):
   - Remover qualquer `status` do body antes do update (**regra de segurança**: status é derivado).
   - Após normalizar `actionPlan`, chamar `recalculateRafStatus(...)` e mesclar o retorno no update.
   - Escrita atômica: um único `UPDATE` com `actionPlan` + `status` + `finalizedAt` + `finalizedById`.

4. **MODIFICAR** `src/app/api/requests/[id]/generate-raf/route.ts`:
   - Insert nasce com `status: 'ABERTA'`, `finalizedAt: null`, `finalizedById: null`.

5. **MODIFICAR** `src/app/api/rafs/route.ts` (GET):
   - Adicionar `status, finalizedAt, finalizedBy:User!finalizedById(id, firstName, lastName)` em `fullSelect` e na versão `summary`.

**Testes unitários (jest ou vitest se existir; senão test manual documentado):**

- `recalculateRafStatus([])` → ABERTA
- `recalculateRafStatus([{status:'COMPLETED'}, {status:'COMPLETED'}], user)` → FINALIZADA com finalizedBy=user
- `recalculateRafStatus([{status:'COMPLETED'}, {status:'PENDING'}])` → ABERTA
- Descompletar ação → ABERTA com `finalizedAt: null`

**Critério de aceite:**
- Editar uma RAF existente via modal atual de edição, marcar todas as ações como COMPLETED, salvar.
- Consulta no Prisma Studio mostra `status = 'FINALIZADA'` + `finalizedAt` preenchido + `finalizedById` = usuário da sessão.
- Descompletar uma ação → status volta para `ABERTA` e `finalizedAt` vira NULL.

**Rollback:** reverter commit. O campo existe no DB desde a Fase 1 — dados escritos até aqui permanecem; lógica volta a ignorá-los.

**Ponto de parada seguro:** sistema funciona normalmente; status recalculado em background, invisível para o usuário.

---

### FASE 3 — Sidebar: grupo "Análise de Falhas"

**Objetivo:** introduzir o grupo expansível antes mesmo da tela nova existir. Se a nova tela ainda não existe, o item "PA das RAFs" pode ficar atrás de uma flag ou simplesmente não ser renderizado até a Fase 5.

**Ícone definido:** `troubleshoot` para o grupo "Análise de Falhas" (sugere análise/diagnóstico). Subitem "RAFs" mantém o ícone original `description` para continuidade visual com a tela atual.

**Mudança em `src/components/layout/Sidebar.tsx`**:

Substituir a entrada atual:
```
{ name: 'RAF', href: '/rafs', icon: 'description', module: 'rafs' }
```

Por:
```
{ name: 'Análise de Falhas', href: '/rafs', icon: 'troubleshoot', module: 'rafs', subItems: [
  { name: 'RAFs', href: '/rafs', module: 'rafs' },
  { name: 'PA das RAFs', href: '/rafs/action-plan', module: 'rafs' },
]}
```

O gating existente (`isModuleEnabled('rafs')` + `hasPermission(..., 'rafs', 'view')`) já cobre ambos os filhos automaticamente (linhas 94–108 do Sidebar.tsx).

**Critério de aceite:**
- Perfil ADMIN vê grupo expansível com 2 filhos.
- Perfil REQUESTER / VIEW_ONLY não vê o grupo (submenus são filtrados e `visibleSubs.length === 0` faz o pai sumir).
- Item "PA das RAFs" clicável, leva a rota 404 temporária (até Fase 5) — documentar esse estado intermediário no PR.

**Rollback:** reverter a entrada no array.

---

### FASE 4 — Coluna "Responsável" no plano de ação (RAF Form/Edit/View)

**Objetivo:** habilitar atribuição de responsável nas telas atuais de RAF, garantindo que a nova tela já encontre dado preenchido.

**Novo componente `src/components/rafs/ResponsibleSelect.tsx`:**
- Dropdown baseado em dados de `/api/users` (ou `/api/people` — confirmar endpoint existente no `/people-teams` na hora).
- Filtrar por roles `ADMIN`, `TECHNICIAN` e `LIMITED_TECHNICIAN` (executores + supervisão; excluir REQUESTER e VIEW_ONLY).
- Indicar `(inativo)` ao lado do nome quando `user.status !== 'ACTIVE'`.
- Input com busca (já há padrão de typeahead em outros selects do projeto — reaproveitar).
- Prop `preserveCase` ao passar o label (nomes próprios).

**Modificações:**

1. `src/components/rafs/RAFFormModal.tsx` (criação):
   - Adicionar coluna "Responsável" na tabela de ações **imediatamente antes da coluna "Prazo"** (ordem final: Item → Assunto → Responsável → Prazo → Descrição da Ação → Status → Nº OS).
   - Na submissão, incluir `responsibleUserId` e `responsibleName` em cada item.

2. `src/components/rafs/RAFEditModal.tsx` (edição):
   - Mesma coluna, mesma posição (antes de "Prazo").
   - Ao carregar, pré-popular dropdown com o responsável atual.

3. `src/components/rafs/RAFViewModal.tsx` (somente leitura):
   - Renderizar coluna "Responsável" com nome + badge `(inativo)` se aplicável.
   - Renderizar badge de status da RAF no header do modal (`ABERTA` / `FINALIZADA` — monocromático).

**Validação:**
- Responsável é **opcional** (retrocompat).
- UI mostra "—" quando vazio.

**Critério de aceite:**
- Criar nova RAF com responsáveis em cada ação → salva corretamente.
- Editar RAF existente (sem responsáveis) → pode atribuir sem precisar preencher todas.
- RAFViewModal mostra badge de status e responsável.
- Playwright: criar RAF, atribuir responsável, recarregar, confirmar persistência.

**Rollback:** reverter commits; coluna no JSON permanece nos dados já salvos (tolerado pelo shape opcional).

---

### FASE 5 — Tela nova `/rafs/action-plan`

**Objetivo:** entregar a tela completa com dashboard, filtros, tabela, edição inline e export.

**Estrutura de página (`src/app/rafs/action-plan/page.tsx`):**

Seguindo `.claude/rules/components.md`:

```
<PageContainer variant="full" className="overflow-hidden p-0">
  <Header wrapper border-b, px-4 py-3 md:px-6>
    <PageHeader title="PA das RAFs" description="..." className="mb-0" actions={exportBtn} />
  </Header>

  <DashboardCards> (4 cards em grid)

  <LegendBar> (legenda de símbolos)

  <FiltersBar> (autocomplete + filtros)

  <Content>
    <AdaptiveSplitPanel
      list={<ActionPlanTable />}
      panel={<RAFViewModal inPage />}   // reusa componente existente
      showPanel={!!selectedRafId}
      ...
    />
  </Content>
</PageContainer>
```

**Componentes novos:**

1. `ActionPlanDashboardCards.tsx`:
   - 4 cards com ícone + label + número grande.
   - Dados vindos de `GET /api/rafs/action-plan/stats`.
   - Labels: "RAFs abertas" / "RAFs finalizadas" / "Ações no prazo" / "Ações vencidas".
   - Tom monocromático; nº grande em preto, label em cinza.

2. `ActionPlanFilters.tsx`:
   - Autocomplete global (um único `<Input>` que filtra por rafNumber, asset.name, asset.protheusCode, maintenanceArea.name, actionDescription, subject, workOrder.internalId, request.requestNumber — tudo no cliente sobre o dataset já carregado).
   - Filtros dedicados: `Nº da RAF` (text), `Código do bem` (text, exact Protheus), `Prazo` (date range), `Área de manutenção` (select), `Nº OS` (text), `Nº SS` (text), `Status da RAF` (select Aberta/Finalizada), `Responsável` (dropdown de User), `Status da ação` (select Pendente/Em andamento/Concluída).
   - Debounce 300ms no autocomplete.

3. `ActionPlanTable.tsx`:
   - Uma linha por ação. Para cada RAF, N linhas (uma por ação); RAF sem ações aparece com uma linha placeholder badge "Precisa de PA".
   - Colunas (ordem — "Responsável" vem antes de "Prazo" para consistência com os modais de RAF):
     1. `RAF` — código + badge status da RAF (ABERTA/FINALIZADA)
     2. `Ação` — descrição da ação
     3. `Responsável` — nome (+ "(inativo)" se aplicável)
     4. `Data criação` — `raf.createdAt`
     5. `Data ocorrência` — `raf.occurrenceDate`
     6. `Prazo` — `item.deadline` com ícone conforme legenda
     7. `OS` — `internalId` + badge "aberta/finalizada" OU botão "Gerar OS"
     8. `SS` — `requestNumber` + badge (apenas exibição — não é editável nem ação)
     9. `Status` — select inline (ADMIN/TECHNICIAN) ou texto (demais)
   - Ordenação visual em todas as colunas textuais/temporais (padrão do commit já existente).
   - Ordenação default: não-COMPLETED → deadline asc (nulls last) → rafNumber desc.
   - Linhas com deadline vencida ganham marcador `●` antes do prazo (não mudar cor de fundo — paleta restrita).
   - Checkbox por linha para seleção (padrão para impressão em lote, se houver demanda futura — por ora **NÃO** implementar impressão em lote daqui; scope control).
   - Em mobile (`isPhone`): virar cards (padrão `.claude/rules/components.md`).

4. `ActionPlanStatusBadge.tsx`:
   - Renderiza o símbolo + tooltip. Usado na coluna `Prazo` e `Status`.

5. `ActionPlanLegend.tsx`:
   - Linha horizontal compacta acima da tabela com os 5 símbolos e rótulos.
   - `text-xs text-muted-foreground`.
   - Ocultável em mobile para economizar espaço (ou colapsada atrás de um "Legenda" toggle).

**Edição inline de status:**
- Select nativo estilizado (consistente com o já usado em `RAFEditModal`).
- `onChange` → PUT na RAF inteira (carrega a RAF atual, substitui o item alterado, salva).
- Loading state na linha durante a chamada.
- Toast de sucesso ("Status atualizado") ou erro com mensagem da API.
- **Gating**: se sessão não é ADMIN nem TECHNICIAN, renderizar texto estático em vez do select.
- Optimistic update opcional: atualizar UI antes da resposta, reverter em caso de erro.

**Botão "Gerar OS" inline:**
- Reusa a lógica já existente em `RAFEditModal` (não reimplementar — extrair para helper `src/lib/rafs/generateWorkOrderFromAction.ts` se necessário).

**Novo endpoint `src/app/api/rafs/action-plan/stats/route.ts`:**
- GET retorna `{ data: { openRafs, finalizedRafs, onTimeActions, overdueActions } }`.
- Query única agregada com `companyId` + `unitId` da sessão.
- Aceita filtros via querystring (mínimo: `unitId`) — começar simples, evoluir depois.

**Exportação Excel:**
- Botão no PageHeader (padrão já existente em `/rafs`).
- Reusa componente `ExportButton` (ver `src/components/ui/ExportButton.tsx`).
- **Formato: uma linha por ação** (mesma granularidade da tabela em tela). Cabeçalho reflete as colunas visíveis: RAF, Ação, Responsável, Data criação, Data ocorrência, Prazo, OS, Status OS, SS, Status SS, Status da ação, Status da RAF.
- Exporta exatamente o que está filtrado/visível.

**Critério de aceite:**
- Perfil ADMIN: abre a tela, vê todos os componentes, edita status inline, gera OS, exporta Excel.
- Perfil TECHNICIAN: mesmo que ADMIN.
- Perfil LIMITED_TECHNICIAN: vê tela, não consegue editar status inline (select vira texto); consegue abrir RAF no painel lateral.
- Perfil REQUESTER/VIEW_ONLY: sidebar não mostra entrada (Fase 3 já garante).
- 4 KPIs batem com consulta manual no banco.
- Autocomplete filtra instantaneamente em dataset de amostra.
- Ordenação default visível: ações vencidas no topo.

**Rollback:** reverter arquivos novos + entrada do sidebar. DB permanece com colunas novas (sem prejuízo).

---

### FASE 6 — Documentação e testes

**Atualizações obrigatórias (cumpre regra do CLAUDE.md "Sincronização de Documentação"):**

1. **`docs/spec.md`** — seção RAF:
   - Campo `status` persistido.
   - Campo `responsible` nas ações.
   - Regra de auto-finalização.
   - Tela "PA das RAFs" — contrato funcional completo.

2. **`.claude/rules/api.md`** — seção RAF:
   - Documentar regra: "`status` da RAF é derivado server-side; cliente não pode setar."
   - Documentar endpoint `/api/rafs/action-plan/stats`.
   - Atualizar lista de campos retornados por `GET /api/rafs`.

3. **`.claude/rules/database.md`**:
   - Documentar enum `RafStatus` e novos campos de `FailureAnalysisReport`.
   - Documentar shape canônico de `ActionPlanItem` (v2 com `responsibleUserId`, `completedAt`).

4. **`.claude/rules/components.md`**:
   - Incluir `/rafs/action-plan` no Mapa de Telas.
   - Documentar componente `ActionPlanStatusBadge` + legenda como padrão reutilizável.

5. **`CLAUDE.md`** (seção "Features do CMMS"):
   - Listar "PA das RAFs" como nova feature de navegação sob "RAF" (ou "Análise de Falhas").

**Testes Playwright:**

- `tests/rafs-action-plan.spec.ts`:
  - Login ADMIN → abrir `/rafs/action-plan` → ver dashboard + tabela.
  - Editar status inline → status salva no banco e reflete no KPI.
  - Auto-finalização: marcar última ação como COMPLETED → badge da RAF muda para FINALIZADA na linha.
  - Reabertura: descompletar ação → volta para ABERTA.
  - Perfil LIMITED_TECHNICIAN → não edita status inline.
  - Perfil VIEW_ONLY → sidebar não mostra "Análise de Falhas".
  - Filtros: autocomplete + dropdown Responsável + date range Prazo.
  - Gerar OS a partir de uma linha.
  - Exportar Excel.
  - Responsivo: tablet e phone.

**Evidências:**
- Screenshots em `auditoria/2026-04-??/pa-das-rafs-rollout/evidencias/` conforme `docs/AUDITORIA.md`.
- `ALLOW_SCREENSHOT_AUTOMATION=1` obrigatório antes de rodar Playwright com screenshots.

---

## 6. Contrato dos 4 KPIs do dashboard

| Card | Fórmula |
|------|---------|
| **RAFs abertas** | `COUNT(FailureAnalysisReport WHERE status = 'ABERTA' AND companyId = session.companyId AND unitId = session.unitId)` |
| **RAFs finalizadas** | `COUNT(... WHERE status = 'FINALIZADA' ...)` |
| **Ações no prazo** | `SUM` sobre actionPlan de cada RAF no escopo: ações com `status != 'COMPLETED'` E `parseDeadline(deadline) >= hoje OU deadline é null-considerado-sem-prazo`. Regra de "sem prazo": contabilizar separado? **Decisão:** contar como "no prazo" para não parecer urgência falsa. |
| **Ações vencidas** | `SUM` sobre actionPlan: `status != 'COMPLETED'` E `parseDeadline(deadline) < hoje`. Ações sem prazo **não** são consideradas vencidas. |

---

## 7. Recomendações finais sobre os riscos (consolidadas)

### R1 — Retrocompat actionPlan
- Todos os campos novos no shape `ActionPlanItem` são **opcionais**.
- Exibir "—" ou "Sem responsável" quando ausente.
- Botão "Atribuir responsável em lote" — **fica fora do escopo v1**; anotar como melhoria futura em `docs/DEPRECATIONS.md` ou backlog.

### R2 — Deadline formato livre
- Parser defensivo (`parseDeadline`) aceita ISO e dd/mm/yyyy.
- Inválido/vazio → `null` → tratado como "sem prazo".
- PUT normaliza para ISO no banco (auto-cura progressiva).

### R3 — Performance
- Endpoint `/api/rafs/action-plan/stats` dedicado para KPIs (evita recalcular no cliente).
- `/api/rafs?summary=true` já existe — usar no flatten client-side.
- Paginação: começar sem paginação real; instrumentar console.time do flatten em dev. Se ultrapassar 300ms → criar endpoint dedicado `/api/rafs/action-plan/items?page=N` antes de produção.
- Debounce 300ms no autocomplete.

### R4 — Multi-tenant
- Toda query com `companyId` explícito + `requireCompanyScope`.
- Teste Playwright: logar como empresa A, verificar que RAFs da empresa B não aparecem nem nas stats nem no autocomplete.

### R5 — Edição concorrente
- v1 usa last-write-wins.
- Medida barata: retornar `updatedAt` no PUT; se próxima edição mandar um `updatedAt` antigo, rejeitar com 409 e UI recarrega. **Implementar só se aparecer problema real** — não bloquear v1.

### R6 — Feedback de ação
- Toast obrigatório em toda edição inline (sucesso e erro).
- Loading spinner na linha enquanto salva.

### R7 — Responsividade
- Cards em `isPhone` (< 768px), tabela em `isCompact+` (>= 768px).
- Split-panel só em `isWide` (>= 1280px) — padrão `AdaptiveSplitPanel`.
- Colunas menos críticas (Data criação, Data ocorrência) colapsar em `isCompact` via `hidden md:table-cell`.

### R8 — Acessibilidade
- Símbolos da legenda **sempre** acompanhados de texto ou tooltip.
- Contraste: preto/cinza escuro sobre branco em todos os estados.
- `aria-label` nos botões de ícone.

### R9 — Auditoria de mudança de status
- v1 **não** persiste histórico de mudanças de status.
- Registrar em `docs/DEPRECATIONS.md` como débito técnico: "Ações de RAF não têm audit trail; considerar tabela `RafActionStatusHistory` se virar requisito."

### R10 — Perfis sem acesso
- Gating já resolvido na Fase 3 (herda de `rafs` module).
- Teste Playwright cobre.

---

## 8. Checklist de execução (ordem cronológica)

- [ ] **Fase 0:** rodar scripts de auditoria de `actionPlan` e `deadline`.
- [ ] **Fase 1:** schema + migration + backfill + `src/types/raf.ts`.
- [ ] **Fase 1:** rodar `npm run db:generate` + `npm run build`.
- [ ] **Fase 2:** helper `recalculateRafStatus` + `parseDeadline` + integração nos PUT/POST de RAF.
- [ ] **Fase 2:** testes unitários do helper.
- [ ] **Fase 2:** validação manual (editar RAF, confirmar status muda).
- [ ] **Fase 3:** sidebar — grupo "Análise de Falhas" com 2 filhos.
- [ ] **Fase 4:** `ResponsibleSelect` + integração em Form/Edit/View modals.
- [ ] **Fase 4:** validação manual (criar RAF, atribuir responsável).
- [ ] **Fase 5:** tela `/rafs/action-plan` + componentes + endpoint `/stats`.
- [ ] **Fase 5:** edição inline + gating de permissão.
- [ ] **Fase 5:** export Excel.
- [ ] **Fase 5:** responsivo mobile/tablet/desktop.
- [ ] **Fase 6:** docs (`spec.md`, `api.md`, `database.md`, `components.md`, `CLAUDE.md`).
- [ ] **Fase 6:** testes Playwright por perfil.
- [ ] **Fase 6:** evidências em `auditoria/` (com `ALLOW_SCREENSHOT_AUTOMATION=1`).
- [ ] **Fase 6:** `npm run lint` + `npm run test` + `npm run build`.
- [ ] Revisão final: verificar que nada fora do escopo foi alterado.

---

## 9. Pontos de decisão — todos resolvidos no kickoff

| # | Decisão | Status |
|---|---------|--------|
| 1 | Nome do enum `RafStatus` → **`ABERTA` / `FINALIZADA`** (PT) | ✅ decidido |
| 2 | Ícone do grupo sidebar → **`troubleshoot`** | ✅ decidido |
| 3 | Posição da coluna "Responsável" nos modais de RAF → **imediatamente antes da coluna "Prazo"** | ✅ decidido |
| 4 | Roles elegíveis em `ResponsibleSelect` → **ADMIN + TECHNICIAN + LIMITED_TECHNICIAN** (excluir REQUESTER e VIEW_ONLY) | ✅ decidido |
| 5 | Formato do XLSX exportado → **uma linha por ação** (mesma granularidade da tabela em tela) | ✅ decidido |

Sem pontos pendentes para kickoff. Plano pronto para execução na ordem das Fases 0 → 6.

---

## 10. Critérios de "pronto para produção"

- [ ] `npm run lint` verde.
- [ ] `npm run build` verde.
- [ ] `npm run test` verde (Playwright cobrindo os perfis).
- [ ] Smoke test em perfil ADMIN, TECHNICIAN, LIMITED_TECHNICIAN, REQUESTER, VIEW_ONLY.
- [ ] KPIs conferem com consulta SQL direta em ambiente de staging.
- [ ] Auto-finalização e reabertura demonstrados em RAF real.
- [ ] Exportação Excel abre corretamente no Excel/LibreOffice.
- [ ] Responsividade validada em celular, tablet e desktop.
- [ ] Multi-tenant: empresa B não vê dados da empresa A.
- [ ] Docs sincronizadas (spec, api, database, components, CLAUDE.md).
- [ ] Evidências em `auditoria/` conforme padrão.

---

## 11. Fora de escopo desta entrega

- Impressão em lote de ações de PA (existe para RAFs inteiras; PA-level fica como feature futura).
- Histórico (audit trail) de mudanças de status de ação.
- Notificações por email/push para responsável quando ação é atribuída ou prazo se aproxima.
- Comentários/anexos por ação.
- Filtro por "sem responsável" como atalho dedicado (pode ser feito no autocomplete).
- Bulk update de responsável.
- Dashboard avançado de análise (tempo médio de conclusão, SLA etc.).

Registrar os itens acima em backlog ou `docs/DEPRECATIONS.md` conforme apropriado.
