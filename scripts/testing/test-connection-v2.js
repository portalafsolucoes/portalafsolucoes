// Script para testar diferentes configurações de conexão
const { PrismaClient } = require('@prisma/client');

// Configurações a testar
const configs = [
  {
    name: "Conexão Direta com SSL",
    url: "postgresql://postgres.wlantssberjxaxpuipkb:Mizu%402025%21%40%23@db.wlantssberjxaxpuipkb.supabase.co:5432/postgres?sslmode=require"
  },
  {
    name: "Conexão Direta sem parâmetros",
    url: "postgresql://postgres.wlantssberjxaxpuipkb:Mizu%402025%21%40%23@db.wlantssberjxaxpuipkb.supabase.co:5432/postgres"
  },
  {
    name: "Pooler com pgbouncer",
    url: "postgresql://postgres.wlantssberjxaxpuipkb:Mizu%402025%21%40%23@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
  },
  {
    name: "Pooler com SSL",
    url: "postgresql://postgres.wlantssberjxaxpuipkb:Mizu%402025%21%40%23@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?sslmode=require"
  },
  {
    name: "IPv6 Pooler",
    url: "postgresql://postgres.wlantssberjxaxpuipkb:Mizu%402025%21%40%23@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
  }
];

async function testConfig(config) {
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
    console.log(`\n📝 URL que funcionou:\n${config.url}\n`);
    
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
      console.log('Copie a URL acima para o arquivo .env\n');
      process.exit(0);
    }
  }
  
  console.log('\n❌ NENHUMA CONFIGURAÇÃO FUNCIONOU');
  console.log('Verifique:');
  console.log('1. Senha está correta?');
  console.log('2. Projeto Supabase está ativo?');
  console.log('3. Firewall permite conexão?');
  process.exit(1);
}

testAll();
