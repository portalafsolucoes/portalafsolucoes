---
globs: src/components/**,src/app/**/page.tsx
---

# Componentes e Paginas

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
- Tr: `odd:bg-gray-50 even:bg-white hover:bg-accent-orange-light cursor-pointer transition-colors`
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

## Mapa de Telas e Modais
| Rota | Titulo | Tipo | Paineis inPage (desktop) | Overlay (mobile + confirmacao) |
|------|--------|------|--------------------------|-------------------------------|
| `/hub` | Hub | Portal | - | - |
| `/login` | Login | Form | - | - |
| `/dashboard` | Dashboard | Stats | - | - |
| `/people-teams` | Pessoas | Listagem split-panel | PersonDetailModal, PersonFormModal | ConfirmDialog |
| `/assets` | Ativos | Listagem split-panel | AssetDetailPanel, AssetEditPanel, AssetCreateModal | ConfirmDialog |
| `/assets/standard` | Bens Padrao | Listagem split-panel | StandardAssetDetailPanel, StandardAssetFormPanel(inPage) | ConfirmDialog |
| `/work-orders` | Ordens de Servico | Listagem split-panel | WorkOrderDetailModal, WorkOrderEditModal, ExecutionModal, FinalizeWorkOrderModal | ConfirmDialog |
| `/requests` | Solicitacoes | Listagem split-panel | RequestDetailModal(inPage), RequestFormModal(inPage) | ConfirmDialog |
| `/requests/approvals` | Aprovacoes | Listagem split-panel | ApprovalModal(inPage) | - |
| `/rafs` | RAF | Listagem split-panel | RAFViewModal, RAFEditModal, RAFFormModal | ConfirmationModal |
| `/locations` | Localizacoes | Listagem split-panel | LocationDetailPanel, LocationFormPanel | ConfirmDialog |
| `/basic-registrations/[entity]` | Cadastros Basicos | Listagem split-panel | GenericDetailPanel, GenericEditPanel, CalendarModal, ResourceModal, AssetFamilyModal, GenericStepModal | ConfirmDialog |
| `/criticality` | Criticidade | Listagem split-panel | CriticalityDetailPanel, CriticalityEditPanel | ConfirmDialog |
| `/maintenance-plan/standard` | Plano Padrao | Listagem split-panel | PlanDetailPanel, PlanFormPanel(inPage) | ConfirmDialog |
| `/maintenance-plan/asset` | Plano por Ativo | Listagem split-panel | AssetPlanDetailPanel, AssetPlanFormPanel(inPage) | ConfirmDialog |
| `/planning/plans` | Planejamento | Listagem split-panel | PlanDetailPanel, PlanFormPanel | ConfirmDialog |
| `/planning/schedules` | Programacao | Listagem split-panel | ScheduleDetailPanel, ScheduleFormPanel | ConfirmDialog |
| `/kpi` | KPI | Dashboard | - | - |
| `/gep` | GEP | Dashboard | - | - |
| `/tree` | Arvore | Visualizacao | AssetDetailPanel | - |
| `/admin/portal` | Configuracoes | Admin split-panel | CompanyDetailPanel, CompanyFormPanel | ConfirmDialog |
| `/admin/users` | Usuarios | Admin split-panel | AdminUserDetailPanel, AdminUserFormPanel | ConfirmDialog |
| `/admin/units` | Unidades | Admin split-panel | UnitDetailPanel, UnitFormPanel | ConfirmDialog |
| `/profile` | Perfil | Detalhe | - | - |
| `/settings` | Configuracoes Usuario | Form | - | - |
| `/technician/my-tasks` | Minhas Tarefas | Listagem split-panel | TaskDetailPanel | ConfirmDialog |
