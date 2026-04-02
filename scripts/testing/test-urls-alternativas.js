// Testar URLs alternativas do Supabase
const { PrismaClient } = require('@prisma/client');

const configs = [
  {
    name: "Pooler IPv4 porta 5432",
    url: "postgresql://postgres.wlantssberjxaxpuipkb:Mizu%402025%21%40%23@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
  },
  {
    name: "Pooler IPv4 porta 6543 com pgbouncer",
    url: "postgresql://postgres.wlantssberjxaxpuipkb:Mizu%402025%21%40%23@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
  },
  {
    name: "Pooler com schema=public",
    url: "postgresql://postgres.wlantssberjxaxpuipkb:Mizu%402025%21%40%23@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&schema=public"
  },
  {
    name: "Pooler com connection_limit=1",
    url: "postgresql://postgres.wlantssberjxaxpuipkb:Mizu%402025%21%40%23@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
  },
  {
    name: "Pooler com pool_timeout",
    url: "postgresql://postgres.wlantssberjxaxpuipkb:Mizu%402025%21%40%23@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&pool_timeout=10"
  },
  {
    name: "Pooler com connect_timeout",
    url: "postgresql://postgres.wlantssberjxaxpuipkb:Mizu%402025%21%40%23@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connect_timeout=10"
  },
  {
    name: "Formato Vercel (sem pgbouncer na URL)",
    url: "postgresql://postgres.wlantssberjxaxpuipkb:Mizu%402025%21%40%23@aws-0-sa-east-1.pooler.supabase.com:6543/postgres"
  },
  {
    name: "Com statement_timeout",
    url: "postgresql://postgres.wlantssberjxaxpuipkb:Mizu%402025%21%40%23@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&statement_timeout=60000"
  }
];

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
    console.log(`\n📝 URL QUE FUNCIONOU:\n${config.url}\n`);
    
    await prisma.$disconnect();
    return true;
    
  } catch (error) {
    console.log(`❌ FALHOU: ${error.message.split('\n')[0]}`);
    await prisma.$disconnect();
    return false;
  }
}

async function testAll() {
  console.log('\n🚀 TESTANDO URLS ALTERNATIVAS DO SUPABASE\n');
  
  let foundWorking = false;
  
  for (const config of configs) {
    const success = await testConfig(config);
    if (success && !foundWorking) {
      foundWorking = true;
      console.log('\n✅ ✅ ✅ CONFIGURAÇÃO FUNCIONANDO ENCONTRADA! ✅ ✅ ✅');
      console.log('Copie a URL acima para o arquivo .env\n');
      // Continua testando para ver se há outras que funcionam
    }
  }
  
  if (!foundWorking) {
    console.log('\n❌ NENHUMA URL FUNCIONOU');
    console.log('\nPróximos passos:');
    console.log('1. Peça ao gestor do outro sistema o .env dele');
    console.log('2. Compare as URLs e configurações');
    console.log('3. Verifique se o projeto Supabase está ativo');
    console.log('4. Confirme que a senha está correta\n');
  }
  
  process.exit(foundWorking ? 0 : 1);
}

testAll();
