/**
 * Pre-check para a migration 20260416234842_uppercase_text_backfill.
 *
 * Detecta colisoes em campos UNIQUE que podem aparecer depois de aplicar
 * UPPER(unaccent(...)) em dados existentes. Gera um relatorio legivel para
 * curadoria manual antes de rodar a migration em producao.
 *
 * Uso: `npx tsx scripts/check-uppercase-collisions.ts`
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function norm(v: string | null | undefined): string | null {
  if (v == null) return null
  return v
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim()
}

type Collision = { scope: string; key: string; ids: string[]; originals: string[] }

async function checkUnique<T extends Record<string, unknown>>(
  entity: string,
  rows: T[],
  fields: (keyof T)[],
  idField: keyof T = 'id' as keyof T,
): Promise<Collision[]> {
  const map = new Map<string, { ids: string[]; originals: string[] }>()
  for (const row of rows) {
    const key = fields
      .map((f) => {
        const v = row[f]
        return typeof v === 'string' ? norm(v) : v == null ? '' : String(v)
      })
      .join('|')
    if (!map.has(key)) map.set(key, { ids: [], originals: [] })
    const entry = map.get(key)!
    entry.ids.push(String(row[idField]))
    entry.originals.push(
      fields.map((f) => `${String(f)}=${row[f] ?? ''}`).join(' '),
    )
  }
  const collisions: Collision[] = []
  for (const [key, { ids, originals }] of map.entries()) {
    if (ids.length > 1) collisions.push({ scope: entity, key, ids, originals })
  }
  return collisions
}

async function main() {
  const report: Collision[] = []

  const assets = await prisma.asset.findMany({
    select: { id: true, unitId: true, tag: true, protheusCode: true },
  })
  report.push(
    ...(await checkUnique('Asset.tag+unitId', assets, ['tag', 'unitId'])),
  )
  report.push(
    ...(await checkUnique(
      'Asset.protheusCode+unitId',
      assets.filter((a) => a.protheusCode),
      ['protheusCode', 'unitId'],
    )),
  )

  const assetFamilies = await prisma.assetFamily.findMany({
    select: { id: true, companyId: true, protheusCode: true },
  })
  report.push(
    ...(await checkUnique(
      'AssetFamily.protheusCode+companyId',
      assetFamilies.filter((a) => a.protheusCode),
      ['protheusCode', 'companyId'],
    )),
  )

  const jobTitles = await prisma.jobTitle.findMany({
    select: { id: true, companyId: true, name: true, protheusCode: true },
  })
  report.push(
    ...(await checkUnique('JobTitle.name+companyId', jobTitles, ['name', 'companyId'])),
  )
  report.push(
    ...(await checkUnique(
      'JobTitle.protheusCode+companyId',
      jobTitles.filter((j) => j.protheusCode),
      ['protheusCode', 'companyId'],
    )),
  )

  const maintenanceAreas = await prisma.maintenanceArea.findMany({
    select: { id: true, companyId: true, code: true, protheusCode: true },
  })
  report.push(
    ...(await checkUnique(
      'MaintenanceArea.code+companyId',
      maintenanceAreas,
      ['code', 'companyId'],
    )),
  )
  report.push(
    ...(await checkUnique(
      'MaintenanceArea.protheusCode+companyId',
      maintenanceAreas.filter((m) => m.protheusCode),
      ['protheusCode', 'companyId'],
    )),
  )

  if (report.length === 0) {
    console.log('OK: nenhuma colisao detectada. Migration pode ser aplicada.')
    return
  }

  console.log(`ATENCAO: ${report.length} colisao(oes) detectada(s).\n`)
  for (const c of report) {
    console.log(`- ${c.scope} => chave normalizada "${c.key}"`)
    console.log(`  ${c.ids.length} registros: ${c.ids.join(', ')}`)
    for (const o of c.originals) console.log(`    ${o}`)
    console.log('')
  }
  console.log('Resolva os duplicados antes de aplicar a migration.')
  process.exit(1)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
