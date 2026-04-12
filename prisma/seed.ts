import { PrismaClient, type UserRole, type ProductSlug, type ProductStatus } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

const DEFAULT_PASSWORD = 'Teste@123'

// ============================================
// PRODUTOS DO PORTAL (macro-módulos comerciais)
// ============================================
const PORTAL_PRODUCTS: { slug: ProductSlug; name: string; description: string; icon: string; order: number; status: ProductStatus }[] = [
  {
    slug: 'CMMS',
    name: 'Gestão de Manutenção',
    description: 'Planejamento, execução e controle de manutenção preventiva e corretiva de ativos industriais.',
    icon: 'construction',
    order: 1,
    status: 'ACTIVE',
  },
  {
    slug: 'GVP',
    name: 'Gestão de Variáveis de Processo',
    description: 'Monitoramento e análise de variáveis operacionais em tempo real para controle de qualidade e eficiência.',
    icon: 'bar_chart',
    order: 2,
    status: 'COMING_SOON',
  },
  {
    slug: 'GPA',
    name: 'Gestão de Portaria e Acesso',
    description: 'Controle inteligente e automatizado de acesso com leitura de placas e gestão integrada de portaria.',
    icon: 'photo_camera',
    order: 3,
    status: 'COMING_SOON',
  },
]

// ============================================
// FEATURES DO PORTAL (itens de navegação por produto)
// ============================================
const PORTAL_MODULES = [
  { slug: 'dashboard', name: 'Dashboard', icon: 'dashboard', order: 1 },
  { slug: 'tree', name: 'Árvore de Ativos', icon: 'account_tree', order: 2 },
  { slug: 'people-teams', name: 'Pessoas e Equipes', icon: 'group', order: 3 },
  { slug: 'basic-registrations', name: 'Cadastros Básicos', icon: 'tune', order: 4 },
  { slug: 'assets', name: 'Ativos', icon: 'inventory_2', order: 5 },
  { slug: 'maintenance-plan', name: 'Plano de Manutenção', icon: 'event_upcoming', order: 6 },
  { slug: 'planning', name: 'Planejamento e Programação', icon: 'date_range', order: 7 },
  { slug: 'work-orders', name: 'Ordens de Serviço', icon: 'construction', order: 8 },
  { slug: 'requests', name: 'Solicitações de Serviço', icon: 'assignment', order: 9 },
  { slug: 'approvals', name: 'Aprovações', icon: 'check_circle', order: 10 },
  { slug: 'rafs', name: 'RAF - Análise de Falhas', icon: 'description', order: 11 },
  { slug: 'locations', name: 'Localizações', icon: 'location_on', order: 12 },
  { slug: 'kpi', name: 'KPI - Indicadores', icon: 'trending_up', order: 13 },
  { slug: 'gep', name: 'GEP - Variáveis de Processo', icon: 'monitoring', order: 14 },
  { slug: 'analytics', name: 'Análises', icon: 'bar_chart', order: 15 },
  { slug: 'settings', name: 'Configurações', icon: 'settings', order: 16 },
]

type SeedUser = {
  email: string
  firstName: string
  lastName: string
  username: string
  role: UserRole
  jobTitle: string
}

type SeedCompany = {
  id: string
  name: string
  email: string
  locationId: string
  locationName: string
  users: SeedUser[]
}

const seedCompanies: SeedCompany[] = [
  {
    id: 'company-valenorte',
    name: 'Cimento Vale do Norte SA',
    email: 'contato@valenorte.local',
    locationId: 'location-valenorte-principal',
    locationName: 'Unidade Principal Vale do Norte',
    users: [
      {
        email: 'super.admin@valenorte.local',
        firstName: 'Carla',
        lastName: 'Mendes',
        username: 'super.admin.valenorte',
        role: 'SUPER_ADMIN',
        jobTitle: 'Super Administradora',
      },
      {
        email: 'admin@valenorte.local',
        firstName: 'Marcos',
        lastName: 'Lima',
        username: 'admin.valenorte',
        role: 'GESTOR',
        jobTitle: 'Administrador',
      },
      {
        email: 'tecnico@valenorte.local',
        firstName: 'Joao',
        lastName: 'Ferreira',
        username: 'tecnico.valenorte',
        role: 'MECANICO',
        jobTitle: 'Tecnico de Manutencao',
      },
      {
        email: 'tecnico.limitado@valenorte.local',
        firstName: 'Paula',
        lastName: 'Santos',
        username: 'tecnico.limitado.valenorte',
        role: 'ELETRICISTA',
        jobTitle: 'Tecnica Limitada',
      },
      {
        email: 'solicitante@valenorte.local',
        firstName: 'Ana',
        lastName: 'Souza',
        username: 'solicitante.valenorte',
        role: 'OPERADOR',
        jobTitle: 'Solicitante',
      },
      {
        email: 'consulta@valenorte.local',
        firstName: 'Bruno',
        lastName: 'Almeida',
        username: 'consulta.valenorte',
        role: 'OPERADOR',
        jobTitle: 'Visualizador',
      },
    ],
  },
  {
    id: 'company-polimix',
    name: 'Polimix Concreto Ltda',
    email: 'contato@polimix.local',
    locationId: 'location-polimix-principal',
    locationName: 'Unidade Principal Polimix',
    users: [
      {
        email: 'super.admin@polimix.local',
        firstName: 'Carla',
        lastName: 'Mendes',
        username: 'super.admin.polimix',
        role: 'SUPER_ADMIN',
        jobTitle: 'Super Administradora',
      },
      {
        email: 'admin@polimix.local',
        firstName: 'Marcos',
        lastName: 'Lima',
        username: 'admin.polimix',
        role: 'GESTOR',
        jobTitle: 'Administrador',
      },
      {
        email: 'tecnico@polimix.local',
        firstName: 'Joao',
        lastName: 'Ferreira',
        username: 'tecnico.polimix',
        role: 'MECANICO',
        jobTitle: 'Tecnico de Manutencao',
      },
      {
        email: 'tecnico.limitado@polimix.local',
        firstName: 'Paula',
        lastName: 'Santos',
        username: 'tecnico.limitado.polimix',
        role: 'ELETRICISTA',
        jobTitle: 'Tecnica Limitada',
      },
      {
        email: 'solicitante@polimix.local',
        firstName: 'Ana',
        lastName: 'Souza',
        username: 'solicitante.polimix',
        role: 'OPERADOR',
        jobTitle: 'Solicitante',
      },
      {
        email: 'consulta@polimix.local',
        firstName: 'Bruno',
        lastName: 'Almeida',
        username: 'consulta.polimix',
        role: 'OPERADOR',
        jobTitle: 'Visualizador',
      },
    ],
  },
]

async function seedCompany(companyData: SeedCompany, passwordHash: string) {
  const company = await prisma.company.upsert({
    where: { id: companyData.id },
    update: {
      name: companyData.name,
      email: companyData.email,
    },
    create: {
      id: companyData.id,
      name: companyData.name,
      email: companyData.email,
    },
  })

  const location = await prisma.location.upsert({
    where: { id: companyData.locationId },
    update: {
      name: companyData.locationName,
      companyId: company.id,
    },
    create: {
      id: companyData.locationId,
      name: companyData.locationName,
      companyId: company.id,
    },
  })

  for (const user of companyData.users) {
    const jobTitleRecord = await prisma.jobTitle.upsert({
      where: {
        companyId_name: {
          companyId: company.id,
          name: user.jobTitle,
        },
      },
      update: {
        name: user.jobTitle,
      },
      create: {
        name: user.jobTitle,
        companyId: company.id,
      },
    })

    const createdUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role,
        jobTitle: user.jobTitle,
        jobTitleId: jobTitleRecord.id,
        enabled: true,
        companyId: company.id,
        locationId: location.id,
        activeUnitId: location.id,
      },
      create: {
        email: user.email,
        password: passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role,
        jobTitle: user.jobTitle,
        jobTitleId: jobTitleRecord.id,
        enabled: true,
        companyId: company.id,
        locationId: location.id,
        activeUnitId: location.id,
      },
    })

    // Criar relação UserUnit (N:N) para que o usuário tenha acesso à unidade
    await prisma.userUnit.upsert({
      where: {
        userId_unitId: {
          userId: createdUser.id,
          unitId: location.id,
        },
      },
      update: {},
      create: {
        userId: createdUser.id,
        unitId: location.id,
      },
    })
  }

  return { company, location }
}

async function seedProducts() {
  console.log('Seeding portal products...')
  const products: { id: string; slug: ProductSlug }[] = []

  for (const prod of PORTAL_PRODUCTS) {
    const created = await prisma.product.upsert({
      where: { slug: prod.slug },
      update: {
        name: prod.name,
        description: prod.description,
        icon: prod.icon,
        order: prod.order,
        status: prod.status,
      },
      create: {
        slug: prod.slug,
        name: prod.name,
        description: prod.description,
        icon: prod.icon,
        order: prod.order,
        status: prod.status,
      },
    })
    products.push({ id: created.id, slug: created.slug })
  }

  console.log(`  ✓ ${products.length} products seeded`)
  return products
}

async function seedModules(productMap: Record<string, string>) {
  console.log('Seeding portal modules (features)...')
  const modules: { id: string; slug: string }[] = []

  for (const mod of PORTAL_MODULES) {
    // gep pertence ao GVP; todos os demais ao CMMS
    const productId = mod.slug === 'gep' ? productMap['GVP'] : productMap['CMMS']

    const created = await prisma.module.upsert({
      where: { slug: mod.slug },
      update: {
        name: mod.name,
        icon: mod.icon,
        order: mod.order,
        productId,
      },
      create: {
        name: mod.name,
        slug: mod.slug,
        icon: mod.icon,
        order: mod.order,
        productId,
      },
    })
    modules.push({ id: created.id, slug: created.slug })
  }

  console.log(`  ✓ ${modules.length} modules seeded and linked to products`)
  return modules
}

async function enableAllModulesForCompany(companyId: string, modules: { id: string; slug: string }[]) {
  for (const mod of modules) {
    await prisma.companyModule.upsert({
      where: {
        companyId_moduleId: {
          companyId,
          moduleId: mod.id,
        },
      },
      update: { enabled: true },
      create: {
        companyId,
        moduleId: mod.id,
        enabled: true,
      },
    })
  }
}

async function enableCmmsProductForCompany(companyId: string, cmmsProductId: string) {
  await prisma.companyProduct.upsert({
    where: {
      companyId_productId: {
        companyId,
        productId: cmmsProductId,
      },
    },
    update: { enabled: true },
    create: {
      companyId,
      productId: cmmsProductId,
      enabled: true,
    },
  })
}

async function main() {
  console.log('Seeding database with portal products, modules, companies and users...')

  const passwordHash = await hash(DEFAULT_PASSWORD, 12)

  // 1. Criar produtos do portal (macro-módulos comerciais)
  const products = await seedProducts()
  const productMap: Record<string, string> = {}
  for (const p of products) {
    productMap[p.slug] = p.id
  }

  // 2. Criar features do portal (itens de navegação) e vincular aos produtos
  const modules = await seedModules(productMap)

  // 3. Criar empresas e usuários
  for (const companyData of seedCompanies) {
    const { company } = await seedCompany(companyData, passwordHash)
    console.log(`✓ Company seeded: ${company.name}`)

    // 4. Habilitar todos os módulos de features para cada empresa
    await enableAllModulesForCompany(company.id, modules)
    console.log(`  ✓ All feature modules enabled for ${company.name}`)

    // 5. Habilitar produto CMMS para cada empresa (ACTIVE por padrão)
    await enableCmmsProductForCompany(company.id, productMap['CMMS'])
    console.log(`  ✓ CMMS product enabled for ${company.name}`)
  }

  console.log('\n✅ Seed completed successfully!')
  console.log(`🔐 Default password: ${DEFAULT_PASSWORD}`)
}

main()
  .catch((error) => {
    console.error('Error seeding database:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
