---
globs: src/components/**,src/app/**/page.tsx
---

# Componentes e Paginas

## Texto em MAIUSCULAS (padrao do sistema)
- O `<Input>` de `@/components/ui/Input` aplica `text-transform: uppercase` por default (classe `uppercase`); o banco recebe o valor ja normalizado via `normalizeTextPayload` no servidor
- Passar `preserveCase` em inputs onde o case importa:
  - Email, senha, URL, telefone, numero (detectados automaticamente via `type`: `email`, `password`, `url`, `tel`, `number`)
  - Textareas e campos de descricao longa (`description`, `notes`, `observation`, `feedback`)
  - Exemplo: `<Input preserveCase ... />`
- **NAO** converter manualmente via `onChange={e => e.target.value.toUpperCase()}` — o `text-transform` cuida do visual e o servidor cuida da normalizacao definitiva
- Para `<textarea>` bruto em formularios, manter estilo original (sem `uppercase`) quando o conteudo for descricao longa

## Papeis de Componentes React
- Por padrao, prefira Server Components para paginas e blocos sem interatividade direta
- Use `'use client'` somente quando houver hooks de estado/efeito, eventos do navegador, refs, modais, tabelas interativas, uploads ou integracao com React Query/Zustand
- Nao colocar regra de permissao apenas na UI; componentes podem esconder acoes, mas a validacao real continua no servidor
- A pagina deve respeitar redirects por perfil: perfis operacionais entram por `Ordens de Servico`; os demais entram por `Dashboard`

## Convencoes de UI e Imports
- Importar componentes de layout por `@/components/layout/*`
- Importar componentes visuais reutilizaveis por `@/components/ui/*`
- Preferir imports absolutos `@/` em vez de cadeias longas de relativos
- Usar o design system existente com `Tailwind CSS v4`, `Shadcn/UI`, `Recharts` e icones no padrao `Material Symbols`
- O botao de acao principal deve usar o componente `<Button>`; nao usar `<button>` raw para acoes padronizadas

## Responsividade (OBRIGATORIO)

### Breakpoints oficiais

| Faixa | Nome | Viewport | Sidebar | Split-panel | Painel de detalhe |
|-------|------|----------|---------|-------------|-------------------|
| < 768px | Phone | Celular | Drawer temporario | Nao | Overlay fullscreen |
| 768–1279px | Compact | Tablet / Desktop compacto | Drawer temporario | Nao | Overlay sheet lateral (max-w-2xl) |
| >= 1280px | Wide | Desktop amplo | Permanente (colapsavel) | Sim (50/50) | InPage panel |

- Split-panel so e renderizado em `>= 1280px` (alinhado com Tailwind `xl:`)
- Sidebar permanente so em `>= 1280px`; abaixo disso e drawer controlado por `mobileMenuOpen` no `SidebarContext`

### Hook unificado: `useResponsiveLayout()`
Arquivo: `src/hooks/useMediaQuery.ts`

```ts
const { isPhone, isCompact, isWide } = useResponsiveLayout()
// isPhone   = celular (< 768px)
// isCompact = nao suporta split-panel (< 1280px, inclui phone + tablet + desktop compacto)
// isWide    = desktop amplo, suporta split-panel (>= 1280px)
```

- **NAO** usar `useIsMobile()`, `useIsDesktop()`, `useIsTablet()` — sao aliases deprecados
- `isWide` e a condicao correta para exibir split-panel ou comportamento exclusivo de desktop

### Componente AdaptiveSplitPanel (OBRIGATORIO em listagens)
Arquivo: `src/components/layout/AdaptiveSplitPanel.tsx`

Todo painel lateral de listagem DEVE usar este componente. Ele decide internamente:
- `isWide`: renderiza `w-1/2 list` + `w-1/2 panel` lado a lado
- `isCompact` (nao-phone): renderiza lista full-width + painel como overlay sheet lateral (slide-in da direita)
- `isPhone`: renderiza lista full-width + painel como overlay fullscreen

```tsx
<AdaptiveSplitPanel
  list={<MinhaListagem />}
  panel={hasSidePanel ? <MeuPainel /> : null}
  showPanel={hasSidePanel}
  panelTitle="Titulo do Painel"
  onClosePanel={() => setSelectedItem(null)}
/>
```

- **NAO** recriar o padrao manual `{hasSidePanel && <div className="w-1/2">...</div>}` — usar este componente
- O `panelTitle` e usado como titulo do Modal no modo compacto/phone

### Regras responsivas para UI elements

**Busca**:
```tsx
<div className="relative w-full sm:w-48 xl:w-64">...</div>
```

**Filtros select**:
```tsx
<select className="w-full sm:w-auto ...">
```

**Botao primario (texto escondido no mobile)**:
```tsx
<Button>
  <Icon name="add" className="text-base" />
  <span className="hidden sm:inline ml-2">Adicionar Item</span>
</Button>
```

**Grids de formulario**:
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
```
Nunca usar `grid-cols-2` sem fallback `grid-cols-1` — em phone o formulario deve ficar em coluna unica.

**Touch targets**:
- Botoes de acao em paineis: `min-h-[44px]` obrigatorio
- Rows de tabela: `py-3` minimo em listas usadas em campo (contexto industrial)

**Container de acoes no PageHeader**:
```tsx
<div className="flex items-center gap-2 flex-wrap">
```
O `flex-wrap` e obrigatorio para evitar overflow horizontal em telas estreitas.

## Sincronizacao de Documentacao
- Se uma mudanca alterar padroes reutilizaveis de pagina, modal, listagem, painel ou layout, atualizar este arquivo no mesmo ciclo
- Se a mudanca afetar comportamento funcional percebido pelo usuario, atualizar tambem a secao correspondente em `docs/SPEC.md`

## Layout de Paginas (OBRIGATORIO)
Toda tela (`page.tsx`) DEVE usar os componentes `PageContainer` e `PageHeader`. Nunca defina padding, max-width ou titulo de pagina manualmente.

### PageContainer (`src/components/layout/PageContainer.tsx`)
Escolha a variante correta:

| Variante | Quando usar | Largura |
|----------|-------------|---------|
| `default` | Listagens, dashboards, tabelas | 100% (sem max-width) |
| `narrow` | Paginas de detalhe | max-w-4xl (896px) |
| `form` | Formularios de criacao/edicao | max-w-3xl (768px) |
| `full` | Layouts full-height | 100% + flex column |

```tsx
<PageContainer>...</PageContainer>
<PageContainer variant="narrow">...</PageContainer>
<PageContainer variant="form">...</PageContainer>
<PageContainer variant="full" className="overflow-hidden">...</PageContainer>
```

### PageHeader (`src/components/layout/PageHeader.tsx`)
Padrao visual:
- Titulo: `text-3xl font-bold text-foreground tracking-tight`
- Descricao: `mt-1 text-sm text-muted-foreground`

```tsx
<PageHeader
  title="Nome da Pagina"
  description="Descricao opcional"
  actions={<Button>Acao</Button>}
/>
```

### Regras de Layout
- **NAO** use `<AppLayout>`; e legado
- **NAO** adicione `px-*`, `py-*`, `max-w-*`, `mx-auto` nos wrappers principais
- **NAO** crie `<h1>` manual para o titulo da pagina
- **NAO** use icones no titulo do `PageHeader`
- O `AppShell` fornece sidebar, header e scroll; o espacamento da pagina e responsabilidade do `PageContainer`

## Padrao de Tela de Listagem (OBRIGATORIO)
Referencia canonica: telas de `Pessoas` e `Ativos`.

### Cards no mobile (OBRIGATORIO)

Toda listagem DEVE renderizar **cards** quando `isPhone` (< 768px) em vez da tabela desktop. Isso garante ergonomia em celular e scroll funcional.

**Padrao de wrapper (obrigatorio):** o conteudo de `list={...}` do `AdaptiveSplitPanel` DEVE ter o wrapper canonico que envolve tanto o modo cards quanto o modo tabela:

```tsx
list={
  loading ? (...) :
  items.length === 0 ? (...) : (
    <div className="h-full flex flex-col overflow-hidden">
      {(viewMode === 'grid' || isPhone) && (
        <div className="overflow-auto flex-1 p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* card items */}
          </div>
        </div>
      )}
      {viewMode === 'table' && !isPhone && (
        <div className="h-full flex flex-col bg-card overflow-hidden">
          <div className="flex-1 overflow-auto min-h-0">
            <table className="min-w-full divide-y divide-gray-200">...</table>
          </div>
        </div>
      )}
    </div>
  )
}
```

**Por que o wrapper `<div className="h-full flex flex-col overflow-hidden">` e obrigatorio:** no modo compact do `AdaptiveSplitPanel`, o container interno e `<div className="w-full overflow-hidden">` — nao e `flex flex-col` com altura. Sem o wrapper, o `flex-1 overflow-auto` dos cards nao se expande corretamente e o scroll quebra.

**Campos minimos de um card mobile:**
- Titulo (bold, truncate se longo) + badge/status no topo
- Subtitulo opcional (codigo, area, origem)
- 2-3 metadados em linha (`flex flex-wrap gap-x-3 gap-y-1`) com `text-[11px]` ou `text-xs`
- Click no card abre o painel/detalhe (mesmo callback da linha da tabela)

**Hook correto:** usar `const { isPhone } = useResponsiveLayout()` do `@/hooks/useMediaQuery`. Nao usar `useIsMobile()` legado.

- Excecao documentada: em `/people-teams`, o toggle de visualizacao deve oferecer apenas `Tabela` e `Grade`; o modo `Arvore` nao deve aparecer nessa tela
- Em `/people-teams`, a coluna e os campos de `Papel` devem usar o papel canonico de acesso do produto; `Cargo` deve usar exclusivamente `jobTitle` como funcao profissional da pessoa
- Quando o campo `Cargo` aparecer em formularios de usuario, ele deve ser renderizado como selecao baseada em `Cadastros Basicos > Cargos`, e nao como texto livre

### Estrutura da pagina
```tsx
<PageContainer variant="full" className="overflow-hidden p-0">
  {/* Header */}
  <div className="border-b border-border px-4 py-3 md:px-6 flex-shrink-0">
    <PageHeader title="..." description="..." className="mb-0" actions={...} />
  </div>

  {/* Content */}
  <div className="flex flex-1 overflow-hidden">
    <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-card">
      {/* Left: tabela/arvore/grade */}
      <div className={`${hasSidePanel ? 'w-1/2 min-w-0' : 'w-full'} transition-all overflow-hidden`}>
        ...
      </div>
      {/* Right: painel lateral */}
      {hasSidePanel && <div className="w-1/2 min-w-0">...</div>}
    </div>
  </div>
</PageContainer>
```

Regras:
- Header wrapper: `border-b border-border px-4 py-3 md:px-6 flex-shrink-0`
- PageHeader: sempre com `className="mb-0"` para espacamento compacto
- Content wrapper: `border-t border-border bg-card` (borda cinza no topo, fundo branco)
- Sem padding no content wrapper; conteudo preenche ate as bordas
- Sem `rounded-[4px]` ou `ambient-shadow` em tabelas dentro do split-panel
- Sem footer de contagem abaixo das tabelas

### Ordem dos controles no PageHeader
```txt
Busca (w-64) > Toggle de visualizacao > Filtros > Exportacao (Excel) > Acao primaria (Adicionar)
```

- Busca: `relative w-64` com icone `search` interno
- Toggle: `bg-muted rounded-[4px] p-1`, botoes com `px-3 py-1.5 rounded-[4px] text-sm font-medium`
- Toggle ativo: `bg-background text-foreground ambient-shadow`
- Toggle inativo: `text-muted-foreground hover:text-foreground`
- Ordem do toggle: **Tabela** primeiro, depois Grade, Arvore (tabela e sempre o default)
- View mode default: `useState<ViewMode>('table')`
- Filtros: `h-9 px-3 text-sm border border-input rounded-[4px] bg-background`
- Botao adicionar: `bg-accent-orange hover:bg-accent-orange/90 text-white font-bold shadow-md`, nunca `<button>` raw

### Tabelas de listagem
- Container: `h-full flex flex-col bg-card overflow-hidden` (sem rounded, sem shadow)
- Scroll: `flex-1 overflow-auto min-h-0`
- Table: `min-w-full divide-y divide-gray-200`
- Thead: `sticky top-0 bg-secondary z-10`
- Th: `px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider`
- Tbody: `bg-card divide-y divide-gray-200`
- Tr: `odd:bg-gray-50 even:bg-white hover:bg-secondary cursor-pointer transition-colors`
- Td: `px-6 py-4 whitespace-nowrap text-sm text-foreground`
- Sem footer de contagem; a tabela termina limpa
- Colunas ordenaveis: icone `unfold_more` (inativo) ou `arrow_upward`/`arrow_downward` (ativo); icone ativo usa `text-accent-orange`

### Painel lateral (Detail/Edit)
- Container: `h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]`
- Header: `flex items-start justify-between px-6 py-5 bg-gray-50 border-b border-gray-200`
- Titulo: `text-lg font-black text-gray-900`
- Close: `flex items-center justify-center p-2 bg-white border border-gray-200 hover:bg-gray-100 rounded-md text-gray-500 shadow-sm transition-colors` com icone `close` de tamanho `text-xl`
- Tabs: `TabsList className="w-full justify-start border-b rounded-none px-4"`
- Barras de secao: `flex items-center gap-3 mb-4 bg-gray-100 border border-gray-200 p-2.5 rounded-md shadow-sm`
- Section title: `font-bold text-[12px] uppercase tracking-wider text-gray-900`
- Fields grid: `grid grid-cols-2 gap-x-4 gap-y-3 px-1`
- Labels: `text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-0.5`
- Values: `text-[13px] font-medium text-gray-900`
- Botao Editar: `bg-gray-900 text-white hover:bg-gray-800 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-[4px]`
- Botao Excluir: `bg-danger text-white hover:bg-danger/90 w-full flex items-center justify-center gap-2 px-4 py-2 rounded-[4px]`
- **NAO** use `border-on-surface-variant/10`; use sempre `border-gray-200` ou `border-gray-300`

### Regras dos botoes de acao no painel de detalhe (OBRIGATORIO)
- Usar o componente `<PanelActionButtons>` de `@/components/ui/PanelActionButtons` para renderizar os botoes Editar e Excluir
- Os botoes devem ser **sempre empilhados verticalmente** (`space-y-2`) — **nunca lado a lado** (`flex gap-2`)
- O texto dos botoes deve ser **sempre generico**: "Editar" e "Excluir" — **nunca incluir o nome da entidade** (ex: "Editar Ativo", "Excluir Pessoa")
- Ordem fixa: Editar em cima, Excluir embaixo
- Excluir sempre com fundo vermelho preenchido (`bg-danger text-white`), nunca outline/branco

### Secoes colapsaveis nos paineis (OBRIGATORIO)
- Usar chevron **inline**, no mesmo padrao de `ModalSection.tsx` e `AssetEditPanel.tsx`
- **NAO** usar wrapper `bg-white p-1 rounded border` em volta do chevron (como o `PanelSection` legado em PersonFormModal)
- Padrao correto do header colapsavel:
```tsx
<button className="w-full flex items-center gap-2 px-4 py-2.5 bg-gray-100 border border-gray-200 text-[12px] font-bold text-gray-900 uppercase tracking-wider hover:bg-gray-200 transition-colors">
  <Icon name={open ? 'expand_more' : 'chevron_right'} className="text-base text-gray-600" />
  Titulo da Secao
</button>
```

### Painel de edicao (inPage)
- Container: `h-full flex flex-col bg-card border-l border-gray-300 shadow-[-15px_0_30px_rgba(0,0,0,0.05)]`
- Header: `flex items-center justify-between px-6 py-5 bg-gray-50 border-b border-gray-200`
- Form: `flex flex-1 min-h-0 flex-col` (NUNCA `h-full`, causa overflow)
- Content: `flex-1 overflow-y-auto p-4 space-y-3`
- Footer fixo: `flex gap-3 px-6 py-4 bg-gray-50 border-t border-gray-200`
- Botoes: ambos com `flex-1` (mesma largura, 50/50)
- Cancelar: `<Button variant="outline" className="flex-1">Cancelar</Button>`
- Salvar: `<Button type="submit" className="flex-1 bg-gray-900 text-white hover:bg-gray-800"><Icon name="save" /> Salvar Alterações</Button>`

### Loading state
```tsx
<div className="flex-1 flex items-center justify-center">
  <div className="text-center">
    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-on-surface-variant"></div>
    <p className="mt-2 text-muted-foreground">Carregando...</p>
  </div>
</div>
```

- **NAO** use `border-blue-600`; use `border-on-surface-variant`

## Tela Dashboard (OBRIGATORIO)
- Rota `/dashboard`, paleta **estritamente monocromatica**: pretos, brancos e tons de cinza. Nao usar verde/amarelo/azul/vermelho nos KPIs, charts, alertas ou paineis. `accent-orange` continua permitido em outras telas, mas **NAO** no Dashboard
- Paleta canonica em `src/components/dashboard/dashboardPalette.ts`: `primary #111827`, `primaryDim #374151`, `muted #6b7280`, `mutedLight #9ca3af`, `surface #f3f4f6`. `STATUS_COLORS` (OS) tambem remapeado para grayscale
- Hierarquia visual por **peso e tom**, nao por cor: critico/relevante usa `primary` + `font-black`; secundario usa `muted`/`mutedLight` + `font-bold`; KPIs `improved/worsened` usam `text-foreground` + `font-black`, neutros usam `text-muted-foreground` + `font-bold`
- Charts com 3+ series usam **padroes SVG (hachuras)** para diferenciar sem cor. Componente canonico: `<ChartPatterns />` em `src/components/dashboard/ChartPatterns.tsx` expondo os IDs `pattern-diagonal`, `pattern-dots`, `pattern-horizontal`, `pattern-crosshatch` em `<defs>`. Uso: `fill="url(#pattern-diagonal)"` nas series Recharts. Legendas CSS usam `repeating-linear-gradient` para casar com o SVG
- Convencoes por chart: `CorrectivePreventiveTrend` — preventivas hachuradas (diagonal), corretivas solidas (primary); `WorkOrderTypeChart` — PREVENTIVE diagonal, CORRECTIVE primary, OTHER mutedLight; `CostBreakdownChart` — Mao de obra primary, Pecas diagonal, Terceiros dots, Ferramentas mutedLight; `GUTDistributionChart` — critical (primary + padrao), high (primaryDim), medium (muted), low (mutedLight); `PMCTrendChart` — PMC solid primary com gradient, Disponibilidade dashed muted, Meta dashed mutedLight
- `AlertsPanel` usa tones semanticos renomeados: `critical` (text-foreground, peso maior), `attention` (text-on-surface-variant), `muted` (text-muted-foreground). Substitui vermelho/amarelo/cinza do legado
- `AlertsPanel` inclui o item `Ações de RAF a vencer (7d)` (icone `hourglass_bottom`, tone `attention`, href `/rafs/action-plan`) alimentado por `alerts.dueSoonRafActions` do endpoint `GET /api/dashboard/overview`. O contador somou acoes de RAF com `deadline` entre hoje e hoje+7 dias e status `!= COMPLETED`
- A API `/api/dashboard/overview` mantem `summary.assets.down` para alimentar o hint do KPI card `Ativos Parados`, mas o item dedicado `Ativos parados` foi removido do `AlertsPanel` em favor do alerta de RAF a vencer

## Grupo `Analise de Falhas` na Sidebar (OBRIGATORIO)
- A sidebar expoe o grupo expansivel `Analise de Falhas` (icone `troubleshoot`, module `rafs`) agrupando dois sub-itens:
  - `RAFs` → `/rafs`
  - `PA das RAFs` → `/rafs/action-plan`
- O grupo e gated pela permissao `hasPermission(user, 'rafs', 'view')`; perfis sem acesso a `rafs` nao veem o grupo inteiro

## Tela PA das RAFs (OBRIGATORIO)
- Rota `/rafs/action-plan`, componentes em `src/components/rafs/ActionPlan*.tsx`
- Componentes canonicos: `ActionPlanTable` + `ActionPlanCards` (mobile), `ActionPlanDashboardCards` (4 KPIs), `ActionPlanFilters`, `ActionPlanLegend`, `ActionPlanStatusBadge`
- Paleta estritamente **monocromatica**: pretos, brancos e tons de cinza. Nao usar verde/amarelo/azul/vermelho. Status de acao usa simbolos: `○` PENDING, `◐` IN_PROGRESS, `✓` COMPLETED, `◔` (borda tracejada) DUE_SOON, `●` (borda preta negrito) OVERDUE. Precedencia no badge: `COMPLETED` > `OVERDUE` > `DUE_SOON` > status bruto
- Selecao de responsavel usa o componente `ResponsibleSelect` em `src/components/rafs/ResponsibleSelect.tsx`. Consome `/api/users` (mesma fonte de `/people-teams`) **sem filtro por role** — qualquer pessoa cadastrada na empresa pode ser atribuida como responsavel por uma acao, ja que "responsavel" e atributo operacional da acao, nao papel de acesso ao sistema. Busca por nome, email ou cargo (`jobTitle`). Marca `(inativo)` quando `enabled === false` ou `status !== 'ACTIVE'`. Ordena ativos antes dos inativos. Limita a 30 resultados visiveis e sinaliza `+N resultado(s) — refine a busca` quando o total exceder. Usado em `RAFFormModal`, `RAFEditModal` e lido pelo `RAFViewModal`
- Layout do bloco `Plano de Acao` dentro de `RAFFormModal` e `RAFEditModal` usa **card-por-item** (nao tabela densa): cada acao e um cartao `border rounded-[4px] p-3 bg-gray-50/60` com header `Item N` + botao de remover, seguido de duas linhas em grid — linha 1 `md:grid-cols-3` (Responsavel, Prazo, Status) e linha 2 `md:grid-cols-2` (Assunto, Descricao da Acao). No `RAFEditModal` ha uma terceira linha alinhada a direita para `N° OS` / botao `Gerar OS`. Esse padrao substitui a tabela horizontal anterior que quebrava em paineis lateral `w-1/2`
- Edicao inline de status e **gated por permissao**: so renderiza `<select>` quando `hasPermission(user, 'rafs', 'edit' | 'create')`; caso contrario mostra `ActionPlanStatusBadge` readonly
- Mudanca de status dispara `PUT /api/rafs/[id]` com o `actionPlan` atualizado; a pagina recarrega em seguida para pegar o `status` da RAF recalculado server-side
- Alerta `A vencer (7d)`: janela padrao em `DUE_SOON_WINDOW_DAYS = 7` (helper `isDueSoon` em `src/lib/rafs/deadline.ts`). Entra no filtro de status de acao como opcao `DUE_SOON` (label `A vencer (7d)`) e na legenda. Acoes sem prazo NAO sao consideradas a vencer
- Destaque visual da coluna `Prazo`: valores **vencidos** ficam em `font-bold` com borda esquerda solida preta (`border-l-2 border-gray-900`); valores **a vencer** ficam em `font-semibold` com borda esquerda tracejada (`border-l-2 border-dashed border-gray-500`). Acoes `COMPLETED` nao recebem destaque
- **Ordenacao client-side em todas as colunas** via `SortableHeader` (icones `unfold_more` inativo, `arrow_upward`/`arrow_downward` ativo em `text-accent-orange`). Cada clique alterna `asc`/`desc`. Default: `Prazo ASC`. NULLS LAST em todos os campos opcionais. A ordenacao vigente e respeitada pela exportacao Excel
- Responsividade: `isPhone` renderiza `ActionPlanCards` em grade responsiva `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3`; cada card e clicavel para abrir a RAF e o `<select>` de status usa `min-h-[44px]` + `stopPropagation` para nao conflitar com o clique do card. Wrapper canonico `<div className="h-full flex flex-col overflow-hidden">` no `list` do `AdaptiveSplitPanel`
- Export Excel usa `ExportButton entity="action-plan-items"` (config em `src/lib/exportExcel.ts`); gera uma linha por acao com colunas: RAF, Acao, Responsavel, Data criacao, Data ocorrencia, Prazo, OS, Status OS, SS, Status SS, Status da acao (`Concluida`/`Em andamento`/`Atrasada`/`A vencer`/`Pendente`), Status da RAF

## Fluxo de Registro Publico e Aprovacao (OBRIGATORIO)
- `/register` e rota publica coberta pelo `publicRoutes` do `AppShell` e do `middleware.ts`; nunca voltar a redireciona-la para `/login`
- A tela `/register` usa autofill de CNPJ via BrasilAPI e abre `/register/pending` apos o submit
- `/register/verify?token=...` trata sete estados distintos: `loading`, `verified`, `already`, `expired` (HTTP 410), `invalid` (404), `missing` (sem token), `error` (fallback). Usar o helper `renderView(status, message)` para manter icone, titulo e descricao consistentes
- Em `/login` e `/hub`, expor entry point para `/register` (`Cadastre-se` no login, `Cadastre sua empresa` no hub ao lado do `Acessar`)
- Em `/admin/portal`, a listagem de empresas tem filtros `Todas / Pendentes / Ativas / Rejeitadas`, banner ambar com contagem de pendentes e `StatusBadge` por linha. Para empresas `PENDING_APPROVAL`, o painel de detalhe deve mostrar o bloco `Dados do cadastro` (CNPJ, razao social, cidade/UF, admin, produtos solicitados) e substituir Editar/Excluir por Aprovar (sucesso) e Rejeitar (motivo obrigatorio em textarea). Para empresas `REJECTED`, exibir o motivo em bloco `bg-danger-light`

## Trocar Empresa e Administracao do Portal no UserMenu
- O `UserMenu` (header, top-right) expoe, **apenas para SUPER_ADMIN** (via `normalizeUserRole(user) === 'SUPER_ADMIN'`), os itens `Trocar empresa` (icone `swap_horiz`) e `Administracao do Portal` (icone `admin_panel_settings`)
- `Trocar empresa` chama `POST /api/admin/switch-company` com `{ companyId: null }`, invalida `['auth', 'me']` e `['company-modules']` no React Query e navega para `/admin/select-company`
- `/admin/select-company` e rota publica coberta pelo `AppShell` (sem sidebar/header) — nao adicionar layout interno por cima

## Sino de Notificacoes (OBRIGATORIO)
- O componente `NotificationBell` em `src/components/layout/NotificationBell.tsx` fica no header principal, imediatamente a esquerda do `UserMenu` e a direita do `UnitSelector`
- Usa React Query (`queryKey: ['notifications']`) com `refetchInterval: 60_000` e `staleTime: 30_000`
- Dropdown de 20rem (`w-80`) com header `Notificacoes` + link `Marcar todas como lidas`; cada notificacao tem ponto azul se nao lida, titulo truncado, mensagem em 2 linhas e tempo relativo em portugues
- Clique em uma notificacao marca como lida e, se tiver `href`, navega para a URL
- Badge vermelho com contagem (`99+` maximo) posicionado absolutamente no canto superior direito do botao

## Troca Forcada de Senha (OBRIGATORIO)
- Quando `user.mustChangePassword === true` (retornado por `/api/auth/me`), o `ForcedPasswordChangeGuard` dentro de `AppShell` redireciona o usuario para `/change-password` em todas as rotas internas
- A tela `/change-password` e rota **publica** no `AppShell` e exibe layout autocontido (sem sidebar/header); no fluxo forcado, esconde o botao `Cancelar` e altera o titulo para `Defina uma nova senha`
- No painel de detalhe de `Pessoas` (`UserDangerActions`), o botao `Resetar senha` (disponivel apenas para status `ACTIVE`) chama `POST /api/users/[id]/reset-password` e exibe a senha temporaria em um overlay com botao `Copiar senha`. A senha nao deve ser exibida em nenhum outro lugar (toast, log, e-mail automatico)

## Logo da Empresa na Sidebar (OBRIGATORIO)
- A logo no topo esquerdo da sidebar deve vir **exclusivamente** de `user.company.logo` retornado por `/api/auth/me`
- **NAO** hardcode logos em `public/`, `imagens/` ou qualquer arquivo local para uso na sidebar principal
- A logo deve ficar na mesma linha do botao hamburguer quando a sidebar estiver expandida
- A imagem deve aparecer **inteira**, sem corte, respeitando a proporcao original
- Use `object-contain` com alinhamento a esquerda para encaixar marcas horizontais
- **NAO** aplicar filtros CSS que alterem a arte original da logo, como `invert`, `brightness`, `contrast` ou similares
- Durante a hidratacao/carregamento inicial, **NAO** exibir o texto fallback `Portal AF Solucoes` no lugar da logo; use placeholder neutro ate os dados do usuario carregarem
- O fallback textual com nome da empresa ou app so pode aparecer quando realmente nao existir logo configurada no banco

## Header Superior Limpo (OBRIGATORIO)
- O lado esquerdo do header superior de todas as telas internas deve permanecer vazio
- **NAO** exibir o texto fixo `CMMS` no header principal
- **NAO** exibir o nome da empresa logada nessa area do topo
- O header deve manter apenas os controles funcionais do lado direito

## Modais e Popups (OBRIGATORIO)
Todo modal do sistema DEVE seguir o padrao abaixo. Referencia visual: modal "Adicionar Pessoa".

### Componentes
| Componente | Arquivo | Funcao |
|------------|---------|--------|
| `Modal` | `src/components/ui/Modal.tsx` | Container do modal com overlay, header, scroll e centralizacao |
| `ModalSection` | `src/components/ui/ModalSection.tsx` | Secao colapsavel com fundo cinza e chevron |

### Modal (`src/components/ui/Modal.tsx`)
Props:
- `isOpen`, `onClose`, `title` (obrigatorios)
- `size`: `sm`, `md`, `lg`, `xl`, `xxl`, `full`, `wide` (default: `wide`)
- `hideHeader`, `noPadding`, `inPage`

O size `wide` calcula a largura descontando a sidebar: `calc(100vw - sidebarWidth - 200px)` com max 1400px. O modal detecta automaticamente se a sidebar esta aberta (256px) ou fechada (64px) via `useSidebar()` e centraliza na area util.

### ModalSection (`src/components/ui/ModalSection.tsx`)
Secao colapsavel usada dentro de todo modal:
```tsx
<ModalSection title="Identificação">
  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
    {/* campos */}
  </div>
</ModalSection>
```

Props: `title` (string), `defaultOpen` (boolean, default: true), `children`.

### Estrutura padrao de um modal overlay
```tsx
<Modal isOpen={open} onClose={onClose} title="Titulo do Modal">
  <form onSubmit={handleSubmit}>
    <div className="p-4 space-y-3">
      <ModalSection title="Secao 1">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-1">Campo</label>
            <input className="w-full px-3 py-2 text-sm border border-gray-300 rounded-[4px] shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
          </div>
        </div>
      </ModalSection>
    </div>

    <div className="flex gap-3 px-4 py-4 bg-gray-50 border-t border-gray-200">
      <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
      <Button type="submit" className="flex-1 bg-gray-900 text-white hover:bg-gray-800">
        <Icon name="save" className="text-base mr-2" />
        Salvar Alterações
      </Button>
    </div>
  </form>
</Modal>
```

### Regras de Modais
- **NAO** crie modais com div manual (`fixed inset-0`); use sempre `<Modal>`
- **NAO** adicione `overflow-y-auto` ou `max-h-[75vh]` nos children; o Modal ja controla o scroll
- **NAO** duplique o botao de fechar (X); o header do Modal ja inclui
- **NAO** use `size="full"` com layout A4 customizado; use `size="wide"` com `ModalSection`
- **NAO** use `border-on-surface-variant/10`; use sempre `border-border`
- **NAO** use `border-blue-600` em spinners; use `border-on-surface-variant`
- Agrupe campos em `<ModalSection>` com titulos descritivos
- Labels: `text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1`
- Inputs: `w-full px-3 py-2 text-sm border border-input rounded-[4px] focus:outline-none focus:ring-2 focus:ring-ring`
- Grid: `grid grid-cols-2 md:grid-cols-3 gap-3`
- Footer: `flex gap-3 px-4 py-4 border-t border-border`
- Botoes: ambos com `flex-1` (mesma largura), Cancelar (outline) a esquerda, Salvar (primary) a direita
- Texto do botao salvar: "Salvar Alterações" (edicao) ou "Salvar" (criacao), com icone `save`
- O modal `Analisar Solicitação` em Aprovações deve usar `title` no `Modal`, `size="wide"` e `ModalSection`
- No `ApprovalModal`, os cards de decisao `Aprovar solicitação` e `Rejeitar solicitação` devem usar fundo semantico sutil mesmo quando inativos (`success-light` e `danger-light`), nunca branco puro; o estado selecionado deve reforcar borda e icone sem virar bloco de cor chapada

### Excecoes
- Modais de confirmacao (`ConfirmationModal`, `ConfirmDialog`): usam `size="sm"` sem `ModalSection`, permanecem overlay
- Nenhum outro modal deve usar overlay no desktop. Todo detalhe, edicao e criacao abre no painel lateral direito

### Deprecacao de Componentes de UI
- Componentes de UI substituidos mas mantidos temporariamente devem ser registrados em `docs/DEPRECATIONS.md`
- Nao usar componentes deprecados em codigo novo; sempre usar o substituto documentado

### Split-panel como padrao universal para listagens (OBRIGATORIO)
Toda tela de listagem DEVE usar o padrao split-panel no desktop para TODOS os fluxos (detalhe, edicao, criacao, execucao, finalizacao):
- Clicar em uma linha da tabela abre o painel de detalhe na metade direita (w-1/2)
- A tabela comprime para w-1/2 quando o painel esta aberto
- Do painel de detalhe, o botao Editar abre o formulario de edicao no mesmo painel direito
- O botao Adicionar abre o formulario de criacao no painel direito (fechando detalhe/edicao anterior)
- Executar, Finalizar e qualquer outra acao abrem no painel direito, nao como overlay
- No mobile (`useIsMobile`), todos os fluxos abrem como overlay `<Modal>` padrao
- Unica excecao para overlay: modais de confirmacao de exclusao (`ConfirmDialog`, `ConfirmationModal`)
- Os componentes devem aceitar prop `inPage` para renderizar como painel embutido
- Cada componente que suporta `inPage` deve renderizar: header com titulo + botao X, conteudo scrollavel, footer fixo
- Nos modais de `Pessoa`, criacao e edicao devem expor os mesmos campos operacionais do cadastro: nome, sobrenome, email, senha, telefone, cargo, papel, taxa/hora, localizacao, calendario, unidades de acesso e status

Referencia canonica: `people-teams/page.tsx` e `assets/page.tsx`.

## Print Views e Impressao em Lote (OBRIGATORIO)
- Toda print view de entidade (ex: `RAFPrintView`, `WorkOrderPrintView`) deve poder ser reutilizada em modo unitario ou em lote
- Modo unitario: recebe `{idEntidade}: string` + `onClose`, renderiza overlay fixo (`fixed inset-0 z-[9999]`) com toolbar Imprimir/Fechar e uma pagina A4 (`w-[210mm] min-h-[297mm]`). A toolbar e escondida na impressao via `print:hidden`
- Modo batch: um componente dedicado `{Entidade}sBatchPrintView` recebe `{idsEntidade}: string[]` + `onClose`, busca os registros via `GET /api/{entidade}?ids=id1,id2,...`, e renderiza uma pagina A4 por registro. Todas as paginas exceto a ultima devem ter `print:break-after-page` para forcar quebra de pagina no PDF
- Quando for possivel reutilizar a print view unitaria dentro do batch, expor props opcionais:
  - `data?: PrintEntityShape` para receber o registro ja carregado (evitando refetch)
  - `embedded?: boolean` para suprimir a toolbar/overlay fixo e renderizar somente a pagina A4
  - O tipo da forma renderizavel deve ser exportado (ex: `export type PrintRAF = ...`) para consumo pelo componente de batch
- A UI que dispara impressao deve usar `dynamic(() => import('...'), { ssr: false })` para evitar SSR da janela de impressao e controlar o estado via um `printState` unico na pagina: `{ kind, mode: 'single', id } | { kind, mode: 'batch', ids } | null`

## Drilldown com Abas e Selecao para Impressao em Lote
- Paineis de detalhe que oferecem drilldown de entidades relacionadas (padrao canonico: `CriticalityDetailPanel` em `/criticality`) devem usar `Tabs` / `TabsList` / `TabsTrigger` / `TabsContent` para separar `Visao Geral` das abas especificas
- Cada aba de drilldown deve ser gated por permissao (`usePermissions()` + `has('feature', 'view')`) — quando o usuario nao tem acesso, a `TabsTrigger` correspondente nao e renderizada
- Cada aba mantem seu proprio `Set<string>` de selecao (`selectedSS`, `selectedOS`, `selectedRAF`); a selecao de todas as abas deve ser resetada sempre que a entidade-mae mudar (via `useEffect` com dependencia na PK do contexto)
- O toolbar de cada drilldown deve expor:
  - Checkbox `Selecionar todos` (indeterminado quando a selecao e parcial)
  - Botao `Imprimir selecionados (N)` desabilitado quando `N === 0`
  - Botao de impressao individual por linha
- Os callbacks de impressao chegam como props (`onPrintSingle: (kind, id) => void`, `onPrintBatch: (kind, ids) => void`) para que a pagina dona do painel decida como renderizar os print views

## Dialogs de Auto-vinculo Bem <-> Plano Padrao (OBRIGATORIO)
Esta feature tem dois dialogs canonicos e um badge de override que aparecem nas telas `/assets`, `/maintenance-plan/standard` e `/maintenance-plan/asset`.

### AssetLinkingDialog (`src/components/assets/AssetLinkingDialog.tsx`)
Dialog compartilhado pelas duas situacoes — a UI muda o `mode` para inverter a orientacao da lista:
- `mode="asset-to-standards"`: listagem de planos padrao compativeis abertos a partir do painel de Bem (Situacao 1). Disparado apos `POST /api/assets` ou `PUT /api/assets/[id]` retornar `compatibleStandardPlans` nao vazio
- `mode="standard-to-assets"`: listagem de bens compativeis abertos a partir do painel de Plano Padrao (Situacao 2). Disparado apos `POST /api/maintenance-plans/standard` ou manualmente via botao `Vincular bens compativeis`
- Usa `<Modal size="lg">`, busca client-side, checkbox `Selecionar todos`, contagens `elegivel` vs `ja vinculado` e botoes `Pular` / `Vincular (N)` no rodape
- Itens ja vinculados (`alreadyLinked=true`) aparecem desabilitados com badge `Ja vinculado` para contexto
- Apos confirmar, chama respectivamente `/api/assets/[id]/apply-standard-plans` ou `/api/maintenance-plans/standard/[id]/apply-to-assets` e fecha o dialog

### PropagateChangesDialog (`src/components/standard-plans/PropagateChangesDialog.tsx`)
Dialog que aparece **apos salvar edicao de um Plano Padrao** (fluxo de `StandardPlanFormPanel`) quando ha `AssetMaintenancePlan` vinculados elegiveis para receber as alteracoes:
- Consome o formato `LinkedAssetPlanItem[]` exportado pelo proprio componente; origem dos dados e `GET /api/maintenance-plans/standard/[id]/linked-assets`
- Apenas itens com `hasLocalOverrides = false` sao selecionaveis (checkbox habilitado); itens com `hasLocalOverrides = true` aparecem **desabilitados** com badge `Customizado` amarelo + linha explicativa `Customizado em DATE por USER — nao recebera propagacao`. Eles existem na lista apenas como contexto visual, nao como candidatos
- Header com banner cinza (`bg-gray-50 border border-gray-200`) explicando o fluxo e indicando `planLabel` do plano que foi alterado
- Contagens inline `N elegivel(is) · N customizado(s)` acima da busca
- Checkbox mestre `Selecionar elegiveis` com estado `indeterminate` para selecao parcial
- Rodape com `Pular` (fecha sem propagar) e `Propagar (N)` (chama `POST /api/maintenance-plans/standard/[id]/propagate` com ids selecionados)
- Enquanto `submitting === true`, botoes ficam desabilitados e o label vira `Propagando...`
- Apos sucesso, o panel de edicao fecha; em caso de skip, o panel fecha mesmo assim (usuario escolheu nao propagar)

### Badge CUSTOMIZADO e botao Reverter ao padrao (AssetPlanDetailPanel)
- Em `src/components/asset-plans/AssetPlanDetailPanel.tsx`, planos com `hasLocalOverrides = true` exibem no header ao lado do titulo um badge:
```tsx
<span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-bold uppercase tracking-wider bg-warning-light text-warning border border-warning/30">
  <Icon name="edit_note" className="text-sm" />
  Customizado
</span>
```
- Abaixo de `PanelActionButtons`, quando `canEdit && hasLocalOverrides && standardPlanId`, renderiza bloco de alerta ambar (`bg-warning-light/40 border border-warning/30 rounded-[4px] p-3`) com icone `warning`, breve explicacao ("Este plano foi customizado localmente. Reverter recria o plano a partir do padrao, descartando as customizacoes estruturais.") e botao `<Button variant="outline">Reverter ao padrão</Button>`
- O clique abre um `ConfirmDialog` com `variant="warning"`, titulo `Reverter ao padrão` e mensagem deixando claro que a operacao descarta customizacoes estruturais mas preserva campos operacionais (ativo, tolerancia, area, tipo, sequencia, ultima execucao)
- A acao chama `POST /api/maintenance-plans/asset/[id]/revert`; em sucesso, recarrega o detalhe e a lista

## Tela Check List Padrao (OBRIGATORIO)
- Rota `/maintenance-plan/standard-checklists`, sub-item da Sidebar abaixo de `Cadastro de Manutencao > Manutencao do Bem` (slug `standard-checklists`)
- Acesso: `SUPER_ADMIN`, `ADMIN`, `PLANEJADOR` com matriz `{ view, create, edit, delete: true }`. `MANUTENTOR` nao tem nenhum acesso (item nao aparece no menu, rotas retornam 403)
- Estrutura logica: 1 checklist por par `(WorkCenter, ServiceType)` (constraint UNIQUE no banco — duplicata retorna `409`). Dentro do checklist, **grupos por familia+modelo** (`StandardChecklistFamilyGroup`) e dentro de cada grupo uma lista ordenada de **etapas** referenciando `GenericStep` (`StandardChecklistStep`)
- Listagem: padrao split-panel canonico com `AdaptiveSplitPanel`. Colunas desktop: Nome, Centro de Trabalho, Tipo de Servico, Unidade, Status (badge `Ativo` verde claro / `Arquivado` cinza), Criado em. Sortable em todas as colunas (default `Criado em DESC`). Filtro de status no header com opcoes `Ativos` (default), `Arquivados`, `Todos`. Mobile renderiza cards (titulo + badge arquivado + WC/ServiceType + unidade + data)
- Componentes canonicos: `src/components/standard-checklists/StandardChecklistDetailPanel.tsx` e `src/components/standard-checklists/StandardChecklistFormPanel.tsx`
- `StandardChecklistDetailPanel`: header com nome + badge `Arquivado` (quando `isActive=false`), `PanelActionButtons` (Editar/Excluir), botao secundario `Arquivar`/`Reativar` (chama `PUT /archive`), secao `Identificacao` (WC, Tipo de Servico, Unidade, Criado por, Status, total de etapas/grupos) e secao `Familias e Etapas` com grupos colapsaveis (chevron `expand_more`/`chevron_right` inline, sem wrapper bg-white)
- `StandardChecklistFormPanel`: campos `Nome`, `Centro de Trabalho` (select), `Tipo de Servico` (select), `Ativo` (checkbox); selects de WC e ServiceType ficam **disabled em modo edicao** (constraint funcional do par `(WC, ServiceType)`); secao `Familias e Etapas` com auto-deteccao via `GET /api/work-centers/[id]/family-models` quando o WC e selecionado em modo criacao, mais botao manual `Detectar familias do WC`; cada grupo permite adicionar/remover etapas via `<select>` populado por `/api/generic-steps`; rodape com botoes `Cancelar` (outline, flex-1) e `Salvar Alteracoes` / `Salvar` (`bg-gray-900`, flex-1) — segue o padrao de painel de edicao inPage
- `StandardChecklistFormPanel` — **Familias colapsaveis**: cada grupo `(Familia / Modelo)` inicia **fechado**; chevron inline `expand_more`/`chevron_right` no header (padrao `ModalSection`, sem wrapper bg-white). Header colapsado mostra sufixo `(N etapas)` contando apenas etapas com `genericStepId` preenchido
- `StandardChecklistFormPanel` — **Reordenacao de etapas**: cada linha de etapa expoe setas `arrow_upward`/`arrow_downward` que trocam a etapa com a vizinha. ↑ desabilitado na primeira etapa; ↓ desabilitado na ultima. Ordem persiste no PUT/POST via indice do array (sem mudanca de schema/API)
- `StandardChecklistFormPanel` — **Selecao + Copiar para**: checkbox a esquerda do numero da etapa, com checkbox `Selecionar todas` no topo da secao (estado `indeterminate` para selecao parcial — marca apenas etapas com `genericStepId` preenchido). Quando ha >=1 etapa selecionada **e** existem >=2 familias no checklist, o header da familia exibe botao `Copiar para (N)` que abre popover absoluto (`top-full mt-1 z-20`, click outside e ESC fecham). Popover lista as **demais** familias do checklist com checkbox + sufixo `(N etapas)`. Ao confirmar: etapas em branco sao ignoradas; dedupe por `genericStepId` no grupo alvo + entre as proprias copiadas; etapas vao para o **fim** da lista do alvo; selecao da origem zera; grupos alvo sao expandidos automaticamente para feedback visual
- Auto-vinculo bidirecional: ao salvar Bem (`POST /api/assets` ou `PUT /api/assets/[id]`) com `workCenterId + familyId + familyModelId`, o servidor dispara `notifyMissingFamilyModel` em side-effect silencioso. Se ja existirem checklists ativos para o WC e o par `(familyId, familyModelId)` ainda nao estiver coberto, cria `Notification` para o `createdById` do checklist com `href` apontando para a tela de check list padrao. Falhas no helper sao swallowed para nao quebrar o fluxo de criacao do bem

## Inspecao de Area (OBRIGATORIO)
- Sidebar expoe o item simples `Inspecao de Area` (icone `fact_check`, module `area-inspections`) entre `Ordens de Servico` e `Solicitacoes de Servico`, apontando para `/inspections/checklists`. Nao ha sub-itens — `MANUTENTOR` ve apenas inspecoes onde `assignedToId === session.id` (filtro vem do servidor em `GET /api/inspections`), entao a mesma rota serve gestor e manutentor sem precisar de tela separada de "retorno"
- `/inspections/checklists` usa o padrao split-panel canonico via `AdaptiveSplitPanel` + `PageContainer variant="full"` + `PageHeader`. Lista todas as inspecoes da unidade ativa, expoe botao `Novo Check List` (apenas para perfis com permissao `create`) e abre detalhe + acoes (preencher, enviar para revisao, devolver, finalizar, reabrir, imprimir, editar, excluir) gated por status + permissoes. Colunas: `N°`, `Descricao`, `Criado em`, `Vencimento`, `N° SSs`, `Status`. Ordenavel em todas; default `Vencimento ASC`. Busca reconhece `number`, `description`, `checklistName`, `workCenterName`, `serviceTypeName` e nome do manutentor atribuido
- Filtro de status default e **`Ativos (ocultar finalizados)`** — esconde inspecoes em status `FINALIZADO`. Outras opcoes do select: `Todos`, `Em preenchimento` (RASCUNHO), `Em revisao` (EM_REVISAO), `Finalizado`, `Atrasado` (virtual, derivado do servidor)
- Componentes canonicos em `src/components/area-inspections/`:
  - `InspectionStatusBadge` — 4 estados: `Em preenchimento` (cinza claro), `Em revisao` (cinza medio), `Finalizado` (preto/grafite), `Atrasado` (borda preta sólida + icone `warning`, sobrepoe RASCUNHO/EM_REVISAO quando `isOverdue`)
  - `InspectionFormPanel` — criar nova: `<select>` `Check List Padrao` (filtra por `isActive`), `Descricao`, `Vencimento`, `Manutentor` + preview live de bens compativeis via `GET /api/maintenance-plans/standard-checklists/[id]/eligible-assets`
  - `InspectionDetailPanel` — readonly com identificacao, resumo (bens/etapas respondidas/NOKs/SSs geradas), historico de workflow e bloco de acoes (Preencher/Revisar, Enviar para revisao, Devolver, Finalizar, Reabrir, Imprimir, Editar, Excluir) gated por status + permissoes
  - `InspectionExecutionPanel` — bens em accordion (primeiro aberto por default); por etapa, 3 botoes radio `OK/NOK/NA` + textarea de observacao; bulk `Marcar tudo OK` e `Marcar tudo NA` por bem (sem `NOK em massa` — NOK deve ser linha-a-linha); contador de pendencias no header; botao `Salvar respostas` sempre disponivel; botao `Enviar para revisao` desabilitado quando ha pendencias; em `EM_REVISAO` o painel entra em `isReviewMode` (sem botao de enviar — finalizacao via FinalizeModal)
  - `FinalizeModal` — overlay (`<Modal size="wide">`) listando todos os NOKs sem SS gerada; cada NOK tem cartao `border rounded-[4px] p-3 bg-gray-50/60` com campos `Titulo *`, `Prioridade` (default `NORMAL`), `Descricao`, `Area de manutencao *` (carregada de `/api/basic-registrations/maintenance-areas`), `Prazo`. Validacao local + server-side: `title` e `maintenanceAreaId` obrigatorios. Apos sucesso, dispara reload da lista
  - `InspectionPrintView` — folha A4 compacta (overlay `fixed inset-0 z-[9999]` com toolbar Imprimir/Fechar `print:hidden`). Cabecalho com empresa+unidade, N°, descricao, vencimento, manutentor, paginacao via CSS `counter(page)/counter(pages)`. Legenda fixa no topo `[ ] OK  [ ] NOK  [ ] NA`. Por bem: bloco `inspection-print-asset` com `break-inside: avoid`, tabela compacta (#, Etapa, OK, NOK, NA, Observacao). `thead { display: table-header-group }` repete cabecalho da tabela em quebras de pagina. Areas de assinatura no rodape
- Workflow visivel: o badge muda conforme `status`. Em `EM_REVISAO`, o gestor pode editar respostas no `InspectionExecutionPanel` (`isReviewMode={true}`) e depois finalizar pelo botao `Finalizar e gerar SSs` no `InspectionDetailPanel` (que abre `FinalizeModal`)
- Vinculo SS<->inspecao visivel: o `InspectionExecutionPanel` mostra `SS gerada` ao lado do step com `requestId` setado; o `InspectionDetailPanel` exibe contagem total de SSs no resumo. SSs criadas por finalizacao tem `Request.inspectionId` preenchido
- Excecao: a tela `Configuracoes` da `Pessoa` continua exigindo cargo via select de `Cadastros Basicos`; nada do fluxo de inspecao toca esse padrao

## Mapa de Telas e Modais
| Rota | Titulo | Tipo | Paineis inPage (desktop) | Overlay (mobile + confirmacao) | Produto |
|------|--------|------|--------------------------|-------------------------------|---------|
| `/hub` | Hub | Portal | - | - | - |
| `/login` | Login | Form | - | - | - |
| `/dashboard` | Dashboard | Stats | - | - | CMMS |
| `/people-teams` | Pessoas | Listagem split-panel | PersonDetailModal, PersonFormModal | ConfirmDialog | CMMS |
| `/assets` | Ativos | Listagem split-panel | AssetDetailPanel, AssetEditPanel, AssetCreateModal, AssetLinkingDialog (mode=asset-to-standards) | ConfirmDialog | CMMS |
| `/assets/standard` | Bens Padrao | Listagem split-panel | StandardAssetDetailPanel, StandardAssetFormPanel(inPage) | ConfirmDialog | CMMS |
| `/work-orders` | Ordens de Servico | Listagem split-panel | WorkOrderDetailModal, WorkOrderEditModal, ExecutionModal, FinalizeWorkOrderModal | ConfirmDialog | CMMS |
| `/inspections/checklists` | Inspecao de Area | Listagem split-panel | InspectionDetailPanel, InspectionFormPanel(inPage), InspectionExecutionPanel(inPage), FinalizeModal, InspectionPrintView | confirm() nativo | CMMS |
| `/requests` | Solicitacoes | Listagem split-panel | RequestDetailModal(inPage), RequestFormModal(inPage) | ConfirmDialog | CMMS |
| `/requests/approvals` | Aprovacoes | Listagem split-panel | ApprovalModal(inPage) | - | CMMS |
| `/rafs` | RAF | Listagem split-panel | RAFViewModal, RAFEditModal, RAFFormModal | ConfirmationModal | CMMS |
| `/rafs/action-plan` | PA das RAFs | Listagem split-panel | RAFViewModal (readonly) | - | CMMS |
| `/locations` | Localizacoes | Listagem split-panel | LocationDetailPanel, LocationFormPanel | ConfirmDialog | CMMS |
| `/basic-registrations/[entity]` | Cadastros Basicos | Listagem split-panel | GenericDetailPanel, GenericEditPanel, CalendarModal, ResourceModal, AssetFamilyModal, GenericStepModal | ConfirmDialog | CMMS |
| `/criticality` | Criticidade | Listagem split-panel | CriticalityDetailPanel (abas + drilldown), CriticalityEditPanel, WorkOrderPrintView / WorkOrdersBatchPrintView, RequestPrintView / RequestsBatchPrintView, RAFPrintView / RAFsBatchPrintView | ConfirmDialog | CMMS |
| `/maintenance-plan/standard` | Plano Padrao | Listagem split-panel | PlanDetailPanel, PlanFormPanel(inPage), AssetLinkingDialog (mode=standard-to-assets), PropagateChangesDialog | ConfirmDialog | CMMS |
| `/maintenance-plan/asset` | Plano por Ativo | Listagem split-panel | AssetPlanDetailPanel (badge Customizado + Reverter ao padrão), AssetPlanFormPanel(inPage) | ConfirmDialog | CMMS |
| `/maintenance-plan/standard-checklists` | Check List Padrao | Listagem split-panel | StandardChecklistDetailPanel, StandardChecklistFormPanel(inPage) | confirm() nativo | CMMS |
| `/planning/plans` | Planejamento | Listagem split-panel | PlanDetailPanel, PlanFormPanel | ConfirmDialog | CMMS |
| `/planning/schedules` | Programacao | Listagem split-panel | ScheduleDetailPanel, ScheduleFormPanel | ConfirmDialog | CMMS |
| `/kpi` | KPI | Dashboard | - | - | CMMS |
| `/gep` | GEP (redirect → /gvp) | Dashboard | - | - | GVP |
| `/tree` | Arvore | Visualizacao | AssetDetailPanel | - | CMMS |
| `/admin/portal` | Configuracoes | Admin split-panel | CompanyDetailPanel, CompanyFormPanel | ConfirmDialog | - |
| `/admin/users` | Usuarios | Admin split-panel | AdminUserDetailPanel, AdminUserFormPanel | ConfirmDialog | - |
| `/admin/units` | Unidades | Admin split-panel | UnitDetailPanel, UnitFormPanel | ConfirmDialog | - |
| `/profile` | Perfil | Detalhe | - | - | - |
| `/settings` | Configuracoes Usuario | Form | - | - | - |
| `/technician/my-tasks` | Minhas Tarefas | Listagem split-panel | TaskDetailPanel | ConfirmDialog | CMMS |
