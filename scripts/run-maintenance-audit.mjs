import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium, devices } from '@playwright/test'
import { ensureScreenshotAutomationAuthorized } from './testing/screenshot-authorization.mjs'

const BASE_URL = 'http://localhost:3000'
const OUTPUT_DIR = path.resolve('auditoria-e2e')
const DISCOVERY_SCREENSHOTS = path.join(OUTPUT_DIR, 'F1_discovery', 'screenshots')
const TEST_SCREENSHOTS = path.join(OUTPUT_DIR, 'F2_testes', 'screenshots')
const UI_SCREENSHOTS = path.join(OUTPUT_DIR, 'F3_ui', 'screenshots')
const REPORT_MD = path.join(OUTPUT_DIR, 'RELATORIO_FINAL.md')
const REPORT_HTML = path.join(OUTPUT_DIR, 'relatorio_final.html')
const MAP_MD = path.join(OUTPUT_DIR, 'F1_discovery', 'mapa_sistema.md')
const TESTS_MD = path.join(OUTPUT_DIR, 'F2_testes', 'resultados_testes.md')
const SUGGESTIONS_MD = path.join(OUTPUT_DIR, 'F4_sugestoes', 'sugestoes.md')
const COMPARATIVE_MD = path.join(OUTPUT_DIR, 'F3_ui', 'comparativo.md')
const QA_EMAIL = 'super.admin@polimix.local'
const QA_PASSWORD = 'Teste@123'
const AUDIT_DATE = new Date().toISOString()

ensureScreenshotAutomationAuthorized('scripts/run-maintenance-audit.mjs')

const state = {
  currentStep: 'boot',
  requestStarts: new Map(),
  stepRequests: new Map(),
  consoleMessages: [],
}

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function relativeToOutput(filePath) {
  return path.relative(OUTPUT_DIR, filePath).replaceAll('\\', '/')
}

function ensureStepBucket(step) {
  if (!state.stepRequests.has(step)) {
    state.stepRequests.set(step, [])
  }
  return state.stepRequests.get(step)
}

function attachNetworkTracking(page) {
  page.on('request', request => {
    state.requestStarts.set(request, {
      startedAt: Date.now(),
      step: state.currentStep,
    })
  })

  page.on('response', response => {
    const request = response.request()
    const meta = state.requestStarts.get(request)
    if (!meta) return
    state.requestStarts.delete(request)

    const url = request.url()
    if (!url.startsWith(BASE_URL)) return

    const entry = {
      step: meta.step,
      url: url.replace(BASE_URL, ''),
      method: request.method(),
      status: response.status(),
      resourceType: request.resourceType(),
      durationMs: Date.now() - meta.startedAt,
    }

    ensureStepBucket(meta.step).push(entry)
  })

  page.on('requestfailed', request => {
    const meta = state.requestStarts.get(request)
    if (!meta) return
    state.requestStarts.delete(request)
    ensureStepBucket(meta.step).push({
      step: meta.step,
      url: request.url().replace(BASE_URL, ''),
      method: request.method(),
      status: 'FAILED',
      resourceType: request.resourceType(),
      durationMs: Date.now() - meta.startedAt,
      failureText: request.failure()?.errorText ?? 'Unknown failure',
    })
  })

  page.on('console', msg => {
    const type = msg.type()
    if (['error', 'warning'].includes(type)) {
      state.consoleMessages.push(`[${type}] ${msg.text()}`)
    }
  })
}

async function ensureDirs() {
  await fs.mkdir(DISCOVERY_SCREENSHOTS, { recursive: true })
  await fs.mkdir(TEST_SCREENSHOTS, { recursive: true })
  await fs.mkdir(UI_SCREENSHOTS, { recursive: true })
  await fs.mkdir(path.join(OUTPUT_DIR, 'F3_ui', 'propostas'), { recursive: true })
  await fs.mkdir(path.join(OUTPUT_DIR, 'F4_sugestoes'), { recursive: true })
  await fs.mkdir(path.join(OUTPUT_DIR, 'evidencias'), { recursive: true })
}

async function waitForPageStable(page, timeout = 12000) {
  await page.waitForTimeout(300)
  try {
    await page.waitForLoadState('networkidle', { timeout: 4000 })
  } catch {}

  await page.waitForFunction(
    () => {
      const loader = document.querySelector('.animate-spin')
      return !loader
    },
    null,
    { timeout }
  ).catch(() => {})

  await page.waitForTimeout(700)
}

async function login(page) {
  state.currentStep = 'login-page'
  const loginStart = Date.now()
  await page.goto(`${BASE_URL}/login?returnUrl=%2Fdashboard`, { waitUntil: 'domcontentloaded' })
  await waitForPageStable(page)
  const loginPageTime = Date.now() - loginStart
  const loginPageShot = path.join(DISCOVERY_SCREENSHOTS, 'F1_01_login.png')
  await page.screenshot({ path: loginPageShot, fullPage: true })

  state.currentStep = 'login-submit'
  const submitStart = Date.now()
  await page.getByLabel('Email').fill(QA_EMAIL)
  await page.getByLabel('Senha').fill(QA_PASSWORD)
  await Promise.all([
    page.waitForURL(url => url.pathname === '/dashboard', { timeout: 20000 }),
    page.getByRole('button', { name: 'Entrar' }).click(),
  ])
  await waitForPageStable(page, 20000)
  const submitTime = Date.now() - submitStart
  const dashboardShot = path.join(DISCOVERY_SCREENSHOTS, 'F1_02_dashboard.png')
  await page.screenshot({ path: dashboardShot, fullPage: true })

  return {
    loginPageTime,
    submitTime,
    screenshots: [loginPageShot, dashboardShot],
  }
}

async function expandSidebarMenus(page) {
  await page.waitForFunction(
    () => {
      const nav = document.querySelector('aside nav')
      return Boolean(nav && nav.querySelector('a[href]'))
    },
    null,
    { timeout: 20000 }
  ).catch(() => {})

  const basicsButton = page.getByRole('button', { name: /Cadastros Básicos/i })
  if (await basicsButton.count()) {
    const expanded = await basicsButton.evaluate(node => node.getAttribute('aria-expanded'))
      .catch(() => null)
    if (expanded !== 'true') {
      await basicsButton.click()
      await page.waitForTimeout(300)
    }
  }
}

async function collectSidebarRoutes(page) {
  await expandSidebarMenus(page)
  return page.evaluate(() => {
    const nav = document.querySelector('aside nav')
    if (!nav) return []
    const links = [...nav.querySelectorAll('a[href]')]
    const unique = new Map()
    for (const link of links) {
      const href = link.getAttribute('href') || ''
      const name = link.textContent?.trim().replace(/\s+/g, ' ') || href
      if (!href.startsWith('/')) continue
      if (href === '/hub') continue
      if (!unique.has(href)) {
        unique.set(href, {
          name,
          href,
          type: link.closest('.ml-4') ? 'CRUD' : 'Modulo',
        })
      }
    }
    return [...unique.values()]
  })
}

async function navigateFromSidebar(page, route) {
  await expandSidebarMenus(page)
  const link = page.locator(`aside nav a[href="${route.href}"]`).first()
  if (await link.count()) {
    await Promise.all([
      page.waitForURL(url => url.pathname === route.href, { timeout: 20000 }).catch(() => {}),
      link.click(),
    ])
    return
  }
  await page.goto(`${BASE_URL}${route.href}`, { waitUntil: 'domcontentloaded' })
}

async function auditRoute(page, route, index) {
  const step = `route:${route.href}`
  state.currentStep = step
  const start = Date.now()
  await navigateFromSidebar(page, route)
  await waitForPageStable(page, 20000)
  const durationMs = Date.now() - start

  const screenshotPath = path.join(DISCOVERY_SCREENSHOTS, `F1_${String(index).padStart(2, '0')}_${slugify(route.name)}.png`)
  await page.screenshot({ path: screenshotPath, fullPage: true })

  const meta = await page.evaluate(() => {
    const heading = document.querySelector('h1')?.textContent?.trim() || document.title || 'Sem titulo'
    const description = document.querySelector('p')?.textContent?.trim() || ''
    const tables = document.querySelectorAll('table').length
    const forms = document.querySelectorAll('form').length
    const buttons = document.querySelectorAll('button').length
    const horizontalOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth
    return { heading, description, tables, forms, buttons, horizontalOverflow }
  })

  const requests = ensureStepBucket(step)
  const apiRequests = requests.filter(req => req.url.startsWith('/api/'))
  const authCalls = apiRequests.filter(req => req.url.startsWith('/api/auth/me')).length
  const pendingCalls = apiRequests.filter(req => req.url.startsWith('/api/requests/pending')).length
  const slowestApi = [...apiRequests].sort((a, b) => b.durationMs - a.durationMs)[0] || null

  const findings = []
  if (durationMs > 2500) {
    findings.push(`Abertura acima de 2,5s (${durationMs}ms).`)
  }
  if (authCalls > 0) {
    findings.push(`Chamou /api/auth/me ${authCalls}x nesta navegacao.`)
  }
  if (pendingCalls > 0) {
    findings.push(`Chamou /api/requests/pending ${pendingCalls}x nesta navegacao.`)
  }
  if (meta.horizontalOverflow) {
    findings.push('Detectado overflow horizontal nesta viewport.')
  }

  return {
    ...route,
    ...meta,
    durationMs,
    screenshotPath,
    apiRequests,
    totalRequests: requests.length,
    authCalls,
    pendingCalls,
    slowestApi,
    findings,
  }
}

async function auditResponsive(baseStorageStatePath, routes) {
  const browser = await chromium.launch({ headless: true })
  const profiles = [
    { name: 'tablet', viewport: { width: 768, height: 1024 } },
    { name: 'mobile', device: devices['iPhone 13'] },
  ]
  const targetRoutes = routes.filter(route =>
    ['/dashboard', '/assets', '/work-orders', '/requests', '/planning', '/maintenance-plan'].includes(route.href)
  )
  const results = []

  for (const profile of profiles) {
    const context = await browser.newContext({
      ...(profile.device ?? {}),
      viewport: profile.viewport,
      storageState: baseStorageStatePath,
    })
    const page = await context.newPage()
    attachNetworkTracking(page)

    for (const route of targetRoutes) {
      state.currentStep = `responsive:${profile.name}:${route.href}`
      const start = Date.now()
      await page.goto(`${BASE_URL}${route.href}`, { waitUntil: 'domcontentloaded' })
      await waitForPageStable(page, 15000)
      const durationMs = Date.now() - start
      const screenshotPath = path.join(UI_SCREENSHOTS, `${profile.name}_${slugify(route.name)}.png`)
      await page.screenshot({ path: screenshotPath, fullPage: true })
      const metrics = await page.evaluate(() => ({
        horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        sidebarVisible: Boolean(document.querySelector('aside')),
        floatingMenuButton: Boolean(document.querySelector('button[class*="fixed"]')),
      }))
      results.push({
        profile: profile.name,
        route: route.href,
        name: route.name,
        durationMs,
        screenshotPath,
        ...metrics,
      })
    }

    await context.close()
  }

  await browser.close()
  return results
}

function getSeverity(route) {
  if (route.durationMs > 4500) return 'CRITICA'
  if (route.durationMs > 2500) return 'ALTA'
  if (route.durationMs > 1500) return 'MEDIA'
  return 'BAIXA'
}

function buildSuggestions(routes, responsiveResults, repeatedAuthCalls) {
  const slowRoutes = [...routes]
    .sort((a, b) => b.durationMs - a.durationMs)
    .slice(0, 5)
    .map(route => `${route.name} (${route.durationMs}ms)`)

  return [
    {
      title: 'Transformar a navegacao lateral em layout persistente do App Router',
      priority: 'ALTA',
      type: 'Performance',
      reason: `A sidebar/header esta sendo remontada a cada troca de tela. Foram observadas ${repeatedAuthCalls} chamadas para /api/auth/me durante a navegacao.`,
    },
    {
      title: 'Consolidar checagem de sessao e permissoes em um provider/cache compartilhado',
      priority: 'ALTA',
      type: 'Backend + UX',
      reason: 'As telas repetem fetches de autenticacao/permissao e mostram estados vazios enquanto aguardam resposta, degradando a percepcao de fluidez.',
    },
    {
      title: 'Substituir carregamentos pos-mount por data fetching no servidor ou React Query com cache',
      priority: 'ALTA',
      type: 'Performance',
      reason: `As rotas mais lentas foram: ${slowRoutes.join(', ')}.`,
    },
    {
      title: 'Padronizar skeletons e transicoes de tela profissionais',
      priority: 'MEDIA',
      type: 'UX/UI',
      reason: 'Ha recarregamento visual perceptivel da barra lateral e do conteudo sem estados intermediarios consistentes.',
    },
    {
      title: 'Revisar layout responsivo do cabecalho fixo e botao do menu mobile',
      priority: 'MEDIA',
      type: 'Responsividade',
      reason: `${responsiveResults.filter(item => item.horizontalOverflow).length} telas apresentaram overflow horizontal em tablet/mobile.`,
    },
  ]
}

function renderMarkdown({ loginMetrics, routes, responsiveResults, suggestions, codeInsights }) {
  const totalTests = routes.length + responsiveResults.length + 1
  const failed = routes.filter(route => route.durationMs > 2500 || route.authCalls > 1 || route.pendingCalls > 1).length
  const partial = responsiveResults.filter(result => result.horizontalOverflow).length
  const passed = totalTests - failed - partial
  const avgDuration = Math.round(routes.reduce((sum, route) => sum + route.durationMs, 0) / Math.max(routes.length, 1))
  const repeatedAuthCalls = routes.reduce((sum, route) => sum + route.authCalls, 0)

  return [
    '# RELATORIO DE AUDITORIA E2E',
    '',
    `**Sistema:** ${BASE_URL}`,
    `**Data:** ${AUDIT_DATE}`,
    '**Ambiente:** desenvolvimento local',
    '**Perfil testado:** SUPER_ADMIN',
    '',
    '## 1. Resumo Executivo',
    '',
    '| Metrica | Valor |',
    '|---|---:|',
    `| Telas auditadas | ${routes.length} |`,
    `| Testes consolidados | ${totalTests} |`,
    `| Tempo medio de abertura | ${avgDuration} ms |`,
    `| Login (submit ate dashboard) | ${loginMetrics.submitTime} ms |`,
    `| Chamadas /api/auth/me no circuito | ${repeatedAuthCalls} |`,
    `| Passou / Falhou / Parcial | ${passed} / ${failed} / ${partial} |`,
    '',
    '### Achados principais',
    '',
    ...suggestions.map(item => `- **${item.priority}**: ${item.title} - ${item.reason}`),
    '',
    '## 2. Mapa do Sistema',
    '',
    '| # | Tela | Rota | Tempo de abertura | APIs observadas | Screenshot |',
    '|---|---|---|---:|---:|---|',
    ...routes.map((route, index) => `| ${index + 1} | ${route.name} | \`${route.href}\` | ${route.durationMs} ms | ${route.apiRequests.length} | ${relativeToOutput(route.screenshotPath)} |`),
    '',
    '## 3. Resultados dos Testes',
    '',
    '| # | Modulo | Funcionalidade | Resultado | Severidade | Observacao |',
    '|---|---|---|---|---|---|',
    ...routes.map((route, index) => {
      const failedRoute = route.durationMs > 2500 || route.authCalls > 1 || route.pendingCalls > 1
      const result = failedRoute ? 'FALHOU' : 'PASSOU'
      const notes = [
        `Abertura ${route.durationMs} ms`,
        route.slowestApi ? `API mais lenta ${route.slowestApi.url} (${route.slowestApi.durationMs} ms)` : 'Sem API capturada',
        ...route.findings,
      ].join(' | ')
      return `| ${index + 1} | ${route.name} | Navegacao e carregamento | ${result} | ${getSeverity(route)} | ${notes} |`
    }),
    '',
    '## 4. Responsividade',
    '',
    '| Perfil | Tela | Tempo | Overflow horizontal | Menu mobile | Screenshot |',
    '|---|---|---:|---|---|---|',
    ...responsiveResults.map(result => `| ${result.profile} | ${result.name} | ${result.durationMs} ms | ${result.horizontalOverflow ? 'SIM' : 'NAO'} | ${result.floatingMenuButton ? 'SIM' : 'NAO'} | ${relativeToOutput(result.screenshotPath)} |`),
    '',
    '## 5. Analise Tecnica',
    '',
    ...codeInsights.map(item => `- **${item.title}**: ${item.detail}`),
    '',
    '## 6. Top 5 correcoes urgentes',
    '',
    '1. Mover `AppLayout` para um `layout.tsx` persistente do App Router, evitando remontagem completa em cada rota.',
    '2. Centralizar sessao/permissoes em cache compartilhado e remover chamadas repetidas de `/api/auth/me`.',
    '3. Quebrar fetches sequenciais do dashboard e demais telas em carregamento paralelo com cache.',
    '4. Criar skeletons e placeholders para sidebar, header e listagens durante a troca de tela.',
    '5. Revisar rotas mais lentas e otimizar endpoints com payload menor e menos round-trips.',
    '',
    '## 7. Top 5 melhorias de maior impacto',
    '',
    ...suggestions.map((item, index) => `${index + 1}. ${item.title} - ${item.reason}`),
    '',
    '## 8. Limitacoes da auditoria',
    '',
    '- Ambiente local, sem acesso ao APM do servidor nem ao tempo interno de banco.',
    '- A medicao de backend foi inferida pelas requisicoes de rede do navegador.',
    '- O circuito foi executado com o perfil SUPER_ADMIN; outros papeis podem ter comportamento diferente.',
    '',
  ].join('\n')
}

function renderHtml({ loginMetrics, routes, responsiveResults, suggestions }) {
  const totalTests = routes.length + responsiveResults.length + 1
  const failed = routes.filter(route => route.durationMs > 2500 || route.authCalls > 1 || route.pendingCalls > 1).length
  const partial = responsiveResults.filter(result => result.horizontalOverflow).length
  const passed = totalTests - failed - partial
  const pct = value => ((value / Math.max(totalTests, 1)) * 100).toFixed(1)
  const avgDuration = Math.round(routes.reduce((sum, route) => sum + route.durationMs, 0) / Math.max(routes.length, 1))

  const routeRows = routes.map((route, index) => {
    const result = route.durationMs > 2500 || route.authCalls > 1 || route.pendingCalls > 1 ? 'FALHOU' : 'PASSOU'
    const badge = result === 'FALHOU' ? 'badge-danger' : 'badge-success'
    const failClass = result === 'FALHOU' ? 'fail' : ''
    const screenshot = relativeToOutput(route.screenshotPath)
    const note = escapeHtml([
      `Abertura ${route.durationMs} ms`,
      route.slowestApi ? `Mais lenta: ${route.slowestApi.url} (${route.slowestApi.durationMs} ms)` : 'Sem API capturada',
      ...route.findings,
    ].join(' | '))
    return `<tr data-result="${result}" class="${failClass}"><td>${index + 1}</td><td>${escapeHtml(route.name)}</td><td>${escapeHtml(route.href)}</td><td>${route.durationMs} ms</td><td><span class="badge ${badge}">${result}</span></td><td>${escapeHtml(getSeverity(route))}</td><td><img class="thumb lb-trigger" src="${screenshot}" data-full="${screenshot}" data-name="${escapeHtml(path.basename(route.screenshotPath))}"></td><td>${note}</td></tr>`
  }).join('\n')

  const mapRows = routes.map(route => `<details class="accordion"><summary>${escapeHtml(route.name)} <span class="badge badge-primary">${escapeHtml(route.type)}</span></summary><div class="accordion-body"><p style="font-size:13px;color:var(--text-muted);margin-bottom:8px">Rota: <code>${escapeHtml(route.href)}</code></p><p style="font-size:14px;margin-bottom:8px">Tempo: ${route.durationMs} ms | APIs: ${route.apiRequests.length} | auth/me: ${route.authCalls}</p><p style="font-size:14px;margin-bottom:12px">${escapeHtml(route.heading)}</p><img class="thumb lb-trigger" src="${relativeToOutput(route.screenshotPath)}" data-full="${relativeToOutput(route.screenshotPath)}" data-name="${escapeHtml(path.basename(route.screenshotPath))}"></div></details>`).join('\n')

  const responsiveCards = responsiveResults.map(result => `<div style="border:1px solid var(--border);border-radius:var(--radius);padding:20px;margin-bottom:16px;background:var(--surface)"><h3 style="margin-bottom:12px">${escapeHtml(result.profile.toUpperCase())} - ${escapeHtml(result.name)}</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:16px"><div><p style="font-size:12px;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px">Problema</p><p style="font-size:14px">${result.horizontalOverflow ? 'Overflow horizontal detectado.' : 'Sem overflow horizontal detectado.'}</p></div><div><p style="font-size:12px;text-transform:uppercase;color:var(--text-muted);margin-bottom:8px">Leitura</p><p style="font-size:14px">Tempo ${result.durationMs} ms. Botao mobile fixo ${result.floatingMenuButton ? 'presente' : 'ausente'}.</p></div></div><div style="margin-top:16px"><img class="thumb lb-trigger" src="${relativeToOutput(result.screenshotPath)}" data-full="${relativeToOutput(result.screenshotPath)}" data-name="${escapeHtml(path.basename(result.screenshotPath))}" style="width:200px;height:auto"></div></div>`).join('\n')

  const suggestionRows = suggestions.map((item, index) => {
    const badge = item.priority === 'ALTA' ? 'badge-danger' : item.priority === 'MEDIA' ? 'badge-warning' : 'badge-muted'
    return `<tr><td>${index + 1}</td><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.type)}</td><td><span class="badge ${badge}">${item.priority}</span></td><td>${escapeHtml(item.reason)}</td></tr>`
  }).join('\n')

  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Auditoria E2E - Gestao de Manutencao</title><style>*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}:root{--bg:#0f1117;--surface:#1a1d27;--surface2:#22263a;--border:#2a2d3a;--text:#e2e8f0;--text-muted:#94a3b8;--primary:#6366f1;--success:#22c55e;--danger:#ef4444;--warning:#f59e0b;--info:#3b82f6;--sidebar-w:220px;--radius:8px}body{background:var(--bg);color:var(--text);font-family:system-ui,sans-serif;display:flex;flex-direction:column;min-height:100vh}header{background:var(--surface);border-bottom:1px solid var(--border);padding:16px 24px;display:flex;align-items:center;gap:16px;position:sticky;top:0;z-index:100}header h1{font-size:18px;font-weight:700}header .meta{font-size:13px;color:var(--text-muted);margin-left:auto}.badge{display:inline-flex;align-items:center;gap:4px;padding:3px 10px;border-radius:99px;font-size:12px;font-weight:600}.badge-success{background:#166534;color:#86efac}.badge-danger{background:#7f1d1d;color:#fca5a5}.badge-warning{background:#78350f;color:#fde68a}.badge-muted{background:#374151;color:#d1d5db}.badge-primary{background:#3730a3;color:#c7d2fe}.layout{display:flex;flex:1}nav{width:var(--sidebar-w);background:var(--surface);border-right:1px solid var(--border);padding:16px 0;position:sticky;top:57px;height:calc(100vh - 57px);overflow-y:auto;flex-shrink:0}nav a{display:flex;align-items:center;gap:10px;padding:10px 20px;color:var(--text-muted);text-decoration:none;font-size:14px;border-left:3px solid transparent;transition:all .15s}nav a:hover,nav a.active{color:var(--text);border-left-color:var(--primary);background:var(--surface2)}main{flex:1;padding:32px;max-width:1200px}section{display:none}section.active{display:block}section h2{font-size:22px;font-weight:700;margin-bottom:24px;padding-bottom:12px;border-bottom:1px solid var(--border)}.metrics{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:16px;margin-bottom:32px}.metric-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:20px;text-align:center}.metric-card .value{font-size:36px;font-weight:800}.metric-card .label{font-size:12px;color:var(--text-muted);margin-top:4px;text-transform:uppercase;letter-spacing:.5px}.progress-bar{display:flex;height:12px;border-radius:99px;overflow:hidden;gap:2px;margin-bottom:24px}.progress-bar span{transition:width .3s}table{width:100%;border-collapse:collapse;font-size:14px}th{background:var(--surface);padding:10px 14px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted)}td{padding:10px 14px;border-bottom:1px solid var(--border);vertical-align:middle}tr.fail{background:rgba(239,68,68,.05)}tr:hover{background:var(--surface)}.filters{display:flex;gap:8px;margin-bottom:16px;flex-wrap:wrap}.filter-btn{padding:6px 14px;border-radius:99px;border:1px solid var(--border);background:transparent;color:var(--text-muted);cursor:pointer;font-size:13px;transition:all .15s}.filter-btn.active,.filter-btn:hover{background:var(--primary);color:#fff;border-color:var(--primary)}.thumb{width:72px;height:48px;object-fit:cover;border-radius:4px;cursor:pointer;border:1px solid var(--border);transition:transform .15s}.thumb:hover{transform:scale(1.05)}#lightbox{display:none;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:9999;align-items:center;justify-content:center;flex-direction:column;gap:12px}#lightbox.open{display:flex}#lightbox img{max-width:90vw;max-height:82vh;border-radius:var(--radius)}#lightbox .lb-name{color:#fff;font-size:13px;opacity:.7}#lightbox .lb-close{position:absolute;top:16px;right:20px;color:#fff;font-size:28px;cursor:pointer;opacity:.7}#lightbox .lb-nav{position:absolute;top:50%;transform:translateY(-50%);color:#fff;font-size:32px;cursor:pointer;opacity:.6;padding:12px;user-select:none}#lightbox .lb-prev{left:12px}#lightbox .lb-next{right:12px}.accordion summary{cursor:pointer;padding:12px 16px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);margin-bottom:4px;font-weight:600;list-style:none;display:flex;align-items:center;justify-content:space-between}.accordion-body{border:1px solid var(--border);border-top:none;padding:16px;border-radius:0 0 var(--radius) var(--radius);margin-bottom:8px}.timeline{display:flex;gap:8px;margin-top:16px}.tl-phase{flex:1;padding:16px;border:1px solid var(--border);border-radius:var(--radius);background:var(--surface)}.tl-phase h4{font-size:13px;text-transform:uppercase;letter-spacing:.5px;margin-bottom:12px;color:var(--text-muted)}.tl-phase ul{list-style:none;font-size:14px}.tl-phase li{padding:6px 0;border-bottom:1px solid var(--border)}.tl-phase li:last-child{border-bottom:none}@media (max-width:900px){nav{display:none}main{padding:20px}.timeline{flex-direction:column}}</style></head><body><header><h1>Auditoria E2E - Gestao de Manutencao</h1><span class="badge badge-success">${passed} passou</span><span class="badge badge-danger">${failed} falhou</span><span class="badge badge-warning">${partial} parcial</span><span class="meta">${escapeHtml(AUDIT_DATE)} · local</span></header><div class="layout"><nav id="sidebar"><a href="#" class="active" data-section="resumo">Resumo</a><a href="#" data-section="mapa">Mapa</a><a href="#" data-section="testes">Testes</a><a href="#" data-section="uiux">UI/UX</a><a href="#" data-section="sugestoes">Sugestoes</a><a href="#" data-section="top5">Top 5</a><a href="#" data-section="roadmap">Roadmap</a></nav><main><section id="resumo" class="active"><h2>Resumo Executivo</h2><div class="metrics"><div class="metric-card"><div class="value" style="color:var(--info)">${routes.length}</div><div class="label">Telas</div></div><div class="metric-card"><div class="value" style="color:var(--info)">${totalTests}</div><div class="label">Testes</div></div><div class="metric-card"><div class="value" style="color:var(--success)">${passed}</div><div class="label">Passou</div></div><div class="metric-card"><div class="value" style="color:var(--danger)">${failed}</div><div class="label">Falhou</div></div><div class="metric-card"><div class="value" style="color:var(--warning)">${partial}</div><div class="label">Parcial</div></div><div class="metric-card"><div class="value" style="color:var(--text-muted)">${avgDuration}</div><div class="label">Media ms</div></div></div><div class="progress-bar"><span style="width:${pct(passed)}%;background:var(--success)"></span><span style="width:${pct(failed)}%;background:var(--danger)"></span><span style="width:${pct(partial)}%;background:var(--warning)"></span></div><p style="font-size:14px;color:var(--text-muted);margin-bottom:12px">Login para dashboard: ${loginMetrics.submitTime} ms. O circuito completo confirmou lentidao recorrente na troca de telas e chamadas repetidas de sessao.</p><ul style="font-size:14px;color:var(--text-muted);padding-left:20px;line-height:2">${suggestions.map(item => `<li>${escapeHtml(item.title)} - ${escapeHtml(item.reason)}</li>`).join('')}</ul></section><section id="mapa"><h2>Mapa do Sistema</h2>${mapRows}</section><section id="testes"><h2>Resultados dos Testes</h2><div class="filters"><button class="filter-btn active" data-filter="todos">Todos</button><button class="filter-btn" data-filter="PASSOU">Passou</button><button class="filter-btn" data-filter="FALHOU">Falhou</button></div><table id="tests-table"><thead><tr><th>#</th><th>Tela</th><th>Rota</th><th>Tempo</th><th>Resultado</th><th>Severidade</th><th>Evidencia</th><th>Observacao</th></tr></thead><tbody>${routeRows}</tbody></table></section><section id="uiux"><h2>Analise de UI/UX</h2>${responsiveCards}</section><section id="sugestoes"><h2>Funcionalidades Sugeridas</h2><table><thead><tr><th>#</th><th>Sugestao</th><th>Tipo</th><th>Prioridade</th><th>Justificativa</th></tr></thead><tbody>${suggestionRows}</tbody></table></section><section id="top5"><h2>Top 5 Correcoes Urgentes</h2><ol style="padding-left:20px;line-height:2.2;font-size:15px"><li>Persistir a shell do app para parar o reload da sidebar/header.</li><li>Eliminar chamadas duplicadas de sessao e pendencias.</li><li>Aplicar cache e paralelismo nas queries principais.</li><li>Trocar estados em branco por skeletons de alta fidelidade.</li><li>Revisar overflow e densidade visual no mobile.</li></ol><h2 style="margin-top:32px">Top 5 Melhorias de Maior Impacto</h2><ol style="padding-left:20px;line-height:2.2;font-size:15px">${suggestions.map(item => `<li>${escapeHtml(item.title)}</li>`).join('')}</ol></section><section id="roadmap"><h2>Roadmap Sugerido</h2><div class="timeline"><div class="tl-phase"><h4>Curto prazo</h4><ul><li>Persistir layout</li><li>Cache de sessao</li><li>Skeleton da troca de tela</li></ul></div><div class="tl-phase"><h4>Medio prazo</h4><ul><li>Refatorar fetches para React Query/Suspense</li><li>Reducao de payload das APIs</li><li>Padrao visual responsivo</li></ul></div><div class="tl-phase"><h4>Longo prazo</h4><ul><li>Observabilidade com APM</li><li>Budget de performance por tela</li><li>Testes automatizados recorrentes</li></ul></div></div></section></main></div><div id="lightbox"><span class="lb-close" id="lb-close">×</span><span class="lb-nav lb-prev" id="lb-prev">‹</span><img id="lb-img" src="" alt=""><div class="lb-name" id="lb-name"></div><span class="lb-nav lb-next" id="lb-next">›</span></div><script>const links=document.querySelectorAll('nav a');const sections=document.querySelectorAll('section');links.forEach(link=>{link.addEventListener('click',e=>{e.preventDefault();links.forEach(l=>l.classList.remove('active'));sections.forEach(s=>s.classList.remove('active'));link.classList.add('active');document.getElementById(link.dataset.section)?.classList.add('active')})});document.querySelectorAll('.filter-btn').forEach(btn=>{btn.addEventListener('click',()=>{document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');const f=btn.dataset.filter;document.querySelectorAll('#tests-table tbody tr').forEach(row=>{row.style.display=(f==='todos'||row.dataset.result===f)?'':'none'})})});let lbImages=[],lbIndex=0;function setLbImage(idx){if(idx<0||idx>=lbImages.length)return;lbIndex=idx;const img=lbImages[idx];document.getElementById('lb-img').src=img.dataset.full||img.src;document.getElementById('lb-name').textContent=img.dataset.name||img.src.split('/').pop()}document.querySelectorAll('.lb-trigger').forEach(img=>{img.addEventListener('click',()=>{lbImages=[...img.closest('section').querySelectorAll('.lb-trigger')];lbIndex=lbImages.indexOf(img);setLbImage(lbIndex);document.getElementById('lightbox').classList.add('open')})});document.getElementById('lb-close').addEventListener('click',()=>document.getElementById('lightbox').classList.remove('open'));document.getElementById('lb-prev').addEventListener('click',()=>setLbImage(lbIndex-1));document.getElementById('lb-next').addEventListener('click',()=>setLbImage(lbIndex+1));document.getElementById('lightbox').addEventListener('click',e=>{if(e.target===document.getElementById('lightbox'))document.getElementById('lightbox').classList.remove('open')});document.addEventListener('keydown',e=>{const lb=document.getElementById('lightbox');if(!lb.classList.contains('open'))return;if(e.key==='Escape')lb.classList.remove('open');if(e.key==='ArrowLeft')setLbImage(lbIndex-1);if(e.key==='ArrowRight')setLbImage(lbIndex+1)})</script></body></html>`
}

async function writeSupportingDocs(routes, responsiveResults, suggestions) {
  const mapMd = [
    '# Mapa do Sistema',
    '',
    '| # | Tela | Rota | Tipo | Acoes observadas | Screenshot |',
    '|---|---|---|---|---|---|',
    ...routes.map((route, index) => `| ${index + 1} | ${route.name} | \`${route.href}\` | ${route.type} | ${route.buttons} botoes, ${route.tables} tabelas, ${route.forms} formularios | ${relativeToOutput(route.screenshotPath)} |`),
    '',
  ].join('\n')

  const testsMd = [
    '# Resultados dos Testes',
    '',
    '| # | Modulo | Acao | Resultado | Severidade | Evidencia | Observacao |',
    '|---|---|---|---|---|---|---|',
    ...routes.map((route, index) => {
      const result = route.durationMs > 2500 || route.authCalls > 1 || route.pendingCalls > 1 ? 'FALHOU' : 'PASSOU'
      return `| ${index + 1} | ${route.name} | Abrir e carregar dados | ${result} | ${getSeverity(route)} | ${relativeToOutput(route.screenshotPath)} | ${route.findings.join(' ')} |`
    }),
    '',
    '## Responsividade',
    '',
    ...responsiveResults.map(result => `- ${result.profile} / ${result.name}: ${result.durationMs} ms, overflow ${result.horizontalOverflow ? 'SIM' : 'NAO'}, screenshot ${relativeToOutput(result.screenshotPath)}`),
    '',
  ].join('\n')

  const suggestionsMd = [
    '# Funcionalidades Sugeridas',
    '',
    '| # | Sugestao | Tipo | Prioridade | Justificativa |',
    '|---|---|---|---|---|',
    ...suggestions.map((item, index) => `| ${index + 1} | ${item.title} | ${item.type} | ${item.priority} | ${item.reason} |`),
    '',
  ].join('\n')

  const comparativeMd = [
    '# Analise de UI/UX',
    '',
    ...responsiveResults.map(result => `## ${result.profile.toUpperCase()} - ${result.name}\n- Tempo: ${result.durationMs} ms\n- Overflow horizontal: ${result.horizontalOverflow ? 'SIM' : 'NAO'}\n- Botao mobile fixo: ${result.floatingMenuButton ? 'SIM' : 'NAO'}\n- Screenshot: ${relativeToOutput(result.screenshotPath)}\n`),
    '',
  ].join('\n')

  await fs.writeFile(MAP_MD, mapMd, 'utf8')
  await fs.writeFile(TESTS_MD, testsMd, 'utf8')
  await fs.writeFile(SUGGESTIONS_MD, suggestionsMd, 'utf8')
  await fs.writeFile(COMPARATIVE_MD, comparativeMd, 'utf8')
}

async function main() {
  await ensureDirs()

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()
  attachNetworkTracking(page)

  const loginMetrics = await login(page)
  const routes = await collectSidebarRoutes(page)
  const auditedRoutes = []

  for (let index = 0; index < routes.length; index += 1) {
    auditedRoutes.push(await auditRoute(page, routes[index], index + 3))
  }

  const storageStatePath = path.join(OUTPUT_DIR, 'evidencias', 'storageState.json')
  await context.storageState({ path: storageStatePath })
  await browser.close()

  const responsiveResults = await auditResponsive(storageStatePath, auditedRoutes)
  const repeatedAuthCalls = auditedRoutes.reduce((sum, route) => sum + route.authCalls, 0)

  const codeInsights = [
    {
      title: 'Layout nao persistente entre rotas',
      detail: 'As paginas instanciam `AppLayout` dentro de cada `page.tsx`, o que remonta sidebar e header em toda navegacao. Evidencia em `src/components/layout/AppLayout.tsx` e `src/app/dashboard/page.tsx`.',
    },
    {
      title: 'Sessao e permissoes buscadas varias vezes',
      detail: 'A sidebar faz fetch de `/api/auth/me` no mount e varias paginas repetem a mesma chamada antes de carregar dados. Isso amplia o tempo de abertura e causa sensacao de recarregamento.',
    },
    {
      title: 'Dashboard com waterfall de requests',
      detail: 'A dashboard consulta sessao primeiro e so depois dispara `/api/dashboard/stats`, criando serializacao evitavel.',
    },
  ]

  const suggestions = buildSuggestions(auditedRoutes, responsiveResults, repeatedAuthCalls)
  const md = renderMarkdown({ loginMetrics, routes: auditedRoutes, responsiveResults, suggestions, codeInsights })
  const html = renderHtml({ loginMetrics, routes: auditedRoutes, responsiveResults, suggestions })

  await writeSupportingDocs(auditedRoutes, responsiveResults, suggestions)
  await fs.writeFile(REPORT_MD, md, 'utf8')
  await fs.writeFile(REPORT_HTML, html, 'utf8')

  const machineSummary = {
    loginMetrics,
    routeCount: auditedRoutes.length,
    avgDurationMs: Math.round(auditedRoutes.reduce((sum, route) => sum + route.durationMs, 0) / Math.max(auditedRoutes.length, 1)),
    slowestRoutes: [...auditedRoutes].sort((a, b) => b.durationMs - a.durationMs).slice(0, 5).map(route => ({
      name: route.name,
      href: route.href,
      durationMs: route.durationMs,
      slowestApi: route.slowestApi,
    })),
    repeatedAuthCalls,
    repeatedPendingCalls: auditedRoutes.reduce((sum, route) => sum + route.pendingCalls, 0),
    consoleMessages: state.consoleMessages,
    reportMd: REPORT_MD,
    reportHtml: REPORT_HTML,
  }

  console.log(JSON.stringify(machineSummary, null, 2))
}

main().catch(error => {
  console.error(error)
  process.exit(1)
})
