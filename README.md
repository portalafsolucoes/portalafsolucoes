# CMM Gestor de Manutencao

Sistema CMMS (Computerized Maintenance Management System) para gestao de ativos, ordens de servico, estoque e analise de falhas com monitoramento de variaveis de processo industrial (GEP).

## Stack

- **Framework:** Next.js 15 (App Router, React 19, TypeScript)
- **Banco:** PostgreSQL via Supabase + Prisma ORM
- **UI:** Tailwind CSS v4 + Shadcn/UI + Recharts
- **Estado:** Zustand + React Query
- **Testes:** Playwright (E2E)
- **Deploy:** Vercel + Cloudinary (uploads)

## Modulos

| Modulo | Descricao |
|--------|-----------|
| Ativos & Localizacoes | Cadastro hierarquico com criticidade GUT |
| Ordens de Servico (OS) | Corretiva, preventiva, preditiva, reativa |
| Solicitacoes (SS) | Portal de chamados com fluxo de aprovacao |
| Estoque & Compras | Pecas, fornecedores, ordens de compra |
| RAF | Analise de falhas (5 Porques + plano de acao) |
| GEP | Variaveis de processo industrial (automacao) |

## Setup

```bash
cp .env.example .env        # preencha as credenciais Supabase
npm install
npm run db:push              # cria tabelas no banco
npm run dev                  # http://localhost:3000
```

## Scripts

| Comando | Descricao |
|---------|-----------|
| `npm run dev` | Ambiente de desenvolvimento |
| `npm run build` | Build de producao |
| `npm run test` | Testes E2E (Playwright) |
| `npm run db:push` | Atualiza schema do banco |

## Estrutura

```
src/
  app/          # Rotas (work-orders, requests, assets, gep, rafs)
  components/   # Componentes React
  hooks/        # Hooks customizados
prisma/         # Schema do banco
scripts/        # Scripts de manutencao e deploy
tests/          # Testes E2E
docs/           # Documentacao tecnica
gep/            # Dados de variaveis de processo
```

## Documentacao

Toda documentacao tecnica esta em [`docs/`](./docs/).
