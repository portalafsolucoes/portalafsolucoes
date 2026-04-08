/**
 * Script de Migração - Multi-Empresa (Fase 1)
 *
 * Este script migra dados existentes para o novo modelo multi-tenant:
 * 1. Cria os módulos do portal (tabela Module)
 * 2. Habilita todos os módulos para empresas existentes (CompanyModule)
 * 3. Cria registros UserUnit para usuários existentes com base no unitId atual
 * 4. Define activeUnitId para usuários que ainda não possuem
 *
 * Executar com: npx tsx scripts/migrate-multi-tenant.ts
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const PORTAL_MODULES = [
  { slug: 'dashboard', name: 'Dashboard', icon: 'LayoutDashboard', order: 1 },
  { slug: 'tree', name: 'Árvore de Ativos', icon: 'Network', order: 2 },
  { slug: 'people-teams', name: 'Pessoas e Equipes', icon: 'Users', order: 3 },
  { slug: 'basic-registrations', name: 'Cadastros Básicos', icon: 'Database', order: 4 },
  { slug: 'assets', name: 'Ativos', icon: 'Package', order: 5 },
  { slug: 'maintenance-plan', name: 'Plano de Manutenção', icon: 'ClipboardList', order: 6 },
  { slug: 'planning', name: 'Planejamento e Programação', icon: 'CalendarRange', order: 7 },
  { slug: 'work-orders', name: 'Ordens de Serviço', icon: 'Wrench', order: 8 },
  { slug: 'requests', name: 'Solicitações de Serviço', icon: 'FileText', order: 9 },
  { slug: 'approvals', name: 'Aprovações', icon: 'CheckCircle', order: 10 },
  { slug: 'rafs', name: 'RAF - Análise de Falhas', icon: 'AlertTriangle', order: 11 },
  { slug: 'locations', name: 'Localizações', icon: 'MapPin', order: 12 },
  { slug: 'kpi', name: 'KPI - Indicadores', icon: 'BarChart3', order: 13 },
  { slug: 'gep', name: 'GEP - Variáveis de Processo', icon: 'Activity', order: 14 },
  { slug: 'analytics', name: 'Análises', icon: 'TrendingUp', order: 15 },
  { slug: 'settings', name: 'Configurações', icon: 'Settings', order: 16 },
]

async function main() {
  console.log('=== Migração Multi-Empresa (Fase 1) ===\n')

  // 1. Criar módulos do portal
  console.log('1. Criando módulos do portal...')
  const modules: { id: string; slug: string }[] = []
  for (const mod of PORTAL_MODULES) {
    const created = await prisma.module.upsert({
      where: { slug: mod.slug },
      update: { name: mod.name, icon: mod.icon, order: mod.order },
      create: { name: mod.name, slug: mod.slug, icon: mod.icon, order: mod.order },
    })
    modules.push({ id: created.id, slug: created.slug })
  }
  console.log(`   ✓ ${modules.length} módulos criados/atualizados`)

  // 2. Habilitar todos os módulos para empresas existentes
  console.log('\n2. Habilitando módulos para empresas existentes...')
  const companies = await prisma.company.findMany()
  for (const company of companies) {
    for (const mod of modules) {
      await prisma.companyModule.upsert({
        where: { companyId_moduleId: { companyId: company.id, moduleId: mod.id } },
        update: { enabled: true },
        create: { companyId: company.id, moduleId: mod.id, enabled: true },
      })
    }
    console.log(`   ✓ ${company.name}: ${modules.length} módulos habilitados`)
  }

  // 3. Criar registros UserUnit para usuários existentes
  console.log('\n3. Criando registros UserUnit para usuários existentes...')
  const users = await prisma.user.findMany({
    select: { id: true, email: true, unitId: true, locationId: true, role: true },
  })

  let userUnitsCreated = 0
  for (const user of users) {
    // Usar unitId se existir, senão locationId como fallback
    const targetUnitId = user.unitId || user.locationId
    if (targetUnitId) {
      await prisma.userUnit.upsert({
        where: { userId_unitId: { userId: user.id, unitId: targetUnitId } },
        update: {},
        create: { userId: user.id, unitId: targetUnitId },
      })
      userUnitsCreated++

      // Definir activeUnitId se não estiver definido
      await prisma.user.update({
        where: { id: user.id },
        data: { activeUnitId: targetUnitId },
      })
    } else {
      console.log(`   ⚠ Usuário ${user.email} não tem unitId nem locationId`)
    }
  }
  console.log(`   ✓ ${userUnitsCreated} registros UserUnit criados`)
  console.log(`   ✓ activeUnitId definido para ${userUnitsCreated} usuários`)

  // 4. Para admins (SUPER_ADMIN), vincular a TODAS as unidades da empresa
  console.log('\n4. Vinculando admins a todas as unidades...')
  const admins = await prisma.user.findMany({
    where: { role: 'SUPER_ADMIN' },
    select: { id: true, email: true, companyId: true },
  })

  for (const admin of admins) {
    const companyLocations = await prisma.location.findMany({
      where: { companyId: admin.companyId },
      select: { id: true },
    })

    for (const loc of companyLocations) {
      await prisma.userUnit.upsert({
        where: { userId_unitId: { userId: admin.id, unitId: loc.id } },
        update: {},
        create: { userId: admin.id, unitId: loc.id },
      })
    }
    console.log(`   ✓ Admin ${admin.email}: vinculado a ${companyLocations.length} unidade(s)`)
  }

  console.log('\n=== Migração concluída com sucesso! ===')
}

main()
  .catch((error) => {
    console.error('Erro na migração:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
