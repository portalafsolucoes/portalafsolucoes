# Plano de Migração de Layout — CMMS Gestor de Manutenção

## Objetivo

Migrar o layout atual (grayscale com bordas, Geist font, lucide-react) para o design system **"Architectural Monolith"** (Polimix Slate) — minimalista, editorial, sem bordas, tonal layering, Manrope + Inter — **sem quebrar funcionalidades**.

---

## Referência Visual — Google Stitch

O design de referência está no projeto **Google Stitch** (Firebase Studio). Abaixo, como acessar os assets:

### Projeto Stitch

- **Título:** Modern Dashboard Redesign
- **Project ID:** `5401872573915346669`
- **URL do Projeto:** Acessar via [Google Stitch / Firebase Studio](https://stitch.withgoogle.com/) → Projetos → "Modern Dashboard Redesign"

### Tela Principal de Referência

- **Nome:** Operational Insights - Variation 1
- **Screen ID:** `a6f6378be28d49ffbdaeada5049fe1b3`

### Telas Já Criadas no Stitch

| Tela | Screen ID | Status |
|------|-----------|--------|
| Operational Insights (Referência) | `a6f6378be28d49ffbdaeada5049fe1b3` | Pronta |
| Dashboard Analítico | `7db39e42766e4f7f9d2298dd32fdcdc4` | Pronta |
| Hub Portal - Portal AF Soluções | `3d09921ae5dc4fd7a0a8fbe7fc445d64` | Pronta |
| Login - Portal AF Soluções | `2186c4194fde459aa984213f9b16359c` | Pronta |

### Como Baixar o HTML/CSS de uma Tela do Stitch

Cada tela no Stitch tem um **HTML completo** com Tailwind CSS inline que serve como referência de implementação.

**Via API (curl):**

```bash
# 1. Listar todas as telas do projeto
# Use a ferramenta Stitch MCP: list_screens(projectId: "5401872573915346669")

# 2. Obter detalhes de uma tela específica (retorna URLs de download)
# Use: get_screen(projectId: "5401872573915346669", screenId: "<SCREEN_ID>")

# 3. Baixar o HTML da tela
curl -L -o referencia_tela.html "<htmlCode.downloadUrl>"

# 4. Baixar o screenshot da tela
curl -L -o referencia_tela.png "<screenshot.downloadUrl>"
```

**Exemplo real (tela Operational Insights):**

```bash
# Screenshot
curl -L -o operational_insights.png \
  "https://lh3.googleusercontent.com/aida/ADBb0ugaCp3wRohrVNocF4Mi8s8m2quYwnQf4lK9Yd76LNge9jz8H2XlsYl2w3W5ervZAFsuJFMV_9Sn1YkCylyrbUYJ6gjwfe6EwVbyGs3RcpBTk88_tNyf6pfQ6OvOuYLPw5C-F01IUr1DAXQt66Xus_3x65UAYo1mQo8XTrmCRtK4JPfDZHc9JrjVymXsr_nUfKTqE5XTQt-qlckZAwIQdqZVitdCuseRcP7FORl_Vc6OUmWUupJn4v52Cbs"

# HTML/CSS completo
curl -L -o operational_insights.html \
  "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ7Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpaCiVodG1sX2VjZWYzM2FjMzhjNzRkYThhMmQxNGQ2NDYyZDYwZDg3EgsSBxCh4Z-JsBgYAZIBIwoKcHJvamVjdF9pZBIVQhM1NDAxODcyNTczOTE1MzQ2NjY5&filename=&opi=89354086"
```

### Design Systems Disponíveis no Projeto

| Nome | Asset ID | Descrição |
|------|----------|-----------|
| **Polimix Slate** (principal) | `c5bdc8b3719c497190c0d0acc7cfdba1` | Design system principal com cores quentes (secondary orange #974a00) |
| Architectural Slate | `10ffdb951278450c99b3286b10352790` | Variante com secondary em slate blue |
| Mono Architect | `6c5a39a0cc2648f791afccf1a4662fa8` | Variante monocromática pura (preto e branco) |

### Paleta de Cores Principal (Polimix Slate)

```
Background:     #f9f9f9  (surface)
Cards:          #ffffff  (surface-container-lowest)
Sections:       #f2f4f4  (surface-container-low)
Container:      #ebeeef  (surface-container)
Primary Text:   #2d3435  (on-surface) — NUNCA usar #000000
Secondary Text: #5a6061  (on-surface-variant)
Primary:        #5f5e5e  (graphite)
Primary Dim:    #535252  (hover state)
On Primary:     #faf7f6  (texto em botões primary)
Accent:         #974a00  (laranja quente — KPIs, trends, CTAs)
Accent Light:   #ffdcc6  (secondary-container)
Error:          #9f403d
Error Light:    #fe8983
Outline:        #757c7d
Ghost Border:   #adb3b4 at 15% opacity
```

### Tipografia

```
Headlines:  Manrope (extrabold, tracking -0.02em)
Body/Data:  Inter (regular, medium)
Labels:     Inter (bold, uppercase, tracking 0.2em, 10-11px)
```

### Regras de Design (Resumo)

1. **SEM bordas 1px** em containers/cards/seções — usar tonal layering
2. **SEM sombras padrão** — usar ambient: `0px 12px 32px rgba(45,52,53,0.06)`
3. **SEM preto puro** (#000000) — usar #2d3435
4. **Border radius:** 4px (0.25rem), nunca 8px+
5. **Glassmorphism** para headers/overlays: `bg-white/80 backdrop-blur-xl`
6. **Ghost border** quando necessário: `outline_variant at 15% opacity`
7. **Espaçamento generoso** — se parece ok, adicione mais 16px

### Como Criar Novas Telas no Stitch

Para gerar mais telas de referência (exemplo: página de Ativos, Solicitações, etc.):

```
# Via ferramenta Stitch MCP:
generate_screen_from_text(
  projectId: "5401872573915346669",
  deviceType: "DESKTOP",
  prompt: "Descrição detalhada da tela desejada..."
)
```

**Dica:** Mantenha prompts concisos (< 500 chars) para evitar timeouts. Gere uma tela por vez.

---

## Princípios da Migração

1. **Incremental**: cada fase é deployável independentemente
2. **Segura**: apenas mudanças visuais, ZERO alteração de lógica de negócio
3. **Completa**: nenhum resquício do sistema antigo (código morto, classes antigas, fontes antigas)
4. **Verificável**: cada fase tem critérios de teste claros

---

## Inventário do Sistema Atual

| Item | Quantidade | Observação |
|------|-----------|------------|
| CSS Variables (globals.css) | ~60 variáveis | Todas grayscale HSL |
| Páginas (page.tsx) | 44 arquivos | 4 padrões: Dashboard, List, Form, Detail |
| Componentes UI (src/components/ui/) | 13 arquivos | Card, Button, Input, Table, Badge, Modal, etc. |
| Componentes Feature | 35 arquivos | 11 subpastas (work-orders, assets, requests, etc.) |
| Layout (shell, sidebar, header) | 6 arquivos | AppShell, Sidebar, Header, UserMenu, AppLayout, Navbar |
| Imports lucide-react | ~75 arquivos | Precisam migrar para Material Symbols |
| Classes `text-gray-*` hardcoded | ~649 ocorrências | Não respondem a CSS variables |
| Classes `border border-*` | ~428 ocorrências | Devem ser removidas |
| Classes `rounded-lg/xl` | ~646 ocorrências | Devem virar rounded-[4px] |
| Bloco dark mode | 37 linhas | Deve ser deletado |

---

## Fase 0 — Preparação (Sem Mudança Visual)

**Objetivo:** Instalar dependências e criar infraestrutura. Zero impacto visual.

### Tarefas

1. **Instalar fontes** no `src/app/layout.tsx`:
   ```tsx
   import { Manrope, Inter } from 'next/font/google'
   const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' })
   const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
   ```

2. **Adicionar Material Symbols Outlined** no `<head>`:
   ```html
   <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
   ```

3. **Criar componente Icon** em `src/components/ui/Icon.tsx`:
   ```tsx
   interface IconProps {
     name: string
     className?: string
     fill?: boolean
     weight?: number
   }
   export function Icon({ name, className, fill = false, weight = 200 }: IconProps) {
     return (
       <span
         className={cn('material-symbols-outlined', className)}
         style={{ fontVariationSettings: `'FILL' ${fill ? 1 : 0}, 'wght' ${weight}` }}
       >
         {name}
       </span>
     )
   }
   ```

4. **Criar mapeamento de ícones** em `src/lib/icon-map.ts`:
   ```ts
   // Mapeamento lucide-react → Material Symbols
   export const ICON_MAP: Record<string, string> = {
     LayoutDashboard: 'dashboard',
     GitBranch: 'account_tree',
     Users: 'group',
     Settings: 'settings',
     Wrench: 'construction',
     FileText: 'description',
     Package: 'inventory_2',
     Layers: 'layers',
     MapPin: 'location_on',
     Calendar: 'calendar_today',
     Search: 'search',
     Plus: 'add',
     Eye: 'visibility',
     Edit: 'edit',
     Trash2: 'delete',
     ChevronDown: 'expand_more',
     ChevronRight: 'chevron_right',
     ChevronLeft: 'chevron_left',
     X: 'close',
     Check: 'check',
     AlertTriangle: 'warning',
     Bell: 'notifications',
     LogOut: 'logout',
     User: 'person',
     Building2: 'business',
     BarChart3: 'bar_chart',
     Activity: 'monitoring',
     Clock: 'schedule',
     ArrowLeft: 'arrow_back',
     ExternalLink: 'open_in_new',
     Download: 'download',
     Upload: 'upload',
     Filter: 'filter_list',
     MoreHorizontal: 'more_horiz',
     Shield: 'shield',
     Target: 'target',
     TrendingUp: 'trending_up',
     // ... completar conforme necessário
   }
   ```

### Verificação
- [ ] `npm run build` passa sem erros
- [ ] Site funciona normalmente, visual idêntico ao atual
- [ ] Componente Icon renderiza corretamente em um teste isolado

---

## Fase 1 — CSS Foundation (Impacto Global Instantâneo)

**Objetivo:** Trocar todas as CSS variables e fontes. Impacto visual imediato em todos os componentes que usam tokens.

### Arquivo: `src/app/globals.css`

#### 1.1 Reescrever variáveis `:root`

```css
:root {
  /* ===== ARCHITECTURAL MONOLITH DESIGN TOKENS ===== */

  /* Surfaces (Tonal Layering) */
  --background: 0 0% 97.6%;          /* #f9f9f9 */
  --foreground: 195 10% 19%;          /* #2d3435 */

  --card: 0 0% 100%;                  /* #ffffff (surface-container-lowest) */
  --card-foreground: 195 10% 19%;     /* #2d3435 */

  --popover: 0 0% 100%;
  --popover-foreground: 195 10% 19%;

  /* Primary (Graphite) */
  --primary: 0 1% 37%;                /* #5f5e5e */
  --primary-hover: 0 1% 32%;          /* #535252 (primary-dim) */
  --primary-foreground: 15 18% 97%;   /* #faf7f6 (on-primary) */

  /* Secondary (Warm Orange - Accent) */
  --secondary: 29 100% 30%;           /* #974a00 */
  --secondary-hover: 29 100% 26%;     /* #854000 */
  --secondary-foreground: 25 100% 95%; /* #fff7f4 */

  /* Muted & Accents */
  --muted: 180 5% 95%;                /* #f2f4f4 (surface-container-low) */
  --muted-foreground: 192 5% 37%;     /* #5a6061 (on-surface-variant) */

  --accent: 186 5% 92%;               /* #ebeeef (surface-container) */
  --accent-foreground: 195 10% 19%;

  /* Semantic Status */
  --success: 160 30% 35%;             /* verde profissional */
  --success-foreground: 0 0% 100%;
  --success-light: 160 20% 95%;
  --success-light-foreground: 160 30% 25%;

  --warning: 29 100% 30%;             /* laranja (secondary) */
  --warning-foreground: 0 0% 100%;
  --warning-light: 30 60% 95%;
  --warning-light-foreground: 29 80% 25%;

  --danger: 2 43% 44%;                /* #9f403d */
  --danger-foreground: 0 0% 100%;
  --danger-light: 4 100% 76%;         /* #fe8983 at 15% */
  --danger-light-foreground: 2 43% 30%;

  --info: 192 5% 50%;
  --info-foreground: 0 0% 100%;
  --info-light: 192 5% 95%;
  --info-light-foreground: 192 5% 30%;

  /* Borders & Inputs */
  --border: 192 4% 69%;               /* #adb3b4 at 15% opacity → usar com /15 */
  --input: 180 5% 95%;                /* #f2f4f4 (filled style) */
  --ring: 0 1% 37%;                   /* primary */

  /* Sidebar (LIGHT - mudança principal!) */
  --sidebar: 180 5% 95%;              /* #f2f4f4 */
  --sidebar-foreground: 195 10% 19%;  /* #2d3435 */
  --sidebar-border: 192 4% 69%;       /* outline_variant */
  --sidebar-accent: 195 10% 19%;      /* #2d3435 (active bg) */
  --sidebar-accent-foreground: 0 0% 100%; /* white text on active */
  --sidebar-muted: 192 5% 37%;        /* #5a6061 */
  --sidebar-active-accent: 192 5% 37%;

  /* Radius */
  --radius: 0.25rem;                  /* 4px - Architectural */

  /* Fonts */
  --font-sans: var(--font-inter);
  --font-headline: var(--font-manrope);
}
```

#### 1.2 Deletar bloco dark mode

Remover completamente o bloco:
```css
/* DELETAR TUDO ISSO: */
@media (prefers-color-scheme: dark) {
  :root {
    /* ... todas as variáveis dark ... */
  }
}
```

#### 1.3 Adicionar classes utilitárias do novo design system

```css
/* Architectural Monolith Utilities */
.font-headline {
  font-family: var(--font-manrope), sans-serif;
}

.ambient-shadow {
  box-shadow: 0px 12px 32px rgba(45, 52, 53, 0.06);
}

.ambient-shadow-lg {
  box-shadow: 0px 20px 40px rgba(45, 52, 53, 0.08);
}

.glass {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.ghost-border {
  border: 1px solid rgba(173, 179, 180, 0.15);
}

.label-uppercase {
  font-family: var(--font-inter), sans-serif;
  font-size: 0.625rem;      /* 10px */
  font-weight: 700;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: hsl(var(--muted-foreground));
}
```

#### 1.4 Atualizar Tailwind theme (em globals.css com @theme inline)

```css
@theme inline {
  --font-sans: var(--font-inter);
  --font-headline: var(--font-manrope);
  --color-surface: #f9f9f9;
  --color-surface-low: #f2f4f4;
  --color-surface-container: #ebeeef;
  --color-surface-high: #e4e9ea;
  --color-surface-highest: #dde4e5;
  --color-on-surface: #2d3435;
  --color-on-surface-variant: #5a6061;
  --color-primary-graphite: #5f5e5e;
  --color-primary-dim: #535252;
  --color-accent-orange: #974a00;
  --color-accent-orange-light: #ffdcc6;
}
```

### Arquivo: `src/app/layout.tsx`

```tsx
// ANTES:
import { Geist, Geist_Mono } from 'next/font/google'
const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

// DEPOIS:
import { Manrope, Inter } from 'next/font/google'
const manrope = Manrope({ variable: '--font-manrope', subsets: ['latin'] })
const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })

// Body class:
<body className={`${manrope.variable} ${inter.variable} font-sans antialiased bg-surface text-on-surface`}>
```

### Verificação
- [ ] Cores mudam globalmente em todo o site
- [ ] Fontes trocam para Inter (body) e Manrope disponível
- [ ] Sidebar muda de escura para clara
- [ ] Bordas ficam mais sutis (ghost borders)
- [ ] Site continua 100% funcional
- [ ] `npm run build` passa

---

## Fase 2 — Layout Shell (4 arquivos)

**Objetivo:** Transformar sidebar, header e shell para o novo design.

### 2.1 Sidebar (`src/components/layout/Sidebar.tsx`)

**Mudanças:**
- Background: `bg-sidebar` (agora claro #f2f4f4)
- Logo: ícone escuro em quadrado + "CMMS" Manrope extrabold + "Gestão de Manutenção" 10px uppercase
- Nav items: Inter 14px medium, ícones Material Symbols
- Active: `bg-[#2d3435] text-white rounded-[4px]` (em vez de bg-sidebar-accent com border-left)
- Inactive: `text-[#5a6061] hover:bg-[#dde4e5] rounded-[4px]`
- Separadores: espaçamento + `opacity-20 h-px bg-[#adb3b4]` (muito sutil)
- Bottom: botão "+ Nova OS" bg-[#2d3435] text-white
- REMOVER todos os imports lucide-react, usar `<Icon name="..." />`

### 2.2 Header (`src/components/layout/Header.tsx`)

**Rebuild completo:**
- Height: 64px (`h-16`)
- Background: `glass` (bg-white/80 backdrop-blur-xl)
- Shadow: `shadow-[0_10px_40px_rgba(0,0,0,0.04)]`
- Left: Brand "CMMS" Manrope extrabold + tabs navegação (Visão Geral, Operacional)
- Right: Search input (bg-[#f2f4f4] rounded-[4px] sem borda), ícones notificação/config/ajuda, avatar

### 2.3 AppShell (`src/components/layout/AppShell.tsx`)

- Ajustar: `h-[calc(100vh-64px)]` (era 44px)
- Manter lógica de rotas públicas vs privadas
- Atualizar padding do main content

### 2.4 UserMenu (`src/components/layout/UserMenu.tsx`)

- Adaptar cores do dropdown para novo tema
- Trocar ícones para Material Symbols

### Verificação
- [ ] Sidebar clara com navegação funcional
- [ ] Header com glassmorphism, search bar, ícones
- [ ] Navegação entre páginas funciona
- [ ] Menu mobile funciona
- [ ] Sidebar collapsa corretamente
- [ ] UserMenu abre/fecha

---

## Fase 3 — UI Components (13 arquivos)

**Objetivo:** Atualizar todos os componentes base da biblioteca UI.

### 3.1 Card.tsx
```
ANTES: rounded-lg border border-border bg-card shadow-sm
DEPOIS: rounded-[4px] bg-card ambient-shadow  (sem border!)
```

### 3.2 Button.tsx
```
ANTES: rounded-md (6px), bg-primary (gray), variantes coloridas
DEPOIS: rounded-[4px], bg-[#5f5e5e] text-[#faf7f6], hover → bg-[#535252]
         Novo variant "accent": bg-[#974a00] text-white (para CTAs destacados)
```

### 3.3 Input.tsx
```
ANTES: border border-input bg-background rounded-md
DEPOIS: bg-[#f2f4f4] rounded-[4px] border-none focus:ring-1 ring-[#5f5e5e]
        OU: border-b-2 border-[#dde4e5] bg-transparent focus:border-[#5f5e5e]
        Labels: uppercase tracking-widest text-[10px] font-bold text-[#5a6061]
```

### 3.4 Table.tsx
```
ANTES: borders em rows, hover:bg-muted/50
DEPOIS: ZERO borders entre rows
        Header: bg-[#f2f4f4] text-[10px] uppercase tracking-widest text-[#5a6061]
        Rows: hover:bg-[#f2f4f4]/50, OU zebra striping alternando bg transparent/bg-[#f9f9f9]
        Cells: px-8 py-6 (mais espaçamento)
```

### 3.5 Badge.tsx
```
ANTES: rounded-full px-2.5 py-0.5
DEPOIS: rounded-[2px] px-2 py-1, text-[10px] font-bold uppercase tracking-wider
        Com dot indicador (span w-1.5 h-1.5 rounded-full)
```

### 3.6 Modal.tsx
```
ANTES: bg-card border border-border shadow-2xl
DEPOIS: bg-card ambient-shadow-lg rounded-[4px], SEM border
        Overlay: bg-black/20 (mais leve) OU glass overlay
```

### 3.7 Demais componentes
- **Tabs.tsx**: active tab com border-bottom #2d3435, inactive em #5a6061
- **ConfirmDialog.tsx**: glass overlay, ambient shadow, sem bordas
- **ConfirmationModal.tsx**: idem
- **ExportButton.tsx**: ghost button style
- **FileUpload.tsx**: área tracejada com ghost-border
- **PageSkeleton.tsx**: usar novas cores de surface

### Verificação
- [ ] Cards sem bordas, com ambient shadow
- [ ] Botões com 4px radius e novas cores
- [ ] Inputs com estilo filled ou bottom-stroke
- [ ] Tabelas sem linhas entre rows
- [ ] Badges com novo formato (não pill)
- [ ] Modais sem bordas, com glassmorphism
- [ ] Todos os componentes renderizam corretamente

---

## Fase 4 — Feature Components (35 arquivos)

**Objetivo:** Atualizar todos os componentes de domínio. Trabalho mecânico mas volumoso.

### Subpastas e arquivos:

| Subpasta | Arquivos | Tarefas Principais |
|----------|----------|-------------------|
| `work-orders/` | DetailModal, EditModal, ExecuteModal, FinalizeModal | Trocar ícones, remover bordas, tonal layering |
| `assets/` | Tree, Table, DetailPanel, EditPanel, CreatePanel, DetailModal, EditModal, CreateModal, Attachments, Timeline | Idem + tree com novo estilo |
| `requests/` | DetailModal, FormModal, FileUploader | Idem |
| `rafs/` | ViewModal, EditModal, FormModal, ActionButtons | Idem |
| `people/` | DetailModal, FormModal | Idem |
| `teams/` | DetailModal, FormModal | Idem |
| `basic-registrations/` | CrudTable, GenericStepModal, CalendarModal, AssetFamilyModal, ResourceModal | Idem + CrudTable = maior impacto |
| `approvals/` | ApprovalModal, ApproveRequestModal | Idem |
| `execution/` | ExecutionModal | Idem |
| `dashboard/` | CorporateDashboard | Headlines Manrope, KPIs com acento laranja |
| `gep/` | VariableSelector | Idem |

### Para CADA arquivo, aplicar:
1. Substituir imports `lucide-react` → `@/components/ui/Icon`
2. Remover classes `border-*` de containers
3. Trocar `text-gray-*` por tokens (`text-foreground`, `text-muted-foreground`, `text-on-surface-variant`)
4. Trocar `rounded-lg/xl` por `rounded-[4px]`
5. Trocar `shadow-sm/lg` por `ambient-shadow`
6. Adicionar `font-headline` em títulos relevantes

### Verificação
- [ ] Todos os modais abrem/fecham corretamente
- [ ] Formulários continuam funcionando
- [ ] CRUD completo funciona (criar, ler, editar, deletar)
- [ ] Ícones Material Symbols renderizam
- [ ] Visual consistente entre componentes

---

## Fase 5 — Pages (44 arquivos)

**Objetivo:** Atualizar todas as páginas do sistema.

### 5.1 Padrão Dashboard (dashboard, team-dashboard, analytics)
- Título: `font-headline text-5xl font-extrabold tracking-tighter`
- Label acima: `label-uppercase` ("STATUS DO SISTEMA", "INDICADORES", etc.)
- KPI cards: valor grande font-headline, trend com cor (verde/vermelho)
- Seções separadas por tonal layering (bg-surface-low → bg-surface)

### 5.2 Padrão List (work-orders, assets, requests, rafs, people-teams, locations, etc.)
- Título: `font-headline text-5xl font-extrabold tracking-tighter`
- Filtros: inputs filled, dropdowns sem borda
- Tabela: componente Table atualizado (fase 3)
- Cards em grid: ambient-shadow, sem bordas
- Paginação: text-[10px] uppercase tracking-widest

### 5.3 Padrão Form (*/new, */edit)
- Card wrapper: sem borda, ambient-shadow
- Seções do form: separadas por spacing (não por <hr> ou borders)
- Labels: uppercase 10px tracking-widest
- Submit button: primary com hover dim

### 5.4 Padrão Detail (*/[id])
- Header: back button + título grande + badges
- Two-column: main (tonal bg mais claro) + sidebar (cards brancos)
- Info sections: separadas por tonal shifts, não bordas

### 5.5 Páginas Especiais
- **Login**: layout two-column (hero escuro + form claro), já tem tela no Stitch
- **Hub**: cards centralizados com módulos, já tem tela no Stitch
- **KPI**: headlines com dados grandes, gráficos, acento laranja
- **Criticidade**: matrix GUT com cores semânticas
- **Tree**: navegação hierárquica com tonal layering para nesting
- **GEP**: gráficos + tabelas de variáveis de processo

### Verificação
- [ ] CADA página renderiza no novo estilo
- [ ] Navegação completa funciona (sidebar → página → modal → ação)
- [ ] Filtros e buscas funcionam
- [ ] Paginação funciona
- [ ] Formulários submetem corretamente
- [ ] CRUD completo para cada módulo

---

## Fase 6 — Cleanup

**Objetivo:** Eliminar todo código morto e dependências antigas.

### Tarefas

1. **Atualizar utils.ts:**
   ```ts
   // getStatusColor() - novas cores do design system
   // getPriorityColor() - novas cores do design system
   ```

2. **Desinstalar lucide-react:**
   ```bash
   npm uninstall lucide-react
   ```

3. **Remover fontes Geist do layout.tsx** (se ainda restarem)

4. **Audit com grep** — ZERO ocorrências permitidas:
   ```bash
   # Nenhum resultado esperado:
   grep -r "lucide-react" src/
   grep -r "text-gray-" src/
   grep -r "border-border" src/
   grep -r "rounded-lg" src/
   grep -r "geist" src/ --ignore-case
   grep -r "shadow-sm\|shadow-lg\|shadow-xl" src/
   grep -r "#000000\|#000" src/  # nenhum preto puro
   grep -r "prefers-color-scheme" src/  # sem dark mode
   ```

5. **Verificar package.json:** lucide-react não listado

### Verificação
- [ ] `npm run build` passa sem warnings
- [ ] Grep audit retorna ZERO resultados para todos os padrões acima
- [ ] Bundle size menor (sem lucide-react tree)

---

## Fase 7 — Polish

**Objetivo:** Refinamento final para pixel-perfect com o design system.

### Tarefas

1. **Hierarquia tipográfica:**
   - Headlines de página: `font-headline text-5xl font-extrabold tracking-[-0.02em]`
   - Section titles: `font-headline text-xl font-bold tracking-tight`
   - Table headers: `text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground`
   - Body data: `text-sm font-medium` Inter

2. **Espaçamento generoso:**
   - Padding de cards: `p-8` (não p-4 ou p-6)
   - Gap entre seções: `mb-12` (não mb-6)
   - Padding entre rows da tabela: `py-6` (não py-4)

3. **Audit de sombras:**
   - Todos os cards: `ambient-shadow`
   - Floating elements: `ambient-shadow-lg`
   - ZERO `shadow-sm`, `shadow-lg`, `shadow-xl` padrão

4. **Audit de cores:**
   - NENHUM `#000000` puro → usar `#2d3435`
   - NENHUM `border` visível → ghost-border ou tonal shift
   - KPIs e trends com acento `#974a00` (laranja)

5. **Review visual página por página:**
   - Screenshot de cada página
   - Comparar com referência do Stitch
   - Ajustar detalhes

### Verificação
- [ ] Visual consistente em TODAS as páginas
- [ ] Hierarquia tipográfica clara e consistente
- [ ] Espaçamento generoso em todo o sistema
- [ ] Nenhum preto puro, nenhuma borda sólida
- [ ] Comparação visual com referência do Stitch aprovada

---

## Ordem de Execução e PRs

```
Fase 0 (Preparação)     → PR #1: "chore: add Manrope/Inter fonts and Icon component"
Fase 1 (CSS Foundation) → PR #2: "style: migrate CSS tokens to Architectural Monolith"
Fase 2 (Layout Shell)   → PR #3: "style: redesign sidebar, header and app shell"
Fase 3 (UI Components)  → PR #4: "style: update all UI primitives to new design system"
Fase 4 (Features)       → PR #5-#7: split by subdirectory groups
Fase 5 (Pages)          → PR #8-#10: split by page pattern
Fase 6 (Cleanup)        → PR #11: "chore: remove lucide-react, dead code and old patterns"
Fase 7 (Polish)         → PR #12: "style: typography, spacing and final visual polish"
```

## Estimativa de Esforço

| Fase | Arquivos | Estimativa |
|------|----------|------------|
| 0 - Preparação | 3 novos | 1h |
| 1 - CSS Foundation | 2 | 2h |
| 2 - Layout Shell | 4 | 4h |
| 3 - UI Components | 13 | 4h |
| 4 - Feature Components | 35 | 8h |
| 5 - Pages | 44 | 8h |
| 6 - Cleanup | audit | 2h |
| 7 - Polish | review | 3h |
| **Total** | **~100 arquivos** | **~32h** |

---

## Checklist Final de Qualidade

- [ ] ZERO imports de `lucide-react`
- [ ] ZERO classes `text-gray-*` hardcoded
- [ ] ZERO `border-border` ou bordas sólidas em containers
- [ ] ZERO `rounded-lg` (tudo `rounded-[4px]` ou `rounded-[2px]`)
- [ ] ZERO `#000000` (preto puro)
- [ ] ZERO dark mode code
- [ ] ZERO sombras padrão (shadow-sm/lg/xl)
- [ ] Todas as páginas usam font-headline para títulos
- [ ] Todas as labels são uppercase 10px tracking-widest
- [ ] Sidebar clara com navegação funcional
- [ ] Header com glassmorphism e search
- [ ] `npm run build` passa sem erros
- [ ] Todos os CRUDs funcionam
- [ ] Navegação completa funciona
- [ ] Layout responsivo preservado
