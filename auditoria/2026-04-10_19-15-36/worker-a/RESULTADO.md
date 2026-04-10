# Resultado da Auditoria E2E - Worker A

- Base URL: `http://localhost:3000`
- Executado em: 2026-04-10T22:53:09.576Z
- Contextos testados: 12
- Issues encontradas: 174

## Casos Executados
- Cimento Vale do Norte SA / SUPER_ADMIN: login role=SUPER_ADMIN, legacyRole=SUPER_ADMIN, landing=http://localhost:3000/dashboard
  - /settings ok: sim
  - /profile ok: sim
  - Menu visivel: Dashboard, Árvore, Pessoas/Equipes, Cadastros Básicos, Ativos, Plano de Manutenção, Planejamento e Programação, Ordens de Serviço (OS), Solicitações (SS), Aprovações, RAF, Localizações, KPI - Indicadores, Configurações
- Cimento Vale do Norte SA / ADMIN: login role=ADMIN, legacyRole=GESTOR, landing=http://localhost:3000/dashboard
  - /settings ok: sim
  - /profile ok: sim
  - Menu visivel: Dashboard, Árvore, Pessoas/Equipes, Cadastros Básicos, Ativos, Plano de Manutenção, Planejamento e Programação, Ordens de Serviço (OS), Solicitações (SS), Aprovações, RAF, Localizações, KPI - Indicadores
- Cimento Vale do Norte SA / TECHNICIAN: login role=TECHNICIAN, legacyRole=MECANICO, landing=http://localhost:3000/work-orders
  - /settings ok: nao
  - /profile ok: sim
  - Menu visivel: Ordens de Serviço (OS), Solicitações (SS), Ativos
- Cimento Vale do Norte SA / LIMITED_TECHNICIAN: login role=LIMITED_TECHNICIAN, legacyRole=ELETRICISTA, landing=http://localhost:3000/work-orders
  - /settings ok: sim
  - /profile ok: sim
  - Menu visivel: Ordens de Serviço (OS), Solicitações (SS)
- Cimento Vale do Norte SA / REQUESTER: login role=REQUESTER, legacyRole=OPERADOR, landing=http://localhost:3000/dashboard
  - /settings ok: nao
  - /profile ok: sim
  - Menu visivel: Dashboard, Solicitações (SS)
- Cimento Vale do Norte SA / VIEW_ONLY: login role=VIEW_ONLY, legacyRole=CONSTRUTOR_CIVIL, landing=http://localhost:3000/dashboard
  - /settings ok: nao
  - /profile ok: nao
  - Menu visivel: 
  - Menu faltante: Dashboard, Ordens de Serviço (OS), Solicitações (SS), Ativos, Localizações, Pessoas/Equipes, KPI - Indicadores
- Polimix Concreto Ltda / SUPER_ADMIN: login role=SUPER_ADMIN, legacyRole=SUPER_ADMIN, landing=http://localhost:3000/dashboard
  - /settings ok: sim
  - /profile ok: sim
  - Menu visivel: Dashboard, Árvore, Pessoas/Equipes, Cadastros Básicos, Ativos, Plano de Manutenção, Planejamento e Programação, Ordens de Serviço (OS), Solicitações (SS), Aprovações, RAF, Localizações, KPI - Indicadores, Configurações
- Polimix Concreto Ltda / ADMIN: login role=ADMIN, legacyRole=MECANICO, landing=http://localhost:3000/dashboard
  - /settings ok: sim
  - /profile ok: sim
  - Menu visivel: Dashboard, Árvore, Pessoas/Equipes, Cadastros Básicos, Ativos, Plano de Manutenção, Planejamento e Programação, Ordens de Serviço (OS), Solicitações (SS), Aprovações, RAF, Localizações, KPI - Indicadores
- Polimix Concreto Ltda / TECHNICIAN: login role=TECHNICIAN, legacyRole=MECANICO, landing=http://localhost:3000/work-orders
  - /settings ok: sim
  - /profile ok: sim
  - Menu visivel: Ordens de Serviço (OS), Solicitações (SS), Ativos
- Polimix Concreto Ltda / LIMITED_TECHNICIAN: login role=LIMITED_TECHNICIAN, legacyRole=ELETRICISTA, landing=http://localhost:3000/work-orders
  - /settings ok: sim
  - /profile ok: sim
  - Menu visivel: Ordens de Serviço (OS), Solicitações (SS)
- Polimix Concreto Ltda / REQUESTER: login role=REQUESTER, legacyRole=MECANICO, landing=http://localhost:3000/dashboard
  - /settings ok: sim
  - /profile ok: sim
  - Menu visivel: Dashboard, Solicitações (SS)
- Polimix Concreto Ltda / VIEW_ONLY: login role=VIEW_ONLY, legacyRole=ELETRICISTA, landing=http://localhost:3000/dashboard
  - /settings ok: nao
  - /profile ok: nao
  - Menu visivel: 
  - Menu faltante: Dashboard, Ordens de Serviço (OS), Solicitações (SS), Ativos, Localizações, Pessoas/Equipes, KPI - Indicadores

## Falhas
- [medium] console: Console error for valenorte/SUPER_ADMIN - Failed to load resource: the server responded with a status of 500 (Internal Server Error)
- [medium] console: Console error for valenorte/SUPER_ADMIN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for valenorte/SUPER_ADMIN - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for valenorte/SUPER_ADMIN - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for valenorte/SUPER_ADMIN - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for valenorte/SUPER_ADMIN - Failed to load resource: the server responded with a status of 404 (Not Found)
- [high] runtime: Unhandled page error for valenorte/SUPER_ADMIN - Invalid or unexpected token
- [medium] logout: Hub did not return to anonymous state for valenorte/SUPER_ADMIN - Login button was not visible after /api/auth/logout
- [medium] console: Console error for valenorte/ADMIN - Failed to load resource: the server responded with a status of 500 (Internal Server Error)
- [medium] console: Console error for valenorte/ADMIN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for valenorte/ADMIN - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for valenorte/ADMIN - Failed to load resource: the server responded with a status of 404 (Not Found)
- [high] runtime: Unhandled page error for valenorte/ADMIN - Invalid or unexpected token
- [medium] console: Console error for valenorte/ADMIN - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for valenorte/ADMIN - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for valenorte/ADMIN - Failed to load resource: the server responded with a status of 401 (Unauthorized)
- [medium] console: Console error for valenorte/TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for valenorte/TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for valenorte/TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for valenorte/TECHNICIAN - Failed to load resource: the server responded with a status of 500 (Internal Server Error)
- [medium] settings: Settings tabs mismatch for valenorte/TECHNICIAN - Tabs should contain only Perfil and Segurança
- [high] runtime: Unhandled page error for valenorte/TECHNICIAN - Invalid or unexpected token
- [high] runtime: Unhandled page error for valenorte/TECHNICIAN - Invalid or unexpected token
- [medium] console: Console error for valenorte/TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [high] runtime: Unhandled page error for valenorte/TECHNICIAN - Invalid or unexpected token
- [medium] console: Console error for valenorte/TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for valenorte/TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for valenorte/TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for valenorte/TECHNICIAN - Failed to load resource: the server responded with a status of 401 (Unauthorized)
- [medium] console: Console error for valenorte/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for valenorte/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for valenorte/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for valenorte/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 500 (Internal Server Error)
- [medium] console: Console error for valenorte/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for valenorte/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for valenorte/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for valenorte/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for valenorte/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for valenorte/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for valenorte/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for valenorte/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for valenorte/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for valenorte/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 500 (Internal Server Error)
- [medium] console: Console error for valenorte/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for valenorte/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for valenorte/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [high] runtime: Unhandled page error for valenorte/LIMITED_TECHNICIAN - Invalid or unexpected token
- [medium] console: Console error for valenorte/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 401 (Unauthorized)
- [medium] console: Console error for valenorte/REQUESTER - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for valenorte/REQUESTER - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for valenorte/REQUESTER - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for valenorte/REQUESTER - Failed to load resource: the server responded with a status of 500 (Internal Server Error)
- [medium] settings: Settings tabs mismatch for valenorte/REQUESTER - Tabs should contain only Perfil and Segurança
- [medium] console: Console error for valenorte/REQUESTER - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for valenorte/REQUESTER - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for valenorte/REQUESTER - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for valenorte/REQUESTER - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for valenorte/REQUESTER - Failed to load resource: the server responded with a status of 404 (Not Found)
- [high] runtime: Unhandled page error for valenorte/REQUESTER - Invalid or unexpected token
- [medium] console: Console error for valenorte/REQUESTER - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [high] runtime: Unhandled page error for valenorte/REQUESTER - Invalid or unexpected token
- [medium] console: Console error for valenorte/REQUESTER - Failed to load resource: the server responded with a status of 401 (Unauthorized)
- [medium] console: Console error for valenorte/VIEW_ONLY - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for valenorte/VIEW_ONLY - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for valenorte/VIEW_ONLY - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for valenorte/VIEW_ONLY - Failed to load resource: the server responded with a status of 500 (Internal Server Error)
- [medium] settings: Settings tabs mismatch for valenorte/VIEW_ONLY - Tabs should contain only Perfil and Segurança
- [high] runtime: Unhandled page error for valenorte/VIEW_ONLY - Invalid or unexpected token
- [medium] profile: Profile page missing company name for valenorte/VIEW_ONLY - Expected Cimento Vale do Norte SA in profile page
- [high] sidebar: Sidebar mismatch for valenorte/VIEW_ONLY - Missing: Dashboard, Ordens de Serviço (OS), Solicitações (SS), Ativos, Localizações, Pessoas/Equipes, KPI - Indicadores | Forbidden visible: none
- [medium] console: Console error for valenorte/VIEW_ONLY - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [high] runtime: Unhandled page error for valenorte/VIEW_ONLY - Invalid or unexpected token
- [medium] console: Console error for valenorte/VIEW_ONLY - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for valenorte/VIEW_ONLY - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for valenorte/VIEW_ONLY - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for valenorte/VIEW_ONLY - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for valenorte/VIEW_ONLY - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [high] runtime: Unhandled page error for valenorte/VIEW_ONLY - Invalid or unexpected token
- [medium] console: Console error for valenorte/VIEW_ONLY - Failed to load resource: the server responded with a status of 401 (Unauthorized)
- [medium] console: Console error for polimix/SUPER_ADMIN - Failed to load resource: the server responded with a status of 500 (Internal Server Error)
- [medium] console: Console error for polimix/SUPER_ADMIN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/SUPER_ADMIN - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for polimix/SUPER_ADMIN - Failed to load resource: the server responded with a status of 404 (Not Found)
- [high] runtime: Unhandled page error for polimix/SUPER_ADMIN - Invalid or unexpected token
- [medium] console: Console error for polimix/SUPER_ADMIN - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for polimix/SUPER_ADMIN - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for polimix/SUPER_ADMIN - Failed to load resource: the server responded with a status of 401 (Unauthorized)
- [medium] console: Console error for polimix/ADMIN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/ADMIN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/ADMIN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/ADMIN - Failed to load resource: the server responded with a status of 500 (Internal Server Error)
- [medium] console: Console error for polimix/ADMIN - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for polimix/ADMIN - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for polimix/ADMIN - Failed to load resource: the server responded with a status of 500 (Internal Server Error)
- [high] runtime: Unhandled page error for polimix/ADMIN - Invariant: Expected clientReferenceManifest to be defined. This is a bug in Next.js.
- [medium] console: Console error for polimix/ADMIN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/ADMIN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/ADMIN - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for polimix/ADMIN - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for polimix/ADMIN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/ADMIN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/ADMIN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/ADMIN - Error loading dashboard: TypeError: Failed to fetch
    at loadDashboard (webpack-internal:///(app-pages-browser)/./src/app/team-dashboard/page.tsx:35:31)
    at TeamDashboardPage.useEffect (webpack-internal:///(app-pages-browser)/./src/app/team-dashboard/page.tsx:30:13)
    at Object.react_stack_bottom_frame (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:23669:20)
    at runWithFiberInDEV (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:872:30)
    at commitHookEffectListMount (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:12345:29)
    at commitHookPassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:12466:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14387:13)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14380:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14380:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14514:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14514:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14380:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14390:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14380:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14380:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14380:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14380:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14390:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14380:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14380:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14514:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14514:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14380:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14380:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14514:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14514:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14380:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14390:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
- [medium] console: Console error for polimix/ADMIN - Error loading work orders: TypeError: Failed to fetch
    at loadWorkOrders (webpack-internal:///(app-pages-browser)/./src/app/work-orders/page.tsx:99:31)
    at WorkOrdersPage.useEffect (webpack-internal:///(app-pages-browser)/./src/app/work-orders/page.tsx:86:13)
    at Object.react_stack_bottom_frame (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:23669:20)
    at runWithFiberInDEV (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:872:30)
    at commitHookEffectListMount (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:12345:29)
    at commitHookPassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:12466:11)
    at reconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14563:11)
    at recursivelyTraverseReconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14534:9)
    at reconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14556:11)
    at recursivelyTraverseReconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14534:9)
    at reconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14556:11)
    at recursivelyTraverseReconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14534:9)
    at reconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14610:11)
    at recursivelyTraverseReconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14534:9)
    at reconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14610:11)
    at recursivelyTraverseReconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14534:9)
    at reconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14556:11)
    at recursivelyTraverseReconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14534:9)
    at reconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14610:11)
    at recursivelyTraverseReconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14534:9)
    at reconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14556:11)
    at recursivelyTraverseReconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14534:9)
    at reconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14556:11)
    at recursivelyTraverseReconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14534:9)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14493:17)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14458:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14380:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14380:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14390:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14380:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14380:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14514:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14514:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14380:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14380:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14514:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
    at commitPassiveMountOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14514:11)
    at recursivelyTraversePassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14360:11)
- [medium] console: Console error for polimix/ADMIN - Error loading work orders: TypeError: Failed to fetch
    at loadWorkOrders (webpack-internal:///(app-pages-browser)/./src/app/work-orders/page.tsx:99:31)
    at WorkOrdersPage.useEffect (webpack-internal:///(app-pages-browser)/./src/app/work-orders/page.tsx:86:13)
    at Object.react_stack_bottom_frame (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:23669:20)
    at runWithFiberInDEV (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:872:30)
    at commitHookEffectListMount (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:12345:29)
    at commitHookPassiveMountEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:12466:11)
    at reconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14563:11)
    at recursivelyTraverseReconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14534:9)
    at reconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14556:11)
    at recursivelyTraverseReconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14534:9)
    at reconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14556:11)
    at recursivelyTraverseReconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14534:9)
    at reconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14610:11)
    at recursivelyTraverseReconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14534:9)
    at reconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14610:11)
    at recursivelyTraverseReconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14534:9)
    at reconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14556:11)
    at recursivelyTraverseReconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14534:9)
    at reconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14610:11)
    at recursivelyTraverseReconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14534:9)
    at reconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14556:11)
    at recursivelyTraverseReconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14534:9)
    at reconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14556:11)
    at recursivelyTraverseReconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14534:9)
    at reconnectPassiveEffects (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:14583:15)
    at doubleInvokeEffectsOnFiber (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:16566:11)
    at runWithFiberInDEV (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:875:13)
    at recursivelyTraverseAndDoubleInvokeEffectsInDEV (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:16543:19)
    at recursivelyTraverseAndDoubleInvokeEffectsInDEV (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:16536:17)
    at recursivelyTraverseAndDoubleInvokeEffectsInDEV (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:16536:17)
    at recursivelyTraverseAndDoubleInvokeEffectsInDEV (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:16536:17)
    at recursivelyTraverseAndDoubleInvokeEffectsInDEV (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:16536:17)
    at recursivelyTraverseAndDoubleInvokeEffectsInDEV (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:16536:17)
    at recursivelyTraverseAndDoubleInvokeEffectsInDEV (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:16536:17)
    at recursivelyTraverseAndDoubleInvokeEffectsInDEV (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:16536:17)
    at recursivelyTraverseAndDoubleInvokeEffectsInDEV (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:16536:17)
    at recursivelyTraverseAndDoubleInvokeEffectsInDEV (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:16536:17)
    at recursivelyTraverseAndDoubleInvokeEffectsInDEV (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:16536:17)
    at recursivelyTraverseAndDoubleInvokeEffectsInDEV (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:16536:17)
    at recursivelyTraverseAndDoubleInvokeEffectsInDEV (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:16536:17)
    at recursivelyTraverseAndDoubleInvokeEffectsInDEV (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:16536:17)
    at recursivelyTraverseAndDoubleInvokeEffectsInDEV (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:16536:17)
    at recursivelyTraverseAndDoubleInvokeEffectsInDEV (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:16536:17)
    at recursivelyTraverseAndDoubleInvokeEffectsInDEV (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:16536:17)
    at recursivelyTraverseAndDoubleInvokeEffectsInDEV (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:16536:17)
    at recursivelyTraverseAndDoubleInvokeEffectsInDEV (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:16536:17)
    at recursivelyTraverseAndDoubleInvokeEffectsInDEV (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:16536:17)
    at recursivelyTraverseAndDoubleInvokeEffectsInDEV (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:16536:17)
    at recursivelyTraverseAndDoubleInvokeEffectsInDEV (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:16536:17)
    at recursivelyTraverseAndDoubleInvokeEffectsInDEV (webpack-internal:///(app-pages-browser)/./node_modules/next/dist/compiled/react-dom/cjs/react-dom-client.development.js:16536:17)
- [medium] console: Console error for polimix/ADMIN - Failed to load resource: the server responded with a status of 401 (Unauthorized)
- [medium] console: Console error for polimix/TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/TECHNICIAN - Failed to load resource: the server responded with a status of 500 (Internal Server Error)
- [medium] console: Console error for polimix/TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/TECHNICIAN - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for polimix/TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/TECHNICIAN - Failed to load resource: the server responded with a status of 404 (Not Found)
- [high] runtime: Unhandled page error for polimix/TECHNICIAN - Invalid or unexpected token
- [high] runtime: Unhandled page error for polimix/TECHNICIAN - Invalid or unexpected token
- [medium] console: Console error for polimix/TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/TECHNICIAN - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for polimix/TECHNICIAN - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for polimix/TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/TECHNICIAN - Failed to load resource: the server responded with a status of 401 (Unauthorized)
- [medium] console: Console error for polimix/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 500 (Internal Server Error)
- [medium] console: Console error for polimix/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for polimix/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for polimix/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 500 (Internal Server Error)
- [medium] console: Console error for polimix/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 500 (Internal Server Error)
- [medium] console: Console error for polimix/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for polimix/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for polimix/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [high] runtime: Unhandled page error for polimix/LIMITED_TECHNICIAN - Invalid or unexpected token
- [high] runtime: Unhandled page error for polimix/LIMITED_TECHNICIAN - Invalid or unexpected token
- [medium] console: Console error for polimix/LIMITED_TECHNICIAN - Failed to load resource: the server responded with a status of 401 (Unauthorized)
- [medium] console: Console error for polimix/REQUESTER - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/REQUESTER - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/REQUESTER - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/REQUESTER - Failed to load resource: the server responded with a status of 500 (Internal Server Error)
- [medium] console: Console error for polimix/REQUESTER - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/REQUESTER - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for polimix/REQUESTER - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/REQUESTER - Failed to load resource: the server responded with a status of 404 (Not Found)
- [high] runtime: Unhandled page error for polimix/REQUESTER - Invalid or unexpected token
- [medium] console: Console error for polimix/REQUESTER - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/REQUESTER - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/REQUESTER - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for polimix/REQUESTER - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/REQUESTER - Failed to load resource: the server responded with a status of 404 (Not Found)
- [high] runtime: Unhandled page error for polimix/REQUESTER - Invalid or unexpected token
- [medium] console: Console error for polimix/REQUESTER - Failed to load resource: the server responded with a status of 401 (Unauthorized)
- [medium] console: Console error for polimix/VIEW_ONLY - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/VIEW_ONLY - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/VIEW_ONLY - Failed to load resource: the server responded with a status of 403 (Forbidden)
- [medium] console: Console error for polimix/VIEW_ONLY - Failed to load resource: the server responded with a status of 500 (Internal Server Error)
- [high] runtime: Unhandled page error for polimix/VIEW_ONLY - Invalid or unexpected token
- [medium] settings: Settings tabs mismatch for polimix/VIEW_ONLY - Tabs should contain only Perfil and Segurança
- [medium] profile: Profile page missing company name for polimix/VIEW_ONLY - Expected Polimix Concreto Ltda in profile page
- [high] sidebar: Sidebar mismatch for polimix/VIEW_ONLY - Missing: Dashboard, Ordens de Serviço (OS), Solicitações (SS), Ativos, Localizações, Pessoas/Equipes, KPI - Indicadores | Forbidden visible: none
- [medium] console: Console error for polimix/VIEW_ONLY - Failed to load resource: the server responded with a status of 404 (Not Found)
- [medium] console: Console error for polimix/VIEW_ONLY - Failed to load resource: the server responded with a status of 404 (Not Found)
- [high] runtime: Unhandled page error for polimix/VIEW_ONLY - Invalid or unexpected token
- [high] runtime: Unhandled page error for polimix/VIEW_ONLY - Invalid or unexpected token
- [medium] console: Console error for polimix/VIEW_ONLY - Failed to load resource: the server responded with a status of 401 (Unauthorized)

## Screenshots
- screenshots\valenorte-super-admin-cmms.png
- screenshots\valenorte-super-admin-dashboard.png
- screenshots\valenorte-super-admin-settings.png
- screenshots\valenorte-super-admin-profile.png
- screenshots\valenorte-super-admin-hub.png
- screenshots\valenorte-admin-cmms.png
- screenshots\valenorte-admin-dashboard.png
- screenshots\valenorte-admin-settings.png
- screenshots\valenorte-admin-profile.png
- screenshots\valenorte-admin-hub.png
- screenshots\valenorte-technician-cmms.png
- screenshots\valenorte-technician-dashboard.png
- screenshots\valenorte-technician-settings.png
- screenshots\valenorte-technician-profile.png
- screenshots\valenorte-technician-hub.png
- screenshots\valenorte-limited-technician-cmms.png
- screenshots\valenorte-limited-technician-dashboard.png
- screenshots\valenorte-limited-technician-settings.png
- screenshots\valenorte-limited-technician-profile.png
- screenshots\valenorte-limited-technician-hub.png
- screenshots\valenorte-requester-cmms.png
- screenshots\valenorte-requester-dashboard.png
- screenshots\valenorte-requester-settings.png
- screenshots\valenorte-requester-profile.png
- screenshots\valenorte-requester-hub.png
- screenshots\valenorte-view-only-cmms.png
- screenshots\valenorte-view-only-dashboard.png
- screenshots\valenorte-view-only-settings.png
- screenshots\valenorte-view-only-profile.png
- screenshots\valenorte-view-only-hub.png
- screenshots\polimix-super-admin-cmms.png
- screenshots\polimix-super-admin-dashboard.png
- screenshots\polimix-super-admin-settings.png
- screenshots\polimix-super-admin-profile.png
- screenshots\polimix-super-admin-hub.png
- screenshots\polimix-admin-cmms.png
- screenshots\polimix-admin-dashboard.png
- screenshots\polimix-admin-settings.png
- screenshots\polimix-admin-profile.png
- screenshots\polimix-admin-hub.png
- screenshots\polimix-technician-cmms.png
- screenshots\polimix-technician-dashboard.png
- screenshots\polimix-technician-settings.png
- screenshots\polimix-technician-profile.png
- screenshots\polimix-technician-hub.png
- screenshots\polimix-limited-technician-cmms.png
- screenshots\polimix-limited-technician-dashboard.png
- screenshots\polimix-limited-technician-settings.png
- screenshots\polimix-limited-technician-profile.png
- screenshots\polimix-limited-technician-hub.png
- screenshots\polimix-requester-cmms.png
- screenshots\polimix-requester-dashboard.png
- screenshots\polimix-requester-settings.png
- screenshots\polimix-requester-profile.png
- screenshots\polimix-requester-hub.png
- screenshots\polimix-view-only-cmms.png
- screenshots\polimix-view-only-dashboard.png
- screenshots\polimix-view-only-settings.png
- screenshots\polimix-view-only-profile.png
- screenshots\polimix-view-only-hub.png

## Observações
- O backend ainda normaliza perfis legados como `GESTOR` para `ADMIN` no login, mas o `/api/auth/me` expõe o papel canônico.
- O fluxo de logout no hub retorna ao estado anônimo sem redirecionar automaticamente para /login.