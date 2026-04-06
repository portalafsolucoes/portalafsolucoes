# Auditoria Unificada de Performance & UX - Portal AF Soluções (CMMS)

**Data:** 2026-04-06
**Fontes:** Auditoria Claude Code (analise de codigo + metricas browser) + Auditoria Codex (E2E automatizado + responsividade)
**Modulo:** Gestao de Manutencao (CMMS)
**Usuario de teste:** super.admin@polimix.local (SUPER_ADMIN)
**Ambiente:** localhost:3000 (dev mode, Next.js 15)

---

## 1. Resumo Executivo

O sistema foi auditado por dois processos independentes que convergem no mesmo diagnostico: **o CMMS esta criticamente lento e com arquitetura de data fetching inadequada para um produto comercial**.

| Metrica Consolidada | Valor |
|---|---:|
| Telas auditadas | 27 |
| Testes executados | 40 |
| Testes reprovados | 26 (65%) |
| Tempo medio de abertura | 4.516ms |
| Chamadas `/api/auth/me` em sessao completa | **88** |
| Login ate dashboard | 7.887ms |
| Pior tela (Pessoas/Equipes) | **15.771ms** |
| Erros 503 observados | 4 ocorrencias |
| Overflow horizontal (tablet/mobile) | 0 |

### Veredicto: 26 de 27 telas reprovam no criterio de performance (<2.5s)

A unica tela que passou foi o Dashboard (1.418ms na navegacao SPA), mas na primeira carga absoluta levou **~33s** (incluindo compilacao HMR + 12s de FCP).

---

## 2. Metricas Detalhadas por Tela (Dados Cruzados)

### Telas Principais

| # | Tela | Rota | Tempo Abertura | TTFB | FCP | auth/me calls | API Mais Lenta | Severidade |
|---|---|---|---:|---:|---:|---:|---|---|
| 1 | Dashboard | `/dashboard` | 1.418ms | 1.598ms | 12.040ms | 5x | `/api/auth/me` (2.728ms) | CRITICA (FCP) |
| 2 | Arvore | `/tree` | 7.816ms | 3.471ms | 3.588ms | 2x | `/api/tree` (6.982ms) | CRITICA |
| 3 | Pessoas/Equipes | `/people-teams` | 15.771ms | 6.049ms | 6.220ms | 3x | `/api/requests/pending` (7.122ms) | CRITICA |
| 4 | Ativos | `/assets` | 4.085ms | 3.653ms | 3.780ms | 4x | `/api/auth/me` (348ms) | ALTA |
| 5 | Criticidade | `/criticality` | 3.151ms | 6.129ms | 6.388ms | 4x | `/api/criticality` (1.485ms) | ALTA |
| 6 | Plano de Manutencao | `/maintenance-plan` | 2.328ms | 1.720ms | 1.816ms | 4x | `/api/auth/me` (15.166ms!) | CRITICA |
| 7 | Planejamento | `/planning` | 3.247ms | 82ms | 168ms | 6x | `/api/planning/plans` (3.310ms) | ALTA |
| 8 | Ordens de Servico | `/work-orders` | 1.810ms | 161ms | 264ms | 6x | RSC fetch (2.933ms) | MEDIA |
| 9 | Solicitacoes (SS) | `/requests` | 2.459ms | 1.265ms | 1.360ms | 3x | `/api/auth/me` (1.341ms) | MEDIA |
| 10 | Aprovacoes | `/requests/approvals` | 1.975ms | 1.552ms | - | 4x | RSC fetch (2.236ms) | MEDIA |
| 11 | RAF | `/rafs` | 6.754ms | 340ms | - | 6x | `main-app.js` (6.706ms) | CRITICA |
| 12 | Localizacoes | `/locations` | 3.205ms | 3.978ms | - | 4x | `/api/auth/me` (816ms) | ALTA |
| 13 | KPI | `/kpi` | 5.062ms | 150ms | - | 4x | `/api/auth/me` (2.413ms) | CRITICA |

### Cadastros Basicos (somente Codex)

| # | Tela | Rota | Tempo | auth/me | pending | Severidade |
|---|---|---|---:|---:|---:|---|
| 14 | Tipos de Manutencao | `/basic-registrations/maintenance-types` | 6.441ms | 4x | 3x | CRITICA |
| 15 | Areas de Manutencao | `/basic-registrations/maintenance-areas` | 5.856ms | 3x | 1x | CRITICA |
| 16 | Tipos de Servico | `/basic-registrations/service-types` | 7.254ms | 3x | 1x | CRITICA |
| 17 | Calendarios | `/basic-registrations/calendars` | 5.930ms | 3x | 1x | CRITICA |
| 18 | Centros de Custos | `/basic-registrations/cost-centers` | 6.783ms | 3x | 1x | CRITICA |
| 19 | Areas | `/basic-registrations/areas` | 2.681ms | 3x | 1x | ALTA |
| 20 | Centros de Trabalho | `/basic-registrations/work-centers` | 6.122ms | 3x | 1x | CRITICA |
| 21 | Tipos Modelo | `/basic-registrations/asset-family-models` | 2.495ms | 3x | 1x | MEDIA |
| 22 | Familias de Bens | `/basic-registrations/asset-families` | 2.597ms | 3x | 1x | ALTA |
| 23 | Posicoes | `/basic-registrations/positions` | 2.528ms | 3x | 1x | ALTA |
| 24 | Recursos | `/basic-registrations/resources` | 5.701ms | 3x | 1x | CRITICA |
| 25 | Tarefas Genericas | `/basic-registrations/generic-tasks` | 2.795ms | 3x | 1x | ALTA |
| 26 | Etapas Genericas | `/basic-registrations/generic-steps` | 2.875ms | 3x | 1x | ALTA |
| 27 | Caracteristicas | `/basic-registrations/characteristics` | 2.787ms | 3x | 1x | ALTA |

### Responsividade (Codex)

| Perfil | Tela | Tempo | Overflow | Menu Mobile |
|---|---|---:|---|---|
| Tablet | Dashboard | 6.663ms | Nao | Sim |
| Tablet | Ativos | 3.537ms | Nao | Sim |
| Tablet | Plano de Manutencao | 3.731ms | Nao | Sim |
| Tablet | Planejamento | 8.111ms | Nao | Sim |
| Tablet | Ordens de Servico | 2.812ms | Nao | Sim |
| Tablet | Solicitacoes | 2.984ms | Nao | Sim |
| Mobile | Dashboard | 3.236ms | Nao | Sim |
| Mobile | Ativos | 2.848ms | Nao | Sim |
| Mobile | Plano de Manutencao | 2.837ms | Nao | Sim |
| Mobile | Planejamento | 5.613ms | Nao | Sim |
| Mobile | Ordens de Servico | 2.894ms | Nao | Sim |
| Mobile | Solicitacoes (SS) | **17.217ms** | Nao | Sim |

**Nota positiva:** Nenhum overflow horizontal detectado. Layout responsivo funcional. Problema e exclusivamente de performance.

---

## 3. Diagnostico Consolidado - Causas-Raiz

Ambas as auditorias convergem nos mesmos 5 problemas fundamentais, ordenados por impacto:

### CR-1: AppLayout NAO e Persistente entre Rotas (CRITICA)

**Concordancia:** Ambas auditorias identificaram este como o problema #1.

O componente `AppLayout` (sidebar + header + navbar) e instanciado **dentro de cada `page.tsx`** em vez de estar no `layout.tsx` do App Router. Isso significa que a cada navegacao:
- Sidebar e completamente desmontada e remontada
- Todos os `useEffect` de mount rodam novamente
- Estado local e perdido
- Flash visual de conteudo recarregando

**Evidencia:** `src/components/layout/AppLayout.tsx` importado em cada page, nao no layout.

**Impacto:** 88 chamadas redundantes de `/api/auth/me` em uma sessao de 27 telas.

---

### CR-2: Ausencia de Auth Provider Centralizado (CRITICA)

**Concordancia:** Ambas auditorias identificaram. Claude Code detalhou os componentes; Codex quantificou (88 chamadas).

Cada componente faz fetch independente ao `/api/auth/me`:
- **Sidebar.tsx** — role + badge de pendencias
- **UserMenu.tsx** — nome/avatar do usuario
- **Navbar.tsx** — permissoes de navegacao
- **Cada page.tsx** — verificacao de acesso

React Query esta **instalado mas NAO utilizado**. Nao existe Context Provider nem Zustand store para auth.

**Pior caso registrado:** `/api/auth/me` levou **15.166ms** (Plano de Manutencao).

---

### CR-3: `/api/requests/pending` Transfere Dados Excessivos (ALTA)

**Claude Code identificou:** Query retorna registros completos com 5 joins (User, Team, Asset, Location, File) quando so precisa do count.

**Codex confirmou:** Chamada em todas as 27 telas, com pior caso de **7.122ms** (Pessoas/Equipes).

**Query atual:** `SELECT *, createdBy:User(*), team:Team(*), asset:Asset(*), location:Location(*), files:File(*)`
**Query ideal:** `SELECT id, { count: 'exact', head: true }`

---

### CR-4: APIs com Full Table Scans e N+1 Queries (ALTA)

**Claude Code identificou no codigo-fonte:**

| API | Problema | Tempo Registrado |
|---|---|---:|
| `/api/dashboard/corporate` | Carrega TODAS as WOs, Assets, Users sem limit. Agrega em JS. | 503 errors |
| `/api/dashboard/stats` | 9 queries paralelas = rate limit Supabase | 503 errors |
| `/api/tree` | N+1: 3 queries por unidade (Area, WorkCenter, Asset) | 6.982ms |
| `/api/kpi` | Carrega TODAS as WOs sem filtro de data, computa KPIs em JS | 1.058-7.000ms |
| `/api/planning/plans` | Full scan de MaintenancePlanExecution + AssetMaintenancePlan | 3.310ms |
| `/api/criticality` | Query sem otimizacao | 1.485ms |
| `/api/basic-registrations/*` | Padroes similares em 14 endpoints | 233-1.786ms |

---

### CR-5: Ausencia de Skeleton Loading e Transicoes (MEDIA)

**Codex identificou:** Recarregamento visual perceptivel da sidebar e conteudo sem estados intermediarios. A experiencia e de "pagina recarregando" em vez de "SPA fluida".

**Claude Code confirmou:** FCP alto (3-12s) sem feedback visual ao usuario.

---

## 4. O que NAO e Problema

Para evitar esforco desnecessario, estes itens foram avaliados e **NAO precisam de correcao**:

| Item | Status | Justificativa |
|---|---|---|
| Layout responsivo (overflow) | OK | 0 telas com overflow em tablet/mobile |
| Menu mobile | OK | Funciona em todas as telas testadas |
| Middleware Next.js | OK | Apenas checa cookie, nao valida backend (rapido) |
| Erros 503 | Sintoma | Causados por rate limit Supabase (CR-4), nao problema de infra |
| HMR lento em dev | Ignorar | So afeta desenvolvimento, nao producao |
| Bundle `main-app.js` grande | Baixa prioridade | Resolvido parcialmente com code splitting na Fase 3 |
| Google Fonts via CSS | Baixa prioridade | Impacto marginal (~200ms) |

---

## 5. Plano de Acao Unificado

### Principios

1. **Zero breaking changes** — cada acao deve ser testavel isoladamente
2. **Incrementalidade** — tela por tela, API por API
3. **Testes antes e depois** — medir impacto real de cada mudanca
4. **Rollback facil** — commits atomicos, sem mega-refactors

---

### FASE 1 — Arquitetura de Auth e Layout (IMPACTO MAXIMO)

**Meta:** Eliminar 95% das chamadas redundantes. Navegacao entre telas < 1s.

| # | Acao | Arquivos Afetados | Complexidade | Impacto |
|---|---|---|---|---|
| 1.1 | **Mover AppLayout para `layout.tsx`** do App Router para que sidebar/header persistam entre rotas | `src/app/layout.tsx`, todas as `page.tsx` (remover wrapper AppLayout) | Media | CRITICO |
| 1.2 | **Criar hook `useAuth()` com React Query** — fetch unico com `staleTime: 5min`, deduplicacao automatica | Novo: `src/hooks/useAuth.ts`, `src/providers/QueryProvider.tsx` | Media | CRITICO |
| 1.3 | **Criar hook `usePendingCount()` com React Query** — retorna apenas count, `staleTime: 30s`, `refetchInterval: 60s` | Novo: `src/hooks/usePendingCount.ts` | Baixa | ALTO |
| 1.4 | **Refatorar Sidebar, Navbar, UserMenu** para usar `useAuth()` em vez de fetch direto | `Sidebar.tsx`, `Navbar.tsx`, `UserMenu.tsx` | Baixa | CRITICO |
| 1.5 | **Refatorar pages** para usar `useAuth()` em vez de fetch direto | Todas as `page.tsx` que chamam `/api/auth/me` | Baixa | CRITICO |

**Resultado esperado Fase 1:**
- `/api/auth/me`: de 88 chamadas/sessao para **1-2**
- `/api/requests/pending`: de 27+ chamadas/sessao para **1** (com refetch automatico)
- Navegacao entre telas: de 2.5-15s para **<500ms**
- Sidebar: para de "piscar" entre rotas

---

### FASE 2 — Otimizacao de Backend/APIs (ELIMINAR LENTIDAO)

**Meta:** Todas as APIs < 500ms. Zero erros 503.

| # | Acao | Arquivo | Complexidade | Impacto |
|---|---|---|---|---|
| 2.1 | **`/api/requests/pending`** — retornar apenas `{ count }` com `head: true` | `src/app/api/requests/pending/route.ts` | Baixa | ALTO |
| 2.2 | **`/api/dashboard/stats`** — serializar em 3 batches de 3 queries | `src/app/api/dashboard/stats/route.ts` | Baixa | ALTO |
| 2.3 | **`/api/dashboard/corporate`** — adicionar `.limit()` e mover agregacao para SQL/views | `src/app/api/dashboard/corporate/route.ts` | Media | ALTO |
| 2.4 | **`/api/kpi`** — adicionar filtro de data (ultimos 12 meses) + mover calculos para SQL | `src/app/api/kpi/route.ts` | Media | ALTO |
| 2.5 | **`/api/tree`** — consolidar 3 queries em 1 com joins | `src/app/api/tree/route.ts` | Media | ALTO |
| 2.6 | **`/api/planning/plans`** — adicionar paginacao e filtros | `src/app/api/planning/plans/route.ts` | Media | MEDIO |
| 2.7 | **`/api/auth/me`** — selecionar apenas campos necessarios (id, role, companyId, name) | `src/app/api/auth/me/route.ts` | Baixa | MEDIO |
| 2.8 | **Cache-Control headers** em todas as APIs GET | Todos os `route.ts` GET | Baixa | MEDIO |

**Resultado esperado Fase 2:**
- Dashboard: de 503 errors para **carregamento limpo < 2s**
- KPI: de 5-7s para **< 500ms**
- Tree: de 7s para **< 1s**
- Todas as APIs: **< 500ms**

---

### FASE 3 — UX Profissional (PERCEPCAO DE VELOCIDADE)

**Meta:** Sistema com aparencia e comportamento de produto comercial.

| # | Acao | Arquivos Afetados | Complexidade | Impacto |
|---|---|---|---|---|
| 3.1 | **Skeleton Loading global** — componente skeleton para sidebar, tabelas e cards | Novo: `src/components/ui/skeleton-page.tsx` | Media | ALTO |
| 3.2 | **Loading states** em cada page com `loading.tsx` do App Router | Novo: `loading.tsx` em cada rota | Baixa | ALTO |
| 3.3 | **Transicao de navegacao** — indicador de progresso no topo (NProgress ou similar) | `layout.tsx` | Baixa | MEDIO |
| 3.4 | **Migrar Google Fonts para `next/font`** | `layout.tsx`, CSS | Baixa | BAIXO |
| 3.5 | **Prefetch de rotas** — `<Link prefetch>` nos itens do sidebar | `Sidebar.tsx` | Baixa | MEDIO |
| 3.6 | **Code splitting** — dynamic import para paginas pesadas (RAF, KPI) | `page.tsx` das rotas pesadas | Baixa | MEDIO |

**Resultado esperado Fase 3:**
- Percepcao de velocidade: **instantanea** (skeleton aparece em <100ms)
- FCP < 1.5s em todas as telas
- Navegacao percebida < 300ms

---

## 6. Arquitetura Proposta

### Antes (Atual)

```
Cada page.tsx:
  └── AppLayout (monta sidebar + header + navbar)
       ├── Sidebar → fetch /api/auth/me + fetch /api/requests/pending
       ├── Navbar → fetch /api/auth/me
       ├── UserMenu → fetch /api/auth/me
       └── PageContent → fetch /api/auth/me (permissao)

Resultado: 4-6 fetches por navegacao, layout remontado, flash visual
```

### Depois (Proposto)

```
layout.tsx (PERSISTENTE entre rotas):
  └── QueryProvider (React Query)
       └── AppLayout (monta UMA VEZ)
            ├── Sidebar → useAuth() (cache) + usePendingCount() (cache 30s)
            ├── Navbar → useAuth() (cache)
            ├── UserMenu → useAuth() (cache)
            └── {children} ← page.tsx renderiza aqui
                 └── useAuth() (cache, zero fetch adicional)

Resultado: 1 fetch de auth por sessao, layout nunca remonta, zero flash
```

---

## 7. Estimativa de Impacto Consolidada

| Metrica | Antes | Apos Fase 1 | Apos Fase 2 | Apos Fase 3 |
|---|---:|---:|---:|---:|
| Chamadas auth/me por sessao | 88 | 1-2 | 1-2 | 1-2 |
| Tempo medio abertura de tela | 4.516ms | ~800ms | ~400ms | ~200ms (percebido) |
| Pior tela (Pessoas/Equipes) | 15.771ms | ~2.000ms | ~800ms | ~300ms (percebido) |
| Erros 503 | 4 | 0 | 0 | 0 |
| Testes passando (de 40) | 14 | ~35 | ~39 | 40 |
| FCP Dashboard (primeira carga) | 12.040ms | ~2.000ms | ~1.500ms | ~1.000ms |

---

## 8. Ordem de Execucao Recomendada

```
SEMANA 1 — Fase 1 (Arquitetura)
  Dia 1-2: Items 1.1 + 1.2 (layout persistente + useAuth hook)
  Dia 3:   Item 1.3 (usePendingCount hook)
  Dia 4:   Items 1.4 + 1.5 (refatorar componentes e pages)
  Dia 5:   Testes e validacao

SEMANA 2 — Fase 2 (Backend)
  Dia 1:   Items 2.1 + 2.2 + 2.7 + 2.8 (quick wins)
  Dia 2:   Item 2.3 (dashboard/corporate)
  Dia 3:   Item 2.4 (KPI)
  Dia 4:   Items 2.5 + 2.6 (tree + planning)
  Dia 5:   Testes e validacao

SEMANA 3 — Fase 3 (UX)
  Dia 1-2: Items 3.1 + 3.2 (skeletons + loading.tsx)
  Dia 3:   Items 3.3 + 3.4 + 3.5 + 3.6 (polimento)
  Dia 4-5: Teste E2E completo, ajustes finais
```

---

## 9. Criterios de Aceite

Ao final das 3 fases, o sistema deve atender:

- [ ] Nenhuma tela com tempo de abertura > 2.5s
- [ ] `/api/auth/me` chamado no maximo 2x por sessao completa
- [ ] Zero erros 503 em navegacao normal
- [ ] Skeleton/loading visivel em < 100ms ao trocar de tela
- [ ] Sidebar NAO pisca/recarrega ao navegar
- [ ] Todas as APIs GET respondendo em < 500ms
- [ ] 40/40 testes E2E passando
- [ ] Funcionalidades existentes 100% preservadas

---

## 10. Conclusao

O sistema tem **funcionalidade solida** e **layout responsivo correto** (zero overflow). O problema e exclusivamente de **arquitetura de data fetching** e **ausencia de caching/deduplicacao**. As correcoes propostas nao alteram regras de negocio nem layout visual — apenas reorganizam COMO os dados sao buscados e compartilhados entre componentes.

A Fase 1 sozinha resolve ~80% dos problemas percebidos pelo usuario. As Fases 2 e 3 levam o sistema ao nivel profissional esperado de um produto comercial.
