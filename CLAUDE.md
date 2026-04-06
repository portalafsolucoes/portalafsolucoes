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

## Módulos
- **Ativos & Localizações** — Cadastro hierárquico com criticidade GUT
- **Ordens de Serviço (OS)** — Corretiva, preventiva, preditiva, reativa
- **Solicitações (SS)** — Portal de chamados com fluxo de aprovação
- **Estoque & Compras** — Peças, fornecedores, ordens de compra
- **RAF** — Análise de falhas (5 Porquês + plano de ação)
- **GEP** — Variáveis de processo industrial (automação)
