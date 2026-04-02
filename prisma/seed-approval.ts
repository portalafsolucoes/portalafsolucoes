import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database with approval system...')

  // Senha padrão: 123456
  const password = '$2b$12$kQOEVsDtn7E64ScB.Ecq2.WVhpu6ek10244wiE7lq0rYOVAsoNP42'

  // 1. Criar empresa
  const company = await prisma.company.upsert({
    where: { id: 'cmh4tcg040003nir4m0aobbcq' },
    update: {},
    create: {
      id: 'cmh4tcg040003nir4m0aobbcq',
      name: 'Mizu Industrial'
    }
  })
  console.log('✓ Company:', company.name)

  // 2. Criar localização
  const location = await prisma.location.upsert({
    where: { id: 'cmh4tcg070004nir4h5q6p7q8' },
    update: {},
    create: {
      id: 'cmh4tcg070004nir4h5q6p7q8',
      name: 'Fábrica Principal',
      companyId: company.id
    }
  })
  console.log('✓ Location:', location.name)

  // 3. Criar usuários

  // SUPER_ADMIN - Administrador Geral (Vê e aprova TODAS as solicitações)
  const adminGeral = await prisma.user.upsert({
    where: { email: 'admin.geral@mizu.com.br' },
    update: {},
    create: {
      email: 'admin.geral@mizu.com.br',
      password,
      firstName: 'Carlos',
      lastName: 'Souza',
      username: 'admin.geral',
      role: 'SUPER_ADMIN',
      jobTitle: 'Gerente de Manutenção',
      enabled: true,
      companyId: company.id,
      locationId: location.id
    }
  })
  console.log('✓ SUPER_ADMIN criado:', adminGeral.firstName, adminGeral.lastName)

  // Criar equipes
  const equipeEletrica = await prisma.team.upsert({
    where: { id: 'team-eletrica-001' },
    update: {},
    create: {
      id: 'team-eletrica-001',
      name: 'Equipe Elétrica',
      description: 'Responsável pela manutenção elétrica',
      companyId: company.id
    }
  })
  console.log('✓ Team criada:', equipeEletrica.name)

  const equipeMecanica = await prisma.team.upsert({
    where: { id: 'team-mecanica-001' },
    update: {},
    create: {
      id: 'team-mecanica-001',
      name: 'Equipe Mecânica',
      description: 'Responsável pela manutenção mecânica',
      companyId: company.id
    }
  })
  console.log('✓ Team criada:', equipeMecanica.name)

  // ADMIN (Líder da Equipe Elétrica) - Vê apenas solicitações da SUA equipe
  const adminEletrica = await prisma.user.upsert({
    where: { email: 'andrew.silva@mizu.com.br' },
    update: {},
    create: {
      email: 'andrew.silva@mizu.com.br',
      password,
      firstName: 'Andrew',
      lastName: 'Silva',
      username: 'andrew.silva',
      role: 'ADMIN',
      jobTitle: 'Líder de Elétrica',
      enabled: true,
      companyId: company.id,
      locationId: location.id
    }
  })
  console.log('✓ ADMIN Elétrica criado:', adminEletrica.firstName, adminEletrica.lastName)

  // Atualizar equipe elétrica com líder
  await prisma.team.update({
    where: { id: equipeEletrica.id },
    data: { leaderId: adminEletrica.id }
  })

  // ADMIN (Líder da Equipe Mecânica) - Vê apenas solicitações da SUA equipe
  const adminMecanica = await prisma.user.upsert({
    where: { email: 'roberto.costa@mizu.com.br' },
    update: {},
    create: {
      email: 'roberto.costa@mizu.com.br',
      password,
      firstName: 'Roberto',
      lastName: 'Costa',
      username: 'roberto.costa',
      role: 'ADMIN',
      jobTitle: 'Líder de Mecânica',
      enabled: true,
      companyId: company.id,
      locationId: location.id
    }
  })
  console.log('✓ ADMIN Mecânica criado:', adminMecanica.firstName, adminMecanica.lastName)

  // Atualizar equipe mecânica com líder
  await prisma.team.update({
    where: { id: equipeMecanica.id },
    data: { leaderId: adminMecanica.id }
  })

  // TECHNICIAN - Técnico comum (pode ver e criar SCs)
  const tecnicoEletrica = await prisma.user.upsert({
    where: { email: 'jose.ferreira@mizu.com.br' },
    update: {},
    create: {
      email: 'jose.ferreira@mizu.com.br',
      password,
      firstName: 'José',
      lastName: 'Ferreira',
      username: 'jose.ferreira',
      role: 'TECHNICIAN',
      jobTitle: 'Eletricista I',
      enabled: true,
      companyId: company.id
    }
  })
  console.log('✓ TECHNICIAN criado:', tecnicoEletrica.firstName, tecnicoEletrica.lastName)

  const tecnicoMecanica = await prisma.user.upsert({
    where: { email: 'paulo.oliveira@mizu.com.br' },
    update: {},
    create: {
      email: 'paulo.oliveira@mizu.com.br',
      password,
      firstName: 'Paulo',
      lastName: 'Oliveira',
      username: 'paulo.oliveira',
      role: 'TECHNICIAN',
      jobTitle: 'Mecânico I',
      enabled: true,
      companyId: company.id
    }
  })
  console.log('✓ TECHNICIAN criado:', tecnicoMecanica.firstName, tecnicoMecanica.lastName)

  // REQUESTER - Usuário solicitante (apenas cria SCs)
  const solicitante = await prisma.user.upsert({
    where: { email: 'maria.santos@mizu.com.br' },
    update: {},
    create: {
      email: 'maria.santos@mizu.com.br',
      password,
      firstName: 'Maria',
      lastName: 'Santos',
      username: 'maria.santos',
      role: 'REQUESTER',
      jobTitle: 'Operadora de Produção',
      enabled: true,
      companyId: company.id
    }
  })
  console.log('✓ REQUESTER criado:', solicitante.firstName, solicitante.lastName)

  // Adicionar membros às equipes
  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: equipeEletrica.id,
        userId: adminEletrica.id
      }
    },
    update: {},
    create: {
      teamId: equipeEletrica.id,
      userId: adminEletrica.id
    }
  })

  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: equipeEletrica.id,
        userId: tecnicoEletrica.id
      }
    },
    update: {},
    create: {
      teamId: equipeEletrica.id,
      userId: tecnicoEletrica.id
    }
  })

  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: equipeMecanica.id,
        userId: adminMecanica.id
      }
    },
    update: {},
    create: {
      teamId: equipeMecanica.id,
      userId: adminMecanica.id
    }
  })

  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: equipeMecanica.id,
        userId: tecnicoMecanica.id
      }
    },
    update: {},
    create: {
      teamId: equipeMecanica.id,
      userId: tecnicoMecanica.id
    }
  })

  console.log('✓ Team members adicionados')

  console.log('\n✅ Seed concluído!')
  console.log('\n📋 Usuários criados (senha: 123456):')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('👑 SUPER_ADMIN (Vê TODAS):')
  console.log('   Email: admin.geral@mizu.com.br')
  console.log('   Nome: Carlos Souza')
  console.log('')
  console.log('⚡ ADMIN Equipe Elétrica (Vê apenas sua equipe):')
  console.log('   Email: andrew.silva@mizu.com.br')
  console.log('   Nome: Andrew Silva')
  console.log('')
  console.log('🔧 ADMIN Equipe Mecânica (Vê apenas sua equipe):')
  console.log('   Email: roberto.costa@mizu.com.br')
  console.log('   Nome: Roberto Costa')
  console.log('')
  console.log('👷 TECHNICIAN Elétrica:')
  console.log('   Email: jose.ferreira@mizu.com.br')
  console.log('   Nome: José Ferreira')
  console.log('')
  console.log('👷 TECHNICIAN Mecânica:')
  console.log('   Email: paulo.oliveira@mizu.com.br')
  console.log('   Nome: Paulo Oliveira')
  console.log('')
  console.log('👤 REQUESTER (Solicitante):')
  console.log('   Email: maria.santos@mizu.com.br')
  console.log('   Nome: Maria Santos')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
