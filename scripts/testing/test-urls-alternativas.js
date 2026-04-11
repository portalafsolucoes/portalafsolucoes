// Testar URLs alternativas do Supabase

// SEGURANCA: credenciais devem vir de variaveis de ambiente
// Configure .env com DATABASE_URL e DIRECT_URL antes de executar
require('dotenv').config({ path: '../../.env' })

const DATABASE_URL = process.env.DATABASE_URL
const DIRECT_URL = process.env.DIRECT_URL

if (!DATABASE_URL) {
  console.error('ERRO: DATABASE_URL nao configurada. Configure o arquivo .env')
  process.exit(1)
}

const { PrismaClient } = require('@prisma/client');

const configs = [
  {
    name: "DATABASE_URL (pooler padrao)",
    url: DATABASE_URL
  },
  {
    name: "DIRECT_URL (conexao direta)",
    url: DIRECT_URL || null
  }
].filter(c => c.url);

async function testConfig(config) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`🔍 ${config.name}`);
  console.log(`${'='.repeat(70)}`);

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: config.url
      }
    },
    log: ['error']
  });

  try {
    console.log('⏳ Conectando...');
    const startTime = Date.now();

    await prisma.$connect();
    const connectTime = Date.now() - startTime;

    console.log(`✅ Conectado em ${connectTime}ms`);

    console.log('⏳ Testando query...');
    const queryStart = Date.now();
    const count = await prisma.user.count();
    const queryTime = Date.now() - queryStart;

    console.log(`✅ SUCESSO! ${count} usuários (query: ${queryTime}ms)`);
    console.log(`\n📝 CONFIGURACAO QUE FUNCIONOU: ${config.name}\n`);

    await prisma.$disconnect();
    return true;

  } catch (error) {
    console.log(`❌ FALHOU: ${error.message.split('\n')[0]}`);
    await prisma.$disconnect();
    return false;
  }
}

async function testAll() {
  console.log('\n🚀 TESTANDO CONFIGURACOES DO SUPABASE\n');

  let foundWorking = false;

  for (const config of configs) {
    const success = await testConfig(config);
    if (success && !foundWorking) {
      foundWorking = true;
      console.log('\n✅ ✅ ✅ CONFIGURAÇÃO FUNCIONANDO ENCONTRADA! ✅ ✅ ✅');
      console.log('Verifique as variaveis DATABASE_URL e DIRECT_URL no arquivo .env\n');
      // Continua testando para ver se há outras que funcionam
    }
  }

  if (!foundWorking) {
    console.log('\n❌ NENHUMA URL FUNCIONOU');
    console.log('\nPróximos passos:');
    console.log('1. Verifique DATABASE_URL e DIRECT_URL no arquivo .env');
    console.log('2. Compare as URLs e configurações');
    console.log('3. Verifique se o projeto Supabase está ativo');
    console.log('4. Confirme que a senha está correta\n');
  }

  process.exit(foundWorking ? 0 : 1);
}

testAll();
