/**
 * Inventário de SUPER_ADMINs (read-only).
 *
 * Lista todos os usuários com role SUPER_ADMIN, indicando:
 *  - se possuem companyId (provável ADMIN de cliente que precisa ser rebaixado)
 *  - ou se já são staff Portal AF (companyId NULL)
 *
 * Saída: CSV em auditoria/<YYYY-MM-DD>/super-admin-vs-admin/dados/super-admins.csv
 *
 * Executar com: npx tsx scripts/audit-super-admins.ts
 *
 * As decisões de promover (companyId=NULL) ou rebaixar (role=ADMIN) são MANUAIS,
 * via SQL no banco, após revisão do CSV gerado.
 */

import { PrismaClient } from '@prisma/client'
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const prisma = new PrismaClient()

async function main() {
  const today = new Date().toISOString().slice(0, 10)
  const outDir = join(process.cwd(), 'auditoria', today, 'super-admin-vs-admin', 'dados')
  await mkdir(outDir, { recursive: true })

  const superAdmins = await prisma.user.findMany({
    where: { role: 'SUPER_ADMIN' },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      companyId: true,
      enabled: true,
      lastLogin: true,
      company: { select: { name: true } },
    },
    orderBy: [{ companyId: 'asc' }, { email: 'asc' }],
  })

  const header = ['id', 'email', 'firstName', 'lastName', 'companyId', 'companyName', 'enabled', 'lastLogin', 'suggestedAction']
  const rows = superAdmins.map((u) => {
    const suggested = u.companyId == null ? 'KEEP_PLATFORM_STAFF' : 'REVIEW_DOWNGRADE_TO_ADMIN'
    return [
      u.id,
      u.email,
      u.firstName,
      u.lastName,
      u.companyId ?? '',
      u.company?.name ?? '',
      String(u.enabled),
      u.lastLogin?.toISOString() ?? '',
      suggested,
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',')
  })

  const csv = [header.join(','), ...rows].join('\n') + '\n'
  const outFile = join(outDir, 'super-admins.csv')
  await writeFile(outFile, csv, 'utf8')

  console.log(`SUPER_ADMINs encontrados: ${superAdmins.length}`)
  console.log(`Inventário gravado em: ${outFile}`)
  console.log('')
  console.log('Próximo passo (manual): revisar o CSV e aplicar SQL caso a caso, por exemplo:')
  console.log('  -- promover staff Portal AF:')
  console.log("  UPDATE \"User\" SET \"companyId\" = NULL WHERE id = '...';")
  console.log('  -- rebaixar admin de empresa cliente:')
  console.log("  UPDATE \"User\" SET role = 'ADMIN' WHERE id = '...';")
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
