import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { ensureScreenshotAutomationAuthorized } from './screenshot-authorization.mjs'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
const AUDIT_DATE = new Date().toISOString().slice(0, 10)
const OUTPUT_ROOT = path.resolve(process.cwd(), 'auditoria', AUDIT_DATE)
const SCREENSHOTS_DIR = path.join(OUTPUT_ROOT, 'screenshots')
const MODALS_DIR = path.join(OUTPUT_ROOT, 'modais')
const EVIDENCE_DIR = path.join(OUTPUT_ROOT, 'evidencias')
const REPORT_MD = path.join(OUTPUT_ROOT, 'RELATORIO.md')
const REPORT_JSON = path.join(OUTPUT_ROOT, 'relatorio.json')

const QA_EMAIL = process.env.QA_EMAIL || 'super.admin@polimix.local'
const QA_PASSWORD = process.env.QA_PASSWORD
if (!QA_PASSWORD) {
  console.error('ERRO: QA_PASSWORD nao configurada. Use: QA_PASSWORD=senha node run-super-admin-full-audit.mjs')
  process.exit(1)
}

ensureScreenshotAutomationAuthorized('scripts/testing/run-super-admin-full-audit.mjs')

function slugify(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

async function ensureDirs() {
  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true })
  await fs.mkdir(MODALS_DIR, { recursive: true })
  await fs.mkdir(EVIDENCE_DIR, { recursive: true })
}

async function waitForStable(page, timeout = 15000) {
  await page.waitForTimeout(400)
  await page.waitForLoadState('domcontentloaded', { timeout }).catch(() => {})
  await page.waitForLoadState('networkidle', { timeout: 4000 }).catch(() => {})
  await page.waitForFunction(
    () => {
      const busy = document.querySelector('[aria-busy="true"]')
      const spinning = document.querySelector('.animate-spin')
      return !busy && !spinning
    },
    null,
    { timeout }
  ).catch(() => {})
  await page.waitForTimeout(700)
}

async function dismissTransientUi(page) {
  const escapeAttempts = 3
  for (let i = 0; i < escapeAttempts; i += 1) {
    await page.keyboard.press('Escape').catch(() => {})
    await page.waitForTimeout(200)
  }
}

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' })
  await waitForStable(page)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, '01-login.png'),
    fullPage: true,
  })

  await page.getByLabel('Email').fill(QA_EMAIL)
  await page.getByLabel('Senha').fill(QA_PASSWORD)

  await Promise.all([
    page.waitForURL(url => !url.pathname.startsWith('/login'), { timeout: 20000 }),
    page.getByRole('button', { name: 'Entrar' }).click(),
  ])

  await waitForStable(page, 20000)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, '02-pos-login.png'),
    fullPage: true,
  })
}

async function enterMaintenanceModule(page) {
  if (page.url().includes('/dashboard')) {
    return
  }

  if (page.url().includes('/hub')) {
    const cmmsCard = page.getByText('Gestão de Manutenção').first()
    if (await cmmsCard.count()) {
      await cmmsCard.click().catch(() => {})
      await page.waitForURL(url => url.pathname === '/dashboard', { timeout: 20000 }).catch(() => {})
    }
  }

  if (!page.url().includes('/dashboard')) {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' })
  }

  await waitForStable(page, 20000)
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, '03-dashboard-shell.png'),
    fullPage: true,
  })
}

async function expandSidebar(page) {
  const basicsButton = page.getByRole('button', { name: /Cadastros Básicos/i })
  if (await basicsButton.count()) {
    const expanded = await basicsButton.first().getAttribute('aria-expanded').catch(() => null)
    if (expanded !== 'true') {
      await basicsButton.first().click().catch(() => {})
      await page.waitForTimeout(300)
    }
  }
}

async function collectRoutes(page) {
  await expandSidebar(page)
  const routes = await page.evaluate(() => {
    const nav = document.querySelector('aside nav')
    if (!nav) return []

    const links = [...nav.querySelectorAll('a[href]')]
    const unique = new Map()

    for (const link of links) {
      const href = link.getAttribute('href') || ''
      const name = (link.textContent || href).trim().replace(/\s+/g, ' ')
      if (!href.startsWith('/')) continue
      if (href === '/hub') continue
      if (!unique.has(href)) {
        unique.set(href, { href, name })
      }
    }

    return [...unique.values()]
  })

  return routes
}

async function collectInteractiveTargets(page) {
  return page.evaluate(() => {
    const keywords = [
      'novo',
      'nova',
      'criar',
      'adicionar',
      'editar',
      'detalhes',
      'visualizar',
      'configurar',
      'aprovar',
      'rejeitar',
      'abrir',
      'mais',
      'acoes',
      'ações',
      'filtro',
      'filtros',
      'buscar',
      'pesquisar',
      'modal',
      'popup',
    ]

    const clickable = [...document.querySelectorAll('button, [role="button"], a, summary')]
    const candidates = []
    const seen = new Set()

    for (const element of clickable) {
      const text = (element.textContent || '').trim().replace(/\s+/g, ' ')
      const aria = (element.getAttribute('aria-label') || '').trim()
      const title = (element.getAttribute('title') || '').trim()
      const content = `${text} ${aria} ${title}`.toLowerCase()
      const visible = element instanceof HTMLElement && element.offsetParent !== null
      const rect = element.getBoundingClientRect()

      if (!visible) continue
      if (rect.width < 20 || rect.height < 20) continue
      if (!keywords.some(keyword => content.includes(keyword))) continue

      const descriptor = element.id
        ? `#${element.id}`
        : `${element.tagName.toLowerCase()}:nth-of-type(${[...element.parentElement?.children || []].indexOf(element) + 1})`

      if (seen.has(descriptor)) continue
      seen.add(descriptor)

      candidates.push({
        descriptor,
        text: text || aria || title || 'acao',
      })
    }

    return candidates.slice(0, 10)
  })
}

async function openTargetAndCapture(page, routeSlug, routeName, candidate, index) {
  const beforeUrl = page.url()
  const safeName = slugify(candidate.text || `acao-${index}`)

  const opened = await page.evaluate((descriptor) => {
    const findElement = () => {
      if (descriptor.startsWith('#')) {
        return document.querySelector(descriptor)
      }

      const [tag, nth] = descriptor.split(':nth-of-type(')
      if (!tag || !nth) return null

      const nthValue = Number(nth.replace(')', ''))
      const all = [...document.querySelectorAll(tag)]
      return all[nthValue - 1] || null
    }

    const element = findElement()
    if (!(element instanceof HTMLElement)) return false
    element.click()
    return true
  }, candidate.descriptor).catch(() => false)

  if (!opened) return null

  await page.waitForTimeout(500)
  await waitForStable(page, 10000)

  const dialogCount = await page.locator('[role="dialog"], .fixed.inset-0, [data-headlessui-portal]').count().catch(() => 0)
  const menuCount = await page.locator('[role="menu"], [role="listbox"], [data-radix-popper-content-wrapper]').count().catch(() => 0)
  const afterUrl = page.url()

  if (dialogCount === 0 && menuCount === 0 && afterUrl === beforeUrl) {
    await dismissTransientUi(page)
    return null
  }

  const targetPath = path.join(
    MODALS_DIR,
    `${routeSlug}-${String(index + 1).padStart(2, '0')}-${safeName}.png`
  )

  await page.screenshot({ path: targetPath, fullPage: true })

  const kind = dialogCount > 0 ? 'modal' : afterUrl !== beforeUrl ? 'navegacao-interna' : 'popup'

  await dismissTransientUi(page)

  if (afterUrl !== beforeUrl) {
    await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => {})
    await waitForStable(page, 10000)
  }

  return {
    trigger: candidate.text,
    kind,
    screenshot: path.relative(OUTPUT_ROOT, targetPath).replaceAll('\\', '/'),
  }
}

async function auditRoute(page, route, index) {
  await expandSidebar(page)
  await page.goto(`${BASE_URL}${route.href}`, { waitUntil: 'domcontentloaded' })
  await waitForStable(page, 20000)

  const routeSlug = `${String(index + 1).padStart(2, '0')}-${slugify(route.name)}`
  const screenshotPath = path.join(SCREENSHOTS_DIR, `${routeSlug}.png`)
  await page.screenshot({ path: screenshotPath, fullPage: true })

  const meta = await page.evaluate(() => {
    const title = document.querySelector('h1')?.textContent?.trim() || document.title || 'Sem titulo'
    const dialogCount = document.querySelectorAll('[role="dialog"]').length
    const buttonCount = document.querySelectorAll('button').length
    const tableCount = document.querySelectorAll('table').length
    const formCount = document.querySelectorAll('form').length
    const popupCount = document.querySelectorAll('[role="menu"], [role="listbox"]').length
    return { title, dialogCount, buttonCount, tableCount, formCount, popupCount }
  })

  const candidates = await collectInteractiveTargets(page)
  const interactions = []

  for (let i = 0; i < candidates.length; i += 1) {
    const result = await openTargetAndCapture(page, routeSlug, route.name, candidates[i], i)
    if (result) {
      interactions.push(result)
    }
  }

  return {
    route: route.href,
    name: route.name,
    title: meta.title,
    screenshot: path.relative(OUTPUT_ROOT, screenshotPath).replaceAll('\\', '/'),
    counts: {
      buttons: meta.buttonCount,
      tables: meta.tableCount,
      forms: meta.formCount,
    },
    interactions,
  }
}

function renderMarkdown(results) {
  const lines = [
    '# Auditoria automatizada',
    '',
    `- Data: ${AUDIT_DATE}`,
    `- URL: ${BASE_URL}`,
    `- Usuario: ${QA_EMAIL}`,
    `- Total de telas auditadas: ${results.length}`,
    `- Total de modais/popups capturados: ${results.reduce((sum, item) => sum + item.interactions.length, 0)}`,
    '',
    '## Telas',
    '',
  ]

  results.forEach((item, idx) => {
    lines.push(`### ${idx + 1}. ${item.name}`)
    lines.push(`- Rota: \`${item.route}\``)
    lines.push(`- Titulo: ${item.title}`)
    lines.push(`- Screenshot: ${item.screenshot}`)
    lines.push(`- Elementos: ${item.counts.buttons} botoes, ${item.counts.tables} tabelas, ${item.counts.forms} formularios`)
    if (item.interactions.length === 0) {
      lines.push('- Modais/popups encontrados: nenhum capturado por heuristica')
    } else {
      lines.push('- Modais/popups encontrados:')
      item.interactions.forEach((interaction) => {
        lines.push(`  - ${interaction.kind}: ${interaction.trigger} -> ${interaction.screenshot}`)
      })
    }
    lines.push('')
  })

  return lines.join('\n')
}

async function main() {
  await ensureDirs()

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  await login(page)
  await enterMaintenanceModule(page)
  const routes = await collectRoutes(page)
  const results = []

  for (let index = 0; index < routes.length; index += 1) {
    results.push(await auditRoute(page, routes[index], index))
  }

  const storageStatePath = path.join(EVIDENCE_DIR, 'storageState.json')
  await context.storageState({ path: storageStatePath })
  await browser.close()

  await fs.writeFile(REPORT_MD, renderMarkdown(results), 'utf8')
  await fs.writeFile(
    REPORT_JSON,
    JSON.stringify(
      {
        date: AUDIT_DATE,
        baseUrl: BASE_URL,
        user: QA_EMAIL,
        totalScreens: results.length,
        totalInteractions: results.reduce((sum, item) => sum + item.interactions.length, 0),
        results,
      },
      null,
      2
    ),
    'utf8'
  )

  console.log(
    JSON.stringify(
      {
        outputRoot: OUTPUT_ROOT,
        totalScreens: results.length,
        totalInteractions: results.reduce((sum, item) => sum + item.interactions.length, 0),
      },
      null,
      2
    )
  )
}

main().catch(async (error) => {
  console.error(error)
  process.exit(1)
})
