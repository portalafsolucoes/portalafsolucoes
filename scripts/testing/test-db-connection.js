// Script para testar conexão com Supabase
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
})

async function testConnection() {
  console.log('🔍 Testando conexão com Supabase...\n')
  
  try {
    // Teste 1: Verificar conexão básica
    console.log('1️⃣  Testando conexão básica...')
    await prisma.$connect()
    console.log('✅ Conexão estabelecida com sucesso!\n')
    
    // Teste 2: Executar query simples
    console.log('2️⃣  Executando query de teste...')
    const result = await prisma.$queryRaw`SELECT NOW() as current_time, version() as postgres_version`
    console.log('✅ Query executada com sucesso!')
    console.log('📅 Horário do servidor:', result[0].current_time)
    console.log('🐘 Versão PostgreSQL:', result[0].postgres_version.split(' ')[0], '\n')
    
    // Teste 3: Verificar tabelas
    console.log('3️⃣  Verificando tabelas do banco...')
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `
    
    if (tables.length === 0) {
      console.log('⚠️  Nenhuma tabela encontrada. Execute: npm run db:push\n')
    } else {
      console.log(`✅ ${tables.length} tabelas encontradas:`)
      tables.slice(0, 10).forEach(t => console.log(`   - ${t.table_name}`))
      if (tables.length > 10) {
        console.log(`   ... e mais ${tables.length - 10} tabelas`)
      }
      console.log()
    }
    
    // Teste 4: Contar registros (se houver tabelas)
    if (tables.length > 0) {
      console.log('4️⃣  Verificando dados...')
      
      try {
        const userCount = await prisma.user.count()
        const companyCount = await prisma.company.count()
        console.log(`✅ ${userCount} usuários e ${companyCount} empresas cadastradas\n`)
      } catch {
        console.log('⚠️  Tabelas existem mas podem estar vazias\n')
      }
    }
    
    console.log('========================================')
    console.log('✅ TESTE DE CONEXÃO CONCLUÍDO COM SUCESSO!')
    console.log('========================================\n')
    console.log('O sistema está pronto para rodar! Execute:')
    console.log('  npm run dev')
    console.log()
    
  } catch (error) {
    console.error('❌ ERRO NA CONEXÃO!\n')
    console.error('Detalhes do erro:', error.message)
    console.error('\n📋 Possíveis causas:')
    console.error('1. Projeto Supabase pode estar pausado')
    console.error('2. Senha incorreta no arquivo .env.local')
    console.error('3. Firewall bloqueando porta 5432')
    console.error('4. Problemas de rede/internet')
    console.error('\n🔧 Soluções:')
    console.error('1. Verifique se o projeto está ativo em:')
    console.error('   https://supabase.com/dashboard')
    console.error('2. Verifique o arquivo .env.local')
    console.error('3. Tente desativar antivírus/firewall temporariamente\n')
    
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()

