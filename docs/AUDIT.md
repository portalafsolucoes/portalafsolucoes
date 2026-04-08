# Auditoria de Consistencia Visual / Layout

Data: 2026-04-08

---

## 1. Stack Detectada

| Item | Valor |
|------|-------|
| **Framework** | Next.js 15.5.7 (App Router) + React 19.2.1 + TypeScript |
| **Sistema de estilo** | Tailwind CSS v4 (via `@tailwindcss/postcss`) com design tokens em CSS variables (`globals.css`). Sem CSS Modules, sem styled-components. |
| **Biblioteca de UI** | Componentes proprios em `src/components/ui/` (Button, Card, Modal, Table, Tabs, Badge, Input, etc.) — estilo Shadcn/UI customizado. |
| **Fontes** | Inter (body/sans) + Manrope (headline). Carregadas via `next/font/google`. |
| **Icones** | Lucide React 0.546 + Material Symbols Outlined (Google Fonts link) |

**Localizacao das telas/paginas:** `src/app/` (48 arquivos `page.tsx` em ~30 rotas)
**Componentes compartilhados:** `src/components/` (layout, ui, e pastas por dominio: assets, work-orders, people, teams, rafs, requests, etc.)

---

## 2. Componentes de Layout Existentes

### 2.1 Componentes ativos

| Componente | Caminho | Papel | Usado em |
|------------|---------|-------|----------|
| **AppShell** | `src/components/layout/AppShell.tsx` | Shell principal: `h-screen`, Sidebar + Header + `<main>` com scroll. Adiciona padding `px-4 py-6 sm:px-6 lg:px-8` ao conteudo. | 1x (root `layout.tsx`) — envolve TODAS as paginas |
| **AppLayout** | `src/components/layout/AppLayout.tsx` | **No-op**: retorna `<>{children}</>` sem nenhum estilo | ~41 paginas importam, mas nao faz nada |
| **Header** | `src/components/layout/Header.tsx` | Barra topo fixa, `h-16`, `glass`, z-40 | 1x (dentro de AppShell) |
| **Sidebar** | `src/components/layout/Sidebar.tsx` | Menu lateral fixo, colapsavel `w-16`/`w-64`, z-60 | 1x (dentro de AppShell) |
| **UnitSelector** | `src/components/layout/UnitSelector.tsx` | Dropdown de unidade no header | 1x (dentro de Header) |
| **UserMenu** | `src/components/layout/UserMenu.tsx` | Menu do usuario no header | 1x (dentro de Header) |

### 2.2 Componente inativo / legado

| Componente | Caminho | Observacao |
|------------|---------|------------|
| **Navbar** | `src/components/layout/Navbar.tsx` | Navegacao horizontal — **nao importado por nenhuma tela**. Contem `max-w-7xl px-4 sm:px-6 lg:px-8 h-16`. Provavelmente legado. |

### 2.3 Duplicatas e problemas

- **AppLayout e um componente fantasma**: 41 paginas importam e usam `<AppLayout>`, mas ele nao faz absolutamente nada (`<>{children}</>`). E uma camada de abstracao vazia.
- **Nao existe componente `PageContainer` ou `PageHeader`**: cada pagina define seu proprio wrapper div com padding e max-width, resultando em divergencias.

---

## 3. Inventario de Valores Hardcoded

### 3.1 Padding do AppShell (camada base)

O `AppShell.tsx` (linha ~24) ja aplica padding ao `<div>` interno do `<main>`:
```
px-4 py-6 sm:px-6 lg:px-8
```
Isso significa que **toda pagina ja recebe 16-32px de padding horizontal e 24px vertical** antes de qualquer classe propria.

### 3.2 max-width de containers por pagina

| Valor | Ocorrencias | Paginas |
|-------|-------------|---------|
| **Nenhum** (sem max-width) | ~20 telas | dashboard, assets, work-orders, requests, rafs, criticality, kpi, gep, technician/my-tasks, e varias sub-rotas (new, [id], edit) |
| `max-w-7xl` (1280px) | ~10 telas | people, teams, locations, analytics, admin/units, admin/portal, admin/users, people-teams, team-dashboard, approvals |
| `max-w-4xl` (896px) | ~3 telas | profile, people/[id], teams/[id] |
| `max-w-3xl` (768px) | ~6 telas | assets/new, locations/new, people/new, people/[id]/edit, teams/[id]/edit, work-orders/new |
| `max-w-6xl` (1152px) | ~2 telas | rafs (listagem), work-orders (listagem) — somente em sub-containers |
| `max-w-md` (448px) | ~3 telas | criticality, login, register |

### 3.3 Padding de pagina (ALEM do AppShell)

Padrao de padding que cada pagina adiciona por conta propria (somando-se ao padding do AppShell):

| Padrao | Ocorrencias | Paginas |
|--------|-------------|---------|
| `px-4 py-4 sm:px-6 lg:px-8 lg:py-6` | ~5 | dashboard, work-orders, requests, rafs, team-dashboard |
| `max-w-7xl mx-auto p-6` | ~4 | people, admin/units, people-teams, approvals |
| `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8` | ~3 | teams, locations, analytics |
| `p-8` | ~2 | profile (`p-8 max-w-4xl mx-auto`), technician/my-tasks |
| `p-6` | ~2 | criticality (`h-full overflow-auto p-6`) |
| `h-full flex flex-col overflow-hidden` (sem padding) | ~2 | assets, work-orders (variante full-height) |
| Nenhum padding extra | ~5+ | sub-rotas de formularios (new, edit) |

**Problema critico**: O AppShell ja da `px-4 py-6 sm:px-6 lg:px-8`. As paginas que adicionam `px-4 sm:px-6 lg:px-8` estao **dobrando o padding horizontal** (total de 32-64px no desktop).

### 3.4 Altura do Header

| Valor | Ocorrencias | Local |
|-------|-------------|-------|
| `h-16` (64px) | 1 | `Header.tsx` linha ~13 |
| `h-[calc(100vh-64px)]` | 1 | `AppShell.tsx` linha ~23 (main) |
| `mt-16` | 1 | `AppShell.tsx` linha ~23 (main offset) |

Consistente — nao ha divergencia no header.

### 3.5 Titulo de pagina (font-size + font-weight)

| Estilo | Ocorrencias | Paginas |
|--------|-------------|---------|
| `text-3xl font-bold text-foreground` | ~10 | people, teams, locations, analytics, admin/units, people-teams, profile, technician/my-tasks, team-dashboard |
| `text-2xl font-bold text-foreground` | ~2 | dashboard (`text-2xl sm:text-3xl lg:text-4xl`), criticality |
| `text-xl md:text-2xl font-bold text-foreground` | ~3 | work-orders, rafs |
| `text-lg md:text-xl font-bold text-foreground` | ~1 | assets |
| `text-2xl sm:text-3xl lg:text-4xl font-bold` | ~1 | dashboard (responsivo) |
| Sem titulo visivel (modal-based) | ~5+ | sub-rotas de formularios |

**Resumo**: O tamanho do titulo de pagina varia entre `text-lg` e `text-4xl` sem padrao claro. O peso e sempre `font-bold` e a cor e sempre `text-foreground`, mas o tamanho e inconsistente.

### 3.6 Cores de fundo

| Cor | Ocorrencias | Uso |
|-----|-------------|-----|
| `bg-background` | global | Body e AppShell (via CSS variable `--background: #f9f9f9`) |
| `bg-card` / `bg-white` | ~60+ | Cards, modais, dropdowns |
| `bg-surface-low` | ~15 | Header buttons, sidebar, inputs |
| `bg-muted` | ~10 | Badges, tags, areas secundarias |
| `bg-primary` | ~8 | Botoes primarios |
| `bg-danger` / `bg-danger-light` | ~5 | Alertas, botoes de exclusao |
| `bg-success-light` / `bg-warning-light` | ~5 | Status badges |
| `bg-gray-50` | ~3 | **Hardcoded fora do design system** — hover de tabelas |
| `bg-gray-100` | ~2 | **Hardcoded fora do design system** |
| `bg-blue-50`, `bg-green-50`, etc. | ~5 | **Cores Tailwind puras fora do design system** |

### 3.7 Border radius

| Valor | Ocorrencias | Uso |
|-------|-------------|-----|
| `rounded-[4px]` | ~393 | Padrao dominante (cards, botoes, inputs, modais) |
| `rounded-full` | ~100 | Avatares, badges circulares, pills |
| `rounded-lg` | ~1 | Caso isolado |
| `rounded-[2px]` | ~1 | Caso isolado |

Bem consistente. `rounded-[4px]` e o design token `--radius: 0.25rem`.

### 3.8 Cores de borda

| Valor | Ocorrencias | Uso |
|-------|-------------|-----|
| `border-border/15` | ~30 | Padrao do design system (opacity 15%) |
| `border-border/20` | ~15 | Variacao |
| `border-border` | ~10 | Sem opacity |
| `border-gray-200` | ~8 | **Hardcoded fora do design system** |
| `border-gray-300` | ~3 | **Hardcoded fora do design system** |
| `.ghost-border` (CSS) | ~5 | Utility class: `rgba(173,179,180,0.15)` |

### 3.9 Cores de texto

| Valor | Ocorrencias | Uso |
|-------|-------------|-----|
| `text-foreground` | ~50 | Titulos, texto primario |
| `text-on-surface` | ~30 | Texto principal (alias) |
| `text-on-surface-variant` | ~40 | Texto secundario |
| `text-muted-foreground` | ~60 | Labels, hints |
| `text-gray-500` | ~10 | **Hardcoded fora do design system** |
| `text-gray-600` | ~8 | **Hardcoded fora do design system** |
| `text-gray-700` | ~5 | **Hardcoded fora do design system** |
| `text-white` | ~20 | Texto sobre backgrounds escuros |

---

## 4. Divergencias entre Telas

### 4.1 Padding duplicado (AppShell + pagina)

O AppShell ja fornece `px-4 py-6 sm:px-6 lg:px-8`. As seguintes paginas adicionam MAIS padding, resultando em padding duplo:

| Pagina | Arquivo | Padding adicional | Total efetivo (desktop) |
|--------|---------|-------------------|------------------------|
| Dashboard | `src/app/dashboard/page.tsx` | `px-4 py-4 sm:px-6 lg:px-8 lg:py-6` | ~64px horizontal |
| Work Orders | `src/app/work-orders/page.tsx` | `px-4 py-4 sm:px-6 lg:px-8 lg:py-6` | ~64px horizontal |
| Requests | `src/app/requests/page.tsx` | `px-4 py-4 sm:px-6 lg:px-8 lg:py-6` | ~64px horizontal |
| RAFs | `src/app/rafs/page.tsx` | `px-4 py-4 sm:px-6 lg:px-8 lg:py-6` | ~64px horizontal |
| People | `src/app/people/page.tsx` | `max-w-7xl mx-auto p-6` | ~56px horizontal |
| Teams | `src/app/teams/page.tsx` | `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8` | ~64px horizontal |
| Locations | `src/app/locations/page.tsx` | `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8` | ~64px horizontal |
| Analytics | `src/app/analytics/page.tsx` | `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8` | ~64px horizontal |
| Profile | `src/app/profile/page.tsx` | `p-8 max-w-4xl mx-auto` | ~64px horizontal |
| Admin/Units | `src/app/admin/units/page.tsx` | `max-w-7xl mx-auto p-6` | ~56px horizontal |
| People-Teams | `src/app/people-teams/page.tsx` | `max-w-7xl mx-auto p-6` | ~56px horizontal |
| Technician | `src/app/technician/my-tasks/page.tsx` | `p-8` | ~64px horizontal |
| Team Dashboard | `src/app/team-dashboard/page.tsx` | `mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 lg:py-8 pt-20 lg:pt-8` | ~64px horizontal + pt-20 mobile!  |

### 4.2 Tamanho de titulo inconsistente entre telas equivalentes

Telas de **listagem** (que deveriam ter o mesmo titulo):

| Tela | Arquivo | Tamanho do titulo |
|------|---------|-------------------|
| People (listagem) | `src/app/people/page.tsx` | `text-3xl font-bold` |
| Teams (listagem) | `src/app/teams/page.tsx` | `text-3xl font-bold` |
| Locations (listagem) | `src/app/locations/page.tsx` | `text-3xl font-bold` |
| Work Orders (listagem) | `src/app/work-orders/page.tsx` | `text-xl md:text-2xl font-bold` |
| RAFs (listagem) | `src/app/rafs/page.tsx` | `text-xl md:text-2xl font-bold` |
| Assets (listagem) | `src/app/assets/page.tsx` | `text-lg md:text-xl font-bold` |
| Dashboard | `src/app/dashboard/page.tsx` | `text-2xl sm:text-3xl lg:text-4xl font-bold` |

**Resultado**: 4 tamanhos diferentes para titulos de telas do mesmo nivel hierarquico.

### 4.3 Container max-width inconsistente entre telas equivalentes

Telas de **listagem com tabela** (deveriam ter mesmo container):

| Tela | max-width |
|------|-----------|
| People | `max-w-7xl` |
| Teams | `max-w-7xl` |
| Locations | `max-w-7xl` |
| Analytics | `max-w-7xl` |
| Work Orders | nenhum |
| Requests | nenhum |
| RAFs | nenhum |
| Assets | nenhum |
| Dashboard | nenhum |

### 4.4 Wrapper pattern inconsistente

Tres padroes distintos para a mesma intencao (container centralizado com max-width):

1. `max-w-7xl mx-auto p-6` (people, admin/units, people-teams)
2. `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8` (teams, locations, analytics)
3. `max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 lg:py-8` (team-dashboard)

Mesma intencao, tres implementacoes com padding diferente (`p-6` vs `py-8 px-4...` vs `py-4 lg:py-8 px-4...`).

### 4.5 Cores hardcoded fora do design system

Varios arquivos usam cores Tailwind puras (`gray-*`, `blue-*`, `green-*`) ao inves dos tokens semanticos definidos em `globals.css`:

- `bg-gray-50`, `bg-gray-100`: hover de linhas de tabela em varios componentes
- `text-gray-500`, `text-gray-600`, `text-gray-700`: textos secundarios que deveriam usar `text-muted-foreground` ou `text-on-surface-variant`
- `border-gray-200`, `border-gray-300`: bordas que deveriam usar `border-border/15`
- `bg-blue-50`, `bg-green-50`: status badges que deveriam usar `bg-info-light`, `bg-success-light`

### 4.6 Team Dashboard com pt-20 anomalo

`src/app/team-dashboard/page.tsx` usa `pt-20 lg:pt-8` — um padding-top de 80px no mobile que nenhuma outra pagina possui. Provavelmente um hack para compensar o header fixo, mas o AppShell ja resolve isso com `mt-16`.

---

## 5. Top 5 Causas-Raiz

1. **Cada pagina define seu proprio container ao inves de reutilizar um componente compartilhado.** Nao existe `<PageContainer>` ou `<PageHeader>`. O `AppLayout` existe mas e um no-op (`<>{children}</>`), entao cada pagina reimplementa o wrapper com classes diferentes.

2. **Padding duplo: AppShell + pagina.** O AppShell ja aplica `px-4 py-6 sm:px-6 lg:px-8` no conteudo, mas a maioria das paginas adiciona seu proprio padding, resultando em margens excessivas e inconsistentes. Algumas paginas sabem disso e nao adicionam padding; outras nao.

3. **Ausencia de tokens para tamanho de titulo de pagina.** O design system define cores e radius, mas nao define classes utilitarias para titulos de pagina. Cada desenvolvedor escolhe entre `text-lg`, `text-xl`, `text-2xl`, `text-3xl` ou combinacoes responsivas.

4. **Uso misto de cores do design system e cores Tailwind puras.** O `globals.css` define tokens semanticos (`bg-surface-low`, `text-muted-foreground`, `border-border/15`), mas ~30+ ocorrencias usam `gray-*`, `blue-*`, `green-*` diretamente, quebrando a consistencia e dificultando mudancas de tema.

5. **Falta de tipologia de pagina.** Nao ha distincao arquitetural entre "pagina de listagem" (deveria ter max-w-7xl + tabela), "pagina de formulario" (max-w-3xl + form), "pagina de detalhe" (max-w-4xl + cards), e "pagina full-height" (flex, sem max-width). Cada pagina decide individualmente.

---

## 6. Tamanho do Problema

| Metrica | Valor |
|---------|-------|
| **Total de telas (page.tsx)** | 48 arquivos |
| **Telas efetivas (excluindo redirects)** | ~40 |
| **Telas com padding duplicado** | ~13 (32%) |
| **Telas com titulo fora do padrao dominante (`text-3xl`)** | ~6 (15%) |
| **Telas sem max-width onde similar tem** | ~5 (12%) |
| **Telas com container pattern diferente das irmas** | ~8 (20%) |
| **Arquivos com cores hardcoded (gray-*, blue-*, etc.)** | ~15-20 |
| **Componentes de layout a refatorar** | 2 (AppLayout, + criar PageContainer/PageHeader) |
| **Componente legado a remover** | 1 (Navbar.tsx — nao utilizado) |

### Estimativa de arquivos a tocar na refatoracao

| Acao | Arquivos |
|------|----------|
| Criar componentes `PageContainer` e `PageHeader` | 2 novos |
| Ajustar AppShell (remover ou manter padding) | 1 |
| Remover/transformar AppLayout | 1 + ~41 paginas que importam |
| Padronizar container de cada pagina | ~30 page.tsx |
| Padronizar titulo de cada pagina | ~15 page.tsx |
| Substituir cores hardcoded por tokens | ~15-20 arquivos (components + pages) |
| Remover Navbar.tsx legado | 1 |
| **Total estimado** | ~45-55 arquivos |
