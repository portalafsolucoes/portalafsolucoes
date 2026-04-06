# Auditoria de Performance - Portal AF Soluções (CMMS)

**Data:** 2026-04-06
**Módulo:** Gestão de Manutenção (CMMS)
**Usuário de teste:** super.admin@polimix.local (SUPER_ADMIN)
**Ambiente:** localhost:3000 (dev mode, Next.js 15)

---

## Resumo Executivo

O sistema apresenta **problemas graves de performance** que comprometem a experiência do usuário. O tempo médio de carregamento das telas é de **3-12 segundos**, com picos de até **33 segundos** na primeira navegação. A causa-raiz principal é a **ausência de um provider centralizado de autenticação**, resultando em 3-5 chamadas redundantes ao `/api/auth/me` por página. Combinado com queries Supabase sem otimização e ausência de caching client-side, o sistema opera muito abaixo do aceitável para um produto comercial.

### Classificação Geral: CRITICO

| Métrica | Valor Atual | Meta Aceitável | Status |
|---------|------------|----------------|--------|
| First Contentful Paint (Dashboard) | 12.040ms | < 1.500ms | CRITICO |
| TTFB médio (navegação direta) | 3.000-6.000ms | < 200ms | CRITICO |
| Chamadas `/api/auth/me` por página | 3-5x | 1x (cacheada) | CRITICO |
| Erros 503 no Dashboard | Sim | Nenhum | ALTO |
| Tempo total hub → dashboard | ~33s | < 3s | CRITICO |

---

## 1. Métricas por Tela

### Tabela de Tempos de Carregamento

| Tela | TTFB | FCP | Load Complete | API Mais Lenta | Chamadas auth/me |
|------|------|-----|---------------|----------------|-----------------|
| **Dashboard** | 1.598ms | 12.040ms | 2.813ms | `/api/auth/me` (2.728ms) | 5x |
| **Árvore** | 3.471ms | 3.588ms | 4.187ms | `/api/tree` (6.982ms), `/api/auth/me` (7.005ms) | 2x |
| **Pessoas/Equipes** | 6.049ms | 6.220ms | 6.666ms | RSC fetch (651ms) | 1x |
| **Ativos** | 3.653ms | 3.780ms | 4.179ms | `/api/auth/me` (348ms) | 1x |
| **Criticidade** | 6.129ms | 6.388ms | 8.672ms | `main-app.js` (2.200ms) | - |
| **Plano de Manutenção** | 1.720ms | 1.816ms | 2.158ms | `/api/auth/me` (15.166ms!) | 3x |
| **Planejamento** | 82ms | 168ms | 416ms | `/api/planning/plans` (3.310ms), `/api/auth/me` (3.004ms) | 3x |
| **Ordens de Serviço** | 161ms | 264ms | 557ms | RSC fetch (2.933ms) | 1x |
| **Solicitações (SS)** | 1.265ms | 1.360ms | 2.814ms | `/api/auth/me` (1.341ms) | 2x |
| **Aprovações** | 1.552ms | - | 2.297ms | RSC fetch (2.236ms) | - |
| **RAF** | 340ms | - | 7.758ms | `main-app.js` (6.706ms), `page.js` (6.003ms) | 4x |
| **Localizações** | 3.978ms | - | 4.973ms | `/api/auth/me` (816ms) | 2x |
| **KPI** | 150ms | - | 696ms | `/api/auth/me` (1.212ms), `/api/kpi` (1.058ms) | 3x |

### Observações dos Tempos

- **Pior tela:** Dashboard na primeira carga (~33s total contando compilação HMR)
- **API mais lenta registrada:** `/api/auth/me` com **15.166ms** na tela Plano de Manutenção
- **Total de chamadas `/api/auth/me` em uma sessão completa:** ~30+ chamadas
- **Erros 503:** Dashboard RSC fetch (3 ocorrências), `/api/dashboard/stats` (1 ocorrência)

---

## 2. Problemas Encontrados

### CRITICO-01: Ausência de Auth Provider Centralizado

**Impacto:** Cada componente (Sidebar, UserMenu, Navbar, páginas) faz sua própria chamada ao `/api/auth/me`, resultando em 3-5 requests redundantes por navegação.

**Componentes que chamam independentemente:**
- `Sidebar.tsx` — fetch no useEffect (mount)
- `UserMenu.tsx` — fetch para dados do usuário
- `Navbar.tsx` — fetch para role/permissões
- Cada `page.tsx` (dashboard, planning, kpi, etc.) — verificação de permissão

**Causa raiz:** Não existe Context Provider, Zustand store, ou React Query para compartilhar o estado do usuário. React Query está instalado mas **não é utilizado**.

**Custo:** ~3-15 segundos de latência adicionais por página, multiplicado por cada navegação.

---

### CRITICO-02: Sidebar Re-renderiza e Re-fetcha em Cada Navegação

**Impacto:** A sidebar não preserva estado entre navegações. Cada troca de rota:
1. Monta novo Sidebar
2. Chama `/api/auth/me` (500ms-7s)
3. Chama `/api/requests/pending` (1-6s)
4. Polling a cada 60s para pending requests

**Causa raiz:** Sidebar faz fetch em `useEffect(() => {}, [])` — executa em cada mount. Como Next.js App Router re-monta componentes na navegação, o efeito roda toda vez.

---

### CRITICO-03: `/api/requests/pending` Retorna Dados Desnecessários

**Impacto:** Chamada em toda página (badge do sidebar), transfere dados completos de cada request com joins em User, Team, Asset, Location, File — quando só precisa do **count**.

**Query atual:**
```sql
SELECT *, createdBy:User(*), team:Team(*), asset:Asset(*), location:Location(*), files:File(*)
WHERE status = 'PENDING' AND companyId = ?
```

**Query ideal:**
```sql
SELECT id, count: exact, head: true
WHERE status = 'PENDING' AND companyId = ?
```

**Economia estimada:** ~80-90% de redução no payload e tempo de query.

---

### ALTO-01: `/api/dashboard/corporate` — Full Table Scan Sem Limites

**Impacto:** Carrega TODOS os WorkOrders, Assets, Requests e Users da empresa sem paginação. Em empresas com volume de dados, causa timeout (503).

**Queries problemáticas:**
- `WorkOrder.select('id, status, type, unitId')` — sem limit
- `Asset.select('id, unitId')` — sem limit
- `Request.select('id, unitId, status')` — sem limit
- `User.select('id, unitId')` — sem limit

Após carregar tudo, faz agregação em memória JavaScript criando múltiplos Maps.

---

### ALTO-02: `/api/dashboard/stats` — 9 Queries Paralelas

**Impacto:** Dispara 9 queries Supabase em `Promise.all()`, podendo atingir rate limit ou esgotar connection pool. Causa erros 503 intermitentes.

**Nota:** Individualmente as queries são eficientes (usam `count: 'exact', head: true`), mas a concorrência é o problema.

---

### ALTO-03: `/api/tree` — Padrão N+1

**Impacto:** Para cada unidade, faz 3 queries separadas (Area, WorkCenter, Asset). Se houver múltiplas unidades, multiplica as chamadas.

**Tempo registrado:** 6.982ms

---

### ALTO-04: `/api/kpi` — Computação Pesada em JavaScript

**Impacto:** Carrega TODAS as WorkOrders da empresa (sem filtro de data) e calcula KPIs em loops JavaScript no servidor.

**Problemas:**
- Sem filtro de data na query (carrega histórico inteiro)
- Múltiplos loops sobre os mesmos dados
- Cálculos que deveriam ser feitos via SQL/agregações no banco

---

### ALTO-05: `/api/planning/plans` — Full Table Scan

**Impacto:** Carrega todas as `MaintenancePlanExecution` e `AssetMaintenancePlan` sem paginação. Iteração em JavaScript para processamento.

---

### MEDIO-01: HMR (Hot Module Replacement) Excessivo em Dev

**Impacto:** Durante a sessão de teste, foram registrados **12+ rebuilds HMR** (webpack hot-updates), cada um levando 500-1800ms. Isso contribui para a lentidão percebida em desenvolvimento.

**Nota:** Não afeta produção, mas prejudica a experiência de desenvolvimento.

---

### MEDIO-02: Bundle `main-app.js` Grande

**Impacto:** O arquivo `main-app.js` levou entre 490ms e **6.706ms** para carregar dependendo da tela. Sugere que o bundle está grande e/ou não há code splitting adequado.

---

### MEDIO-03: Google Fonts Carregado via CSS Import

**Impacto:** Duas requisições para Google Fonts (`Inter`) em formatos diferentes, uma bloqueante. Deveria usar `next/font` para otimização automática.

---

## 3. Resumo de Network Requests (Dashboard)

| URL | Status | Ocorrências | Observação |
|-----|--------|-------------|------------|
| `/api/auth/me` | 200 | 5x | Redundante - deveria ser 1x |
| `/api/dashboard/stats` | 200/503 | 2x | Erro intermitente |
| `/api/dashboard/corporate` | 200 | 2x | Chamado 2x (duplicado) |
| `/api/requests/pending` | 200 | 2x | Badge sidebar (duplicado) |
| `/dashboard?_rsc=...` | 200/503 | 4x | RSC refetches + erros |
| `webpack.hot-update.js` | 200 | 12x | HMR dev rebuilds |

**Total de requests na carga do Dashboard:** 61 requests

---

## 4. Plano de Correção Priorizado

### Fase 1 — Correções Críticas (Impacto Imediato)

| # | Ação | Impacto Esperado | Complexidade |
|---|------|------------------|-------------|
| 1.1 | **Criar AuthProvider centralizado** com Zustand + React Query | Eliminar 30+ chamadas redundantes/sessão | Média |
| 1.2 | **Implementar React Query** para todas as chamadas de API | Deduplicação automática, cache client-side | Média |
| 1.3 | **Otimizar `/api/requests/pending`** — retornar apenas count | -90% payload, -80% tempo | Baixa |
| 1.4 | **Adicionar `staleTime` e `cacheTime`** no React Query (5min para auth, 30s para dados) | Eliminar refetches na navegação | Baixa |

**Meta Fase 1:** Reduzir tempo de navegação entre telas de ~5s para <1s.

### Fase 2 — Otimizações de Backend

| # | Ação | Impacto Esperado | Complexidade |
|---|------|------------------|-------------|
| 2.1 | **Paginar `/api/dashboard/corporate`** e mover agregação para SQL | Eliminar 503s, -70% tempo | Média |
| 2.2 | **Serializar queries do `/api/dashboard/stats`** (3 batches de 3) | Eliminar 503s por rate limit | Baixa |
| 2.3 | **Adicionar filtro de data no `/api/kpi`** (últimos 12 meses) | -80% dados transferidos | Baixa |
| 2.4 | **Mover cálculos KPI para SQL** (SUM, AVG, GROUP BY) | -90% tempo de computação | Média |
| 2.5 | **Otimizar `/api/tree`** — single query com joins | Eliminar N+1, -70% tempo | Média |
| 2.6 | **Adicionar índices** em `companyId`, `status`, `unitId` nas tabelas principais | -50% tempo de query | Baixa |

**Meta Fase 2:** Reduzir tempo de APIs de 3-7s para <500ms.

### Fase 3 — Otimizações de Frontend

| # | Ação | Impacto Esperado | Complexidade |
|---|------|------------------|-------------|
| 3.1 | **Migrar Google Fonts para `next/font`** | Eliminar flash de fonte, -200ms | Baixa |
| 3.2 | **Implementar Skeleton Loading** em todas as telas | UX profissional durante carregamento | Média |
| 3.3 | **Code splitting** — lazy load páginas pesadas (RAF, KPI) | Reduzir bundle inicial | Baixa |
| 3.4 | **Adicionar Cache-Control headers** em todas as APIs GET | Cache no browser/CDN | Baixa |
| 3.5 | **Prefetch de rotas** via `<Link prefetch>` do Next.js | Navegação instantânea percebida | Baixa |

**Meta Fase 3:** FCP < 1.5s em todas as telas, navegação percebida < 300ms.

---

## 5. Arquitetura Proposta (Auth Provider)

```
┌──────────────────────────────────────────────┐
│                  Layout.tsx                    │
│  ┌──────────────────────────────────────────┐ │
│  │         AuthProvider (Zustand)            │ │
│  │  - user, role, company (fetch 1x)        │ │
│  │  - React Query: staleTime=5min           │ │
│  │  ┌─────────┐  ┌─────────┐  ┌──────────┐ │ │
│  │  │ Sidebar  │  │ Navbar  │  │ UserMenu │ │ │
│  │  │ useAuth()│  │useAuth()│  │ useAuth()│ │ │
│  │  │ (no fetch)│ │(no fetch)│ │(no fetch)│ │ │
│  │  └─────────┘  └─────────┘  └──────────┘ │ │
│  │          ┌──────────────┐                 │ │
│  │          │   Page.tsx   │                 │ │
│  │          │  useAuth()   │                 │ │
│  │          │  (no fetch)  │                 │ │
│  │          └──────────────┘                 │ │
│  └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘

Resultado: 1 fetch em vez de 3-5 por navegação
```

---

## 6. Comparativo de Estimativa de Melhoria

| Métrica | Antes | Depois (estimado) | Melhoria |
|---------|-------|--------------------|----------|
| FCP Dashboard | 12.040ms | ~1.200ms | **10x** |
| Navegação entre telas | 3.000-6.000ms | 200-500ms | **10-15x** |
| Chamadas `/api/auth/me` / sessão | 30+ | 1-2 | **95%** |
| Payload `/api/requests/pending` | Full records + joins | Count only | **~95%** |
| Erros 503 | Frequentes | Eliminados | **100%** |
| Tempo `/api/kpi` | 1.000-7.000ms | 200-400ms | **5-10x** |

---

## 7. Conclusão

O sistema tem uma **base funcional sólida** mas sofre de problemas de arquitetura de dados que tornam a experiência do usuário inaceitável para um produto comercial. As 3 correções de maior impacto são:

1. **AuthProvider centralizado** (elimina 95% das chamadas redundantes)
2. **React Query com caching** (elimina refetches na navegação)
3. **Otimização de queries Supabase** (reduz tempo de API em 5-10x)

Implementando as Fases 1 e 2, o sistema deve atingir tempos de resposta profissionais (<1s para navegação, <2s para cargas pesadas como KPI).
