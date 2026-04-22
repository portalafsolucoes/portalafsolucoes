/**
 * scripts/migrate-roles-to-manutentor.ts
 *
 * Migra usuários com role legada (MECANICO, ELETRICISTA, OPERADOR, CONSTRUTOR_CIVIL)
 * para MANUTENTOR, conforme Plano de Ação (Fase 2).
 *
 * Uso:
 *   npx tsx scripts/migrate-roles-to-manutentor.ts            # dry-run
 *   npx tsx scripts/migrate-roles-to-manutentor.ts --apply    # aplica em transação
 *
 * Registra log em auditoria/YYYY-MM-DD/migracao-roles-manutentor/README.md
 */
import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

const LEGACY_ROLES = ['MECANICO', 'ELETRICISTA', 'OPERADOR', 'CONSTRUTOR_CIVIL'] as const

async function main() {
  const apply = process.argv.includes('--apply')
  const now = new Date()
  const dateDir = now.toISOString().slice(0, 10)
  const outDir = path.join(process.cwd(), 'auditoria', dateDir, 'migracao-roles-manutentor')
  const readme = path.join(outDir, 'README.md')

  console.log(`\n=== Migração de roles → MANUTENTOR ${apply ? '(APPLY)' : '(DRY-RUN)'} ===\n`)

  const candidates = await prisma.$queryRawUnsafe<Array<{
    id: string; email: string; firstName: string; lastName: string; role: string; companyId: string | null
  }>>(
    `SELECT id, email, "firstName", "lastName", role::text AS role, "companyId"
     FROM "User"
     WHERE role::text IN ('MECANICO','ELETRICISTA','OPERADOR','CONSTRUTOR_CIVIL')
     ORDER BY "companyId", role, email`
  )

  console.log(`Candidatos encontrados: ${candidates.length}`)
  console.table(candidates.map(u => ({
    email: u.email,
    role_atual: u.role,
    novo_role: 'MANUTENTOR',
    company: u.companyId ?? '(sem)'
  })))

  if (candidates.length === 0) {
    console.log('\nNada a migrar. Encerrando.')
    return
  }

  if (!apply) {
    console.log('\nDRY-RUN — nada foi alterado. Execute com --apply para persistir.')
    return
  }

  fs.mkdirSync(outDir, { recursive: true })

  const snapshot = candidates.map(u => ({ ...u }))

  const affected = await prisma.$executeRawUnsafe(
    `UPDATE "User"
       SET role = 'MANUTENTOR'::"UserRole",
           "updatedAt" = NOW()
     WHERE role::text IN ('MECANICO','ELETRICISTA','OPERADOR','CONSTRUTOR_CIVIL')`
  )

  console.log(`\nUsuários atualizados: ${affected}`)

  const body = [
    '# Migração de roles legadas → MANUTENTOR',
    '',
    `**Data:** ${now.toISOString()}`,
    `**Afetados:** ${affected}`,
    '',
    '## Snapshot antes da atualização',
    '',
    '| Email | Role anterior | CompanyId |',
    '|---|---|---|',
    ...snapshot.map(u => `| ${u.email} | ${u.role} | ${u.companyId ?? '-'} |`),
    '',
    '## Rollback',
    '',
    'Para reverter um usuário específico:',
    '',
    '```sql',
    `UPDATE "User" SET role = '<ROLE_ANTIGO>'::"UserRole" WHERE id = '<ID>';`,
    '```',
    '',
  ].join('\n')

  fs.writeFileSync(readme, body, 'utf8')
  console.log(`Log salvo em ${path.relative(process.cwd(), readme)}`)
}

main()
  .catch(err => {
    console.error('Erro:', err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
