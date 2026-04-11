// Script para testar diferentes configurações de conexão

// SEGURANCA: credenciais devem vir de variaveis de ambiente
// Configure .env com DATABASE_URL antes de executar
require('dotenv').config({ path: '../../.env' })

const DATABASE_URL = process.env.DATABASE_URL
const DIRECT_URL = process.env.DIRECT_URL

if (!DATABASE_URL) {
  console.error('ERRO: DATABASE_URL nao configurada. Configure o arquivo .env')
  process.exit(1)
}

const { PrismaClient } = require('@prisma/client');

// Configurações a testar
const configs = [
  {
    name: "Conexão via DATABASE_URL",
    url: DATABASE_URL
  },
  {
    name: "Conexão via DIRECT_URL",
    url: DIRECT_URL || DATABASE_URL
  }
];

async function testConfig(config) {
  if (!config.url) return false

  console.log(`\n${'='.repeat(60)}`);
  console.log(`🔍 Testando: ${config.name}`);
  console.log(`${'='.repeat(60)}`);

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: config.url
      }
    }
  });

  try {
    console.log('⏳ Conectando...');
    await prisma.$connect();

    console.log('⏳ Contando usuários...');
    const count = await prisma.user.count();

    console.log(`✅ SUCESSO! ${count} usuários encontrados`);
    console.log(`\n📝 Configuração que funcionou: ${config.name}\n`);

    await prisma.$disconnect();
    return true;

  } catch (error) {
    console.log(`❌ FALHOU: ${error.message}`);
    await prisma.$disconnect();
    return false;
  }
}

async function testAll() {
  console.log('\n🚀 INICIANDO TESTES DE CONEXÃO\n');

  for (const config of configs) {
    const success = await testConfig(config);
    if (success) {
      console.log('\n✅ CONFIGURAÇÃO FUNCIONANDO ENCONTRADA!');
      console.log('Verifique as variaveis DATABASE_URL e DIRECT_URL no arquivo .env\n');
      process.exit(0);
    }
  }

  console.log('\n❌ NENHUMA CONFIGURAÇÃO FUNCIONOU');
  console.log('Verifique:');
  console.log('1. DATABASE_URL está correta no arquivo .env?');
  console.log('2. Projeto Supabase está ativo?');
  console.log('3. Firewall permite conexão?');
  process.exit(1);
}

testAll();
