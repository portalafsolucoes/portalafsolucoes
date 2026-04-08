# CMM Gestor de Manutenção

## Repositório GitHub
https://github.com/portalafsolucoes/portalafsolucoes

## Stack
- **Framework:** Next.js 15 (App Router, React 19, TypeScript)
- **Banco:** PostgreSQL via Supabase + Prisma ORM
- **UI:** Tailwind CSS v4 + Shadcn/UI + Recharts
- **Estado:** Zustand + React Query
- **Testes:** Playwright (E2E)
- **Deploy:** Vercel + Cloudinary (uploads)

## Comandos
- `npm run dev` — Desenvolvimento local (http://localhost:3000)
- `npm run build` — Build de produção (`prisma generate && next build`)
- `npm run test` — Testes E2E com Playwright
- `npm run db:push` — Atualiza schema no banco
- `npm run db:studio` — Prisma Studio (interface visual do banco)
- `npm run lint` — ESLint

## Estrutura do Projeto
```
src/
  app/          # Rotas (work-orders, requests, assets, gep, rafs)
  components/   # Componentes React
  hooks/        # Hooks customizados
prisma/         # Schema do banco (Prisma)
public/         # Arquivos estáticos
scripts/        # Scripts utilitários
tests/          # Testes E2E (Playwright)
docs/           # Documentação
gep/            # Módulo GEP (variáveis de processo industrial)
```

## Layout de Páginas (OBRIGATÓRIO)

Toda tela (`page.tsx`) DEVE usar os componentes `PageContainer` e `PageHeader`. Nunca defina padding, max-width ou título de página manualmente.

### PageContainer (`src/components/layout/PageContainer.tsx`)

Envolve todo o conteúdo da página. Escolha a variante correta:

| Variante | Quando usar | Largura |
|----------|-------------|---------|
| `default` | Listagens, dashboards, tabelas | 100% (sem max-width) |
| `narrow` | Páginas de detalhe (ex: perfil, ver item) | max-w-4xl (896px) |
| `form` | Formulários de criação/edição | max-w-3xl (768px) |
| `full` | Layouts full-height (árvore de ativos, split-view) | 100% + flex column |

```tsx
// Listagem
<PageContainer>...</PageContainer>

// Detalhe
<PageContainer variant="narrow">...</PageContainer>

// Formulário
<PageContainer variant="form">...</PageContainer>

// Full-height
<PageContainer variant="full" className="overflow-hidden">...</PageContainer>
```

### PageHeader (`src/components/layout/PageHeader.tsx`)

Título padronizado de toda página. Estilos fixos, não alterar tamanho:
- Título: `text-3xl font-bold text-foreground tracking-tight`
- Descrição: `mt-1 text-sm text-muted-foreground`

```tsx
<PageHeader
  title="Nome da Página"
  description="Descrição opcional"
  actions={<Button>Ação</Button>}
/>
```

### Regras
- **NÃO** use `<AppLayout>` — é um componente legado (no-op)
- **NÃO** adicione `px-*`, `py-*`, `max-w-*`, `mx-auto` em divs wrapper de página — o PageContainer já faz isso
- **NÃO** crie `<h1>` manual para título — use PageHeader
- **NÃO** use ícones dentro do título — PageHeader aceita apenas string
- O `AppShell` fornece sidebar + header + scroll. O padding é responsabilidade exclusiva do PageContainer

## Módulos
- **Ativos & Localizações** — Cadastro hierárquico com criticidade GUT
- **Ordens de Serviço (OS)** — Corretiva, preventiva, preditiva, reativa
- **Solicitações (SS)** — Portal de chamados com fluxo de aprovação
- **Estoque & Compras** — Peças, fornecedores, ordens de compra
- **RAF** — Análise de falhas (5 Porquês + plano de ação)
- **GEP** — Variáveis de processo industrial (automação)
