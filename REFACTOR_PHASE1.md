# Refatoracao de Layout — Fase 1: Primitivos + Pilotos

Data: 2026-04-08

---

## Arquivos Criados

### 1. `src/components/layout/PageContainer.tsx` (NOVO)

Componente de container de pagina com 4 variantes:

| Variante | Classes |
|----------|---------|
| `default` | `mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6` |
| `narrow` | `mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-8 py-6` |
| `form` | `mx-auto w-full max-w-3xl px-4 sm:px-6 lg:px-8 py-6` |
| `full` | `flex h-full flex-col px-4 sm:px-6 lg:px-8 py-6` |

Aceita `className` para override pontual via `cn()` (clsx + tailwind-merge).

### 2. `src/components/layout/PageHeader.tsx` (NOVO)

Componente de cabecalho de pagina com API:
- `title: string` — texto do h1
- `description?: string` — subtitulo opcional
- `actions?: ReactNode` — botoes/acoes alinhados a direita
- `className?: string` — override do container

Estilos fixos:
- Titulo: `text-3xl font-bold text-foreground tracking-tight`
- Descricao: `mt-1 text-sm text-muted-foreground`
- Container: `flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6`

---

## Arquivos Modificados

### 3. `src/components/layout/AppShell.tsx`

**Diff resumido:**
```diff
- <div className="h-full overflow-y-auto px-4 py-6 sm:px-6 lg:px-8">
+ <div className="h-full overflow-y-auto">
```

O padding `px-4 py-6 sm:px-6 lg:px-8` foi removido do wrapper interno do `<main>`.
A responsabilidade de padding agora e do `PageContainer` dentro de cada pagina.

**Impacto**: Todas as ~40 telas que NAO foram migradas ainda vao perder o padding do AppShell.
Isso e esperado — na Fase 2, cada tela sera migrada para usar `<PageContainer>`.
Durante a transicao, telas nao-migradas ficarao sem padding lateral/vertical ate serem atualizadas.

### 4. `src/app/people/page.tsx` (Piloto A)

**Mudancas:**
- Removido import de `AppLayout` e `Link` (nao utilizado)
- Adicionado imports de `PageContainer` e `PageHeader`
- Substituido `<AppLayout>` por `<PageContainer>` (variante default)
- Substituido header manual (`<div className="max-w-7xl mx-auto p-6">` + h1 inline) por `<PageHeader>`
- Preservados: texto do titulo ("Pessoas"), descricao, botao "Adicionar Pessoa" (agora via prop `actions`)
- Removida a div wrapper `max-w-7xl mx-auto p-6` (substituida pelo PageContainer default que ja inclui max-w-7xl)

### 5. `src/app/work-orders/page.tsx` (Piloto B)

**Mudancas:**
- Removido import de `AppLayout`
- Adicionado imports de `PageContainer` e `PageHeader`
- Substituido `<AppLayout>` por `<PageContainer>` (variante default)
- Substituido header manual (titulo `text-xl md:text-2xl` + icone + descricao + actions complexos) por `<PageHeader>`
- Removida a div wrapper `px-4 py-4 sm:px-6 lg:px-8 lg:py-6` (era padding duplicado com o AppShell)
- **Titulo padronizado**: de `text-xl md:text-2xl` para `text-3xl` (via PageHeader)
- Preservados: toggle grid/table, ExportButton, botao "Nova Ordem" (agora via prop `actions`)

---

## Como Testar Visualmente

### Pre-requisito
```bash
npm run dev
```

### Tela 1: Pessoas (`/people`)
1. Acessar http://localhost:3000/people
2. Verificar:
   - Titulo "Pessoas" em `text-3xl font-bold` com `tracking-tight`
   - Subtitulo "Gerencie as pessoas da organizacao" em `text-sm text-muted-foreground`
   - Botao "Adicionar Pessoa" alinhado a direita do titulo (mobile: abaixo)
   - Container centralizado com max-width 1280px e padding lateral responsivo
   - Sem padding duplo (conteudo nao deve estar excessivamente recuado)
3. Testar responsividade: reduzir a janela para mobile e confirmar que titulo e botao empilham verticalmente

### Tela 2: Ordens de Servico (`/work-orders`)
1. Acessar http://localhost:3000/work-orders
2. Verificar:
   - Titulo "Ordens de Servico (OS)" agora em `text-3xl font-bold` (antes era `text-xl md:text-2xl`)
   - Subtitulo "Gerencie todas as ordens de manutencao"
   - Toggle grid/table + ExportButton + "Nova Ordem" alinhados a direita
   - Container centralizado com max-width 1280px
   - Sem padding duplo (antes tinha ~64px horizontal no desktop, agora ~32px)
3. Abrir uma OS para garantir que o modal inline continua funcionando

### Telas NAO migradas (regressao esperada)
- Telas como `/dashboard`, `/teams`, `/locations` etc. vao perder o padding lateral/vertical do AppShell
- Isso e **intencional** — serao migradas na Fase 2

---

## Decisoes Tomadas por Conta Propria

1. **Removi o import orfao de `Link` em people/page.tsx** — nao era usado no corpo da pagina, provavelmente residuo de refatoracao anterior.

2. **Mantive o icone do titulo de work-orders fora do PageHeader** — o PageHeader recebe `title` como string, nao como ReactNode. O titulo anterior de work-orders tinha um `<Icon>` inline. Optei por remover o icone do titulo (que era `<Icon name="description">`) para manter a API simples e consistente. Se futuramente for necessario icones nos titulos, a prop `title` pode ser mudada para `ReactNode`.

3. **O `actions` wrapper no PageHeader usa `flex items-center gap-2 flex-shrink-0`** — adicionei `flex-shrink-0` para evitar que os botoes sejam comprimidos quando o titulo for longo.

4. **Mantive os modais dentro do `<PageContainer>`** em ambas as telas — eles usam `fixed` positioning, entao a posicao no DOM nao afeta o layout visual. Mover para fora seria uma mudanca desnecessaria.
