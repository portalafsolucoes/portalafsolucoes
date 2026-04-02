import { PrismaClient, type UserRole } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

const DEFAULT_PASSWORD = 'Teste@123'

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
        role: 'ADMIN',
        jobTitle: 'Administrador',
      },
      {
        email: 'tecnico@valenorte.local',
        firstName: 'Joao',
        lastName: 'Ferreira',
        username: 'tecnico.valenorte',
        role: 'TECHNICIAN',
        jobTitle: 'Tecnico de Manutencao',
      },
      {
        email: 'tecnico.limitado@valenorte.local',
        firstName: 'Paula',
        lastName: 'Santos',
        username: 'tecnico.limitado.valenorte',
        role: 'LIMITED_TECHNICIAN',
        jobTitle: 'Tecnica Limitada',
      },
      {
        email: 'solicitante@valenorte.local',
        firstName: 'Ana',
        lastName: 'Souza',
        username: 'solicitante.valenorte',
        role: 'REQUESTER',
        jobTitle: 'Solicitante',
      },
      {
        email: 'consulta@valenorte.local',
        firstName: 'Bruno',
        lastName: 'Almeida',
        username: 'consulta.valenorte',
        role: 'VIEW_ONLY',
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
        role: 'ADMIN',
        jobTitle: 'Administrador',
      },
      {
        email: 'tecnico@polimix.local',
        firstName: 'Joao',
        lastName: 'Ferreira',
        username: 'tecnico.polimix',
        role: 'TECHNICIAN',
        jobTitle: 'Tecnico de Manutencao',
      },
      {
        email: 'tecnico.limitado@polimix.local',
        firstName: 'Paula',
        lastName: 'Santos',
        username: 'tecnico.limitado.polimix',
        role: 'LIMITED_TECHNICIAN',
        jobTitle: 'Tecnica Limitada',
      },
      {
        email: 'solicitante@polimix.local',
        firstName: 'Ana',
        lastName: 'Souza',
        username: 'solicitante.polimix',
        role: 'REQUESTER',
        jobTitle: 'Solicitante',
      },
      {
        email: 'consulta@polimix.local',
        firstName: 'Bruno',
        lastName: 'Almeida',
        username: 'consulta.polimix',
        role: 'VIEW_ONLY',
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
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role,
        jobTitle: user.jobTitle,
        enabled: true,
        companyId: company.id,
        locationId: location.id,
      },
      create: {
        email: user.email,
        password: passwordHash,
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        role: user.role,
        jobTitle: user.jobTitle,
        enabled: true,
        companyId: company.id,
        locationId: location.id,
      },
    })
  }

  return { company, location }
}

async function main() {
  console.log('Seeding database with current test companies and users...')

  const passwordHash = await hash(DEFAULT_PASSWORD, 12)

  for (const companyData of seedCompanies) {
    const { company } = await seedCompany(companyData, passwordHash)
    console.log(`✓ Company seeded: ${company.name}`)
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
