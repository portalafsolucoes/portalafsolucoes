/**
 * Importa etapas genericas em lote a partir de uma planilha .xlsx
 *
 * Uso:
 *   tsx scripts/import-generic-steps.ts \
 *     --file="C:/.../ETAPAS GENERICAS.xlsx" \
 *     --base-url=https://portalafsolucoes-delta.vercel.app \
 *     --email=usuario@dominio.com \
 *     --password=... \
 *     [--dry-run] \
 *     [--limit=3] \
 *     [--delay=200] \
 *     [--report=auditoria/2026-04-29/import-etapas-genericas/relatorio.csv]
 *
 * Flags:
 *   --dry-run  Nao executa POST, apenas valida login e simula o lote
 *   --limit    Processa apenas as primeiras N linhas
 *   --delay    Delay em ms entre requisicoes (default 200)
 *   --report   Caminho do CSV de saida (default em auditoria/<data>/import-etapas-genericas/)
 *
 * Variaveis de ambiente alternativas: IMPORT_EMAIL, IMPORT_PASSWORD, IMPORT_BASE_URL
 *
 * Mapeamento Excel -> API:
 *   Descricao      -> name           (UPPERCASE + sem acento aplicado pelo servidor)
 *   Tipo           -> optionType     ('NONE' | 'RESPONSE' | 'OPTION')
 *   Cod. Protheus  -> protheusCode   (preservado em case original)
 *
 * Observacoes:
 *   - Cada linha vira um POST /api/basic-registrations/generic-steps
 *   - Duplicatas (409) sao registradas como SKIPPED, nao abortam o lote
 *   - O cookie de sessao e mantido via Cookie header em todas as requisicoes
 *   - generic-steps e scope=company; a unidade ativa nao afeta o salvamento
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import * as XLSX from 'xlsx'

type OptionType = 'NONE' | 'RESPONSE' | 'OPTION'

interface ExcelRow {
  rowIndex: number
  description: string
  optionType: OptionType
  protheusCode: string | null
}

interface RowResult {
  rowIndex: number
  protheusCode: string | null
  description: string
  status: 'CREATED' | 'SKIPPED_DUPLICATE' | 'FAILED' | 'DRY_RUN'
  httpStatus?: number
  message?: string
  createdId?: string
}

interface CliArgs {
  file: string
  baseUrl: string
  email: string
  password: string
  dryRun: boolean
  limit?: number
  delayMs: number
  report: string
}

function parseArgs(): CliArgs {
  const argv = process.argv.slice(2)
  const map = new Map<string, string | boolean>()
  for (const arg of argv) {
    if (arg.startsWith('--')) {
      const eq = arg.indexOf('=')
      if (eq === -1) {
        map.set(arg.substring(2), true)
      } else {
        map.set(arg.substring(2, eq), arg.substring(eq + 1))
      }
    }
  }

  const file = (map.get('file') as string) || ''
  const baseUrl = ((map.get('base-url') as string) || process.env.IMPORT_BASE_URL || '').replace(/\/$/, '')
  const email = (map.get('email') as string) || process.env.IMPORT_EMAIL || ''
  const password = (map.get('password') as string) || process.env.IMPORT_PASSWORD || ''
  const dryRun = Boolean(map.get('dry-run'))
  const limitRaw = map.get('limit') as string | undefined
  const limit = limitRaw ? parseInt(limitRaw, 10) : undefined
  const delayRaw = (map.get('delay') as string) || '200'
  const delayMs = parseInt(delayRaw, 10)

  const today = new Date().toISOString().slice(0, 10)
  const defaultReport = path.join(
    'auditoria',
    today,
    'import-etapas-genericas',
    `relatorio${dryRun ? '-dry-run' : ''}.csv`
  )
  const report = (map.get('report') as string) || defaultReport

  if (!file) throw new Error('Argumento obrigatorio: --file=<caminho.xlsx>')
  if (!baseUrl) throw new Error('Argumento obrigatorio: --base-url=<url>')
  if (!email) throw new Error('Argumento obrigatorio: --email=<email>')
  if (!password) throw new Error('Argumento obrigatorio: --password=<senha> (ou env IMPORT_PASSWORD)')
  if (limit !== undefined && (!Number.isFinite(limit) || limit <= 0)) {
    throw new Error('--limit deve ser inteiro positivo')
  }
  if (!Number.isFinite(delayMs) || delayMs < 0) {
    throw new Error('--delay deve ser inteiro >= 0')
  }

  return { file, baseUrl, email, password, dryRun, limit, delayMs, report }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function readExcel(filePath: string): ExcelRow[] {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo nao encontrado: ${filePath}`)
  }

  const wb = XLSX.readFile(filePath)
  const sheetName = wb.SheetNames[0]
  if (!sheetName) throw new Error('Planilha sem abas')
  const sheet = wb.Sheets[sheetName]
  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: false })

  const rows: ExcelRow[] = []
  json.forEach((rec, i) => {
    const description = String(rec['Descricao'] ?? rec['Descrição'] ?? '').trim()
    const tipoRaw = String(rec['Tipo'] ?? '').trim().toUpperCase()
    const protheusRaw = rec['Cod. Protheus'] ?? rec['Cod Protheus'] ?? rec['Codigo Protheus'] ?? rec['Código Protheus']
    const protheusCode = protheusRaw ? String(protheusRaw).trim() : null

    if (!description) return // pula linha sem descricao

    let optionType: OptionType = 'NONE'
    if (tipoRaw === 'RESPONSE' || tipoRaw === 'OPTION' || tipoRaw === 'NONE') {
      optionType = tipoRaw as OptionType
    } else if (tipoRaw) {
      throw new Error(`Linha ${i + 2}: Tipo invalido "${tipoRaw}" (esperado NONE, RESPONSE ou OPTION)`)
    }

    if (optionType === 'OPTION') {
      throw new Error(
        `Linha ${i + 2}: Tipo OPTION exige lista de opcoes na planilha — formato nao suportado neste import.`
      )
    }

    rows.push({
      rowIndex: i + 2, // +1 zero-based, +1 cabecalho
      description,
      optionType,
      protheusCode: protheusCode || null,
    })
  })

  return rows
}

interface LoginResult {
  cookie: string
  user: {
    id: string
    email: string
    role: string
    company?: { id?: string; name?: string }
    unitId?: string | null
  }
}

function extractSessionCookie(setCookieHeaders: string[]): string | null {
  for (const h of setCookieHeaders) {
    const m = h.match(/^session=([^;]+)/)
    if (m) return `session=${m[1]}`
  }
  return null
}

async function login(baseUrl: string, email: string, password: string): Promise<LoginResult> {
  const res = await fetch(`${baseUrl}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })

  const json = await res.json().catch(() => null) as { data?: LoginResult['user']; error?: string } | null

  if (!res.ok || !json?.data) {
    throw new Error(`Login falhou (${res.status}): ${json?.error || 'sem mensagem'}`)
  }

  // node 18+ fetch expoe getSetCookie em alguns runtimes; fallback para raw
  const setCookieRaw = (res.headers as unknown as { getSetCookie?: () => string[] }).getSetCookie?.()
    || res.headers.get('set-cookie')?.split(/,(?=\s*\w+=)/) // split por virgula seguida de novo cookie
    || []

  const cookie = extractSessionCookie(setCookieRaw)
  if (!cookie) {
    throw new Error('Login retornou 200 mas nao incluiu cookie de sessao')
  }

  return { cookie, user: json.data }
}

async function verifySession(baseUrl: string, cookie: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${baseUrl}/api/auth/me`, {
    headers: { Cookie: cookie },
  })
  if (!res.ok) {
    throw new Error(`Verificacao de sessao falhou (${res.status})`)
  }
  const json = await res.json() as { data?: Record<string, unknown> }
  return json.data ?? {}
}

async function postGenericStep(
  baseUrl: string,
  cookie: string,
  payload: { name: string; optionType: OptionType; protheusCode: string | null; options: unknown[] },
): Promise<{ httpStatus: number; ok: boolean; data?: Record<string, unknown>; error?: string }> {
  const res = await fetch(`${baseUrl}/api/basic-registrations/generic-steps`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: cookie,
    },
    body: JSON.stringify(payload),
  })

  let body: { data?: Record<string, unknown>; error?: string; message?: string } = {}
  try {
    body = await res.json()
  } catch {
    // resposta sem JSON
  }

  return {
    httpStatus: res.status,
    ok: res.ok,
    data: body?.data,
    error: body?.error || (res.ok ? undefined : `HTTP ${res.status}`),
  }
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ''
  const s = String(value)
  if (s.includes('"') || s.includes(',') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"'
  }
  return s
}

function writeReport(reportPath: string, results: RowResult[]): void {
  const dir = path.dirname(reportPath)
  fs.mkdirSync(dir, { recursive: true })

  const header = ['linha', 'cod_protheus', 'descricao', 'status', 'http_status', 'mensagem', 'created_id']
  const lines = [header.join(',')]
  for (const r of results) {
    lines.push([
      r.rowIndex,
      r.protheusCode,
      r.description,
      r.status,
      r.httpStatus ?? '',
      r.message ?? '',
      r.createdId ?? '',
    ].map(csvEscape).join(','))
  }
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf-8')
}

async function main(): Promise<void> {
  const args = parseArgs()

  console.log('--- Import de etapas genericas ---')
  console.log(`Arquivo:   ${args.file}`)
  console.log(`Base URL:  ${args.baseUrl}`)
  console.log(`Email:     ${args.email}`)
  console.log(`Modo:      ${args.dryRun ? 'DRY-RUN (nao envia POST)' : 'EXECUCAO REAL'}`)
  if (args.limit !== undefined) console.log(`Limite:    ${args.limit} linhas`)
  console.log(`Delay:     ${args.delayMs}ms entre requests`)
  console.log(`Relatorio: ${args.report}`)
  console.log('')

  const allRows = readExcel(args.file)
  console.log(`Linhas lidas do Excel: ${allRows.length}`)
  const rows = args.limit !== undefined ? allRows.slice(0, args.limit) : allRows
  console.log(`Linhas a processar:    ${rows.length}`)
  console.log('')

  console.log('Autenticando...')
  const { cookie, user } = await login(args.baseUrl, args.email, args.password)
  console.log(`OK: ${user.email} | role=${user.role} | empresa=${user.company?.name ?? '-'} | unidade=${user.unitId ?? '-'}`)
  await verifySession(args.baseUrl, cookie)
  console.log('Sessao verificada via /api/auth/me')
  console.log('')

  const results: RowResult[] = []
  let created = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const prefix = `[${i + 1}/${rows.length}] linha ${row.rowIndex} | ${row.protheusCode ?? '-'}`

    if (args.dryRun) {
      results.push({
        rowIndex: row.rowIndex,
        protheusCode: row.protheusCode,
        description: row.description,
        status: 'DRY_RUN',
        message: 'simulacao — sem POST',
      })
      console.log(`${prefix} | DRY-RUN`)
      continue
    }

    try {
      const res = await postGenericStep(args.baseUrl, cookie, {
        name: row.description,
        optionType: row.optionType,
        protheusCode: row.protheusCode,
        options: [],
      })

      if (res.ok) {
        created++
        results.push({
          rowIndex: row.rowIndex,
          protheusCode: row.protheusCode,
          description: row.description,
          status: 'CREATED',
          httpStatus: res.httpStatus,
          createdId: res.data?.id as string | undefined,
        })
        console.log(`${prefix} | CREATED (${res.httpStatus})`)
      } else if (res.httpStatus === 409) {
        skipped++
        results.push({
          rowIndex: row.rowIndex,
          protheusCode: row.protheusCode,
          description: row.description,
          status: 'SKIPPED_DUPLICATE',
          httpStatus: res.httpStatus,
          message: res.error,
        })
        console.log(`${prefix} | SKIP duplicado`)
      } else {
        failed++
        results.push({
          rowIndex: row.rowIndex,
          protheusCode: row.protheusCode,
          description: row.description,
          status: 'FAILED',
          httpStatus: res.httpStatus,
          message: res.error,
        })
        console.log(`${prefix} | FAIL ${res.httpStatus}: ${res.error}`)
      }
    } catch (err) {
      failed++
      const message = err instanceof Error ? err.message : String(err)
      results.push({
        rowIndex: row.rowIndex,
        protheusCode: row.protheusCode,
        description: row.description,
        status: 'FAILED',
        message,
      })
      console.log(`${prefix} | EXCEPTION: ${message}`)
    }

    if (args.delayMs > 0 && i < rows.length - 1) {
      await sleep(args.delayMs)
    }
  }

  writeReport(args.report, results)

  console.log('')
  console.log('--- Resumo ---')
  console.log(`Criados:   ${created}`)
  console.log(`Pulados:   ${skipped}  (duplicatas)`)
  console.log(`Falhas:    ${failed}`)
  console.log(`Dry-run:   ${results.filter(r => r.status === 'DRY_RUN').length}`)
  console.log(`Total:     ${results.length}`)
  console.log(`Relatorio: ${args.report}`)
}

main().catch((err) => {
  console.error('')
  console.error('ERRO FATAL:', err instanceof Error ? err.message : err)
  process.exit(1)
})
