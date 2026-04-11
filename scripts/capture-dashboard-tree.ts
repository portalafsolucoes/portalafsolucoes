import { chromium, Page } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'

const BASE_URL = 'http://localhost:3000'
const EMAIL = 'super.admin@polimix.local'
const PASSWORD = 'Teste@123'

const outputDir = path.join(
  'E:',
  'Google Drive',
  '01 - Desenvolvimento',
  '02 - Projetos',
  '08 - Gestor Manutenção',
  '03 - Referencias',
  '03 - Gestor Manutencao - Dashboard e Arvore'
)
const screenshotsDir = path.join(outputDir, 'screenshots')

function ensureScreenshotAutomationAuthorized() {
  const rawValue = (process.env.ALLOW_SCREENSHOT_AUTOMATION ?? '').trim().toLowerCase()
  const authorizedValues = new Set(['1', 'true', 'yes', 'authorized'])

  if (!authorizedValues.has(rawValue)) {
    throw new Error(
      'Screenshot generation is blocked for scripts/capture-dashboard-tree.ts. Set ALLOW_SCREENSHOT_AUTOMATION=1 to authorize this run.'
    )
  }
}

type Capture = {
  section: 'dashboard' | 'tree'
  file: string
  title: string
  route: string
  note: string
}

const captures: Capture[] = []

function ensureDirs() {
  fs.mkdirSync(screenshotsDir, { recursive: true })
}

async function waitForVisualReady(page: Page) {
  await page.waitForLoadState('domcontentloaded')
  await page.waitForLoadState('networkidle').catch(() => null)
  await page.waitForFunction(() => {
    const hasSpinner = Array.from(document.querySelectorAll('*')).some((el) => {
      const cls = (el.getAttribute('class') || '').toLowerCase()
      return cls.includes('animate-spin')
    })
    return !hasSpinner
  }, undefined, { timeout: 20000 }).catch(() => null)
  await page.waitForTimeout(1500)
}

async function loginIfNeeded(page: Page) {
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(500)

  if (!page.url().includes('/login')) {
    await waitForVisualReady(page)
    return
  }

  const response = await page.request.post(`${BASE_URL}/api/auth/login`, {
    data: { email: EMAIL, password: PASSWORD },
  })

  if (!response.ok()) {
    throw new Error(`Falha no login via API: ${response.status()} ${await response.text()}`)
  }

  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' })
  await waitForVisualReady(page)
}

async function capture(page: Page, section: Capture['section'], file: string, title: string, note: string) {
  await waitForVisualReady(page)
  const target = path.join(screenshotsDir, file)
  await page.screenshot({ path: target, fullPage: true, type: 'png' })
  captures.push({
    section,
    file,
    title,
    route: page.url().replace(BASE_URL, '') || '/',
    note,
  })
}

async function captureDashboard(page: Page) {
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' })
  await waitForVisualReady(page)

  await capture(
    page,
    'dashboard',
    'dashboard-01-corporativo-carregado.png',
    'Dashboard Corporativo',
    'Tela principal do dashboard corporativo do SUPER_ADMIN com cards consolidados e tabela comparativa por unidade.'
  )
}

async function expandVisibleTreeNodes(page: Page) {
  const expandedLabels = new Set<string>()

  for (let pass = 0; pass < 4; pass++) {
    const rows = await page.locator('main .cursor-pointer').evaluateAll((nodes) => {
      return nodes.map((node, idx) => {
        const text = (node.textContent || '').replace(/\s+/g, ' ').trim()
        const svgCount = node.querySelectorAll('svg').length
        const isAssetRow = text.includes('OK') || text.includes('DOWN')
        return { idx, text, svgCount, isAssetRow }
      })
    })

    let changed = false
    for (const row of rows) {
      const looksExpandable = !row.isAssetRow
      if (!looksExpandable) continue
      if (!row.text || expandedLabels.has(row.text)) continue

      try {
        await page.locator('main .cursor-pointer').nth(row.idx).click()
        expandedLabels.add(row.text)
        changed = true
        await waitForVisualReady(page)
      } catch {
        // ignora nós instáveis e segue com os demais
      }
    }

    if (!changed) break
  }
}

async function captureTree(page: Page) {
  await page.goto(`${BASE_URL}/tree`, { waitUntil: 'domcontentloaded' })
  await waitForVisualReady(page)

  await capture(
    page,
    'tree',
    'tree-01-inicial-sem-unidade.png',
    'Árvore sem unidade selecionada',
    'Estado inicial da tela Árvore antes da seleção de unidade.'
  )

  const select = page.locator('select').first()
  const unitValue = await select.evaluate((node: HTMLSelectElement) => {
    const option = Array.from(node.options).find((item) => item.value)
    return option?.value || ''
  })

  if (!unitValue) return

  await select.selectOption(unitValue)
  await waitForVisualReady(page)

  await capture(
    page,
    'tree',
    'tree-02-unidade-selecionada.png',
    'Árvore com unidade selecionada',
    'Visão da árvore após seleção da unidade, com painel de estrutura e painel direito aguardando ativo.'
  )

  await expandVisibleTreeNodes(page)

  await capture(
    page,
    'tree',
    'tree-03-hierarquia-expandida.png',
    'Árvore expandida',
    'Estrutura hierárquica expandida da unidade selecionada.'
  )

  const treeResponse = await page.request.get(`${BASE_URL}/api/tree?unitId=${unitValue}`)
  const treePayload = await treeResponse.json()
  const assetNames = ((treePayload?.data?.assets || []) as Array<{ name: string; tag?: string | null }>)
    .map((asset) => asset.tag ? `[${asset.tag}] ${asset.name}` : asset.name)
    .slice(0, 3)

  for (let i = 0; i < assetNames.length; i++) {
    const locator = page.getByText(assetNames[i], { exact: false }).first()
    const count = await locator.count()
    if (count === 0) continue

    try {
      await locator.click({ timeout: 5000 })
      await waitForVisualReady(page)
      await capture(
        page,
        'tree',
        `tree-asset-0${i + 1}.png`,
        `Detalhe do ativo ${i + 1}`,
        'Painel direito da Árvore com OSs, SSs e RAFs do ativo selecionado.'
      )
    } catch {
      // Ativo nao ficou acessivel na arvore visivel; segue sem interromper o restante.
    }
  }
}

function writeReport() {
  const lines = [
    '# Dashboard e Arvore - Captura Fiel',
    '',
    'Atualizado em: 2026-04-06',
    `Base URL: \`${BASE_URL}\``,
    `Usuario: \`${EMAIL}\``,
    '',
    '## Criterio de captura',
    '',
    '- login automatico quando necessario',
    '- espera por `domcontentloaded`',
    '- tentativa de espera por `networkidle`',
    '- espera extra ate sumirem elementos com classe `animate-spin`',
    '- pausa adicional antes de cada screenshot para evitar capturas com loading parcial',
    '',
    '## Dashboard',
    '',
  ]

  for (const item of captures.filter((captureItem) => captureItem.section === 'dashboard')) {
    lines.push(`- [${item.file}](${path.join(screenshotsDir, item.file)})`)
    lines.push(`  Tela: ${item.title}`)
    lines.push(`  Rota: \`${item.route}\``)
    lines.push(`  Nota: ${item.note}`)
  }

  lines.push('', '## Arvore', '')

  for (const item of captures.filter((captureItem) => captureItem.section === 'tree')) {
    lines.push(`- [${item.file}](${path.join(screenshotsDir, item.file)})`)
    lines.push(`  Tela: ${item.title}`)
    lines.push(`  Rota: \`${item.route}\``)
    lines.push(`  Nota: ${item.note}`)
  }

  lines.push('', '## Observacoes', '')
  lines.push('- Nao foram encontrados modais nativos em `dashboard` pelo codigo atual.')
  lines.push('- Na tela `tree`, a hierarquia e composta por selecao de unidade, arvore expansivel e painel de detalhe do ativo; nao ha modais implementados nessa pagina atualmente.')
  lines.push('- Nesta base analisada, a tela `tree` nao exibiu ativos nem painel de detalhe navegavel mesmo apos selecionar a unidade. A API `/api/tree?unitId=...` retorna ativos, mas a hierarquia visivel ficou restrita aos nós de area, indicando inconsistencia entre os relacionamentos usados na montagem da arvore e os dados cadastrados.')

  fs.writeFileSync(path.join(outputDir, 'DASHBOARD_ARVORE_CAPTURAS.md'), lines.join('\n'), 'utf8')
}

async function main() {
  ensureScreenshotAutomationAuthorized()
  ensureDirs()

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  try {
    await loginIfNeeded(page)
    await captureDashboard(page)
    await captureTree(page)
    writeReport()
  } finally {
    await context.close()
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
