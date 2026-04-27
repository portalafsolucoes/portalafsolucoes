# Plano de Ação — Check List Padrão V2: Famílias Interativas

**Data:** 2026-04-27
**Autor:** Felipe / Claude Code (alinhamento iterativo)
**Escopo:** Tela `/maintenance-plan/standard-checklists`, formulário de criação/edição. Três melhorias de UX no bloco "Famílias e Etapas" do `StandardChecklistFormPanel`. **Não altera schema, API nem permissões.**

---

## 1. Objetivos

1. **Famílias colapsáveis** — cada grupo `(Família / Modelo)` pode ser expandido/colapsado pelo usuário, iniciando **fechado**, com chevron inline padrão `ModalSection`.
2. **Reordenação por setas ↑/↓** — em cada etapa do grupo, dois botões trocam a ordem com a etapa vizinha. Sem drag-and-drop.
3. **Seleção + Copiar para outras famílias** — checkbox à esquerda de cada etapa; quando há ≥1 etapa selecionada num grupo, aparece o botão "Copiar para (N)" no header da família. Clique abre popover com checkboxes das demais famílias do checklist; ao confirmar, etapas são copiadas para os grupos alvo, **deduplicando por `genericStepId`** (etapas já existentes no alvo, e duplicatas entre as próprias copiadas, são puladas). Etapas em branco (sem `genericStepId`) são **ignoradas** no copy.

Persistência segue idêntica: o PUT/POST já reescreve grupos+etapas a partir do array, com `order` derivado do índice. Nenhuma mudança de backend é necessária.

---

## 2. Decisões consolidadas

| Tema | Decisão |
|---|---|
| Reordenação | Setas ↑/↓ (sem drag-and-drop) |
| Estado inicial das famílias | **Fechadas** |
| Escopo de seleção/cópia | **Por família** — cada grupo tem seu próprio "Copiar para" |
| Etapas em branco no copy | **Ignoradas** (sem `genericStepId`) |
| Posição do checkbox | À esquerda do número da etapa |
| Etapas copiadas vão para | **Fim** da lista do grupo alvo |
| Dedupe | Por `genericStepId` no grupo alvo + entre as próprias copiadas |
| Após copiar com sucesso | Limpa seleção da origem; expande grupos alvo (feedback visual); fecha popover |
| Sumário no header colapsado | `(N etapas)` ao lado de "Família / Modelo" |
| "Selecionar todas" no grupo | Checkbox no topo da seção de etapas (só etapas com `genericStepId` preenchido) |
| "Copiar para" sem outras famílias | Botão não aparece (só faz sentido com >1 família no checklist) |
| Etapas em branco selecionadas | Permitidas no checkbox (visual), filtradas no copy |
| Persistência de estado de UI | Apenas client-side; não vai no payload |

---

## 3. Arquivo único modificado

- [src/components/standard-checklists/StandardChecklistFormPanel.tsx](src/components/standard-checklists/StandardChecklistFormPanel.tsx) — lugar único de mudança.

API ([src/app/api/maintenance-plans/standard-checklists/[id]/route.ts](src/app/api/maintenance-plans/standard-checklists/[id]/route.ts)) e schema **não** mudam.

---

## 4. Mudanças no estado do componente

```ts
// novo
const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
const [selectedStepsByGroup, setSelectedStepsByGroup] = useState<Record<string, Set<string>>>({})
const [copyMenuOpenFor, setCopyMenuOpenFor] = useState<string | null>(null)
const [copyTargets, setCopyTargets] = useState<Set<string>>(new Set())
```

`expandedGroups`: chaves de grupo abertos (`group.key`).
`selectedStepsByGroup`: `{ [group.key]: Set<step.key> }`.
`copyMenuOpenFor`: `group.key` cujo popover está aberto, ou `null`.
`copyTargets`: chaves de famílias alvo selecionadas no popover atual.

---

## 5. Helpers locais

```ts
const toggleGroup = (key: string) => { ... }
const toggleStepSelection = (groupKey: string, stepKey: string) => { ... }
const toggleSelectAllInGroup = (groupKey: string) => { ... }
const moveStepUp = (groupKey: string, idx: number) => { ... }
const moveStepDown = (groupKey: string, idx: number) => { ... }
const openCopyMenu = (groupKey: string) => { ... }
const closeCopyMenu = () => { ... }
const toggleCopyTarget = (groupKey: string) => { ... }
const performCopy = (sourceGroupKey: string) => { ... }
const stepCount = (group) => group.steps.filter(s => s.genericStepId).length
const selectionCount = (groupKey: string) => selectedStepsByGroup[groupKey]?.size ?? 0
```

`performCopy`:
1. Lê `selectedStepKeys = selectedStepsByGroup[sourceGroupKey] ?? new Set()`.
2. Pega `etapasParaCopiar = sourceGroup.steps.filter(s => selectedStepKeys.has(s.key) && s.genericStepId)`.
3. Para cada `targetKey ∈ copyTargets`, calcula `existing = new Set(target.steps.map(s => s.genericStepId).filter(Boolean))` e itera `etapasParaCopiar` adicionando ao alvo somente se `genericStepId` ainda não estiver em `existing`; depois adiciona ao `existing` para evitar duplicatas no próprio batch.
4. Atualiza `familyGroups` em uma única chamada de `setFamilyGroups`.
5. `setExpandedGroups(prev => new Set([...prev, ...copyTargets]))`.
6. `setSelectedStepsByGroup(prev => ({ ...prev, [sourceGroupKey]: new Set() }))`.
7. `closeCopyMenu()`.

---

## 6. Mudanças visuais — header da família

```
[chevron] Família / Modelo  ── span flex-1   [N etapas]   [Copiar para (N)]   [Remover grupo]
```

- `chevron`: `expand_more` (aberto) ou `chevron_right` (fechado), inline `text-gray-600 text-base`.
- O header inteiro vira `<button type="button">` que alterna `expandedGroups`.
- Sufixo `(N etapas)` aparece sempre (aberto e fechado) com `text-[11px] text-muted-foreground`.
- Botão "Copiar para (N)" só aparece quando `selectionCount(group.key) > 0` **e** existem ≥2 famílias no checklist. `stopPropagation` no clique para não fechar/abrir o grupo.
- Botão "Remover grupo" mantém comportamento atual; também ganha `stopPropagation`.

Conteúdo das etapas (atualmente sempre visível) passa a renderizar somente quando `expandedGroups.has(group.key)`.

---

## 7. Mudanças visuais — linha de etapa

Atual:
```
[01]  [GenericStepCombobox]  [×]
```

Novo:
```
[☐]  [01]  [GenericStepCombobox]  [↑]  [↓]  [×]
```

- Checkbox: `<input type="checkbox" />` controlado por `selectedStepsByGroup[group.key]?.has(step.key)`.
- Setas: `<button type="button">` com `Icon name="arrow_upward" / "arrow_downward"`. Desabilitado no extremo (`idx === 0` para ↑, `idx === group.steps.length - 1` para ↓), `text-muted-foreground hover:text-foreground disabled:opacity-30`.
- "Selecionar todas" no topo (visível só com grupo aberto e existindo ≥1 etapa com `genericStepId`):
  ```
  [☐ Selecionar todas]      (acima da listagem de etapas, antes do "Adicionar etapa")
  ```
  Estado: `indeterminate` quando seleção parcial; `checked` quando todas as etapas válidas estão selecionadas.

---

## 8. Mudanças visuais — popover "Copiar para"

Posicionamento: abaixo do botão "Copiar para (N)", `absolute right-0 top-full mt-1 z-20`. Container: `bg-card border border-gray-200 rounded-[4px] shadow-lg w-80 p-3`.

Conteúdo:
```
Copiar N etapa(s) para:
─────────────────
[☐] Família X / Modelo Y     (3 etapas)
[☐] Família Z / Modelo W     (0 etapas)
...
─────────────────
[Cancelar]                    [Copiar (M)]
```

- Listagem de **demais famílias do checklist** (exclui o grupo origem).
- Cada item: checkbox + nome `assetFamilyName / familyModelName` + sufixo `(N etapas)`.
- Botão `Copiar (M)` desabilitado quando `copyTargets.size === 0`.
- Click outside fecha o popover (handler em `useEffect` com `mousedown`).
- ESC fecha o popover.

---

## 9. Comportamento ao remover etapa/grupo

- `removeStep(groupKey, stepKey)` — limpa a entrada `stepKey` em `selectedStepsByGroup[groupKey]` quando existe.
- `removeGroup(groupKey)` — limpa `selectedStepsByGroup[groupKey]`, `expandedGroups.delete(groupKey)` e fecha o popover se estava aberto para esse grupo.

---

## 10. Critérios de aceite

- [ ] Famílias iniciam fechadas.
- [ ] Clicar no header (qualquer área que não seja botão) alterna aberto/fechado, com chevron correto.
- [ ] Header colapsado mostra `(N etapas)` com contagem só de etapas válidas (`genericStepId` preenchido).
- [ ] Setas ↑/↓ trocam etapas com a vizinha; ↑ desabilitado na primeira; ↓ desabilitado na última.
- [ ] Reordenação não muda o checkbox marcado da etapa (chave estável).
- [ ] Checkbox da etapa marca/desmarca individualmente.
- [ ] Checkbox "Selecionar todas" do grupo: marca todas as etapas com `genericStepId`; estado `indeterminate` quando seleção parcial.
- [ ] Botão "Copiar para (N)" só aparece quando `selectionCount > 0` **e** há ≥2 famílias.
- [ ] Popover lista somente as **outras** famílias do checklist com contagem de etapas.
- [ ] Click outside e ESC fecham o popover.
- [ ] Copy: etapas em branco são ignoradas; duplicatas por `genericStepId` no alvo são puladas; duplicatas no próprio batch também.
- [ ] Após copiar: seleção da origem zera; popover fecha; grupos alvo abrem.
- [ ] Salvar/editar persiste a nova ordem das etapas (validação manual abrindo o registro depois).
- [ ] `isPhone` continua funcional (componente não usa hooks responsivos novos; layout em coluna única segue ok).
- [ ] Sem regressão visual: paleta, tipografia, padrão de spacing seguem o existente.

---

## 11. Verificação

1. `npm run lint` — garantir sem erros novos.
2. `npm run build` — confirmar typecheck e build estáveis.
3. Smoke manual via preview (descrita em `CLAUDE.md` para mudanças de UI): abrir `/maintenance-plan/standard-checklists`, criar/editar um checklist, exercitar:
   - Toggle de famílias (chevron).
   - Reordenar 2-3 etapas.
   - Selecionar etapas de um grupo, copiar para outros 2 grupos, conferir dedupe e expansão automática.
   - Salvar; reabrir; verificar nova ordem persistida.

---

## 12. Documentação

Atualizar [.claude/rules/components.md](.claude/rules/components.md), seção **"Tela Check List Padrao"**, registrando:

- Famílias colapsáveis (default fechadas, chevron inline padrão `ModalSection`).
- Reordenação por setas ↑/↓.
- Seleção + "Copiar para" com dedupe por `genericStepId`; etapas vazias ignoradas; popover lista demais famílias do checklist.

Sem mudanças em `docs/SPEC.md`, `.claude/rules/api.md` ou `.claude/rules/database.md` (sem mudança de contrato/schema).

---

## 13. Ordem de execução

1. Ler arquivo atual e mapear os pontos de inserção.
2. Refator do estado (novos `useState`, helpers).
3. Refator do JSX (header colapsável + checkbox + setas + popover).
4. `npm run lint` e ajuste de tipos.
5. `npm run build` para confirmar typecheck.
6. Atualização de `.claude/rules/components.md`.
7. Reportar conclusão com pontos verificados.
