# Produtos do Portal AF Soluções

O Portal AF Soluções é uma plataforma com três produtos comerciais independentes, cada um habilitado por empresa via `CompanyProduct` no banco.

## Glossário

- **Produto**: unidade comercial vendida e habilitada por empresa (CMMS, GVP, GPA).
- **Feature / Módulo de menu**: item navegável dentro de um produto (ex.: `work-orders`, `tree`). Pertence a exatamente um Produto via `Module.productId`.
- **Habilitação por empresa**: `CompanyProduct` habilita o produto inteiro; `CompanyModule` habilita features finas dentro dele.
- **Portal / Plataforma**: guarda-chuva AF Soluções. `/hub` é a porta de entrada pública.

## Produtos

### CMMS — Gestão de Manutenção
- **Slug**: `CMMS`
- **Status**: `ACTIVE` (implementado e em produção)
- **Rota raiz**: `/dashboard` (ou `/work-orders` para perfis operacionais)
- **Objetivo**: Planejamento, execução e controle de manutenção preventiva e corretiva de ativos industriais.
- **Features**: dashboard, tree, people-teams, basic-registrations, assets, maintenance-plan, planning, work-orders, requests, approvals, rafs, locations, kpi, analytics, settings

### GVP — Gestão de Variáveis de Processo
- **Slug**: `GVP`
- **Status**: `COMING_SOON` (schema parcial existente, implementação futura)
- **Rota raiz**: `/gvp` (atual `/gep` é redirect)
- **Objetivo**: Monitoramento e análise de variáveis operacionais em tempo real para controle de qualidade e eficiência.
- **Features planejadas**: process-variables, process-readings, process-alarms, process-sectors, gvp-dashboard
- **Schema**: `ProcessVariable`, `ProcessReading`, `ProcessAlarm`, `ProcessAlarmTrigger`, `ProcessDataFile` já existem em `prisma/schema.prisma`

### GPA — Gestão de Portaria e Acesso
- **Slug**: `GPA`
- **Status**: `COMING_SOON` (não implementado — aguarda PRD)
- **Rota raiz**: `/portaria`
- **Objetivo**: Controle inteligente de acesso com leitura de placas (LPR) e gestão integrada de portaria e notas fiscais.
- **Features planejadas**: gates, visitors, access-logs, license-plates, deliveries
- **Domínio esperado**: `AccessGate`, `Visitor`, `Vehicle`, `LicensePlateReading`, `AccessLog`, `Delivery`, `AccessRule`

## Matriz Produto × Feature

| Feature (Module slug) | Produto |
|---|---|
| dashboard | CMMS |
| tree | CMMS |
| people-teams | CMMS |
| basic-registrations | CMMS |
| assets | CMMS |
| maintenance-plan | CMMS |
| planning | CMMS |
| work-orders | CMMS |
| requests | CMMS |
| approvals | CMMS |
| rafs | CMMS |
| locations | CMMS |
| kpi | CMMS |
| analytics | CMMS |
| settings | CMMS |
| gep (alias) / process-variables | GVP |
| process-readings | GVP |
| process-alarms | GVP |
| gvp-dashboard | GVP |
| gates | GPA |
| visitors | GPA |
| access-logs | GPA |

## Regras de Habilitação

- Cada empresa pode ter um subconjunto de produtos habilitados via `CompanyProduct`.
- Por padrão, apenas CMMS é habilitado ao criar uma nova empresa.
- GVP e GPA são habilitados manualmente pelo SUPER_ADMIN via `/admin/portal` (UI futura) ou SQL.
- Desabilitar um produto oculta todas as suas features na sidebar e bloqueia acesso via middleware.

## Débitos Registrados

- **Shell e branding CMMS-centric** (`src/lib/branding.ts`, `src/components/layout/AppShell.tsx`): shell ainda usa linguagem de manutenção. Neutralizar quando GVP/GPA forem implementados.
- **Dupla fonte de verdade do GVP** (`src/lib/gep-parser.ts` vs banco): resolver na implementação de GVP escolhendo entre banco ou ingestão de arquivos com persistência.
- **Rotas legadas CMMS**: `/people`, `/teams`, `/team-dashboard` (legados) vs. `/people-teams` (canônico). Consolidar em ciclo futuro.
- **Enum `ProcessSector` hardcoded** em `ProcessVariable`: migrar para tabela multi-tenant na implementação de GVP.
- **Admin UI de produtos**: toggle de produtos por empresa em `/admin/portal` — pendente de implementação.
